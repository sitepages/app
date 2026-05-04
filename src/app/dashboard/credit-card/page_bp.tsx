'use client'
import { useState } from 'react'
import { useTransactions } from '@/hooks/useTransactions'
import { CreditCard, Upload } from 'lucide-react'

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

export default function CreditCardPage() {
  const [month, setMonth] = useState(getDefaultMonth())
  const { transactions, loading } = useTransactions(HOUSEHOLD_ID, {
    month, type: 'EXPENSE',
  })

  const total = transactions.reduce((s, t) => s + Math.abs(Number(t.amount)), 0)

  // Por categoria
  const catMap: Record<string, { name: string; color: string; total: number; count: number }> = {}
  transactions.forEach(tx => {
    const cat   = (tx.categories as any)
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
  const byMember = Object.values(memberMap).sort((a, b) => b.total - a.total)

  // Top 10
  const top10 = [...transactions]
    .sort((a, b) => Math.abs(Number(b.amount)) - Math.abs(Number(a.amount)))
    .slice(0, 10)

  return (
    <div className="p-7 max-w-[1100px] mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between mb-7 animate-fade-up">
        <div>
          <h1 className="page-title">Análise do Cartão</h1>
          <p className="page-subtitle">Detalhamento dos gastos do cartão de crédito</p>
        </div>
        <div className="flex gap-3">
          <input type="month" value={month} onChange={e => setMonth(e.target.value)}
            className="input" style={{ width: 'auto' }} />
          <a href="/dashboard/import" className="btn btn-primary">
            <Upload size={14} /> Importar CSV
          </a>
        </div>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-3 gap-4 mb-6 animate-fade-up-1">
        <div className="stat-card" style={{ borderColor: 'rgba(248,113,113,0.2)' }}>
          <div className="flex items-center justify-between mb-3">
            <p className="stat-label">Total do Mês</p>
            <span className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: 'var(--danger-bg)', color: 'var(--danger)' }}>
              <CreditCard size={13} />
            </span>
          </div>
          <p className="stat-value" style={{ color: 'var(--danger)' }}>{fmt(total)}</p>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
            {transactions.length} transações em {monthLabel(month)}
          </p>
        </div>

        <div className="stat-card">
          <p className="stat-label">Maior categoria</p>
          {byCategory[0] ? (
            <>
              <div className="flex items-center gap-2 mt-2">
                <span className="w-2 h-2 rounded-full" style={{ background: byCategory[0].color }} />
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
                  {byCategory[0].name}
                </p>
              </div>
              <p style={{ fontSize: 18, fontFamily: 'DM Mono, monospace', fontWeight: 700,
                           color: byCategory[0].color, marginTop: 4 }}>
                {fmt(byCategory[0].total)}
              </p>
            </>
          ) : (
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 8 }}>—</p>
          )}
        </div>

        <div className="stat-card">
          <p className="stat-label">Ticket médio</p>
          <p className="stat-value" style={{ color: 'var(--info)', marginTop: 8 }}>
            {transactions.length > 0 ? fmt(total / transactions.length) : fmt(0)}
          </p>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>por transação</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-5 h-5 rounded-full border-2 animate-spin"
            style={{ borderColor: 'var(--brand)', borderTopColor: 'transparent' }} />
        </div>
      ) : transactions.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-20 gap-4 text-center"
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
        <div className="grid grid-cols-2 gap-5 animate-fade-up-2">

          {/* Por categoria */}
          <section>
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
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>({cat.count}x)</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          {total > 0 ? Math.round((cat.total / total) * 100) : 0}%
                        </span>
                        <span style={{ fontSize: 13, fontFamily: 'DM Mono, monospace',
                                       color: 'var(--text)', fontWeight: 500 }}>
                          {fmt(cat.total)}
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
          </section>

          {/* Por pessoa + Top 10 */}
          <section className="space-y-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-3"
                style={{ color: 'var(--text-muted)' }}>Por Pessoa</p>
              <div className="card px-5 py-4">
                {byMember.map((m, i) => (
                  <div key={m.name} className={i > 0 ? 'mt-4' : ''}>
                    <div className="flex justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                          style={{
                            background: i === 0 ? 'rgba(0,196,122,0.15)' : 'rgba(59,130,246,0.15)',
                            color: i === 0 ? 'var(--brand)' : 'var(--info)',
                          }}>
                          {m.name[0]}
                        </div>
                        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{m.name}</span>
                      </div>
                      <span style={{ fontSize: 13, fontFamily: 'DM Mono, monospace',
                                     color: 'var(--text)', fontWeight: 500 }}>
                        {fmt(m.total)}
                      </span>
                    </div>
                    <div className="progress-track" style={{ height: 5 }}>
                      <div className="progress-fill" style={{
                        width: `${total > 0 ? (m.total / total) * 100 : 0}%`,
                        background: i === 0 ? 'var(--brand)' : 'var(--info)',
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-3"
                style={{ color: 'var(--text-muted)' }}>Top 10 Maiores Gastos</p>
              <div className="card overflow-hidden">
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <tbody>
                    {top10.map((tx, i) => (
                      <tr key={tx.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '9px 12px', width: 28 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
                                         fontFamily: 'DM Mono, monospace' }}>
                            {i + 1}
                          </span>
                        </td>
                        <td style={{ padding: '9px 4px' }}>
                          <p style={{ fontSize: 12, color: 'var(--text)', fontWeight: 500 }}>
                            {tx.description}
                          </p>
                          <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>
                            {formatDate(tx.date)}
                            {tx.categories && (
                              <span style={{ color: (tx.categories as any).color, marginLeft: 6 }}>
                                {(tx.categories as any).name}
                              </span>
                            )}
                          </p>
                        </td>
                        <td style={{ padding: '9px 12px', textAlign: 'right',
                                     fontFamily: 'DM Mono, monospace', fontSize: 13,
                                     fontWeight: 600, color: 'var(--danger)', whiteSpace: 'nowrap' }}>
                          {fmt(Number(tx.amount))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

        </div>
      )}
    </div>
  )
}
