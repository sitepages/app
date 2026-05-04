'use client'
import { useState } from 'react'
import { CheckCircle, X } from 'lucide-react'
import type { ShoppingList, ShoppingListItem } from '@/hooks/useShoppingList'

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

export function ShoppingListFinalizeButton({ list, items, onFinalize, loading }: {
  list: ShoppingList
  items: ShoppingListItem[]
  onFinalize: () => Promise<string | null>
  loading: boolean
}) {
  const [confirming, setConfirming]   = useState(false)
  const [finalizing, setFinalizing]   = useState(false)

  const checkedItems = items.filter(i => i.is_checked)
  const disabled = checkedItems.length === 0 || finalizing || loading

  const checkedTotal = checkedItems.reduce((s, i) =>
    s + (Number(i.actual_price ?? i.estimated_price ?? 0) * Number(i.quantity)), 0)

  async function handleConfirm() {
    setFinalizing(true)
    await onFinalize()
    setFinalizing(false)
    setConfirming(false)
  }

  return (
    <>
      <button
        onClick={() => setConfirming(true)}
        disabled={disabled}
        className="btn btn-primary w-full"
      >
        <CheckCircle size={15} />
        {finalizing
          ? 'Finalizando...'
          : `Finalizar compra (${checkedItems.length} item${checkedItems.length !== 1 ? 's' : ''})`}
      </button>

      {confirming && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', padding: 24,
        }} onClick={e => { if (e.target === e.currentTarget) setConfirming(false) }}>
          <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 16, padding: 28, width: '100%', maxWidth: 400,
            boxShadow: 'var(--shadow-lg)',
          }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-base" style={{ color: 'var(--text)' }}>
                Finalizar lista?
              </h2>
              <button onClick={() => setConfirming(false)}
                className="btn btn-ghost btn-sm" style={{ padding: '4px 8px' }}>
                <X size={16} />
              </button>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 18, lineHeight: 1.6 }}>
              {checkedItems.length} item{checkedItems.length !== 1 ? 's' : ''} serão registrados como
              uma sessão de mercado.{' '}
              Total:{' '}
              <span style={{ fontFamily: 'DM Mono, monospace', fontWeight: 600, color: 'var(--danger)' }}>
                {fmt(checkedTotal)}
              </span>
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="btn btn-secondary flex-1"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirm}
                disabled={finalizing}
                className="btn btn-primary flex-1"
              >
                {finalizing ? 'Finalizando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
