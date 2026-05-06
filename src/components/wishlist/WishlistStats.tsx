'use client'
import type { WishItem } from '@/lib/types/wishlist'

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

export default function WishlistStats({ items }: { items: WishItem[] }) {
  const active    = items.filter(i => i.status !== 'comprado')
  const bought    = items.filter(i => i.status === 'comprado')
  const totalGoal = active.reduce((s, i) => s + (i.target_price ?? 0), 0)
  const totalSaved = active.reduce((s, i) => s + i.saved_amount, 0)
  const pct = totalGoal > 0 ? Math.round((totalSaved / totalGoal) * 100) : 0

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6 animate-fade-up-1">
      <div className="card" style={{ padding: '14px 16px' }}>
        <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>
          Itens ativos
        </p>
        <p className="text-2xl font-bold" style={{ color: 'var(--text)' }}>{active.length}</p>
      </div>
      <div className="card" style={{ padding: '14px 16px' }}>
        <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>
          Total desejado
        </p>
        <p className="text-lg font-bold" style={{ color: 'var(--text)', fontFamily: 'DM Mono, monospace' }}>
          {fmt(totalGoal)}
        </p>
      </div>
      <div className="card" style={{ padding: '14px 16px' }}>
        <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>
          Já juntado
        </p>
        <p className="text-lg font-bold" style={{ color: 'var(--brand)', fontFamily: 'DM Mono, monospace' }}>
          {fmt(totalSaved)}
        </p>
        {totalGoal > 0 && (
          <div className="mt-2">
            <div className="progress-track" style={{ height: 4 }}>
              <div className="progress-fill" style={{ width: `${pct}%` }} />
            </div>
            <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{pct}% do total</p>
          </div>
        )}
      </div>
      <div className="card" style={{ padding: '14px 16px' }}>
        <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>
          Comprados
        </p>
        <p className="text-2xl font-bold" style={{ color: 'var(--info)' }}>{bought.length}</p>
      </div>
    </div>
  )
}
