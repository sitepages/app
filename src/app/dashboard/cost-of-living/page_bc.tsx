'use client'

import { useState }            from 'react'
import { useCostOfLiving, CostPeriod } from '@/hooks/useCostOfLiving'
import { Home, TrendingDown, Calendar, ArrowRight } from 'lucide-react'

const HOUSEHOLD_ID = process.env.NEXT_PUBLIC_HOUSEHOLD_ID!

function fmt(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}
function monthLabel(m: string) {
  const [y, mo] = m.split('-')
  const names = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
  return `${names[parseInt(mo) - 1]}/${y.slice(2)}`
}
function sourceLabel(s: string) {
  return s === 'card' ? 'Cartão' : s === 'installment' ? 'Parcela' : s === 'debt' ? 'Dívida' : 'VA'
}
function sourceColor(s: string) {
  return s === 'card' ? 'var(--text-muted)' : s === 'installment' ? 'var(--warning)' : s === 'debt' ? 'var(--danger)' : '#F97316'
}

const PERIODS: { value: CostPeriod; label: string }[] = [
  { value: '1',  label: 'Mês atual'    },
  { value: '3',  label: 'Últimos 3m'   },
  { value: '6',  label: 'Últimos 6m'   },
  { value: '12', label: 'Últimos 12m'  },
]

export default function CostOfLivingPage() {
  const [period, setPeriod] = useState<CostPeriod>('3')
  const { data, loading }   = useCostOfLiving(HOUSEHOLD_ID, period)

  const maxMonth = data ? Math.max(...data.byMonth.map(m => m.total), 1) : 1

  return (
    <div className="p-7 max-w-[1100px] mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between mb-7 animate-fade-up">
        <div>
          <h1 className="page-title">Custo de Vida</h1>
          <p className="page-subtitle">Quanto custa manter seu padrão de vida atual</p>
        </div>
        {/* Seletor de período */}
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          {PERIODS.map(p => (
            <button key={p.value} onClick={() => setPeriod(p.value)}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
              style={{
                background: period === p.value ? 'var(--brand)'       : 'transparent',
                color:      period === p.value ? 'var(--text-inverse)' : 'var(--text-muted)',
                border:     'none', cursor: 'pointer',
              }}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-24">
          <div className="w-6 h-6 rounded-full border-2 animate-spin"
            style={{ borderColor: 'var(--brand)', borderTopColor: 'transparent' }} />
        </div>
      ) : !data ? null : (
        <>
          {/* ── CARDS PRINCIPAIS ── */}
          <div className="grid grid-cols-4 gap-4 mb-6 animate-fade-up-1">
            <div className="stat-card col-span-2" style={{ borderColor: 'var(--brand-border)' }}>
              <div className="flex items-center justify-between mb-3">
                <p className="stat-label">Custo Médio Mensal</p>
                <span className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: 'var(--brand-bg)', color: 'var(--brand)' }}>
                  <Home size={13} />
                </span>
              </div>
              <p className="stat-value" style={{ color: 'var(--brand)' }}>{fmt(data.totalMonthly)}</p>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                média de {data.months.length} {data.months.length === 1 ? 'mês' : 'meses'}
              </p>
            </div>

            <div className="stat-card">
              <div className="flex items-center justify-between mb-3">
                <p className="stat-label">Custo Diário</p>
                <span className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: 'var(--info-bg)', color: 'var(--info)' }}>
                  <Calendar size={13} />
                </span>
              </div>
              <p className="stat-value" style={{ color: 'var(--info)' }}>{fmt(data.dailyAverage)}</p>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>por dia</p>
            </div>

            <div className="stat-card">
              <p className="stat-label mb-3">Fixo vs Variável</p>
              <div className="flex rounded-lg overflow-hidden mb-2" style={{ height: 8 }}>
                <div style={{ width: `${data.fixedPercent}%`, background: 'var(--danger)', transition: 'width 0.5s' }} />
                <div style={{ flex: 1, background: 'var(--warning)' }} />
              </div>
              <div className="flex justify-between">
                <span style={{ fontSize: 11, color: 'var(--danger)' }}>Fixo {data.fixedPercent}%</span>
                <span style={{ fontSize: 11, color: 'var(--warning)' }}>Variável {data.variablePercent}%</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-5 animate-fade-up-2">

            {/* ── FIXO VS VARIÁVEL DETALHADO ── */}
            <section>
              <SectionLabel>Fixo vs Variável</SectionLabel>
              <div className="card px-5 py-4">
                <div className="grid grid-cols-2 gap-4 mb-5">
                  {[
                    { label: 'Fixo',     value: data.fixedTotal,    color: 'var(--danger)',  pct: data.fixedPercent    },
                    { label: 'Variável', value: data.variableTotal, color: 'var(--warning)', pct: data.variablePercent },
                  ].map(item => (
                    <div key={item.label} className="rounded-xl p-4" style={{ background: 'var(--bg-elevated)' }}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ background: item.color }} />
                        <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
                          {item.label}
                        </span>
                      </div>
                      <p style={{ fontSize: 22, fontFamily: 'DM Mono, monospace', fontWeight: 700, color: item.color }}>
                        {fmt(item.value)}
                      </p>
                      <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{item.pct}% do total</p>
                    </div>
                  ))}
                </div>

                {/* Barra empilhada */}
                <div className="flex rounded-xl overflow-hidden" style={{ height: 10 }}>
                  <div style={{ width: `${data.fixedPercent}%`, background: 'var(--danger)', transition: 'width 0.6s' }} />
                  <div style={{ flex: 1, background: 'var(--warning)' }} />
                </div>
              </div>
            </section>

            {/* ── POR CATEGORIA ── */}
            <section>
              <SectionLabel>Por Categoria</SectionLabel>
              <div className="card px-5 py-4">
                {data.byCategory.length === 0 ? (
                  <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Sem dados no período</p>
                ) : (
                  <div className="space-y-3">
                    {data.byCategory.map(cat => (
                      <div key={cat.name}>
                        <div className="flex justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: cat.color }} />
                            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{cat.name}</span>
                            {cat.isFixed && (
                              <span style={{ fontSize: 9, fontWeight: 600, textTransform: 'uppercase',
                                             color: 'var(--danger)', letterSpacing: '0.05em' }}>fixo</span>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{cat.percent}%</span>
                            <span style={{ fontSize: 13, fontFamily: 'DM Mono, monospace', color: 'var(--text)', fontWeight: 500 }}>
                              {fmt(cat.total)}
                            </span>
                          </div>
                        </div>
                        <div className="progress-track" style={{ height: 5 }}>
                          <div className="progress-fill" style={{ width: `${cat.percent}%`, background: cat.color }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            {/* ── TENDÊNCIA MENSAL ── */}
            <section>
              <SectionLabel>Tendência Mensal</SectionLabel>
              <div className="card px-5 py-5">
                {data.byMonth.length <= 1 ? (
                  <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                    Selecione 3 meses ou mais para ver a tendência
                  </p>
                ) : (
                  <>
                    <div className="flex items-end gap-3" style={{ height: 100 }}>
                      {data.byMonth.map((m, i) => {
                        const fixedH    = maxMonth > 0 ? (m.fixed    / maxMonth) * 80 : 0
                        const variableH = maxMonth > 0 ? (m.variable / maxMonth) * 80 : 0
                        const isLast    = i === data.byMonth.length - 1
                        return (
                          <div key={m.month} className="flex-1 flex flex-col items-center gap-1.5">
                            <span style={{ fontSize: 10, color: isLast ? 'var(--brand)' : 'var(--text-muted)',
                                           fontFamily: 'DM Mono, monospace', fontWeight: isLast ? 600 : 400 }}>
                              {fmt(m.total).replace('R$\u00a0', '')}
                            </span>
                            {/* Barra empilhada: fixo + variável */}
                            <div className="w-full flex flex-col justify-end rounded-lg overflow-hidden"
                              style={{ height: 70, background: 'var(--bg-elevated)' }}>
                              <div style={{ height: `${variableH}px`, background: 'rgba(245,158,11,0.7)', transition: 'height 0.5s' }} />
                              <div style={{ height: `${fixedH}px`,    background: 'rgba(248,113,113,0.8)', transition: 'height 0.5s' }} />
                            </div>
                            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{monthLabel(m.month)}</span>
                          </div>
                        )
                      })}
                    </div>
                    {/* Legenda */}
                    <div className="flex items-center gap-4 mt-3">
                      {[
                        { color: 'rgba(248,113,113,0.8)', label: 'Fixo'     },
                        { color: 'rgba(245,158,11,0.7)',  label: 'Variável' },
                      ].map(l => (
                        <div key={l.label} className="flex items-center gap-1.5">
                          <span className="w-3 h-3 rounded-sm" style={{ background: l.color }} />
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{l.label}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </section>

            {/* ── POR PESSOA ── */}
            <section>
              <SectionLabel>Por Pessoa</SectionLabel>
              <div className="card px-5 py-4">
                {data.byMember.length === 0 ? (
                  <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Sem dados no período</p>
                ) : (
                  <div className="space-y-4">
                    {data.byMember.map((m, i) => (
                      <div key={m.userId}>
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
                            style={{
                              background: i === 0 ? 'rgba(0,196,122,0.15)' : 'rgba(59,130,246,0.15)',
                              color:      i === 0 ? 'var(--brand)' : 'var(--info)',
                            }}>
                            {m.name[0]}
                          </div>
                          <div className="flex-1">
                            <div className="flex justify-between mb-1">
                              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{m.name}</span>
                              <span style={{ fontSize: 13, fontFamily: 'DM Mono, monospace', color: 'var(--text)', fontWeight: 500 }}>
                                {fmt(m.total)}<span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 4 }}>/mês</span>
                              </span>
                            </div>
                            <div className="progress-track">
                              <div className="progress-fill" style={{
                                width: `${m.percent}%`,
                                background: i === 0 ? 'var(--brand)' : 'var(--info)',
                              }} />
                            </div>
                          </div>
                        </div>
                        <p style={{ fontSize: 11, color: 'var(--text-muted)', paddingLeft: 44 }}>
                          {m.percent}% do custo total
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            {/* ── COMPOSIÇÃO DETALHADA ── */}
            <section className="col-span-2">
              <SectionLabel>Composição Detalhada</SectionLabel>
              <div className="card overflow-hidden">
                <div className="grid grid-cols-2 divide-x" style={{ borderColor: 'var(--border)' }}>

                  {/* Fixo */}
                  <div className="px-5 py-4">
                    <div className="flex items-center gap-2 mb-4">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: 'var(--danger)' }} />
                      <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                        Custos Fixos — {fmt(data.fixedTotal)}/mês
                      </p>
                    </div>
                    <div className="space-y-2.5">
                      {data.fixedItems.map((item, i) => (
                        <div key={i} className="flex items-center justify-between">
                          <div className="flex items-center gap-2 min-w-0">
                            <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4,
                                           background: 'var(--bg-elevated)', color: sourceColor(item.source) }}>
                              {sourceLabel(item.source)}
                            </span>
                            <span style={{ fontSize: 13, color: 'var(--text-secondary)', overflow: 'hidden',
                                           textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {item.name}
                            </span>
                          </div>
                          <span style={{ fontSize: 13, fontFamily: 'DM Mono, monospace', color: 'var(--danger)',
                                         fontWeight: 500, marginLeft: 8, flexShrink: 0 }}>
                            {fmt(item.amount)}
                          </span>
                        </div>
                      ))}
                      {data.fixedItems.length === 0 && (
                        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Nenhum custo fixo identificado</p>
                      )}
                    </div>
                  </div>

                  {/* Variável */}
                  <div className="px-5 py-4">
                    <div className="flex items-center gap-2 mb-4">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: 'var(--warning)' }} />
                      <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                        Custos Variáveis — {fmt(data.variableTotal)}/mês
                      </p>
                    </div>
                    <div className="space-y-2.5">
                      {data.variableItems.map((item, i) => (
                        <div key={i} className="flex items-center justify-between">
                          <div className="flex items-center gap-2 min-w-0">
                            <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4,
                                           background: 'var(--bg-elevated)', color: sourceColor(item.source) }}>
                              {sourceLabel(item.source)}
                            </span>
                            <span style={{ fontSize: 13, color: 'var(--text-secondary)', overflow: 'hidden',
                                           textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {item.name}
                            </span>
                          </div>
                          <span style={{ fontSize: 13, fontFamily: 'DM Mono, monospace', color: 'var(--warning)',
                                         fontWeight: 500, marginLeft: 8, flexShrink: 0 }}>
                            {fmt(item.amount)}
                          </span>
                        </div>
                      ))}
                      {data.variableItems.length === 0 && (
                        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Nenhum custo variável identificado</p>
                      )}
                    </div>
                  </div>

                </div>
              </div>
            </section>

          </div>
        </>
      )}
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
      {children}
    </p>
  )
}
