'use client'
import { useState, useEffect, useRef } from 'react'
import { Plus, Search } from 'lucide-react'
import { createClient } from '@/services/supabase/client'
import type { ShoppingListSuggestion } from '@/hooks/useShoppingList'

const HOUSEHOLD_ID = process.env.NEXT_PUBLIC_HOUSEHOLD_ID!

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

interface ProductResult {
  id: string
  name: string
  unit: string | null
  last_price: number | null
  subcategory: string | null
}

export function ShoppingListAddItem({ suggestions, onAdd }: {
  suggestions: ShoppingListSuggestion[]
  onAdd: (item: {
    product_name: string
    quantity?: number
    unit?: string
    estimated_price?: number
    grocery_product_id?: string
  }) => void
}) {
  const [query, setQuery]       = useState('')
  const [qty, setQty]           = useState('1')
  const [unit, setUnit]         = useState('')
  const [price, setPrice]       = useState('')
  const [results, setResults]   = useState<ProductResult[]>([])
  const [selectedId, setSelectedId] = useState<string | undefined>()
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    if (!query.trim()) { setResults([]); return }
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('grocery_products')
        .select('id, name, unit, last_price, subcategory')
        .eq('household_id', HOUSEHOLD_ID)
        .ilike('name', `%${query}%`)
        .limit(6)
      setResults(data ?? [])
    }, 300)
    return () => clearTimeout(debounceRef.current)
  }, [query])

  function selectProduct(p: ProductResult) {
    setQuery(p.name)
    setUnit(p.unit ?? '')
    setPrice(p.last_price ? String(p.last_price) : '')
    setSelectedId(p.id)
    setResults([])
  }

  function selectSuggestion(s: ShoppingListSuggestion) {
    setQuery(s.product_name)
    setPrice(s.last_price ? String(s.last_price) : '')
    setSelectedId(s.grocery_product_id ?? undefined)
    setResults([])
  }

  function handleAdd() {
    if (!query.trim()) return
    onAdd({
      product_name: query.trim(),
      quantity: parseFloat(qty) || 1,
      unit: unit.trim() || undefined,
      estimated_price: price ? parseFloat(price) : undefined,
      grocery_product_id: selectedId,
    })
    setQuery('')
    setQty('1')
    setUnit('')
    setPrice('')
    setSelectedId(undefined)
    setResults([])
  }

  const visibleSuggestions = query.trim()
    ? suggestions.filter(s => s.product_name.toLowerCase().includes(query.toLowerCase())).slice(0, 6)
    : suggestions.slice(0, 6)

  return (
    <div className="card" style={{ padding: 16 }}>
      <p className="text-xs font-semibold uppercase tracking-wider mb-3"
        style={{ color: 'var(--text-muted)' }}>
        Adicionar item
      </p>

      {/* Search input with autocomplete */}
      <div style={{ position: 'relative', marginBottom: 10 }}>
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{
            position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
            color: 'var(--text-muted)', pointerEvents: 'none',
          }} />
          <input
            value={query}
            onChange={e => { setQuery(e.target.value); setSelectedId(undefined) }}
            onKeyDown={e => { if (e.key === 'Enter') handleAdd() }}
            className="input"
            placeholder="Nome do produto..."
            style={{ paddingLeft: 36 }}
          />
        </div>
        {results.length > 0 && (
          <div style={{
            position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20,
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 10, marginTop: 4, boxShadow: 'var(--shadow-lg)',
          }}>
            {results.map(p => (
              <button key={p.id} onClick={() => selectProduct(p)} style={{
                width: '100%', textAlign: 'left', padding: '9px 14px',
                background: 'none', border: 'none', cursor: 'pointer',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                borderBottom: '1px solid var(--border-subtle)',
              }}>
                <div>
                  <p style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>{p.name}</p>
                  {p.subcategory && (
                    <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.subcategory}</p>
                  )}
                </div>
                {p.last_price != null && (
                  <span style={{ fontSize: 12, fontFamily: 'DM Mono, monospace', color: 'var(--text-secondary)', flexShrink: 0 }}>
                    {fmt(p.last_price)}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Qty / unit / price / add */}
      <div className="flex gap-2 mb-3">
        <input
          type="number"
          value={qty}
          onChange={e => setQty(e.target.value)}
          className="input"
          placeholder="Qtd"
          style={{ width: 68 }}
          min="0.001"
          step="0.001"
        />
        <input
          value={unit}
          onChange={e => setUnit(e.target.value)}
          className="input"
          placeholder="UN"
          style={{ width: 60 }}
        />
        <input
          type="number"
          value={price}
          onChange={e => setPrice(e.target.value)}
          className="input"
          placeholder="R$ est."
          style={{ flex: 1 }}
          min="0"
          step="0.01"
        />
        <button
          onClick={handleAdd}
          disabled={!query.trim()}
          className="btn btn-primary"
          style={{ flexShrink: 0 }}
        >
          <Plus size={16} />
        </button>
      </div>

      {/* Suggestion chips */}
      {visibleSuggestions.length > 0 && (
        <div>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>Frequentes:</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {visibleSuggestions.map(s => (
              <button
                key={s.product_name}
                onClick={() => selectSuggestion(s)}
                className="badge"
                style={{ cursor: 'pointer', fontSize: 12, border: '1px solid var(--border)' }}
              >
                {s.product_name}
                {s.last_price != null && (
                  <span style={{ color: 'var(--text-muted)', marginLeft: 4 }}>
                    {fmt(s.last_price)}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
