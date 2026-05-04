'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/services/supabase/client'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
         ResponsiveContainer, Legend } from 'recharts'
import { TrendingUp, TrendingDown, Calendar, DollarSign, BarChart2, ArrowUpRight, ArrowDownRight } from 'lucide-react'

const HOUSEHOLD_ID = process.env.NEXT_PUBLIC_HOUSEHOLD_ID!
const fmt  = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
const fmtK = (v: number) => v >= 1000 ? `R$${(v / 1000).toFixed(1)}k` : `R$${v.toFixed(0)}`

const MONTH_NAMES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
function monthLabel(m: string) {
  const [y, mo] = m.split('-')
  return `${MONTH_NAMES[parseInt(mo) - 1]}/${y.slice(2)}`
}

function getLast12Months(): string[] {
  const months: string[] = []
  const now = new Date()
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  return months
}

interface MonthData {
  month:    string
  label:    string
  income:   number
  expenses: number
  balance:  number
}

interface CategoryData {
  name:     string
  color:    string
  months:   Record<string, number>
}

export default function AnalyticsPage() {
  const [period, setPeriod]         = useState<'6' | '12'>('12')
  const [monthData, setMonthData]   = useState<MonthData[]>([])
  const [catData, setCatData]       = useState<CategoryData[]>([])
  const [loading, setLoading]       = useState(true)
  const [activeTab, setActiveTab]   = useState<'overview' | 'categories' | 'balance'>('overview')
  const supabase = createClient()

  useEffect(() => {
    loadData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadData() {
    setLoading(true)
    const months = getLast12Months()

    // Busca transações
    const { data: txs } = await supabase
      .from('transactions')
      .select('amount, competence_month, transaction_type, category_id')
      .eq('household_id', HOUSEHOLD_ID)
      .is('deleted_at', null)
      .in('competence_month', months)

    // Busca rendas
    const { data: incomes } = await supabase
      .from('income_entries')
      .select('amount, competence_month')
      .eq('household_id', HOUSEHOLD_ID)
      .in('competence_month', months)

    // Busca categorias
    const { data: categories } = await supabase
      .from('categories')
      .select('id, name, color')

    const catMap = Object.fromEntries((categories ?? []).map(c => [c.id, c]))

    // Agrupa por mês
    const byMonth: Record<string, { income: number; expenses: number }> = {}
    months.forEach(m => { byMonth[m] = { income: 0, expenses: 0 } })

    ;(incomes ?? []).forEach(r => {
      const m = r.competence_month
      if (byMonth[m]) byMonth[m].income += Number(r.amount)
    })
    ;(txs ?? []).forEach(t => {
      const m = t.competence_month
      if (!byMonth[m]) return
      const amt = Math.abs(Number(t.amount))
      if (t.transaction_type === 'EXPENSE') byMonth[m].expenses += amt
      else if (t.transaction_type === 'INCOME') byMonth[m].income += amt
    })

    const mData: MonthData[] = months.map(m => ({
      month:    m,
      label:    monthLabel(m),
      income:   byMonth[m].income,
      expenses: byMonth[m].expenses,
      balance:  byMonth[m].income - byMonth[m].expenses,
    }))
    setMonthData(mData)

    // Agrupa gastos por categoria e mês
    const catTotals: Record<string, Record<string, number>> = {}
    ;(txs ?? []).filter(t => t.transaction_type === 'EXPENSE').forEach(t => {
      const catId = t.category_id ?? 'sem-categoria'
      if (!catTotals[catId]) catTotals[catId] = {}
      const m = t.competence_month
      catTotals[catId][m] = (catTotals[catId][m] ?? 0) + Math.abs(Number(t.amount))
    })

    const catList: CategoryData[] = Object.entries(catTotals)
      .map(([id, mths]) => ({
        name:   catMap[id]?.name ?? 'Sem categoria',
        color:  catMap[id]?.color ?? '#6366f1',
        months: mths,
      }))
      .sort((a, b) => {
        const totA = Object.values(a.months).reduce((s, v) => s + v, 0)
        const totB = Object.values(b.months).reduce((s, v) => s + v, 0)
        return totB - totA
      })
      .slice(0, 6)

    setCatData(catList)
    setLoading(false)
  }

  const displayed = monthData.slice(period === '6' ? 6 : 0)

  // Métricas resumo
  const totalIncome    = displayed.reduce((s, m) => s + m.income, 0)
  const totalExpenses  = displayed.reduce((s, m) => s + m.expenses, 0)
  const avgMonthly     = totalExpenses / (displayed.length || 1)
  const lastMonth      = displayed[displayed.length - 1]
  const prevMonth      = displayed[displayed.length - 2]
  const expenseDiff    = lastMonth && prevMonth ? lastMonth.expenses - prevMonth.expenses : 0
  const expenseDiffPct = prevMonth?.expenses > 0 ? (expenseDiff / prevMonth.expenses) * 100 : 0

  // Dados acumulados de saldo
  let cumBalance = 0
  const balanceData = displayed.map(m => {
    cumBalance += m.balance
    return { ...m, cumBalance }
  })

  // Dados para gráfico de categorias (últimos N meses)
  const catChartData = displayed.map(m => {
    const row: Record<string, any> = { label: m.label }
    catData.forEach(c => { row[c.name] = c.months[m.month] ?? 0 })
    return row
  })

  // Gasto diário médio do mês atual
  const currentMonthData = monthData[monthData.length - 1]
  const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()
  const dailyAvg = currentMonthData ? currentMonthData.expenses / daysInMonth : 0

  // Comparativo mesmo mês do ano anterior
  const currentMonthStr = monthData[monthData.length - 1]?.month
  const prevYearMonthStr = currentMonthStr
    ? `${parseInt(currentMonthStr.split('-')[0]) - 1}-${currentMonthStr.split('-')[1]}`
    : null
  const prevYearMonth = prevYearMonthStr ? monthData.find(m => m.month === prevYearMonthStr) : null

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="w-5 h-5 rounded-full border-2 animate-spin"
        style={{ borderColor: 'var(--brand)', borderTopColor: 'transparent' }} />
    </div>
  )

  return (
    <div className="p-4 md:p-7 max-w-[1100px] mx-auto">

      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between mb-4 md:mb-7 animate-fade-up">
        <div>
          <h1 className="page-title">Analytics</h1>
          <p className="page-subtitle">Histórico e evolução financeira</p>
        </div>
        <div className="flex gap-2 self-start">
          {(['6', '12'] as const).map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`btn btn-sm ${period === p ? 'btn-primary' : 'btn-secondary'}`}>
              {p} meses
            </button>
          ))}
        </div>
      </div>

      {/* Cards KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-7 animate-fade-up-1">
        <div className="stat-card">
          <p className="stat-label">Receita total</p>
          <p className="stat-value" style={{ color: 'var(--success)' }}>{fmt(totalIncome)}</p>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
            últimos {period} meses
          </p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Gastos totais</p>
          <p className="stat-value" style={{ color: 'var(--danger)' }}>{fmt(totalExpenses)}</p>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
            últimos {period} meses
          </p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Custo de vida médio</p>
          <p className="stat-value" style={{ color: 'var(--warning)' }}>{fmt(avgMonthly)}</p>
          <div className="flex items-center gap-1 mt-1">
            {expenseDiffPct !== 0 && (
              <>
                {expenseDiff > 0
                  ? <ArrowUpRight size={12} style={{ color: 'var(--danger)' }} />
                  : <ArrowDownRight size={12} style={{ color: 'var(--success)' }} />}
                <span style={{ fontSize: 11,
                  color: expenseDiff > 0 ? 'var(--danger)' : 'var(--success)' }}>
                  {Math.abs(expenseDiffPct).toFixed(1)}% vs mês ant.
                </span>
              </>
            )}
          </div>
        </div>
        <div className="stat-card">
          <p className="stat-label">Gasto diário médio</p>
          <p className="stat-value" style={{ color: 'var(--info)' }}>{fmt(dailyAvg)}</p>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
            mês atual / {daysInMonth} dias
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="overflow-x-auto mb-6 animate-fade-up-1">
      <div className="flex gap-1"
        style={{ background: 'var(--bg-elevated)', borderRadius: 10, padding: 4, width: 'fit-content' }}>
        {[
          { id: 'overview', label: 'Visão geral' },
          { id: 'categories', label: 'Por categoria' },
          { id: 'balance', label: 'Saldo acumulado' },
        ].map(tab => (
          <button key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            style={{
              padding: '6px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500,
              background: activeTab === tab.id ? 'var(--bg-card)' : 'transparent',
              color: activeTab === tab.id ? 'var(--text)' : 'var(--text-muted)',
              border: activeTab === tab.id ? '1px solid var(--border)' : '1px solid transparent',
              transition: 'all 0.15s', cursor: 'pointer', whiteSpace: 'nowrap',
            }}>
            {tab.label}
          </button>
        ))}
      </div>
      </div>

      {/* ── Tab: Overview ── */}
      {activeTab === 'overview' && (
        <div className="space-y-6 animate-fade-up-2">
          <div className="card p-6">
            <p className="font-semibold text-sm mb-5" style={{ color: 'var(--text)' }}>
              Receitas e Gastos por mês
            </p>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={displayed} barGap={4} barCategoryGap="28%">
                <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={fmtK} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} width={56} />
                <Tooltip
                  contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 12 }}
                  formatter={(v: any) => fmt(v)}
                  labelStyle={{ color: 'var(--text)', fontWeight: 600 }}
                />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
                <Bar dataKey="income"   name="Receita" fill="var(--success)" radius={[4,4,0,0]} />
                <Bar dataKey="expenses" name="Gastos"  fill="var(--danger)"  radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Comparativo anual */}
          {prevYearMonth && currentMonthData && (
            <div className="card p-5">
              <p className="font-semibold text-sm mb-4" style={{ color: 'var(--text)' }}>
                Comparativo anual — {monthLabel(currentMonthData.month)}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { label: 'Gastos este ano', value: currentMonthData.expenses, color: 'var(--danger)' },
                  { label: 'Gastos ano anterior', value: prevYearMonth.expenses, color: 'var(--text-muted)' },
                  { label: 'Receita este ano', value: currentMonthData.income, color: 'var(--success)' },
                  { label: 'Receita ano anterior', value: prevYearMonth.income, color: 'var(--text-muted)' },
                ].map((item, i) => (
                  <div key={i} className="rounded-xl p-4" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>{item.label}</p>
                    <p style={{ fontSize: 18, fontFamily: 'DM Mono, monospace', fontWeight: 700, color: item.color }}>
                      {fmt(item.value)}
                    </p>
                  </div>
                ))}
              </div>
              {prevYearMonth.expenses > 0 && (
                <div className="mt-4 rounded-xl p-3" style={{
                  background: currentMonthData.expenses > prevYearMonth.expenses ? 'var(--danger-bg)' : 'var(--success-bg)',
                  border: `1px solid ${currentMonthData.expenses > prevYearMonth.expenses ? 'rgba(239,68,68,0.2)' : 'rgba(0,196,122,0.2)'}`,
                }}>
                  <p style={{ fontSize: 13, color: 'var(--text)' }}>
                    {currentMonthData.expenses > prevYearMonth.expenses
                      ? `▲ ${((currentMonthData.expenses / prevYearMonth.expenses - 1) * 100).toFixed(1)}% mais gastos que ${monthLabel(prevYearMonth.month)}`
                      : `▼ ${((1 - currentMonthData.expenses / prevYearMonth.expenses) * 100).toFixed(1)}% menos gastos que ${monthLabel(prevYearMonth.month)}`
                    }
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Categories ── */}
      {activeTab === 'categories' && (
        <div className="space-y-6 animate-fade-up-2">
          <div className="card p-6">
            <p className="font-semibold text-sm mb-5" style={{ color: 'var(--text)' }}>
              Top 6 categorias — evolução mensal
            </p>
            {catData.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: '40px 0' }}>
                Sem dados suficientes para o período selecionado
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={catChartData} barGap={2} barCategoryGap="25%">
                  <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={fmtK} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} width={56} />
                  <Tooltip
                    contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 12 }}
                    formatter={(v: any) => fmt(v)}
                    labelStyle={{ color: 'var(--text)', fontWeight: 600 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
                  {catData.map(c => (
                    <Bar key={c.name} dataKey={c.name} stackId="a" fill={c.color} radius={[2,2,0,0]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Tabela de totais por categoria */}
          {catData.length > 0 && (
            <div className="card overflow-hidden">
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 10, fontWeight: 600,
                      textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
                      Categoria
                    </th>
                    {displayed.map(m => (
                      <th key={m.month} style={{ padding: '10px 8px', textAlign: 'right', fontSize: 10, fontWeight: 600,
                        textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
                        {m.label}
                      </th>
                    ))}
                    <th style={{ padding: '10px 16px', textAlign: 'right', fontSize: 10, fontWeight: 600,
                      textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {catData.map(c => {
                    const total = Object.values(c.months).reduce((s, v) => s + v, 0)
                    return (
                      <tr key={c.name} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '8px 16px' }}>
                          <div className="flex items-center gap-2">
                            <div style={{ width: 10, height: 10, borderRadius: 3, background: c.color, flexShrink: 0 }} />
                            <span style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>{c.name}</span>
                          </div>
                        </td>
                        {displayed.map(m => (
                          <td key={m.month} style={{ padding: '8px', textAlign: 'right', fontSize: 12,
                            fontFamily: 'DM Mono, monospace', color: 'var(--text-secondary)' }}>
                            {c.months[m.month] ? fmtK(c.months[m.month]) : '—'}
                          </td>
                        ))}
                        <td style={{ padding: '8px 16px', textAlign: 'right', fontSize: 13,
                          fontFamily: 'DM Mono, monospace', fontWeight: 700, color: 'var(--danger)' }}>
                          {fmt(total)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Balance ── */}
      {activeTab === 'balance' && (
        <div className="space-y-6 animate-fade-up-2">
          <div className="card p-6">
            <p className="font-semibold text-sm mb-5" style={{ color: 'var(--text)' }}>
              Saldo acumulado (receitas − gastos)
            </p>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={balanceData}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={fmtK} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} width={60} />
                <Tooltip
                  contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 12 }}
                  formatter={(v: any, name: string) => [fmt(v), name === 'cumBalance' ? 'Saldo acumulado' : name === 'balance' ? 'Saldo do mês' : name]}
                  labelStyle={{ color: 'var(--text)', fontWeight: 600 }}
                />
                <Legend
                  wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
                  formatter={(v) => v === 'cumBalance' ? 'Saldo acumulado' : 'Saldo do mês'}
                />
                <Line type="monotone" dataKey="cumBalance" stroke="var(--brand)" strokeWidth={2.5}
                  dot={{ r: 3, fill: 'var(--brand)' }} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="balance" stroke="var(--success)" strokeWidth={1.5}
                  strokeDasharray="4 4" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Tabela mensal */}
          <div className="card overflow-hidden">
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Mês','Receita','Gastos','Saldo do mês','Saldo acumulado'].map((h, i) => (
                    <th key={i} style={{ padding: '10px 16px', textAlign: i === 0 ? 'left' : 'right',
                      fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
                      letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {balanceData.slice().reverse().map((m) => (
                  <tr key={m.month} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '10px 16px', fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                      {m.label}
                    </td>
                    <td style={{ padding: '10px 16px', textAlign: 'right', fontSize: 13,
                      fontFamily: 'DM Mono, monospace', color: 'var(--success)' }}>
                      {fmt(m.income)}
                    </td>
                    <td style={{ padding: '10px 16px', textAlign: 'right', fontSize: 13,
                      fontFamily: 'DM Mono, monospace', color: 'var(--danger)' }}>
                      {fmt(m.expenses)}
                    </td>
                    <td style={{ padding: '10px 16px', textAlign: 'right', fontSize: 13,
                      fontFamily: 'DM Mono, monospace', fontWeight: 600,
                      color: m.balance >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                      {fmt(m.balance)}
                    </td>
                    <td style={{ padding: '10px 16px', textAlign: 'right', fontSize: 13,
                      fontFamily: 'DM Mono, monospace', fontWeight: 700,
                      color: m.cumBalance >= 0 ? 'var(--brand)' : 'var(--danger)' }}>
                      {fmt(m.cumBalance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
