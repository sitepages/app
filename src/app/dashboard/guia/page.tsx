'use client'
import { useState } from 'react'
import {
  BookOpen, TrendingUp, CreditCard, Calendar, Wallet,
  Lock, Target, AlertTriangle, ChevronDown, ChevronUp,
} from 'lucide-react'

const SECTIONS = [
  {
    id: 'renda',
    icon: TrendingUp,
    color: '#00C47A',
    title: 'Como o dinheiro entra no sistema',
    content: [
      {
        subtitle: 'Pela tela de Rendas',
        text: 'Você registra manualmente cada recebimento do mês — salário, freelance, rendimento de investimento, aluguel recebido, vale alimentação ou qualquer outro. Cada lançamento tem um mês de competência (não necessariamente o dia em que caiu na conta), e é isso que define em qual mês ele vai aparecer nos cálculos.',
      },
      {
        subtitle: 'Exemplo prático',
        highlight: true,
        text: 'Se você recebe o salário de abril no dia 5 de abril, registra como competência abril. Se cair no dia 30 de março mas for referente a abril, o correto é registrar como abril mesmo.',
      },
      {
        subtitle: 'Pela importação do CSV do Nubank',
        text: 'Quando você importa o extrato, o sistema detecta automaticamente os lançamentos negativos (dinheiro que entrou) e os registra como renda. Isso acontece porque no extrato do Nubank, valores negativos significam crédito na fatura — ou seja, estorno ou pagamento que gerou saldo.',
      },
    ],
  },
  {
    id: 'gastos',
    icon: CreditCard,
    color: '#F87171',
    title: 'Como os gastos são registrados',
    content: [
      {
        subtitle: 'Pela importação do CSV (fluxo principal)',
        text: 'Você baixa o CSV da fatura do Nubank e importa no app. O sistema faz automaticamente: lê cada linha, limpa o nome do estabelecimento, classifica a categoria por palavras-chave, detecta parcelas e mostra uma prévia para você conferir antes de confirmar.',
      },
      {
        subtitle: 'Exemplo de limpeza de nome',
        highlight: true,
        text: '"UBER *UBER TRIP HELP.U" vira "Uber". "SUPERMERCADO EXTRA 0032 SAO PAULO" vira "Supermercado Extra".',
      },
      {
        subtitle: 'O campo "mês de competência"',
        text: 'Todo gasto tem dois campos: a data da transação (quando aconteceu) e o mês de competência (em qual mês ele deve ser contado). Na importação do Nubank, o sistema usa a data da transação para definir o mês de competência automaticamente. Isso é importante porque define onde o gasto vai aparecer — no saldo, no orçamento e no custo de vida.',
      },
    ],
  },
  {
    id: 'saldo',
    icon: Calendar,
    color: '#60A5FA',
    title: 'Como o saldo do mês é calculado',
    content: [
      {
        subtitle: 'A fórmula',
        highlight: true,
        text: 'Saldo = Total de Rendas − Total de Gastos\n\nExemplo: em março você registrou R$ 8.000 de salário e R$ 6.200 em gastos no cartão. O saldo de março é +R$ 1.800.',
      },
      {
        subtitle: 'O que entra nos gastos',
        text: 'Apenas transações do tipo Despesa, do mês de competência selecionado, que não foram excluídas. Transações excluídas continuam salvas no banco mas não são contadas em nada.',
      },
      {
        subtitle: 'Por que um gasto pode aparecer no mês errado',
        text: 'Se a data da transação é 31 de março mas o mês de competência foi definido como abril (seja na importação ou manualmente), esse gasto vai aparecer no saldo de abril, não de março. O app usa sempre o mês de competência, nunca a data da transação, para os cálculos.',
      },
    ],
  },
  {
    id: 'patrimonio',
    icon: Wallet,
    color: '#F59E0B',
    title: 'Como o patrimônio é calculado',
    content: [
      {
        subtitle: 'Disponível',
        text: 'Soma dos saldos de todas as contas correntes. Exemplo: R$ 3.200 na conta do Bradesco + R$ 1.800 na conta do Nubank = R$ 5.000 disponível.',
      },
      {
        subtitle: 'Investido',
        text: 'Soma dos saldos de poupanças, investimentos e CDBs/CDIs. Exemplo: R$ 15.000 na poupança + R$ 22.000 num CDB = R$ 37.000 investido.',
      },
      {
        subtitle: 'Total',
        text: 'Soma de tudo — disponível + investido. O vale alimentação não entra no total porque é tratado como benefício de consumo, não como patrimônio.',
      },
      {
        subtitle: 'Atenção importante',
        highlight: true,
        text: 'Os saldos das contas são atualizados manualmente. O app não deduz automaticamente os gastos das contas. Você precisa entrar em Patrimônio e atualizar o saldo quando ele mudar. O sistema de transações e o sistema de saldo de contas são independentes.',
      },
    ],
  },
  {
    id: 'aprisionado',
    icon: Lock,
    color: '#F87171',
    title: 'O que é rendimento aprisionado',
    content: [
      {
        subtitle: 'O que significa',
        text: 'O card "Aprisionado" mostra quanto do seu patrimônio já está comprometido com parcelas futuras que ainda não foram pagas.',
      },
      {
        subtitle: 'Exemplo',
        highlight: true,
        text: 'Você comprou uma TV em 6x de R$ 500. Já pagou 2 parcelas. Restam 4 × R$ 500 = R$ 2.000 aprisionados. Esse valor está no seu patrimônio hoje, mas já foi "prometido" para ser gasto nos próximos meses.',
      },
      {
        subtitle: 'Como o sistema detecta',
        text: 'Quando você importa um CSV com uma compra parcelada (ex: "iPhone — Parcela 1/12 — R$ 600"), o app cria um plano de parcelamento automaticamente e registra que está na parcela 1 de 12. A cada nova importação com a parcela seguinte, o sistema avança o contador.',
      },
      {
        subtitle: 'Como o sistema projeta',
        text: 'O app estima em quais meses futuros cada parcela vai cair, baseado na data de início e no número de parcelas restantes, e mostra um gráfico dos próximos 6 meses com o total comprometido em cada um.',
      },
    ],
  },
  {
    id: 'orcamento',
    icon: Target,
    color: '#8B5CF6',
    title: 'Como o orçamento funciona',
    content: [
      {
        subtitle: 'Definindo limites',
        text: 'Você define um limite de gasto por categoria para cada mês. Exemplo: R$ 800 para Alimentação em maio.',
      },
      {
        subtitle: 'Os três status',
        highlight: true,
        text: '🟢 Verde (ok): gastou menos de 80% do limite — ex: R$ 560 de R$ 800\n🟡 Amarelo (atenção): gastou entre 80% e 100% — ex: R$ 720 de R$ 800\n🔴 Vermelho (estourou): gastou mais de 100% — ex: R$ 950 de R$ 800',
      },
      {
        subtitle: 'Mês de competência',
        text: 'O orçamento usa o mês de competência — assim como o saldo. Se um gasto de alimentação foi importado com competência em maio, ele entra no orçamento de maio, não de abril. Você pode copiar o orçamento do mês anterior para não precisar definir tudo de novo toda vez.',
      },
    ],
  },
  {
    id: 'alteracoes',
    icon: Calendar,
    color: '#06B6D4',
    title: 'O que muda se eu alterar algo',
    content: [
      {
        subtitle: 'Se eu mover uma transação de março para abril',
        highlight: true,
        text: '→ O saldo de março melhora (um gasto a menos)\n→ O saldo de abril piora (ganha um gasto)\n→ O orçamento de março melhora na categoria\n→ O orçamento de abril piora nessa categoria',
      },
      {
        subtitle: 'Se eu excluir uma transação',
        text: 'Ela some do saldo do mês, do orçamento da categoria e dos gráficos do dashboard. Ela não é apagada de verdade — fica salva com marca de excluída e pode ser restaurada.',
      },
      {
        subtitle: 'Se eu mudar o saldo de uma conta',
        text: 'O patrimônio (disponível, investido, total) muda imediatamente. O saldo do mês não muda — são cálculos independentes.',
      },
      {
        subtitle: 'Se eu registrar uma renda',
        text: 'O total de receitas do mês aumenta e o saldo do mês melhora. Se for vale alimentação, também entra no custo de vida como custo variável.',
      },
      {
        subtitle: 'Se eu mudar a categoria de uma transação',
        text: 'O orçamento da categoria antiga diminui, o orçamento da nova aumenta, e o gráfico de "Gastos por Categoria" no dashboard é atualizado.',
      },
      {
        subtitle: 'Se eu adicionar um custo fixo na tela de Custo de Vida',
        text: 'O custo de vida total muda e o card no dashboard é atualizado. O saldo do mês não muda — custo fixo é uma estimativa separada das transações reais.',
      },
    ],
  },
  {
    id: 'atencao',
    icon: AlertTriangle,
    color: '#F59E0B',
    title: 'Pontos de atenção',
    content: [
      {
        subtitle: 'Saldo de contas e saldo do mês são independentes',
        highlight: true,
        text: 'O app não deduz os gastos automaticamente das contas. Se você gastar R$ 2.000 no cartão em abril, o saldo do mês de abril cai R$ 2.000, mas o saldo das contas não muda sozinho. Você precisa atualizar manualmente quando pagar a fatura.',
      },
      {
        subtitle: 'Existem dois sistemas de "fixo" que não se conversam',
        text: 'No dashboard, "Fixo vs Variável" usa o campo interno de cada transação (marcado automaticamente na importação com palavras-chave como "aluguel", "netflix"). Na tela de Custo de Vida, os custos fixos são os que você cadastrou manualmente. São fontes diferentes e podem apresentar números diferentes.',
      },
      {
        subtitle: 'O vale alimentação conta duas vezes no custo de vida',
        text: 'Ele entra como renda (na tela de Rendas) e também é somado ao custo variável no cálculo de custo de vida — porque representa um gasto de alimentação que acontece todo mês, mesmo que não apareça no extrato do cartão.',
      },
      {
        subtitle: 'Custo de vida ≠ total de gastos do mês',
        text: 'O custo de vida é uma estimativa estrutural — combina custos fixos cadastrados manualmente com a média dos gastos no cartão nos últimos meses. O total de gastos do mês usa as transações reais daquele mês específico.',
      },
      {
        subtitle: 'Parcelas podem precisar de revisão manual',
        text: 'Se o mesmo plano de parcelamento aparecer em dois formatos diferentes no CSV (ex: nome ligeiramente diferente em meses distintos), o sistema pode criar dois planos separados em vez de avançar o mesmo. Nesses casos ele marca para revisão e você decide manualmente.',
      },
      {
        subtitle: 'Metas e lista de desejos não afetam os cálculos',
        text: 'São módulos de acompanhamento separados. Registrar progresso numa meta ou mover um item da lista de desejos para "comprado" não altera saldo, patrimônio, orçamento ou custo de vida.',
      },
    ],
  },
]

export default function GuiaPage() {
  const [open, setOpen] = useState<string | null>(null)

  function toggle(id: string) {
    setOpen(prev => prev === id ? null : id)
  }

  return (
    <div className="p-4 md:p-7 max-w-[800px] mx-auto">

      {/* Header */}
      <div className="mb-6 animate-fade-up">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(0,196,122,0.12)', border: '1px solid rgba(0,196,122,0.2)' }}>
            <BookOpen size={16} style={{ color: 'var(--brand)' }} />
          </div>
          <h1 className="page-title">Guia Financeiro</h1>
        </div>
        <p className="page-subtitle">Como o app calcula cada número que aparece na tela</p>
      </div>

      {/* Sections */}
      <div className="space-y-3 animate-fade-up-1">
        {SECTIONS.map(section => {
          const isOpen = open === section.id
          const Icon = section.icon
          return (
            <div
              key={section.id}
              className="card"
              style={{
                overflow: 'hidden',
                borderColor: isOpen ? `${section.color}44` : undefined,
                transition: 'border-color 0.2s',
              }}
            >
              {/* Section header — always visible */}
              <button
                onClick={() => toggle(section.id)}
                className="w-full flex items-center justify-between gap-3"
                style={{
                  padding: '16px 20px',
                  background: 'none', border: 'none', cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: `${section.color}18`, color: section.color }}>
                    <Icon size={15} />
                  </div>
                  <span className="font-semibold text-sm" style={{ color: 'var(--text)' }}>
                    {section.title}
                  </span>
                </div>
                <div style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
                  {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
              </button>

              {/* Section content */}
              {isOpen && (
                <div style={{ borderTop: '1px solid var(--border)', padding: '20px 20px 20px' }}>
                  <div className="space-y-4">
                    {section.content.map((block, i) => (
                      <div key={i}>
                        <p className="text-xs font-semibold uppercase tracking-wider mb-1.5"
                          style={{ color: section.color }}>
                          {block.subtitle}
                        </p>
                        <div
                          style={{
                            background: block.highlight ? `${section.color}0d` : undefined,
                            border: block.highlight ? `1px solid ${section.color}22` : undefined,
                            borderRadius: block.highlight ? 8 : undefined,
                            padding: block.highlight ? '10px 14px' : undefined,
                          }}
                        >
                          {block.text.split('\n').map((line, j) => (
                            <p key={j} className="text-sm leading-relaxed"
                              style={{
                                color: block.highlight ? 'var(--text)' : 'var(--text-muted)',
                                marginBottom: j < block.text.split('\n').length - 1 ? 6 : 0,
                              }}>
                              {line}
                            </p>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <p className="text-center text-xs mt-8 animate-fade-up-2" style={{ color: 'var(--text-muted)' }}>
        Última atualização: maio 2026
      </p>
    </div>
  )
}
