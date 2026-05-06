# Finança Casa — Como a Lógica Financeira Funciona

Este documento explica como o app calcula cada número que aparece na tela. Escrito para quem entende de finanças mas não precisa saber de código.

---

## 1. Como o dinheiro entra no sistema

Existem dois jeitos de registrar renda:

**Pela tela de Rendas:**
Você entra manualmente cada recebimento do mês — salário, freelance, rendimento de investimento, aluguel recebido, vale alimentação ou qualquer outro. Cada lançamento tem um mês de competência (não necessariamente o dia em que caiu na conta), e é isso que define em qual mês ele vai aparecer nos cálculos.

Por exemplo: se você recebe o salário de abril no dia 5 de abril, registra como competência abril. Se cair no dia 30 de março mas for referente a abril, o correto é registrar como abril mesmo.

**Pela importação do CSV do Nubank:**
Quando você importa o extrato, o sistema detecta automaticamente os lançamentos negativos (dinheiro que entrou) e os registra como renda. Isso acontece porque no extrato do Nubank, valores negativos significam crédito na fatura — ou seja, estorno ou pagamento de fatura que gerou saldo.

---

## 2. Como os gastos são registrados

**Pela importação do CSV:**
Este é o jeito principal. Você baixa o CSV da fatura do Nubank e importa no app. O sistema faz o seguinte automaticamente:

1. Lê cada linha do arquivo e converte para o formato do app
2. Limpa o nome do estabelecimento — remove códigos, sufixos de rastreamento e palavras desnecessárias. Por exemplo, "UBER *UBER TRIP HELP.U" vira "Uber"
3. Tenta classificar a categoria automaticamente usando palavras-chave. Se o nome contém "Mercado" ou "Supermercado", categoriza como alimentação. Se contém "Netflix" ou "Spotify", marca como fixo e categoriza como assinatura
4. Detecta se é uma parcela. Se o nome termina com "Parcela 2/6", o sistema identifica que é a segunda de seis parcelas e cria ou avança o plano de parcelamento correspondente
5. Você vê uma prévia antes de confirmar. Pode ajustar categorias e depois salvar tudo

**Manualmente:**
Também é possível adicionar transações uma a uma pela tela de Transações, mas não é o fluxo principal.

**O campo "mês de competência":**
Todo gasto tem dois campos de data: a data da transação (quando aconteceu) e o mês de competência (em qual mês ele deve ser contado). Na importação do Nubank, o sistema usa a data da transação para definir o mês de competência automaticamente. Isso é importante porque define onde o gasto vai aparecer — no saldo, no orçamento e no custo de vida.

---

## 3. Como o saldo do mês é calculado

O saldo do mês é simples:

> **Saldo = Total de Rendas − Total de Gastos**

Exemplo: em março você registrou R$ 8.000 de salário e R$ 6.200 em gastos no cartão. O saldo de março é **+R$ 1.800**.

Se os gastos forem maiores que as rendas, o saldo aparece negativo — significa que você gastou mais do que entrou naquele mês.

**O que entra no "Total de Gastos":**
Apenas transações do tipo Despesa, do mês de competência selecionado, que não foram excluídas. Transações marcadas como excluídas continuam salvas no banco mas não são contadas em nada.

**O que entra no "Total de Rendas":**
Todos os lançamentos registrados na tela de Rendas para aquele mês de competência. O vale alimentação entra aqui também.

**Por que um gasto pode aparecer no mês errado:**
Se a data da transação é 31 de março mas o mês de competência foi definido como abril (seja na importação ou manualmente), esse gasto vai aparecer no saldo de abril, não de março. O app usa sempre o mês de competência, nunca a data da transação, para os cálculos.

---

## 4. Como o patrimônio é calculado

O patrimônio é dividido em três números:

**Disponível**
Soma dos saldos de todas as contas correntes. Exemplo: você tem R$ 3.200 na conta do Bradesco e R$ 1.800 na conta do Nubank — o disponível é R$ 5.000.

**Investido**
Soma dos saldos de poupanças, investimentos e CDBs/CDIs. Exemplo: R$ 15.000 na poupança + R$ 22.000 num CDB = R$ 37.000 investido.

**Total**
Soma de tudo — disponível + investido. O vale alimentação não entra no total porque é tratado como benefício de consumo, não como patrimônio.

**Atenção importante:** os saldos das contas são atualizados manualmente. O app não deduz automaticamente os gastos das contas nem some automaticamente as rendas. Você precisa entrar na tela de Patrimônio e atualizar o saldo quando ele mudar. O sistema de transações e o sistema de saldo de contas são independentes.

---

## 5. O que é rendimento aprisionado

O card "Aprisionado" no dashboard mostra quanto do seu patrimônio já está comprometido com parcelas futuras que ainda não foram pagas.

Exemplo: você comprou uma TV em 6x de R$ 500. Você já pagou 2 parcelas. Restam 4 parcelas × R$ 500 = R$ 2.000 aprisionados. Esse valor está no seu patrimônio hoje, mas já foi "prometido" para ser gasto nos próximos meses.

**Como o sistema detecta:**
Quando você importa um CSV com uma compra parcelada (ex: "iPhone — Parcela 1/12 — R$ 600"), o app cria um plano de parcelamento automaticamente e registra que está na parcela 1 de 12. A cada nova importação que trouxer a parcela seguinte, o sistema avança o contador.

**Como o sistema projeta:**
O app estima em quais meses futuros cada parcela vai cair, baseado na data de início e no número de parcelas restantes, e mostra um gráfico dos próximos 6 meses com o total comprometido em cada um.

---

## 6. Como o orçamento funciona

Você define um limite de gasto por categoria para cada mês. Exemplo: R$ 800 para Alimentação em maio.

O app então soma todos os gastos daquele mês que foram classificados como Alimentação e compara com o limite:

- **Verde (ok):** gastou menos de 80% do limite — ex: R$ 560 de R$ 800
- **Amarelo (atenção):** gastou entre 80% e 100% — ex: R$ 720 de R$ 800
- **Vermelho (estourou):** gastou mais de 100% — ex: R$ 950 de R$ 800

O dashboard mostra um resumo das categorias com alertas. Se quiser ver o detalhamento completo, acesse a tela de Orçamento.

Você pode copiar o orçamento do mês anterior para não precisar definir tudo de novo toda vez.

**O orçamento usa o mês de competência** — assim como o saldo. Se um gasto de alimentação foi importado com competência em maio, ele entra no orçamento de maio, não de abril.

---

## 7. O que muda se eu alterar algo

**Se eu mover uma transação de março para abril (mudar o mês de competência):**
- O saldo de março melhora (fica um gasto a menos)
- O saldo de abril piora (ganha um gasto)
- O orçamento de março melhora na categoria desse gasto
- O orçamento de abril piora nessa mesma categoria
- O custo de vida pode mudar nos dois meses se usar o modo de mês específico

**Se eu excluir uma transação:**
- Ela some do saldo do mês
- Some do orçamento da categoria
- Some do "Gastos por Categoria" e do "Eu vs Esposa" no dashboard
- Ela não é apagada de verdade — fica salva com marca de excluída e pode ser restaurada

**Se eu mudar o saldo de uma conta:**
- O patrimônio (disponível, investido, total) muda imediatamente
- O saldo do mês **não** muda — são cálculos independentes

**Se eu registrar uma renda:**
- O total de receitas do mês aumenta
- O saldo do mês melhora
- Se for vale alimentação, também entra no cálculo de custo de vida como custo variável

**Se eu mudar a categoria de uma transação:**
- O orçamento da categoria antiga diminui
- O orçamento da nova categoria aumenta
- O gráfico de "Gastos por Categoria" no dashboard muda

**Se eu adicionar ou remover um custo fixo na tela de Custo de Vida:**
- O custo de vida total muda
- O card "Custo de Vida" no dashboard muda
- O saldo do mês **não** muda — custo fixo é uma estimativa separada das transações reais

**Se eu avançar uma parcela manualmente:**
- O capital aprisionado diminui (menos parcelas restantes)
- A projeção dos próximos meses é recalculada

---

## 8. Pontos de atenção

**O saldo de contas e o saldo do mês são independentes.**
O app não deduz os gastos automaticamente das contas. Se você gastar R$ 2.000 no cartão em abril, o saldo do mês de abril cai R$ 2.000, mas o saldo das contas não muda sozinho. Você precisa atualizar manualmente quando pagar a fatura.

**Existem dois sistemas de "fixo" que não se conversam.**
No dashboard, "Fixo vs Variável" usa o campo interno de cada transação (marcado automaticamente na importação com base em palavras-chave como "aluguel", "netflix", "internet"). Na tela de Custo de Vida, os custos fixos são os que você cadastrou manualmente na lista de custos fixos. São fontes diferentes e podem apresentar números diferentes.

**O vale alimentação conta duas vezes no custo de vida.**
Ele entra como renda (na tela de Rendas) e também é somado ao custo variável no cálculo de custo de vida — porque representa um gasto de alimentação que acontece todo mês, mesmo que não apareça no extrato do cartão.

**O custo de vida não é o mesmo que o total de gastos do mês.**
O custo de vida é uma estimativa estrutural — combina custos fixos cadastrados manualmente com a média dos gastos no cartão nos últimos meses. O total de gastos do mês usa as transações reais daquele mês específico.

**Parcelas detectadas automaticamente podem precisar de revisão.**
Se o mesmo plano de parcelamento aparecer em dois formatos diferentes no CSV (ex: nome ligeiramente diferente em meses distintos), o sistema pode criar dois planos separados em vez de avançar o mesmo. Nesses casos ele marca o plano para revisão e você decide manualmente qual é o correto.

**Metas e lista de desejos não afetam nenhum cálculo financeiro.**
São módulos de acompanhamento separados. Registrar progresso numa meta ou mover um item da lista de desejos para "comprado" não altera saldo, patrimônio, orçamento ou custo de vida.
