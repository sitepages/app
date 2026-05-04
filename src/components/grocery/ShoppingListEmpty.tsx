'use client'
import { useState } from 'react'
import { ShoppingCart, Plus } from 'lucide-react'

export function ShoppingListEmpty({ onCreate }: {
  onCreate: (name: string, budget?: number) => void
}) {
  const [name, setName]     = useState('')
  const [budget, setBudget] = useState('')

  return (
    <div className="card flex flex-col items-center justify-center py-16 gap-5 text-center"
      style={{ borderStyle: 'dashed' }}>
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
        style={{ background: 'var(--brand-bg)', border: '1px solid var(--brand-border)' }}>
        <ShoppingCart size={22} style={{ color: 'var(--brand)' }} />
      </div>
      <div>
        <p className="font-semibold" style={{ color: 'var(--text)' }}>Nenhuma lista ativa</p>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          Crie uma lista para organizar suas compras
        </p>
      </div>
      <div className="w-full max-w-xs flex flex-col gap-3">
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          className="input"
          placeholder="Nome da lista (opcional)"
        />
        <input
          type="number"
          value={budget}
          onChange={e => setBudget(e.target.value)}
          className="input"
          placeholder="Orçamento em R$ (opcional)"
          step="0.01"
          min="0"
        />
        <button
          onClick={() => onCreate(name.trim() || 'Lista de compras', budget ? parseFloat(budget) : undefined)}
          className="btn btn-primary"
        >
          <Plus size={14} /> Nova lista
        </button>
      </div>
    </div>
  )
}
