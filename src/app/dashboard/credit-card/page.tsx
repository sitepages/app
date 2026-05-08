'use client'
import { useState, useEffect, useCallback } from 'react'
import { useTransactions } from '@/hooks/useTransactions'
import { createClient }    from '@/services/supabase/client'
import { CreditCard, Upload, Users } from 'lucide-react'
import { useHideValues } from '@/hooks/useHideValues'

const HOUSEHOLD_ID = process.env.NEXT_PUBLIC_HOUSEHOLD_ID!
const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Math.abs(v))
function getDefaultMonth() { return new Date().toISOString().slice(0, 7) }
function monthLabel(m: string) {
  const [y, mo] = m.split('-')
  const n = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
  return `${n[parseInt(mo) - 1]}/${y.slice(2)}`
}
function formatDate(iso: string) {
  const [y, m, d] = iso.split('-'); return `${d}/${m}/${y}`
}
function getPreviousMonths(n: number): string[] {
  const months: string[] = []
  const now = new Date()
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  return months
}

export default function CreditCardPage() {
  const [month, setMonth]             = useState(getDefaultMonth())
  const [evolution, setEvolution]     = useState<{ month: string; total: number }[]>([])
  const [prevTotal, setPrevTotal]     = useState(0)
  const { hidden }                    = useHideValues()
  const h = (v: number) => hidden ? '••••••' : fmt(v)

  const { transactions, loading } = useTransactions(HOUSEHOLD_ID, { month, type: 'EXPENSE' })

  const total      = transactions.reduce((s, t) => s + Math.abs(Number(t.amount)), 0)
  const sortedTxs  = [...transactions].sort((a, b) => Math.abs(Number(b.amount)) - Math.abs(Number(a.amount)))

  // Por categoria
  const catMap: Record<string, { name: string; color: string; total: number; count: number }> = {}
  transactions.forEach(tx => {
    const cat  = (tx.categories as any)
    const name  = cat?.name  ?? 'Sem categoria'
    const color = cat?.color ?? '#6B7280'
    if (!catMap[name]) catMap[name] = { name, color, total: 0, count: 0 }
    catMap[name].total += Math.abs(Number(tx.amount))
    catMap[name].count++
  })
  const byCategory = Object.values(catMap).sort((a, b) => b.total - a.total)

  // Por pessoa
  const memberMap: Record<string, { name: string; total: number }> = {}
  transactions.forEach(tx => {
    const name = (tx as any).imported_by_name ?? '—'
    if (!memberMap[name]) memberMap[name] = { name, total: 0 }
    memberMap[name].total += Math.abs(Number(tx.amount))
  })
  const byMember    = Object.values(memberMap)
  const numPersons  = byMember.length

  // Evolução últimos 6 meses
  const fetchEvolution = useCallback(async () => {
    const supabase = createClient()
    const months   = getPreviousMonths(6)
    const { data } = await supabase
      .from('transactions')
      .select('amount, competence_month')
      .eq('household_id', HOUSEHOLD_ID)
      .eq('transaction_type', 'EXPENSE')
      .is('deleted_at', null)
      .in('competence_month', months)

    const totals: Record<string, number> = {}
    months.forEach(m => { totals[m] = 0 })
    data?.forEach(tx => {
      if (totals[tx.competence_month] !== undefined)
        totals[tx.competence_month] += Math.abs(Number(tx.amount))
    })

    const result = months.map(m => ({ month: m, total: totals[m] }))
    setEvolution(result)

    // Mês anterior ao selecionado
    const idx = months.indexOf(month)
    if (idx > 0) setPrevTotal(result[idx - 1]?.total ?? 0)
    else setPrevTotal(0)
  }, [month])

  useEffect(() => { fetchEvolution() }, [fetchEvolution])

  const maxEvolution = Math.max(...evolution.map(e => e.total), 1)
  const diff         = total - prevTotal
  const diffPct      = prevTotal > 0 ? Math.round((diff / prevTotal) * 100) : null

  return (
    <div className="p-4 md:p-7 max-w-[1100px] mx-auto">

      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between mb-4 md:mb-7 animate-fade-up">
        <div>
          <h1 className="page-title">Cartão de Crédito</h1>
          <p className="page-subtitle">Análise separada dos gastos importados do cartão</p>
        </div>
        <div className="flex flex-wrap gap-2 self-start">
          <input type="month" value={month} onChange={e => setMonth(e.target.value)}
            className="input" style={{ width: 'auto' }} />
          <a href="/dashboard/cost-of-living" className="btn btn-secondary">
            <span className="hidden sm:inline">Voltar ao custo de vida</span><span className="sm:hidden">Custo de Vida</span>
          </a>
          <a href="/dashboard/import" className="btn btn-primary">
            <Upload size={14} /> <span className="hidden sm:inline">Importar CSV</span>
          </a>
        </div>
      </div>

      {/* 4 Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 animate-fade-up-1">
        <div className="stat-card">
          <div className="flex items-center justify-between mb-3">
            <p className="stat-label">Total do Mês</p>
            <span className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: 'var(--danger-bg)', color: 'var(--danger)' }}>
              <CreditCard size={13} />
            </span>
          </div>
          <p className="stat-value" style={{ color: 'var(--danger)' }}>{h(total)}</p>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
            {transactions.length} compras
          </p>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between mb-3">
            <p className="stat-label">Mês Anterior</p>
            <span className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: diff > 0 ? 'var(--danger-bg)' : 'var(--success-bg)',
                       color: diff > 0 ? 'var(--danger)' : 'var(--success)' }}>
              <CreditCard size={13} />
            </span>
          </div>
          <p className="stat-value" style={{ color: prevTotal > 0 ? 'var(--text)' : 'var(--text-muted)' }}>
            {hidden ? '••••••' : prevTotal > 0 ? fmt(prevTotal) : 'R$ 0,00'}
          </p>
          <p style={{ fontSize: 11, marginTop: 6,
                      color: diffPct !== null ? (diff > 0 ? 'var(--danger)' : 'var(--success)') : 'var(--text-muted)' }}>
            {diffPct !== null
              ? `${diff > 0 ? '▲' : '▼'} ${Math.abs(diffPct)}% vs mês anterior`
              : 'Sem base para comparar'}
          </p>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between mb-3">
            <p className="stat-label">Ticket Médio</p>
            <span className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: 'var(--info-bg)', color: 'var(--info)' }}>
              <CreditCard size={13} />
            </span>
          </div>
          <p className="stat-value" style={{ color: 'var(--info)' }}>
            {hidden ? '••••••' : transactions.length > 0 ? fmt(total / transactions.length) : fmt(0)}
          </p>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>Por transação</p>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between mb-3">
            <p className="stat-label">Pessoas</p>
            <span className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: 'var(--warning-bg)', color: 'var(--warning)' }}>
              <Users size={13} />
            </span>
          </div>
          <p className="stat-value" style={{ color: 'var(--warning)' }}>{numPersons}</p>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
            Com gastos no mês
          </p>
        </div>
      </div>

      {/* Por categoria + Por pessoa */}
      {!loading && transactions.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6 animate-fade-up-2">

          {/* Por categoria */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-3"
              style={{ color: 'var(--text-muted)' }}>Por Categoria</p>
            <div className="card px-5 py-4">
              <div className="space-y-3">
                {byCategory.map(cat => (
                  <div key={cat.name}>
                    <div className="flex justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: cat.color }} />
                        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{cat.name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          {total > 0 ? Math.round((cat.total / total) * 100) : 0}%
                        </span>
                        <span style={{ fontSize: 13, fontFamily: 'DM Mono, monospace',
                                       color: 'var(--text)', fontWeight: 500, whiteSpace: 'nowrap' }}>
                          {h(cat.total)}
                        </span>
                      </div>
                    </div>
                    <div className="progress-track" style={{ height: 5 }}>
                      <div className="progress-fill"
                        style={{ width: `${total > 0 ? (cat.total / total) * 100 : 0}%`, background: cat.color }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Por pessoa */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-3"
              style={{ color: 'var(--text-muted)' }}>Por Pessoa</p>
            <div className="card px-5 py-4">
              {byMember.map((m, i) => (
                <div key={m.name} className={i > 0 ? 'mt-4' : ''}>
                  <div className="flex justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                        style={{
                          background: i === 0 ? 'rgba(0,196,122,0.15)' : 'rgba(59,130,246,0.15)',
                          color:      i === 0 ? 'var(--brand)' : 'var(--info)',
                        }}>
                        {m.name[0]}
                      </div>
                      <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{m.name}</span>
                    </div>
                    <span style={{ fontSize: 13, fontFamily: 'DM Mono, monospace',
                                   color: 'var(--text)', fontWeight: 500 }}>
                      {h(m.total)}
                    </span>
                  </div>
                  <div className="progress-track" style={{ height: 5 }}>
                    <div className="progress-fill" style={{
                      width: `${total > 0 ? (m.total / total) * 100 : 0}%`,
                      background: i === 0 ? 'var(--brand)' : 'var(--info)',
                    }} />
                  </div>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                    {total > 0 ? Math.round((m.total / total) * 100) : 0}% do total
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Evolução mensal */}
      <div className="mb-6 animate-fade-up-2">
        <p className="text-xs font-semibold uppercase tracking-wider mb-3"
          style={{ color: 'var(--text-muted)' }}>Evolução Mensal</p>
        <div className="card px-6 py-5">
          <div className="flex items-end gap-3" style={{ height: 140 }}>
            {evolution.map((e, i) => {
              const isSelected = e.month === month
              const barH       = maxEvolution > 0 ? (e.total / maxEvolution) * 100 : 0
              const heightPx   = Math.max(barH * 1.0, e.total > 0 ? 4 : 2)
              return (
                <div key={e.month} className="flex-1 flex flex-col items-center gap-2"
                  style={{ cursor: 'pointer' }}
                  onClick={() => setMonth(e.month)}>
                  <span style={{
                    fontSize: 10, fontFamily: 'DM Mono, monospace',
                    color: isSelected ? 'var(--brand)' : 'var(--text-muted)',
                    fontWeight: isSelected ? 700 : 400,
                  }}>
                    {hidden ? '\u2022\u2022\u2022' : e.total > 0 ? fmt(e.total).replace('R$\u00a0', '') : '0,00'}
                  </span>
                  <div className="w-full flex items-end" style={{ flex: 1 }}>
                    <div className="w-full rounded-lg transition-all"
                      style={{
                        height: `${heightPx}px`,
                        background: isSelected
                          ? 'var(--brand)'
                          : e.total > 0
                            ? 'rgba(59,130,246,0.5)'
                            : 'var(--bg-elevated)',
                        border: isSelected ? '1px solid var(--brand)' : '1px solid transparent',
                        minHeight: 4,
                      }} />
                  </div>
                  <span style={{
                    fontSize: 10,
                    color: isSelected ? 'var(--brand)' : 'var(--text-muted)',
                    fontWeight: isSelected ? 600 : 400,
                  }}>
                    {monthLabel(e.month)}
                  </span>
                </div>
              )
            })}
          </div>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
            Clique em um mês para ver o detalhamento
          </p>
        </div>
      </div>

      {/* Tabela completa — do maior para o menor */}
      <div className="animate-fade-up-3">
        <p className="text-xs font-semibold uppercase tracking-wider mb-3"
          style={{ color: 'var(--text-muted)' }}>
          Todas as Transações do Cartão
        </p>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-5 h-5 rounded-full border-2 animate-spin"
              style={{ borderColor: 'var(--brand)', borderTopColor: 'transparent' }} />
          </div>
        ) : sortedTxs.length === 0 ? (
          <div className="card flex flex-col items-center justify-center py-16 gap-4 text-center"
            style={{ borderStyle: 'dashed' }}>
            <CreditCard size={28} style={{ color: 'var(--text-muted)' }} />
            <div>
              <p style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>
                Nenhuma transação em {monthLabel(month)}
              </p>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                Importe o CSV do Nubank para ver o detalhamento
              </p>
            </div>
            <a href="/dashboard/import" className="btn btn-primary btn-sm">Importar CSV</a>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border)' }}>
                  {['Data', 'Descrição', 'Categoria', 'Quem', 'Valor'].map((h, i) => (
                    <th key={h} style={{
                      padding: '10px 16px', textAlign: i === 4 ? 'right' : 'left',
                      fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
                      letterSpacing: '0.07em', color: 'var(--text-muted)',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedTxs.map(tx => (
                  <tr key={tx.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <td style={{ padding: '11px 16px', fontSize: 12,
                                 fontFamily: 'DM Mono, monospace', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {formatDate(tx.date)}
                    </td>
                    <td style={{ padding: '11px 16px' }}>
                      <p style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>
                        {tx.description}
                      </p>
                      <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>
                        {tx.raw_title}
                      </p>
                    </td>
                    <td style={{ padding: '11px 16px' }}>
                      {tx.categories ? (
                        <span className="badge" style={{
                          color:       (tx.categories as any).color,
                          background:  `${(tx.categories as any).color}18`,
                          borderColor: `${(tx.categories as any).color}40`,
                          fontSize: 11,
                        }}>
                          {(tx.categories as any).name}
                        </span>
                      ) : (
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: '11px 16px', fontSize: 12, color: 'var(--text-secondary)' }}>
                      {(tx as any).imported_by_name ?? '—'}
                    </td>
                    <td style={{ padding: '11px 16px', textAlign: 'right',
                                 fontFamily: 'DM Mono, monospace', fontSize: 13,
                                 fontWeight: 600, color: 'var(--danger)', whiteSpace: 'nowrap' }}>
                      {h(Number(tx.amount))}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: 'var(--bg-elevated)', borderTop: '1px solid var(--border)' }}>
                  <td colSpan={3} style={{ padding: '10px 16px', fontSize: 12, color: 'var(--text-muted)' }}>
                    {sortedTxs.length} transações
                  </td>
                  <td />
                  <td style={{ padding: '10px 16px', textAlign: 'right',
                               fontFamily: 'DM Mono, monospace', fontSize: 14,
                               fontWeight: 700, color: 'var(--danger)' }}>
                    {h(total)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
