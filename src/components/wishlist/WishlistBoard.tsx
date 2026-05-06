'use client'
import { useState, useRef } from 'react'
import { Plus, Heart } from 'lucide-react'
import { useWishlist } from '@/hooks/useWishlist'
import WishCard from './WishCard'
import WishItemModal from './WishItemModal'
import WishlistStats from './WishlistStats'
import type { WishItem, WishItemStatus, CreateWishItemDTO } from '@/lib/types/wishlist'

const HOUSEHOLD_ID = process.env.NEXT_PUBLIC_HOUSEHOLD_ID!

const COLUMNS: { status: WishItemStatus; label: string; color: string }[] = [
  { status: 'quero',        label: 'Quero',        color: 'var(--info)' },
  { status: 'economizando', label: 'Economizando',  color: 'var(--warning)' },
  { status: 'comprado',     label: 'Comprado',      color: 'var(--brand)' },
]

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

export default function WishlistBoard() {
  const {
    items, categories, loading, error,
    addItem, updateItem, deleteItem, moveItem, reorderItems,
    addCategory, uploadImage,
  } = useWishlist(HOUSEHOLD_ID)

  const [modalOpen, setModalOpen]       = useState(false)
  const [editItem, setEditItem]         = useState<WishItem | null>(null)
  const [filterCat, setFilterCat]       = useState<string>('all')
  const [activeTab, setActiveTab]       = useState<WishItemStatus>('quero')
  const dragItem   = useRef<string | null>(null)
  const dragOver   = useRef<{ status: WishItemStatus; index: number } | null>(null)

  function openAdd() { setEditItem(null); setModalOpen(true) }
  function openEdit(item: WishItem) { setEditItem(item); setModalOpen(true) }

  async function handleSave(data: CreateWishItemDTO) {
    if (editItem) {
      await updateItem(editItem.id, {
        ...data,
        target_price: data.target_price,
        saved_amount: data.saved_amount ?? 0,
        updated_at: new Date().toISOString(),
      })
    } else {
      await addItem(data)
    }
  }

  async function handleAddCategory(name: string, icon?: string) {
    return await addCategory({ name, icon }) as any
  }

  function getColItems(status: WishItemStatus) {
    return items
      .filter(i => i.status === status && (filterCat === 'all' || i.category_id === filterCat))
      .sort((a, b) => a.priority - b.priority)
  }

  function colTotal(status: WishItemStatus) {
    return items
      .filter(i => i.status === status)
      .reduce((s, i) => s + (i.target_price ?? 0), 0)
  }

  function handleDragStart(e: React.DragEvent, id: string) {
    dragItem.current = id
    e.dataTransfer.effectAllowed = 'move'
  }

  function handleDragEnd() {
    dragItem.current = null
    dragOver.current = null
  }

  function handleDragOver(e: React.DragEvent, status: WishItemStatus, index: number) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    dragOver.current = { status, index }
  }

  async function handleDrop(e: React.DragEvent, targetStatus: WishItemStatus, targetIndex: number) {
    e.preventDefault()
    const id = dragItem.current
    if (!id) return
    const source = items.find(i => i.id === id)
    if (!source) return
    if (source.status !== targetStatus) {
      await moveItem(id, targetStatus)
    } else {
      await reorderItems(id, targetIndex, targetStatus)
    }
  }

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="w-5 h-5 rounded-full border-2 animate-spin"
        style={{ borderColor: 'var(--brand)', borderTopColor: 'transparent' }} />
    </div>
  )

  if (error) return (
    <div className="card p-6 text-center" style={{ color: 'var(--danger)' }}>{error}</div>
  )

  const hasItems = items.length > 0

  return (
    <div className="p-4 md:p-7 max-w-[1200px] mx-auto">

      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between mb-4 md:mb-6 animate-fade-up">
        <div>
          <h1 className="page-title">Lista de Desejos</h1>
          <p className="page-subtitle">Itens que vocês desejam comprar</p>
        </div>
        <button onClick={openAdd} className="btn btn-primary self-start gap-2">
          <Plus size={16} /> Adicionar Item
        </button>
      </div>

      {/* Stats */}
      {hasItems && <WishlistStats items={items} />}

      {/* Category filter chips */}
      {categories.length > 0 && (
        <div className="flex gap-2 flex-wrap mb-4 animate-fade-up-2">
          <button
            onClick={() => setFilterCat('all')}
            className="badge"
            style={{
              cursor: 'pointer', border: `1px solid ${filterCat === 'all' ? 'var(--brand)' : 'var(--border)'}`,
              background: filterCat === 'all' ? 'var(--brand-bg)' : 'var(--bg-elevated)',
              color: filterCat === 'all' ? 'var(--brand)' : 'var(--text-muted)',
              padding: '4px 10px',
            }}
          >
            Todas
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setFilterCat(cat.id)}
              className="badge"
              style={{
                cursor: 'pointer',
                border: `1px solid ${filterCat === cat.id ? (cat.color ?? 'var(--brand)') : 'var(--border)'}`,
                background: filterCat === cat.id ? `${cat.color ?? 'var(--brand)'}22` : 'var(--bg-elevated)',
                color: filterCat === cat.id ? (cat.color ?? 'var(--brand)') : 'var(--text-muted)',
                padding: '4px 10px',
              }}
            >
              {cat.icon && <span style={{ marginRight: 4 }}>{cat.icon}</span>}
              {cat.name}
            </button>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!hasItems && (
        <div className="card flex flex-col items-center justify-center py-20 gap-4 text-center animate-fade-up-2"
          style={{ borderStyle: 'dashed' }}>
          <Heart size={40} style={{ color: 'var(--text-muted)', opacity: 0.4 }} />
          <div>
            <p className="font-semibold mb-1" style={{ color: 'var(--text)' }}>Nenhum desejo ainda</p>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Adicione itens que vocês desejam comprar
            </p>
          </div>
          <button onClick={openAdd} className="btn btn-primary gap-2">
            <Plus size={15} /> Adicionar primeiro item
          </button>
        </div>
      )}

      {/* Mobile tabs */}
      {hasItems && (
        <>
          <div className="flex md:hidden gap-1 mb-4 p-1 rounded-xl animate-fade-up-2"
            style={{ background: 'var(--bg-elevated)' }}>
            {COLUMNS.map(col => {
              const count = getColItems(col.status).length
              return (
                <button
                  key={col.status}
                  onClick={() => setActiveTab(col.status)}
                  style={{
                    flex: 1, padding: '7px 0', borderRadius: 10, border: 'none', cursor: 'pointer',
                    background: activeTab === col.status ? 'var(--bg-card)' : 'transparent',
                    color: activeTab === col.status ? col.color : 'var(--text-muted)',
                    fontSize: 12, fontWeight: 600, transition: 'all 0.15s',
                  }}
                >
                  {col.label} {count > 0 && `(${count})`}
                </button>
              )
            })}
          </div>

          {/* Mobile: single column */}
          <div className="md:hidden animate-fade-up-2">
            {COLUMNS.filter(c => c.status === activeTab).map(col => (
              <Column
                key={col.status}
                col={col}
                colItems={getColItems(col.status)}
                total={colTotal(col.status)}
                onEdit={openEdit}
                onDelete={deleteItem}
                onMove={moveItem}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                dragItemId={dragItem.current}
              />
            ))}
          </div>

          {/* Desktop: 3 columns */}
          <div className="hidden md:grid grid-cols-3 gap-4 animate-fade-up-2">
            {COLUMNS.map(col => (
              <Column
                key={col.status}
                col={col}
                colItems={getColItems(col.status)}
                total={colTotal(col.status)}
                onEdit={openEdit}
                onDelete={deleteItem}
                onMove={moveItem}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                dragItemId={dragItem.current}
              />
            ))}
          </div>
        </>
      )}

      {/* Modal */}
      {modalOpen && (
        <WishItemModal
          item={editItem}
          categories={categories}
          onSave={handleSave}
          onAddCategory={handleAddCategory}
          onUploadImage={uploadImage}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  )
}

function Column({
  col, colItems, total, onEdit, onDelete, onMove,
  onDragStart, onDragEnd, onDragOver, onDrop, dragItemId,
}: {
  col: { status: WishItemStatus; label: string; color: string }
  colItems: WishItem[]
  total: number
  onEdit: (item: WishItem) => void
  onDelete: (id: string) => void
  onMove: (id: string, status: WishItemStatus) => void
  onDragStart: (e: React.DragEvent, id: string) => void
  onDragEnd: (e: React.DragEvent) => void
  onDragOver: (e: React.DragEvent, status: WishItemStatus, index: number) => void
  onDrop: (e: React.DragEvent, status: WishItemStatus, index: number) => void
  dragItemId: string | null
}) {
  return (
    <div
      onDragOver={e => onDragOver(e, col.status, colItems.length)}
      onDrop={e => onDrop(e, col.status, colItems.length)}
      style={{ minHeight: 120 }}
    >
      {/* Column header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <span style={{
            width: 8, height: 8, borderRadius: '50%',
            background: col.color, display: 'inline-block',
          }} />
          <span className="font-semibold text-sm" style={{ color: 'var(--text)' }}>{col.label}</span>
          <span className="badge" style={{
            background: 'var(--bg-elevated)', color: 'var(--text-muted)',
            fontSize: 10, padding: '1px 6px',
          }}>{colItems.length}</span>
        </div>
        {total > 0 && (
          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace' }}>
            {fmt(total)}
          </span>
        )}
      </div>

      {/* Cards */}
      <div className="space-y-3">
        {colItems.map((item, idx) => (
          <div
            key={item.id}
            onDragOver={e => { e.stopPropagation(); onDragOver(e, col.status, idx) }}
            onDrop={e => { e.stopPropagation(); onDrop(e, col.status, idx) }}
          >
            <WishCard
              item={item}
              rank={idx}
              onEdit={() => onEdit(item)}
              onDelete={() => onDelete(item.id)}
              onMove={status => onMove(item.id, status)}
              onDragStart={e => onDragStart(e, item.id)}
              onDragEnd={onDragEnd}
              onDragOver={e => onDragOver(e, col.status, idx)}
              onDrop={e => onDrop(e, col.status, idx)}
              isDragging={dragItemId === item.id}
            />
          </div>
        ))}

        {colItems.length === 0 && (
          <div style={{
            border: '1px dashed var(--border)', borderRadius: 10,
            padding: '24px 16px', textAlign: 'center',
            color: 'var(--text-muted)', fontSize: 12,
          }}>
            Arraste itens aqui
          </div>
        )}
      </div>
    </div>
  )
}
