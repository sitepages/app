'use client'
import { useState, useRef } from 'react'
import {
  GripVertical, ImageIcon, ExternalLink, MoreVertical,
  Pencil, Trash2, ArrowRight,
} from 'lucide-react'
import { getWishItemProgress } from '@/lib/types/wishlist'
import type { WishItem, WishItemStatus } from '@/lib/types/wishlist'

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

function fmtDate(iso: string) {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

const STATUS_LABELS: Record<WishItemStatus, string> = {
  quero: 'Quero',
  economizando: 'Economizando',
  comprado: 'Comprado',
}

interface Props {
  item: WishItem
  rank: number
  onEdit: () => void
  onDelete: () => void
  onMove: (status: WishItemStatus) => void
  onDragStart: (e: React.DragEvent) => void
  onDragEnd: (e: React.DragEvent) => void
  onDragOver: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent) => void
  isDragging: boolean
}

export default function WishCard({
  item, rank, onEdit, onDelete, onMove,
  onDragStart, onDragEnd, onDragOver, onDrop, isDragging,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const { percentage, remaining, isComplete } = getWishItemProgress(item)
  const hasPrice = !!item.target_price && item.target_price > 0

  const isPastDue = item.target_date && !item.purchase_date
    && new Date(item.target_date) < new Date()

  const OTHER_STATUSES = (['quero', 'economizando', 'comprado'] as WishItemStatus[])
    .filter(s => s !== item.status)

  const isTop = rank === 0 && item.status === 'quero'

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDrop={onDrop}
      style={{
        background: 'var(--bg-card)',
        border: `1px solid ${isTop ? 'var(--brand)' : 'var(--border)'}`,
        borderRadius: 12,
        overflow: 'hidden',
        opacity: isDragging ? 0.4 : item.status === 'comprado' ? 0.7 : 1,
        transition: 'opacity 0.15s, border-color 0.15s',
        cursor: 'grab',
        borderLeft: isTop ? '3px solid var(--brand)' : undefined,
      }}
    >
      {/* Image */}
      {item.image_url ? (
        <div style={{ aspectRatio: '16/9', overflow: 'hidden', position: 'relative' }}>
          <img
            src={item.image_url}
            alt={item.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        </div>
      ) : (
        <div style={{
          aspectRatio: '16/9',
          background: 'var(--bg-elevated)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <ImageIcon size={28} style={{ color: 'var(--text-muted)', opacity: 0.4 }} />
        </div>
      )}

      <div style={{ padding: '10px 12px 12px' }}>
        {/* Top row: grip + rank + menu */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <GripVertical size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            <span style={{
              fontSize: 11, fontWeight: 600, color: 'var(--text-muted)',
              fontFamily: 'DM Mono, monospace',
            }}>#{rank + 1}</span>
          </div>
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setMenuOpen(o => !o)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--text-muted)', padding: '2px 4px', borderRadius: 4,
              }}
            >
              <MoreVertical size={15} />
            </button>
            {menuOpen && (
              <div
                ref={menuRef}
                onMouseLeave={() => setMenuOpen(false)}
                style={{
                  position: 'absolute', right: 0, top: '100%', zIndex: 10,
                  background: 'var(--bg-card)', border: '1px solid var(--border)',
                  borderRadius: 8, padding: '4px 0', minWidth: 160,
                  boxShadow: 'var(--shadow-lg)',
                }}
              >
                <button
                  onClick={() => { setMenuOpen(false); onEdit() }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-white/5"
                  style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text)' }}
                >
                  <Pencil size={13} /> Editar
                </button>
                {OTHER_STATUSES.map(s => (
                  <button
                    key={s}
                    onClick={() => { setMenuOpen(false); onMove(s) }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-white/5"
                    style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text)' }}
                  >
                    <ArrowRight size={13} /> Mover para {STATUS_LABELS[s]}
                  </button>
                ))}
                <button
                  onClick={() => { setMenuOpen(false); onDelete() }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-white/5"
                  style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--danger)' }}
                >
                  <Trash2 size={13} /> Excluir
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Name + link */}
        <div className="flex items-start gap-1.5 mb-2">
          <p className="font-semibold text-sm flex-1 leading-snug" style={{ color: 'var(--text)' }}>
            {item.name}
          </p>
          {item.url && (
            <a href={item.url} target="_blank" rel="noopener noreferrer"
              style={{ color: 'var(--info)', flexShrink: 0, marginTop: 2 }}>
              <ExternalLink size={13} />
            </a>
          )}
        </div>

        {/* Category badge */}
        {item.category && (
          <span className="badge" style={{
            background: `${item.category.color ?? 'var(--brand)'}22`,
            color: item.category.color ?? 'var(--brand)',
            border: `1px solid ${item.category.color ?? 'var(--brand)'}44`,
            fontSize: 10, marginBottom: 8, display: 'inline-block',
          }}>
            {item.category.icon && <span style={{ marginRight: 3 }}>{item.category.icon}</span>}
            {item.category.name}
          </span>
        )}

        {/* Progress */}
        {hasPrice && (
          <div style={{ marginBottom: 8 }}>
            <div className="progress-track" style={{ height: 5 }}>
              <div
                className="progress-fill"
                style={{
                  width: `${percentage}%`,
                  background: isComplete ? 'var(--brand)' : undefined,
                }}
              />
            </div>
            <div className="flex justify-between mt-1">
              {isComplete ? (
                <span style={{ fontSize: 10, color: 'var(--brand)', fontWeight: 600 }}>
                  ✓ Meta atingida!
                </span>
              ) : (
                <>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace' }}>
                    Juntado: {fmt(item.saved_amount)}
                  </span>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace' }}>
                    Falta: {fmt(remaining)}
                  </span>
                </>
              )}
            </div>
          </div>
        )}

        {/* Dates */}
        {item.status === 'comprado' && item.purchase_date && (
          <p style={{ fontSize: 10, color: 'var(--info)' }}>
            Comprado em {fmtDate(item.purchase_date)}
          </p>
        )}
        {item.target_date && item.status !== 'comprado' && (
          <p style={{ fontSize: 10, color: isPastDue ? 'var(--danger)' : 'var(--text-muted)' }}>
            Prazo: {fmtDate(item.target_date)}{isPastDue ? ' — Vencido' : ''}
          </p>
        )}
      </div>
    </div>
  )
}
