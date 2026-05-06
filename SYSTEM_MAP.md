# Finança Casa — Mapa Técnico do Sistema

## 1. Visão Geral da Arquitetura

```
Supabase (Postgres + Auth + Storage)
        │
        ├── services/supabase/client.ts   ← browser (CSR)
        └── services/supabase/server.ts   ← server (SSR, middleware)
                │
        src/hooks/use*.ts                 ← toda lógica de dados
                │
        src/app/dashboard/*/page.tsx      ← páginas (client components)
        src/components/**/*.tsx           ← componentes compartilhados
```

Não há Redux, Zustand nem Context API. Cada página instancia seus próprios hooks diretamente.

---

## 2. Mapa de Módulos e Conexões

### Dashboard (`app/dashboard/DashboardClient.tsx`)
Consome **4 hooks em paralelo**:
- `useAccounts(HOUSEHOLD_ID)` → `summary.disponivel`, `summary.investido`, `summary.total`
- `useBudgets(HOUSEHOLD_ID, month)` → `budgets`, `exceeded`, `warning`
- `useCostOfLiving(HOUSEHOLD_ID, '3')` → `costData.totalMonthly`, `costData.fixedPercent`, `costData.variablePercent`
- `useInstallments(HOUSEHOLD_ID)` → `totalCommitted`

Além disso faz **2 queries diretas ao Supabase** (sem hook):
- `transactions` filtrado por `competence_month` → `totalExpenses`, `fixedTotal`, `variableTotal`, `byCategory`, `byMember`
- `income_entries` filtrado por `competence_month` → `totalIncome`, `vaIncome`

### Transações (`hooks/useTransactions.ts`)
- Tabela: `transactions` + join `categories(name, icon, color)`
- Join manual: `household_members` para resolver `imported_by` → `imported_by_name`
- Filtros: `competence_month`, `category_id`, `imported_by`, `status`, `transaction_type`
- Não retorna cálculo nenhum — só os dados brutos. Cada página agrega o que precisa.

### Contas (`hooks/useAccounts.ts`)
- Tabela: `accounts` onde `is_active = true`
- Calcula `AccountSummary` localmente (não no banco):
  ```
  disponivel = sum(CHECKING)
  investido  = sum(SAVINGS + INVESTMENT + CDI)
  total      = sum(todos exceto FOOD_CARD)
  ```
- `FOOD_CARD` foi removido do patrimônio (comentário no código: "VA agora é renda, não patrimônio")

### Orçamento (`hooks/useBudgets.ts`)
- Tabela: `budgets` + `transactions`
- Para cada budget: cruza `category_id` com as transações EXPENSE do mesmo `competence_month`
- Calcula `spent`, `percent`, `remaining`, `status` localmente
- `upsertBudget` usa `onConflict: 'household_id,category_id,month'`

### Custo de Vida (`hooks/useCostOfLiving.ts`)
- Tabelas: `fixed_costs`, `transactions`, `income_entries`
- Duas fontes de variável: cartão de crédito (média das transações EXPENSE) + VA (income_entries.category = 'FOOD_CARD')
- Dois modos: `average` (média de 3/6/12 meses) ou `month` (mês específico com chart de 12 meses)

### Parcelas (`hooks/useInstallments.ts`)
- Tabela: `installment_plans` + `installment_payments`
- Calcula `remaining_installments`, `committed_value`, `paid_installments`, `percent_paid` localmente
- `getMonthlyProjection()` projeta parcelas restantes nos próximos 6 meses estimando datas pela `start_date`

### Rendas (`hooks/useIncome.ts`)
- Tabela: `income_entries` + join `accounts(name, type)`
- Categorias: `SALARY | FREELANCE | INVESTMENT_RETURN | RENTAL | FOOD_CARD | OTHER`
- Agrega `byCategory` e `byMember` localmente a partir do array em memória

### Dívidas (`hooks/useDebts.ts`)
- Tabelas: `debts` + `debt_payments`
- Calcula `total_paid` e `percent_paid` cruzando `debt_payments` por `debt_id`
- `registerPayment()` atualiza `current_balance` e muda `status` para `PAID` se `balance_after <= 0`

### Metas (`hooks/useGoals.ts`)
- Tabela: `savings_goals`
- `addProgress()` incrementa `current_amount` e seta `is_completed = true` se atingir `target_amount`
- `getMonthlySavings()` = `(target_amount - current_amount) / meses_restantes`

### Custo Fixo (`hooks/useFixedCosts.ts`)
- Tabela: `fixed_costs` onde `is_active = true`
- Soft delete via `update({ is_active: false })`
- Alimenta `useCostOfLiving` (ambas fazem queries independentes à mesma tabela)

### Importação CSV (`hooks/useImport.ts`)
- Pipeline: `idle → parsing → classifying → preview → saving → done`
- `processFile()` chama:
  1. `lib/csv-parser.ts` → `parseNubankCSV()` — detecta separador, converte datas
  2. `lib/sanitizer.ts` → pipeline de 6 passos no título
  3. `lib/classifier.ts` → `classifyTransactions()` — keyword match em `category_rules`
  4. `lib/installment-detector.ts` → detecta "Parcela X/Y"
  5. `lib/installment-matcher.ts` → cria/avança/marca planos de parcelamento
- `confirmImport()` insere em `import_batches` + `transactions`

### Lista de Desejos (`hooks/useWishlist.ts`)
- Tabelas: `wish_items` + `wish_categories`
- Storage: bucket `wish-images` (público)
- `moveItem()` seta `purchase_date = today` quando move para `comprado`
- `reorderItems()` recalcula `priority` para toda a coluna

---

## 3. Lógica Financeira Completa

### 3.1 Saldo do Mês
**Calculado em:** `DashboardClient.tsx` → função `fetchData()`

```
totalIncome   = SUM(income_entries.amount) WHERE competence_month = month
totalExpenses = SUM(ABS(transactions.amount)) WHERE transaction_type='EXPENSE' AND competence_month = month AND deleted_at IS NULL
saldo         = totalIncome - totalExpenses
```

- Mostrado em: `DashboardClient.tsx` seção "Resumo do Mês"
- Também calculado de forma semelhante em `analytics/page.tsx` para o gráfico histórico

### 3.2 Patrimônio
**Calculado em:** `hooks/useAccounts.ts` → `summary`

```
disponivel = SUM(accounts.balance) WHERE type = 'CHECKING' AND is_active = true
investido  = SUM(accounts.balance) WHERE type IN ('SAVINGS','INVESTMENT','CDI') AND is_active = true
total      = SUM(accounts.balance) WHERE type != 'FOOD_CARD' AND is_active = true
```

- Saldos são **atualizados manualmente** via `updateBalance()` — não são calculados automaticamente a partir de transações
- `FOOD_CARD` não entra no patrimônio (é tratado como benefício de renda)

### 3.3 Capital Aprisionado (Parcelas)
**Calculado em:** `hooks/useInstallments.ts` → `totalCommitted`

```
por plano:
  remaining_installments = total_installments - current_installment
  committed_value        = remaining_installments × installment_amount

totalCommitted = SUM(committed_value) de todos os planos ativos
```

- Mostrado no Dashboard como "Aprisionado" — valor do patrimônio já comprometido com parcelas futuras

### 3.4 Custo de Vida
**Calculado em:** `hooks/useCostOfLiving.ts`

```
fixedTotal    = SUM(fixed_costs.amount) WHERE type='FIXED' AND is_active=true

avgCard = média mensal de SUM(ABS(transactions.amount)) WHERE type='EXPENSE' por mês no período
avgVA   = média mensal de SUM(income_entries.amount) WHERE category='FOOD_CARD' por mês no período

variableTotal = SUM(fixed_costs.amount WHERE type='VARIABLE') + avgCard + avgVA
totalMonthly  = fixedTotal + variableTotal
dailyAverage  = totalMonthly / 30

fixedPercent    = fixedTotal / totalMonthly × 100
variablePercent = variableTotal / totalMonthly × 100
```

- Modo `average`: usa 3/6/12 meses para todos os cálculos
- Modo `month`: card mostra 1 mês específico, chart mostra 12 meses

### 3.5 Orçamento vs Realizado
**Calculado em:** `hooks/useBudgets.ts`

```
por categoria:
  spent     = SUM(ABS(transactions.amount)) WHERE category_id = X AND competence_month = month AND type='EXPENSE'
  percent   = spent / amount_limit × 100
  remaining = amount_limit - spent
  status    = percent >= 100 → 'exceeded' | percent >= 80 → 'warning' | else → 'ok'
```

### 3.6 Fixo vs Variável (Dashboard)
**Calculado em:** `DashboardClient.tsx` → `fetchData()`

```
fixedTotal    = SUM(ABS(transactions.amount)) WHERE is_fixed=true AND type='EXPENSE' AND competence_month=month
variableTotal = totalExpenses - fixedTotal
```

- `is_fixed` é setado durante a importação por `lib/classifier.ts` → `checkIsFixed()` usando palavras-chave (aluguel, internet, netflix, etc.)
- Diferente do `useCostOfLiving` que usa a tabela `fixed_costs` — são dois sistemas paralelos

---

## 4. Mapa de Dependências — "Se mudar X, o que quebra?"

### Se mudar `transactions`
| O que muda | Impacto |
|-----------|---------|
| Adicionar/remover campo | `useTransactions.ts` (select), `DashboardClient.tsx` (queries diretas), `useBudgets.ts` (select), `useCostOfLiving.ts` (select), `analytics/page.tsx` |
| Mudar `competence_month` | Toda aggregação por mês para de funcionar em todos os módulos |
| Mudar `transaction_type` enum | `useTransactions.ts`, `DashboardClient.tsx`, `useBudgets.ts`, `useCostOfLiving.ts`, `credit-card/page.tsx` |
| Mudar `is_fixed` | Dashboard "Fixo vs Variável" — não afeta `useCostOfLiving` (usa `fixed_costs`) |
| Mudar `deleted_at` (soft delete) | Todos os selects usam `.is('deleted_at', null)` — remover esse campo exporia transações deletadas |

### Se mudar `accounts`
| O que muda | Impacto |
|-----------|---------|
| Mudar tipos de conta | `useAccounts.ts` → `summary` (fórmula de `disponivel`/`investido`/`total`) e `DashboardClient.tsx` |
| Remover `is_active` | `useAccounts.ts` buscaria contas desativadas |
| Mudar `balance` | Patrimônio muda imediatamente (não é calculado, é manual) |

### Se mudar `income_entries`
| O que muda | Impacto |
|-----------|---------|
| Adicionar campo | `useIncome.ts`, `DashboardClient.tsx` (queries diretas) |
| Mudar categoria `FOOD_CARD` | `useCostOfLiving.ts` (filtra por `category='FOOD_CARD'`), `DashboardClient.tsx` (`vaIncome`) |
| Mudar `competence_month` | Toda aggregação de renda por mês |

### Se mudar `fixed_costs`
| O que muda | Impacto |
|-----------|---------|
| Adicionar campo | `useFixedCosts.ts`, `useCostOfLiving.ts` (selects independentes) |
| Mudar `type` enum (FIXED/VARIABLE) | `useCostOfLiving.ts` → `fixedTotal` e `variableTotal`, `useFixedCosts.ts` |
| Remover `is_active` | Itens deletados apareceriam no custo de vida |

### Se mudar `installment_plans`
| O que muda | Impacto |
|-----------|---------|
| Mudar `current_installment` | `remaining_installments`, `committed_value`, `percent_paid`, projeção mensal |
| Mudar `start_date` | `getMonthlyProjection()` usa isso para estimar datas futuras |
| Mudar `is_active` | Planos inativos somem de `totalCommitted` e do dashboard |

### Se mudar `budgets`
| O que muda | Impacto |
|-----------|---------|
| Mudar unique constraint `(household_id, category_id, month)` | `upsertBudget()` usa esse índice como `onConflict` |
| Remover `amount_limit` | `percent`, `remaining`, `status` quebram |

### Se mudar `wish_categories` / `wish_items`
| O que muda | Impacto |
|-----------|---------|
| Mudar `status` enum | `useWishlist.ts` → `moveItem()`, `MOVE_MAP` em `WishCard.tsx`, `WishItemModal.tsx` |
| Remover bucket `wish-images` | `uploadImage()` em `useWishlist.ts` quebra |

### Se mudar `household_members`
| O que muda | Impacto |
|-----------|---------|
| Remover `display_name` | `useTransactions.ts`, `useIncome.ts`, `DashboardClient.tsx` — todos resolvem nome do membro |
| Remover `user_id` | Resolução de `imported_by` → nome quebra em transações |

---

## 5. Fluxo de Dados — Resumo Financeiro Principal

```
Supabase
  ├── transactions (competence_month=X, deleted_at=null)
  │     ├── EXPENSE → totalExpenses, fixedTotal, variableTotal, byCategory, byMember
  │     └── (todos) → useBudgets: spent por category_id
  │
  ├── income_entries (competence_month=X)
  │     ├── ALL → totalIncome
  │     └── FOOD_CARD → vaIncome, avgVA (custo de vida)
  │
  ├── accounts (is_active=true)
  │     └── balance por tipo → disponivel, investido, total
  │
  ├── installment_plans (is_active=true)
  │     └── remaining × amount → totalCommitted (aprisionado)
  │
  ├── fixed_costs (is_active=true)
  │     ├── FIXED → fixedTotal (custo de vida)
  │     └── VARIABLE → variableManualTotal (custo de vida)
  │
  └── transactions (múltiplos meses, EXPENSE)
        └── média por mês → avgCard (custo de vida)

        ↓ DashboardClient.tsx monta:

  PATRIMÔNIO:    disponivel | investido | total | aprisionado
  MÊS:           totalIncome | totalExpenses | saldo
  ORÇAMENTO:     spent/limit/percent por categoria
  CUSTO DE VIDA: fixedTotal + variableTotal = totalMonthly
  FIXO/VARIÁVEL: fixedTotal/totalExpenses% | variableTotal/totalExpenses%
```

---

## 6. Tabelas Supabase — Referência Rápida

| Tabela | Chave de filtro | Soft delete | Usado em |
|--------|----------------|-------------|---------|
| `transactions` | `household_id`, `competence_month` | `deleted_at` | Dashboard, Transações, Orçamento, Custo de Vida, Cartão, Analítico |
| `accounts` | `household_id`, `is_active` | `is_active=false` | Patrimônio, Rendas |
| `income_entries` | `household_id`, `competence_month` | — (hard delete) | Dashboard, Rendas, Custo de Vida |
| `budgets` | `household_id`, `month` | — (hard delete) | Orçamento, Dashboard |
| `installment_plans` | `household_id`, `is_active` | `is_active=false` | Parcelas, Dashboard |
| `installment_payments` | `plan_id`, `household_id` | — | Parcelas |
| `fixed_costs` | `household_id`, `is_active` | `is_active=false` | Custo de Vida |
| `debts` | `household_id` | — | Dívidas |
| `debt_payments` | `debt_id`, `household_id` | — | Dívidas |
| `savings_goals` | `household_id` | — (hard delete) | Metas |
| `categories` | — (global) | — | Transações, Orçamento, Importação |
| `category_rules` | — (global) | — | Importação (classifier) |
| `household_members` | `household_id` | `deleted_at` | Dashboard, Transações, Rendas |
| `import_batches` | `household_id` | — | Importação |
| `grocery_sessions` | `household_id` | — (hard delete) | Mercado |
| `grocery_items` | `session_id` | CASCADE | Mercado |
| `grocery_products` | `household_id` | `is_active=false` | Mercado |
| `wish_categories` | `household_id` | — | Lista de Desejos |
| `wish_items` | `household_id` | — | Lista de Desejos |

---

## 7. Padrões Críticos a Preservar

- **`competence_month`** é sempre `"YYYY-MM"` string — nunca usar `date` para aggregação por mês
- **`deleted_at`** em `transactions` — todos os selects DEVEM ter `.is('deleted_at', null)`
- **`household_id`** em todas as queries — nunca omitir
- **Saldo de contas é manual** — não é derivado das transações; atualizado via `updateBalance()`
- **`is_fixed`** em transações vem do `classifier.ts` na importação — não tem UI de edição direta
- **`FOOD_CARD` de income_entries** aparece em dois lugares: `vaIncome` no dashboard E `avgVA` no custo de vida — a mesma renda conta nos dois
- **`fixed_costs` e `is_fixed` em transactions** são sistemas paralelos e independentes — `useCostOfLiving` usa `fixed_costs`, o dashboard usa `transactions.is_fixed`
