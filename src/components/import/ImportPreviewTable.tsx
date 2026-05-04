'use client'

import type { ClassifiedTransaction } from '@/lib/classifier'
import type { Category }              from '@/hooks/useCategories'

interface ImportPreviewTableProps {
  transactions:     ClassifiedTransaction[]
  categories:       Category[]
  onChangeCategory: (index: number, categoryId: string) => void
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

export default function ImportPreviewTable({
  transactions,
  categories,
  onChangeCategory,
}: ImportPreviewTableProps) {

  const totalExpenses = transactions
    .filter(tx => tx.transaction_type === 'EXPENSE')
    .reduce((s, tx) => s + tx.amount, 0)

  const totalIncome = transactions
    .filter(tx => tx.transaction_type === 'INCOME')
    .reduce((s, tx) => s + tx.amount, 0)

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ border: '1px solid var(--border)' }}
    >
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border)' }}>
            {['Data', 'Tipo', 'Descrição', 'Título original', 'Categoria', 'Valor'].map(h => (
              <th key={h} style={{
                padding: '10px 14px',
                textAlign: h === 'Valor' ? 'right' : 'left',
                fontSize: 11,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.07em',
                color: 'var(--text-muted)',
              }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {transactions.map((tx, i) => (
            <tr
              key={i}
              style={{ borderBottom: '1px solid var(--border-subtle)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              {/* Data */}
              <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace', whiteSpace: 'nowrap' }}>
                {formatDate(tx.date)}
              </td>

              {/* Tipo — badge */}
              <td style={{ padding: '10px 14px' }}>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '2px 8px',
                  borderRadius: 20,
                  fontSize: 11,
                  fontWeight: 500,
                  background: tx.transaction_type === 'EXPENSE' ? 'var(--danger-bg)' : 'var(--success-bg)',
                  color:      tx.transaction_type === 'EXPENSE' ? 'var(--danger)'    : 'var(--success)',
                  border:     `1px solid ${tx.transaction_type === 'EXPENSE' ? 'rgba(248,113,113,0.2)' : 'rgba(0,196,122,0.2)'}`,
                }}>
                  {tx.transaction_type === 'EXPENSE' ? 'Gasto' : 'Crédito'}
                </span>
              </td>

              {/* Descrição */}
              <td style={{ padding: '10px 14px', fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>
                {tx.description}
              </td>

              {/* Título original */}
              <td style={{ padding: '10px 14px', fontSize: 11, color: 'var(--text-muted)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {tx.raw_title}
              </td>

              {/* Categoria — só para gastos */}
              <td style={{ padding: '10px 14px' }}>
                {tx.transaction_type === 'EXPENSE' ? (
                  <select
                    value={tx.category_id ?? ''}
                    onChange={e => onChangeCategory(i, e.target.value)}
                    style={{
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border-strong)',
                      borderRadius: 7,
                      padding: '4px 8px',
                      fontSize: 12,
                      color: 'var(--text)',
                      outline: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    <option value="">Sem categoria</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                ) : (
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>—</span>
                )}
              </td>

              {/* Valor */}
              <td style={{
                padding: '10px 14px',
                textAlign: 'right',
                fontSize: 13,
                fontWeight: 600,
                fontFamily: 'DM Mono, monospace',
                color: tx.transaction_type === 'EXPENSE' ? 'var(--danger)' : 'var(--success)',
                whiteSpace: 'nowrap',
              }}>
                {tx.transaction_type === 'EXPENSE' ? '-' : '+'}{formatCurrency(tx.amount)}
              </td>
            </tr>
          ))}
        </tbody>

        {/* Totais */}
        <tfoot>
          <tr style={{ background: 'var(--bg-card)', borderTop: '1px solid var(--border)' }}>
            <td colSpan={3} style={{ padding: '10px 14px', fontSize: 12, color: 'var(--text-muted)' }}>
              {transactions.length} transações &nbsp;·&nbsp;
              <span style={{ color: 'var(--danger)' }}>
                {transactions.filter(t => t.transaction_type === 'EXPENSE').length} gastos
              </span>
              &nbsp;·&nbsp;
              <span style={{ color: 'var(--success)' }}>
                {transactions.filter(t => t.transaction_type === 'INCOME').length} créditos
              </span>
            </td>
            <td colSpan={1} style={{ padding: '10px 14px', fontSize: 12, color: 'var(--text-muted)' }}>
              {transactions.filter(tx => tx.category_id && tx.transaction_type === 'EXPENSE').length} classificados
            </td>
            <td colSpan={2} style={{ padding: '10px 14px', textAlign: 'right' }}>
              <span style={{ fontSize: 12, color: 'var(--danger)', fontFamily: 'DM Mono, monospace', marginRight: 12 }}>
                -{formatCurrency(totalExpenses)}
              </span>
              <span style={{ fontSize: 12, color: 'var(--success)', fontFamily: 'DM Mono, monospace' }}>
                +{formatCurrency(totalIncome)}
              </span>
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
