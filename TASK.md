# Spec: Importação de Extrato de Conta Corrente

**Feature:** `bank-statement-import`  
**Prioridade:** Alto  
**Depende de:** Módulo de Transações (existente), Módulo de Contas (existente)

---

## Visão Geral

Importador de extratos de conta corrente (PDF do Itaú, extensível a outros bancos) que converte lançamentos bancários em transações do sistema, evitando duplicatas com o CSV do cartão Nubank e identificando automaticamente o tipo de cada lançamento.

---

## Problema Central: Deduplicação

O extrato de conta corrente contém **todos os movimentos da conta**, incluindo o pagamento da fatura do cartão de crédito (`PAG BOLETO NU PAGAMENTOS SA`). Como cada compra do cartão já entra pelo CSV do Nubank, o pagamento da fatura **não deve ser importado** — caso contrário, cada gasto seria contado duas vezes.

**Regra de ouro:** Pagamento de fatura de cartão = ignorar sempre, automaticamente.

---

## Alterações no Banco de Dados

### Tabela `transactions` — 2 campos novos

```sql
ALTER TABLE transactions
  ADD COLUMN source TEXT NOT NULL DEFAULT 'MANUAL'
    CHECK (source IN ('NUBANK_CSV', 'BANK_STATEMENT', 'MANUAL')),
  ADD COLUMN pix_recipient TEXT;
```

- `source`: rastreia a origem de cada transação
- `pix_recipient`: nome extraído do lançamento (ex: `"JOSMARY"`, `"TIM S A"`)

**Nenhuma tabela nova necessária.** Tudo integra ao fluxo existente de transações.

### Migration

```sql
-- Marcar importações existentes como NUBANK_CSV
UPDATE transactions
SET source = 'NUBANK_CSV'
WHERE import_batch_id IS NOT NULL;
```

---

## Novos Arquivos

```
src/
  lib/
    itau-parser.ts          ← parser do PDF do Itaú
    statement-classifier.ts ← classifica tipo de lançamento
  components/
    import/
      StatementUpload.tsx   ← UI de upload do extrato
      StatementPreview.tsx  ← preview com tipos e filtros
  hooks/
    useStatementImport.ts   ← orquestra o fluxo de importação
  app/dashboard/import/
    statement/
      page.tsx              ← página de importação do extrato
```

---

## `src/lib/itau-parser.ts`

Parser do formato exato do extrato Itaú (PDF gerado via `pdftotext -layout`).

### Formato real do arquivo (observado no extrato)

```
04/05/2026 PIX TRANSF DAIANE 02/05                    -125,00
04/05/2026 PAG BOLETO BOTICARIO PRODUTOS DE BELEZA    -197,73
02/05/2026 SALDO DO DIA                                         3.431,50
07/04/2026 PAGTO SALARIO                             3.211,30
```

**Padrão:** `DD/MM/YYYY DESCRIÇÃO ... VALOR` — valor pode ter `.` de milhar e `,` decimal. Saldo do dia aparece na segunda coluna (mais à direita). Lançamentos sem saldo têm valor na primeira coluna.

### Tipos de lançamento identificados

| Prefixo no extrato | Tipo interno | `transaction_type` | Ação |
|---|---|---|---|
| `PIX TRANSF` (valor negativo) | `PIX_SENT` | `EXPENSE` | Importar |
| `PIX TRANSF` (valor positivo) | `PIX_RECEIVED` | `INCOME` | Importar |
| `PIX QRS` (valor negativo) | `PIX_QR_EXPENSE` | `EXPENSE` | Importar |
| `PIX QRS` (valor positivo) | `PIX_QR_INCOME` | `INCOME` | Importar |
| `PAG BOLETO` | `BOLETO` | `EXPENSE` | Importar (exceto fatura cartão) |
| `PAG BOLETO NU PAGAMENTOS` | `CARD_PAYMENT` | — | **Ignorar automaticamente** |
| `PAGTO SALARIO` | `SALARY` | `INCOME` | Importar |
| `PAGTO FERIAS` | `SALARY` | `INCOME` | Importar |
| `SISDEB` | `DIRECT_DEBIT` | `EXPENSE` | Importar |
| `RSCSS` | `DEBIT_PURCHASE` | `EXPENSE` | Importar |
| `RSCCS` | `DEBIT_PURCHASE` | `EXPENSE` | Importar |
| `TBI` | `INTERNAL_TRANSFER` | — | **Ignorar automaticamente** |
| `SALDO DO DIA` | — | — | **Ignorar automaticamente** |

### Extração do `pix_recipient`

Para `PIX TRANSF` e `PIX QRS`, extrair o nome antes da data no final:

```
"PIX TRANSF JOSMARY13/04"  → recipient: "JOSMARY"
"PIX TRANSF Farmaci11/04"  → recipient: "Farmaci" (limpar depois)
"PIX QRS TIM S A07/04"     → recipient: "TIM S A"
"PIX TRANSF 475511012/04"  → recipient: null (é CPF/CNPJ, não nome)
```

Regex para remover o sufixo de data: `/\d{2}\/?\d{2}$/` no final da string.

### Interface do parser

```typescript
export interface ItauStatement {
  accountHolder: string      // "MARIA EDUARDA DALLE MOLLE"
  agency: string             // "2956"
  account: string            // "028371-3"
  periodStart: string        // "2026-01-01"
  periodEnd: string          // "2026-06-30"
  entries: ItauEntry[]
}

export interface ItauEntry {
  date: string               // "2026-04-13" (ISO)
  rawDescription: string     // "PIX TRANSF JOSMARY13/04" (original)
  cleanDescription: string   // "Pix - JOSMARY" (legível)
  entryType: ItauEntryType   // enum dos tipos acima
  amount: number             // positivo = entrada, negativo = saída
  pixRecipient: string | null
  shouldIgnore: boolean      // true para CARD_PAYMENT, INTERNAL_TRANSFER, SALDO_DIA
  ignoreReason: string | null // "Pagamento de fatura do cartão" etc.
}

export type ItauEntryType =
  | 'PIX_SENT' | 'PIX_RECEIVED'
  | 'PIX_QR_EXPENSE' | 'PIX_QR_INCOME'
  | 'BOLETO' | 'CARD_PAYMENT'
  | 'SALARY' | 'DIRECT_DEBIT'
  | 'DEBIT_PURCHASE' | 'INTERNAL_TRANSFER'
  | 'UNKNOWN'

export function parseItauPDF(pdfText: string): ItauStatement
```

---

## `src/lib/statement-classifier.ts`

Reutiliza o classificador de categorias existente (`lib/classifier.ts`) com mapeamentos adicionais para tipos de lançamento bancário.

```typescript
// Mapeamentos fixos por tipo — sem precisar de category_rules
const TYPE_TO_CATEGORY: Partial<Record<ItauEntryType, string>> = {
  SALARY:        'Renda',      // vai para income_entries, não transactions
  PIX_RECEIVED:  'Renda',
  DIRECT_DEBIT:  'Moradia',   // SISDEB frequentemente é seguro/utilidade
  DEBIT_PURCHASE: null,       // classificar pelo nome igual CSV
}

// Para BOLETO: extrair nome do estabelecimento e cruzar com category_rules
// "PAG BOLETO COPEL-DIS" → "COPEL" → Energia → categoria Utilidades
// "PAG BOLETO IRED INTERNET LTDA" → "IRED" → Internet → categoria Moradia
```

### Lógica de classificação por tipo

- **`SALARY` / `PAGTO_FERIAS`**: não vira `transaction` — vira `income_entry` automaticamente
- **`PIX_RECEIVED`** (positivo): vira `income_entry` com categoria `PIX Recebido`
- **`PIX_SENT`** / **`PIX_QR_EXPENSE`**: vira `transaction` EXPENSE, classifica pelo nome do destinatário
- **`BOLETO`**: vira `transaction` EXPENSE, classifica pelo nome do estabelecimento
- **`DIRECT_DEBIT`**: vira `transaction` EXPENSE, classifica pelo nome
- **`DEBIT_PURCHASE`**: vira `transaction` EXPENSE, classifica pelo nome (igual CSV Nubank)

---

## `src/hooks/useStatementImport.ts`

Orquestra o fluxo reutilizando os estados já existentes em `useImport.ts`.

### Estados do fluxo

```
idle → uploading → parsing → classifying → preview → saving → done
```

Idêntico ao `useImport`, com uma etapa extra de **filtro** no preview.

### Interface

```typescript
interface UseStatementImportReturn {
  state: ImportState
  statement: ItauStatement | null
  entries: StatementPreviewEntry[]   // entries com classificação aplicada
  ignoredCount: number               // total de lançamentos ignorados
  upload: (file: File) => Promise<void>
  toggleEntry: (index: number) => void  // marcar/desmarcar no preview
  updateCategory: (index: number, categoryId: string) => void
  confirm: () => Promise<void>
  reset: () => void
}
```

### Extração do PDF — Restrição Crítica de Ambiente

**`pdftotext` não pode ser usado.** É um binário do sistema operacional (pacote `poppler-utils`) que não existe no ambiente serverless da Vercel. Tentar executá-lo via `child_process` compila localmente mas falha silenciosamente no deploy.

**Solução: `pdf-parse`** — lib JavaScript pura, sem dependência de binários do sistema, compatível com Node.js serverless da Vercel.

```bash
npm install pdf-parse
npm install -D @types/pdf-parse
```

A extração acontece em uma **Next.js API Route** (não Server Action — o tamanho do PDF pode exceder o limite de payload de Server Actions):

```typescript
// src/app/api/parse-statement/route.ts
import { NextRequest, NextResponse } from 'next/server'
import pdfParse from 'pdf-parse'

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const file = formData.get('pdf') as File

  if (!file || file.type !== 'application/pdf') {
    return NextResponse.json({ error: 'PDF inválido' }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const { text } = await pdfParse(buffer)

  return NextResponse.json({ text })
}
```

O hook `useStatementImport` chama essa route, recebe o texto extraído e passa para `parseItauPDF(text)` — que roda inteiramente no cliente.

**Atenção ao formato do texto extraído por `pdf-parse`:** o layout espacial (colunas alinhadas por espaços) é preservado de forma diferente de `pdftotext -layout`. O parser `itau-parser.ts` deve ser desenvolvido e testado com o output real de `pdf-parse`, não de `pdftotext`. Testar com o arquivo `itau_extrato_012026.pdf` antes de generalizar o regex.

---

## UI: `src/components/import/StatementPreview.tsx`

### Layout da tabela de preview

| Col | Conteúdo |
|-----|----------|
| Checkbox | Marcar/desmarcar para importar |
| Data | DD/MM/YYYY |
| Tipo | Badge colorido (`Pix`, `Boleto`, `Débito`, `Salário`) |
| Descrição | `cleanDescription` + destinatário se Pix |
| Categoria | Dropdown editável (igual ao preview do CSV) |
| Valor | Verde (entrada) / Vermelho (saída) |
| Status | Badge `Ignorado` para CARD_PAYMENT / INTERNAL_TRANSFER |

### Lançamentos ignorados

Aparecem com linha levemente opaca + badge `Ignorado` e tooltip explicando o motivo. O usuário **não pode** ativar lançamentos do tipo `CARD_PAYMENT` (proteção contra duplicata).

### Resumo antes de confirmar

```
✓ 23 lançamentos para importar
  R$ 4.820,50 em despesas · R$ 3.211,30 em receitas

⊘ 2 lançamentos ignorados automaticamente
  Pagamento de fatura do cartão · Transferência interna
```

---

## `src/app/dashboard/import/statement/page.tsx`

Página dedicada, separada de `/dashboard/import` (que é o CSV do Nubank).

### Estrutura da página

```
1. Seleção de conta          ← qual conta corrente está sendo importada
2. Upload do PDF             ← drag & drop ou seleção de arquivo
3. Preview com filtros       ← tabela com todos os lançamentos
4. Confirmação               ← salva em batch no Supabase
```

### Navegação

Adicionar na sidebar em "Importar" um submenu:
- **Cartão Nubank** → `/dashboard/import` (existente)
- **Extrato Conta** → `/dashboard/import/statement` (novo)

---

## Integração com Tabelas Existentes

### `transactions` (despesas e Pix enviados)

```typescript
{
  household_id,
  account_id,           // conta selecionada no início do import
  date,                 // da entrada do extrato
  competence_month,     // derivado da data (YYYY-MM)
  description,          // cleanDescription
  raw_title,            // rawDescription original
  amount,               // absoluto (positivo)
  transaction_type: 'EXPENSE',
  status: 'PAID',
  category_id,          // classificado automaticamente
  source: 'BANK_STATEMENT',           // campo novo
  pix_recipient,                      // campo novo
  imported_by,          // user_id de quem fez o upload
  import_batch_id,      // batch criado para este extrato
}
```

### `income_entries` (salários e Pix recebidos)

Lançamentos `SALARY`, `PAGTO_FERIAS` e `PIX_RECEIVED` positivos viram `income_entry`:

```typescript
{
  household_id,
  account_id,
  amount,
  description,          // "Salário" / "Férias" / "Pix recebido - VITORIA"
  category: 'SALARY' | 'OTHER',
  date,
  competence_month,
  user_id,              // membro da conta selecionada
}
```

---

## Tratamento de Edge Cases

| Caso | Comportamento |
|---|---|
| `PAG BOLETO NU PAGAMENTOS SA` | Ignorado automaticamente, não pode ser ativado |
| `TBI` (transferência interna) | Ignorado automaticamente |
| `SALDO DO DIA` | Ignorado, não aparece no preview |
| Pix com valor positivo (recebido) | Vai para `income_entries`, não `transactions` |
| Destinatário é CPF/CNPJ (`475511012/04`) | `pix_recipient = null`, descrição fica o número |
| Mesmo lançamento importado duas vezes | Detectar por `date + amount + raw_title + account_id`, alertar no preview |
| PDF de outro banco (não Itaú) | Mostrar erro: "Formato não reconhecido. Suportado: Itaú" |
| PDF protegido por senha | Mostrar erro amigável |

### Deduplicação por reimportação

Antes de salvar, checar no Supabase:

```typescript
const { data: existing } = await supabase
  .from('transactions')
  .select('id')
  .eq('household_id', householdId)
  .eq('account_id', accountId)
  .eq('date', entry.date)
  .eq('amount', entry.amount)
  .eq('raw_title', entry.rawDescription)
  .eq('source', 'BANK_STATEMENT')
```

Se encontrar: marcar como `duplicate: true` no preview, desmarcar por padrão.

---

## Extensibilidade Futura

O parser do Itaú é a implementação concreta de uma interface genérica:

```typescript
// lib/bank-parsers/types.ts
export interface BankStatementParser {
  bank: string
  parse(text: string): BankStatement
}

// lib/bank-parsers/itau.ts  ← implementação atual
// lib/bank-parsers/nubank-account.ts  ← futuro (extrato conta Nubank)
// lib/bank-parsers/bradesco.ts  ← futuro
```

Quando adicionar Nubank conta corrente: criar `nubank-account.ts` com os mesmos tipos de retorno. O hook `useStatementImport` e o preview funcionam sem alteração.

---

## Resumo das Alterações

| Arquivo | Tipo | Descrição |
|---|---|---|
| `supabase/migrations/add_statement_fields.sql` | SQL | `source` e `pix_recipient` em `transactions` |
| `src/lib/itau-parser.ts` | Novo | Parser do PDF do Itaú |
| `src/lib/statement-classifier.ts` | Novo | Classificação de tipos bancários |
| `src/hooks/useStatementImport.ts` | Novo | Orquestração do fluxo |
| `src/components/import/StatementUpload.tsx` | Novo | UI de upload |
| `src/components/import/StatementPreview.tsx` | Novo | Preview com filtros |
| `src/app/dashboard/import/statement/page.tsx` | Novo | Página do importador |
| `src/app/api/parse-statement/route.ts` | Novo | API Route para extração do PDF via `pdf-parse` (não usar `pdftotext` — incompatível com Vercel) |
| `src/components/layout/Sidebar.tsx` | Editar | Submenu em "Importar" |
| `src/hooks/useImport.ts` | Editar | Adicionar `source: 'NUBANK_CSV'` ao salvar |