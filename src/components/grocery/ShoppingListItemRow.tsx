'use client'
import { useState } from 'react'
import { X, Check } from 'lucide-react'
import type { ShoppingListItem } from '@/hooks/useShoppingList'

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

export function ShoppingListItemRow({ item, onToggle, onRemove, onPriceUpdate }: {
  item: ShoppingListItem
  onToggle: (id: string) => void
  onRemove: (id: string) => void
  onPriceUpdate: (id: string, price: number) => void
}) {
  const [editingPrice, setEditingPrice] = useState(false)
  const [priceInput, setPriceInput]     = useState('')

  function handleToggle() {
    onToggle(item.id)
    if (!item.is_checked) {
      setEditingPrice(true)
      setPriceInput(item.estimated_price ? String(item.estimated_price) : '')
    } else {
      setEditingPrice(false)
    }
  }

  function commitPrice() {
    const v = parseFloat(priceInput)
    if (!isNaN(v) && v > 0) onPriceUpdate(item.id, v)
    setEditingPrice(false)
  }

  const diff = item.actual_price != null && item.estimated_price != null
    ? item.actual_price - item.estimated_price
    : null

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '10px 16px', borderBottom: '1px solid var(--border-subtle)',
      opacity: item.is_checked ? 0.55 : 1, transition: 'opacity 0.2s',
    }}>
      {/* Check circle */}
      <button onClick={handleToggle} style={{
        width: 22, height: 22, borderRadius: '50%', flexShrink: 0, cursor: 'pointer',
        border: `2px solid ${item.is_checked ? 'var(--brand)' : 'var(--border-strong)'}`,
        background: item.is_checked ? 'var(--brand)' : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.15s',
      }}>
        {item.is_checked && <Check size={12} color="white" />}
      </button>

      {/* Name + meta */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontSize: 14, fontWeight: 500, color: 'var(--text)',
          textDecoration: item.is_checked ? 'line-through' : 'none',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {item.product_name}
        </p>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 2, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            {item.quantity} {item.unit ?? ''}
          </span>
          {item.estimated_price != null && (
            <span style={{ fontSize: 11, fontFamily: 'DM Mono, monospace', color: 'var(--text-muted)' }}>
              est. {fmt(item.estimated_price)}
            </span>
          )}
          {diff !== null && (
            <span style={{ fontSize: 11, fontFamily: 'DM Mono, monospace', color: diff > 0 ? 'var(--danger)' : 'var(--success)' }}>
              {diff > 0 ? '+' : ''}{fmt(diff)}
            </span>
          )}
          {item.category_hint && (
            <span className="badge" style={{ fontSize: 10 }}>{item.category_hint}</span>
          )}
        </div>
      </div>

      {/* Actual price */}
      <div style={{ flexShrink: 0 }}>
        {item.actual_price != null && !editingPrice ? (
          <button
            onClick={() => { setEditingPrice(true); setPriceInput(String(item.actual_price)) }}
            style={{ fontSize: 13, fontFamily: 'DM Mono, monospace', fontWeight: 600,
                     color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer' }}>
            {fmt(item.actual_price)}
          </button>
        ) : editingPrice ? (
          <input
            type="number"
            step="0.01"
            min="0"
            value={priceInput}
            onChange={e => setPriceInput(e.target.value)}
            onBlur={commitPrice}
            onKeyDown={e => {
              if (e.key === 'Enter') commitPrice()
              if (e.key === 'Escape') setEditingPrice(false)
            }}
            autoFocus
            className="input"
            style={{ width: 80, padding: '4px 8px', fontSize: 12 }}
          />
        ) : null}
      </div>

      {/* Remove */}
      <button
        onClick={() => onRemove(item.id)}
        className="btn btn-ghost btn-sm"
        style={{ padding: 4, color: 'var(--text-muted)', flexShrink: 0 }}
      >
        <X size={14} />
      </button>
    </div>
  )
}
