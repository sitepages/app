'use client'
import { Archive } from 'lucide-react'
import type { ShoppingList, ShoppingListItem } from '@/hooks/useShoppingList'

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

export function ShoppingListHeader({ list, items, onUpdateBudget, onArchive, onFinalize }: {
  list: ShoppingList
  items: ShoppingListItem[]
  onUpdateBudget: (budget: number | null) => void
  onArchive: () => void
  onFinalize: () => void
}) {
  const estimated = items.reduce((s, i) =>
    s + (Number(i.estimated_price ?? 0) * Number(i.quantity)), 0)

  const cartTotal = items
    .filter(i => i.is_checked)
    .reduce((s, i) => s + (Number(i.actual_price ?? i.estimated_price ?? 0) * Number(i.quantity)), 0)

  const checkedCount = items.filter(i => i.is_checked).length

  const budgetPct = list.budget && list.budget > 0
    ? (cartTotal / list.budget) * 100
    : null
  const budgetColor =
    budgetPct === null ? 'var(--brand)'
    : budgetPct >= 100  ? 'var(--danger)'
    : budgetPct >= 80   ? 'var(--warning)'
    :                     'var(--brand)'

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="font-semibold text-sm" style={{ color: 'var(--text)' }}>{list.name}</p>
        <button
          onClick={() => { if (confirm('Arquivar esta lista?')) onArchive() }}
          className="btn btn-ghost btn-sm"
          title="Arquivar lista"
          style={{ padding: '4px 8px' }}
        >
          <Archive size={14} />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="stat-card">
          <p className="stat-label">Estimado</p>
          <p style={{ fontSize: 15, fontFamily: 'DM Mono, monospace', fontWeight: 700, color: 'var(--info)', marginTop: 4 }}>
            {fmt(estimated)}
          </p>
        </div>
        <div className="stat-card">
          <p className="stat-label">No carrinho</p>
          <p style={{ fontSize: 15, fontFamily: 'DM Mono, monospace', fontWeight: 700, color: 'var(--success)', marginTop: 4 }}>
            {fmt(cartTotal)}
          </p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Itens</p>
          <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginTop: 4 }}>
            {checkedCount}
            <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-muted)', marginLeft: 3 }}>
              / {items.length}
            </span>
          </p>
        </div>
      </div>

      {list.budget && list.budget > 0 && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Orçamento: {fmt(list.budget)}
            </span>
            <span style={{ fontSize: 12, fontFamily: 'DM Mono, monospace', color: budgetColor }}>
              {budgetPct !== null ? `${Math.round(budgetPct)}%` : ''}
            </span>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{
              width: `${Math.min(budgetPct ?? 0, 100)}%`,
              background: budgetColor,
              transition: 'width 0.3s, background 0.3s',
            }} />
          </div>
        </div>
      )}
    </div>
  )
}
