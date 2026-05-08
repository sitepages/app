'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient }  from '@/services/supabase/client'
import { useAccounts }   from '@/hooks/useAccounts'
import { useBudgets }       from '@/hooks/useBudgets'
import { useCostOfLiving }  from '@/hooks/useCostOfLiving'
import { useInstallments }  from '@/hooks/useInstallments'
import {
  TrendingDown, TrendingUp, Wallet, Upload,
  ArrowRight, RefreshCw, Calendar, Lock,
} from 'lucide-react'
import { useHideValues } from '@/hooks/useHideValues'

const HOUSEHOLD_ID = process.env.NEXT_PUBLIC_HOUSEHOLD_ID!

function fmt(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}
function getDefaultMonth() { return new Date().toISOString().slice(0, 7) }
function monthLabel(m: string) {
  const [y, mo] = m.split('-')
  const names = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
  return `${names[parseInt(mo) - 1]} ${y}`
}

interface MonthData {
  totalExpenses: number
  totalIncome:   number
  vaIncome:      number
  saldo:         number
  expenseCount:  number
  incomeCount:   number
  byCategory:    { name: string; color: string; total: number }[]
  byMember:      { name: string; total: number; userId: string }[]
  fixedTotal:    number
  variableTotal: number
}

const HIDDEN = '••••••'

export default function DashboardClient({ displayName, greeting }: { displayName: string; greeting: string }) {
  const [month, setMonth]     = useState(getDefaultMonth())
  const [data, setData]       = useState<MonthData | null>(null)
  const [loading, setLoading] = useState(true)
  const { hidden }            = useHideValues()
  const h = (v: number) => hidden ? HIDDEN : fmt(v)
  const { summary }           = useAccounts(HOUSEHOLD_ID)
  const { budgets, exceeded, warning } = useBudgets(HOUSEHOLD_ID, month)
  const { data: costData }               = useCostOfLiving(HOUSEHOLD_ID, '3')
  const { totalCommitted }               = useInstallments(HOUSEHOLD_ID)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()

    // Membros
    const { data: members } = await supabase
      .from('household_members')
      .select('user_id, display_name')
      .eq('household_id', HOUSEHOLD_ID)
    const memberMap: Record<string, string> = {}
    members?.forEach(m => { memberMap[m.user_id] = m.display_name })

    // Transações do mês
    const { data: txs } = await supabase
      .from('transactions')
      .select('amount, transaction_type, is_fixed, imported_by, category_id, categories(name, color)')
      .eq('household_id', HOUSEHOLD_ID)
      .eq('competence_month', month)
      .is('deleted_at', null)

    const expenses      = (txs ?? []).filter(t => t.transaction_type === 'EXPENSE')
    const totalExpenses = expenses.reduce((s, t) => s + Math.abs(Number(t.amount)), 0)
    const fixedTotal    = expenses.filter(t => t.is_fixed).reduce((s, t) => s + Math.abs(Number(t.amount)), 0)
    const variableTotal = totalExpenses - fixedTotal

    // Rendas do mês
    const { data: incomeData } = await supabase
      .from('income_entries')
      .select('amount, user_id, category')
      .eq('household_id', HOUSEHOLD_ID)
      .eq('competence_month', month)

    const totalIncome = (incomeData ?? []).reduce((s, e) => s + Number(e.amount), 0)
    const vaIncome    = (incomeData ?? []).filter((e: any) => e.category === 'FOOD_CARD')
                          .reduce((s, e) => s + Number(e.amount), 0)

    // Por categoria
    const catMap: Record<string, { name: string; color: string; total: number }> = {}
    expenses.forEach(tx => {
      const cat   = (tx.categories as any)
      const name  = cat?.name  ?? 'Sem categoria'
      const color = cat?.color ?? '#6B7280'
      if (!catMap[name]) catMap[name] = { name, color, total: 0 }
      catMap[name].total += Math.abs(Number(tx.amount))
    })
    const byCategory = Object.values(catMap).sort((a, b) => b.total - a.total).slice(0, 6)

    // Por membro
    const memberTotals: Record<string, number> = {}
    expenses.forEach(tx => {
      const uid = tx.imported_by ?? 'unknown'
      memberTotals[uid] = (memberTotals[uid] ?? 0) + Math.abs(Number(tx.amount))
    })
    const byMember = Object.entries(memberTotals)
      .map(([userId, total]) => ({ userId, name: memberMap[userId] ?? '—', total }))

    setData({
      totalExpenses, totalIncome, vaIncome,
      saldo: totalIncome - totalExpenses,
      expenseCount: expenses.length,
      incomeCount: (incomeData ?? []).length,
      byCategory, byMember, fixedTotal, variableTotal,
    })
    setLoading(false)
  }, [month])

  useEffect(() => { fetchData() }, [fetchData])

  return (
    <div className="p-4 md:p-7 max-w-[1100px] mx-auto">

      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between mb-4 md:mb-7 animate-fade-up">
        <div>
          <p className="text-sm mb-0.5" style={{ color: 'var(--text-muted)' }}>
            {greeting}, <span style={{ color: 'var(--brand)' }}>{displayName}</span> 👋
          </p>
          <h1 className="page-title">Visão Geral</h1>
        </div>
        <div className="flex items-center gap-2 md:gap-3">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <Calendar size={13} style={{ color: 'var(--text-muted)' }} />
            <input type="month" value={month} onChange={e => setMonth(e.target.value)}
              className="input" style={{ width: 'auto', padding: 0, background: 'transparent', border: 'none', fontSize: 13 }} />
          </div>
          <button onClick={fetchData} className="btn btn-secondary btn-sm" title="Atualizar">
            <RefreshCw size={13} />
          </button>
          <a href="/dashboard/import" className="btn btn-primary">
            <Upload size={14} /> <span className="hidden sm:inline">Importar CSV</span>
          </a>
        </div>
      </div>

      {/* PATRIMÔNIO */}
      <section className="mb-7 animate-fade-up-1">
        <SectionLabel>Patrimônio</SectionLabel>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Disponível"  value={summary.disponivel} color="var(--success)" sub="Conta corrente" hidden={hidden} />
          <StatCard label="Investido"   value={summary.investido}  color="var(--info)"    sub="Poupança + CDI + Invest." hidden={hidden} />
          <StatCard label="Total"       value={summary.total}      color="var(--brand)"   sub="Patrimônio completo" highlight hidden={hidden} />
          <div className="stat-card" style={{ borderColor: 'rgba(248,113,113,0.2)' }}>
            <div className="flex items-center justify-between mb-2">
              <p className="stat-label">Aprisionado</p>
              <Lock size={13} style={{ color: 'var(--danger)' }} />
            </div>
            <p className="stat-value" style={{ color: 'var(--danger)' }}>{h(totalCommitted)}</p>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
              {totalCommitted > 0 ? 'Em parcelas futuras' : 'Nenhuma parcela ativa'}
            </p>
          </div>
        </div>
      </section>

      {/* RESUMO DO MÊS */}
      <section className="mb-7 animate-fade-up-2">
        <SectionLabel>{monthLabel(month)}</SectionLabel>
        {loading ? <LoadingSkeleton /> : data && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="stat-card">
              <div className="flex items-center justify-between mb-3">
                <p className="stat-label">Receitas</p>
                <span className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: 'var(--success-bg)', color: 'var(--success)' }}>
                  <TrendingUp size={13} />
                </span>
              </div>
              <p className="stat-value" style={{ color: 'var(--success)' }}>{h(data.totalIncome)}</p>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                {data.incomeCount} lançamentos
                {data.vaIncome > 0 && <span style={{ color: 'var(--warning)' }}> · VA: {h(data.vaIncome)}</span>}
              </p>
            </div>
            <div className="stat-card">
              <div className="flex items-center justify-between mb-3">
                <p className="stat-label">Gastos</p>
                <span className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: 'var(--danger-bg)', color: 'var(--danger)' }}>
                  <TrendingDown size={13} />
                </span>
              </div>
              <p className="stat-value" style={{ color: 'var(--danger)' }}>{h(data.totalExpenses)}</p>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>{data.expenseCount} transações</p>
            </div>
            <div className="stat-card">
              <div className="flex items-center justify-between mb-3">
                <p className="stat-label">Saldo</p>
                <span className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: 'var(--info-bg)', color: 'var(--info)' }}>
                  <Wallet size={13} />
                </span>
              </div>
              <p className="stat-value" style={{ color: data.saldo >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                {hidden ? HIDDEN : `${data.saldo >= 0 ? '+' : '-'}${fmt(Math.abs(data.saldo))}`}
              </p>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                {data.saldo >= 0 ? 'Sobrou no mês' : 'Déficit no mês'}
              </p>
            </div>
          </div>
        )}
      </section>

      {!loading && data && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 animate-fade-up-3">

          {/* ORÇAMENTO */}
          <section className="md:col-span-2">
            <SectionLabel>
              Orçamento x Realizado
              {(exceeded > 0 || warning > 0) && (
                <span className="ml-2 badge badge-danger" style={{ fontSize: 10, verticalAlign: 'middle' }}>
                  {exceeded > 0 && `${exceeded} acima`}{exceeded > 0 && warning > 0 && ' · '}{warning > 0 && `${warning} atenção`}
                </span>
              )}
            </SectionLabel>
            <div className="card px-5 py-4">
              {budgets.length === 0 ? (
                <div className="flex items-center justify-between">
                  <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Nenhum orçamento definido para este mês</p>
                  <a href="/dashboard/budget" className="btn btn-secondary btn-sm">Definir orçamento</a>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
                    {budgets.slice(0, 6).map((b: any) => {
                      const color = b.status === 'exceeded' ? 'var(--danger)' : b.status === 'warning' ? 'var(--warning)' : b.categories?.color ?? 'var(--brand)'
                      return (
                        <div key={b.id}>
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                                style={{ background: b.categories?.color ?? '#6B7280' }} />
                              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{b.categories?.name}</span>
                            </div>
                            <span style={{ fontSize: 11, fontFamily: 'DM Mono, monospace', color, fontWeight: 600 }}>
                              {Math.round(b.percent)}%
                            </span>
                          </div>
                          <div className="progress-track" style={{ height: 5 }}>
                            <div className="progress-fill" style={{ width: `${Math.min(b.percent, 100)}%`, background: color }} />
                          </div>
                          <div className="flex justify-between mt-1">
                            <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace' }}>{h(b.spent)}</span>
                            <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace' }}>{h(Number(b.amount_limit))}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <div className="mt-4 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
                    <a href="/dashboard/budget" style={{ fontSize: 12, color: 'var(--brand)', textDecoration: 'none' }}>
                      Ver orçamento completo →
                    </a>
                  </div>
                </>
              )}
            </div>
          </section>

          {/* GASTOS POR CATEGORIA */}
          <section>
            <SectionLabel>Gastos por Categoria</SectionLabel>
            <div className="card px-5 py-4">
              {data.byCategory.length === 0 ? (
                <Empty text="Nenhum gasto registrado" />
              ) : (
                <div className="space-y-3">
                  {data.byCategory.map(cat => (
                    <div key={cat.name}>
                      <div className="flex justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: cat.color }} />
                          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{cat.name}</span>
                        </div>
                        <span style={{ fontSize: 13, fontFamily: 'DM Mono, monospace', color: 'var(--text)', fontWeight: 500 }}>
                          {h(cat.total)}
                        </span>
                      </div>
                      <div className="progress-track">
                        <div className="progress-fill" style={{
                          width: `${data.totalExpenses > 0 ? (cat.total / data.totalExpenses) * 100 : 0}%`,
                          background: cat.color,
                        }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* EU VS ESPOSA */}
          <section>
            <SectionLabel>Eu vs Esposa</SectionLabel>
            <div className="card px-5 py-4">
              {data.byMember.length === 0 ? (
                <Empty text="Nenhum gasto registrado" />
              ) : (
                <div className="space-y-4">
                  {data.byMember.map((m, i) => (
                    <div key={m.userId}>
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
                          style={{
                            background: i === 0 ? 'rgba(0,196,122,0.15)' : 'rgba(59,130,246,0.15)',
                            color: i === 0 ? 'var(--brand)' : 'var(--info)',
                          }}>
                          {m.name[0]}
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between mb-1">
                            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{m.name}</span>
                            <span style={{ fontSize: 13, fontFamily: 'DM Mono, monospace', color: 'var(--text)', fontWeight: 500 }}>
                              {h(m.total)}
                            </span>
                          </div>
                          <div className="progress-track">
                            <div className="progress-fill" style={{
                              width: `${data.totalExpenses > 0 ? (m.total / data.totalExpenses) * 100 : 0}%`,
                              background: i === 0 ? 'var(--brand)' : 'var(--info)',
                            }} />
                          </div>
                        </div>
                      </div>
                      <p style={{ fontSize: 11, color: 'var(--text-muted)', paddingLeft: 40 }}>
                        {data.totalExpenses > 0 ? Math.round((m.total / data.totalExpenses) * 100) : 0}% do total
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* FIXO VS VARIÁVEL */}
          <section>
            <SectionLabel>Fixo vs Variável</SectionLabel>
            <div className="card px-5 py-4">
              {data.totalExpenses === 0 ? <Empty text="Nenhum gasto registrado" /> : (
                <>
                  <div className="flex rounded-xl overflow-hidden mb-5" style={{ height: 10 }}>
                    <div style={{ width: `${(data.fixedTotal / data.totalExpenses) * 100}%`, background: 'var(--danger)', transition: 'width 0.5s' }} />
                    <div style={{ flex: 1, background: 'var(--warning)' }} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'Fixo',     value: data.fixedTotal,    color: 'var(--danger)',  total: data.totalExpenses },
                      { label: 'Variável', value: data.variableTotal, color: 'var(--warning)', total: data.totalExpenses },
                    ].map(item => (
                      <div key={item.label} className="rounded-xl p-4" style={{ background: 'var(--bg-elevated)' }}>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ background: item.color }} />
                          <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
                            {item.label}
                          </span>
                        </div>
                        <p style={{ fontSize: 20, fontFamily: 'DM Mono, monospace', fontWeight: 700, color: item.color }}>
                          {Math.round((item.value / item.total) * 100)}%
                        </p>
                        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{h(item.value)}</p>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </section>

          {/* CUSTO DE VIDA */}
          <section>
            <SectionLabel>Custo de Vida</SectionLabel>
            <div className="card px-5 py-4">
              {!costData ? (
                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Calculando...</p>
              ) : (
                <>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p style={{ fontSize: 22, fontFamily: 'DM Mono, monospace', fontWeight: 700, color: 'var(--brand)' }}>
                        {h(costData.totalMonthly)}
                        {!hidden && <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 400, marginLeft: 4 }}>/mês</span>}
                      </p>
                      <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                        {h(costData.dailyAverage)}{!hidden && '/dia · média 3 meses'}
                      </p>
                    </div>
                    <a href="/dashboard/cost-of-living" style={{ fontSize: 12, color: 'var(--brand)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                      Ver detalhes →
                    </a>
                  </div>
                  <div className="flex rounded-lg overflow-hidden mb-2" style={{ height: 7 }}>
                    <div style={{ width: `${costData.fixedPercent}%`, background: 'var(--danger)', transition: 'width 0.5s' }} />
                    <div style={{ flex: 1, background: 'var(--warning)' }} />
                  </div>
                  <div className="flex justify-between">
                    <span style={{ fontSize: 11, color: 'var(--danger)' }}>Fixo {costData.fixedPercent}% · {h(costData.fixedTotal)}</span>
                    <span style={{ fontSize: 11, color: 'var(--warning)' }}>Variável {costData.variablePercent}% · {h(costData.variableTotal)}</span>
                  </div>
                </>
              )}
            </div>
          </section>

          {/* ACESSO RÁPIDO */}
          <section>
            <SectionLabel>Acesso Rápido</SectionLabel>
            <div className="card px-5 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  { href: '/dashboard/income',      label: 'Registrar renda',  color: 'var(--success)', icon: '↑' },
                  { href: '/dashboard/import',       label: 'Importar CSV',     color: 'var(--brand)',   icon: '⬆' },
                  { href: '/dashboard/accounts',     label: 'Atualizar saldo',  color: 'var(--info)',    icon: '⊙' },
                  { href: '/dashboard/transactions', label: 'Ver transações',   color: 'var(--warning)', icon: '☰' },
                ].map(item => (
                  <a key={item.href} href={item.href}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all"
                    style={{ background: 'var(--bg-elevated)', textDecoration: 'none' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-card-hover)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg-elevated)')}
                  >
                    <span style={{ fontSize: 16, color: item.color }}>{item.icon}</span>
                    <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{item.label}</span>
                    <ArrowRight size={12} style={{ color: 'var(--text-muted)', marginLeft: 'auto' }} />
                  </a>
                ))}
              </div>
            </div>
          </section>

        </div>
      )}
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>{children}</p>
}
function StatCard({ label, value, color, sub, highlight, hidden }: { label: string; value: number; color: string; sub: string; highlight?: boolean; hidden: boolean }) {
  return (
    <div className="stat-card" style={highlight ? { borderColor: 'var(--brand-border)' } : {}}>
      <p className="stat-label">{label}</p>
      <p className="stat-value" style={{ color }}>{hidden ? HIDDEN : fmt(value)}</p>
      <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>{sub}</p>
    </div>
  )
}
function Empty({ text }: { text: string }) {
  return <div className="flex items-center justify-center py-8"><p style={{ fontSize: 13, color: 'var(--text-muted)' }}>{text}</p></div>
}
function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {[1,2,3].map(i => (
        <div key={i} className="stat-card">
          <div className="skeleton h-3 w-20 mb-4 rounded" />
          <div className="skeleton h-7 w-32 mb-2 rounded" />
          <div className="skeleton h-2 w-16 rounded" />
        </div>
      ))}
    </div>
  )
}
