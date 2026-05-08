'use client'

import { useState } from 'react'
import { useHideValues } from '@/hooks/useHideValues'
import { createClient }        from '@/services/supabase/client'
import { useTransactions }     from '@/hooks/useTransactions'
import { useCategories }       from '@/hooks/useCategories'
import { Upload, Filter, TrendingDown, TrendingUp, ArrowLeftRight } from 'lucide-react'

const HOUSEHOLD_ID = process.env.NEXT_PUBLIC_HOUSEHOLD_ID!

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Math.abs(value))
}

function getDefaultMonth(): string {
  return new Date().toISOString().slice(0, 7)
}

export default function TransactionsPage() {
  const [month,      setMonth]      = useState(getDefaultMonth())
  const [categoryId, setCategoryId] = useState('')
  const [typeFilter, setType]       = useState('')

  const { hidden } = useHideValues()
  const h = (v: number) => hidden ? '••••••' : formatCurrency(v)
  const { transactions, loading, error, refetch } = useTransactions(HOUSEHOLD_ID, {
    month,
    category_id: categoryId || undefined,
    type:        (typeFilter as any) || undefined,
  })

  const { categories } = useCategories()

  const expenses = transactions.filter(t => t.transaction_type === 'EXPENSE')
  const incomes  = transactions.filter(t => t.transaction_type === 'INCOME')
  const totalExp = expenses.reduce((s, t) => s + Math.abs(t.amount), 0)
  const totalInc = incomes.reduce((s, t)  => s + Math.abs(t.amount), 0)

  return (
    <div className="p-4 md:p-7 max-w-[1100px] mx-auto">

      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between mb-4 md:mb-7 animate-fade-up">
        <div>
          <h1 className="page-title">Transações</h1>
          <p className="page-subtitle">Histórico completo do casal</p>
        </div>
        <a href="/dashboard/import" className="btn btn-primary self-start">
          <Upload size={14} /> <span className="hidden sm:inline">Importar CSV</span>
        </a>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 animate-fade-up-1">
        <div className="stat-card">
          <div className="flex items-center justify-between mb-3">
            <p className="stat-label">Gastos do mês</p>
            <span className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: 'var(--danger-bg)', color: 'var(--danger)' }}>
              <TrendingDown size={13} />
            </span>
          </div>
          <p className="stat-value" style={{ color: 'var(--danger)' }}>{h(totalExp)}</p>
          <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 6 }}>{expenses.length} transações</p>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between mb-3">
            <p className="stat-label">Créditos do mês</p>
            <span className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: 'var(--success-bg)', color: 'var(--success)' }}>
              <TrendingUp size={13} />
            </span>
          </div>
          <p className="stat-value" style={{ color: 'var(--success)' }}>{h(totalInc)}</p>
          <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 6 }}>{incomes.length} transações</p>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between mb-3">
            <p className="stat-label">Saldo do mês</p>
            <span className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: 'var(--info-bg)', color: 'var(--info)' }}>
              <ArrowLeftRight size={13} />
            </span>
          </div>
          <p className="stat-value" style={{ color: totalInc - totalExp >= 0 ? 'var(--success)' : 'var(--danger)' }}>
            {hidden ? '••••••' : `${totalInc - totalExp >= 0 ? '+' : '-'}${formatCurrency(totalInc - totalExp)}`}
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 6 }}>{transactions.length} total</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="card px-4 py-3 mb-5 flex flex-wrap items-center gap-3 animate-fade-up-2">
        <Filter size={13} style={{ color: 'var(--text-muted)' }} />

        <input
          type="month" value={month} onChange={e => setMonth(e.target.value)}
          className="input" style={{ width: 'auto' }}
        />

        <select value={typeFilter} onChange={e => setType(e.target.value)}
          className="input" style={{ width: 'auto' }}>
          <option value="">Todos os tipos</option>
          <option value="EXPENSE">Gastos</option>
          <option value="INCOME">Créditos</option>
        </select>

        <select value={categoryId} onChange={e => setCategoryId(e.target.value)}
          className="input" style={{ width: 'auto' }}>
          <option value="">Todas as categorias</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        {(month !== getDefaultMonth() || typeFilter || categoryId) && (
          <button
            onClick={() => { setMonth(getDefaultMonth()); setType(''); setCategoryId('') }}
            className="btn btn-ghost btn-sm ml-auto"
          >
            Limpar filtros
          </button>
        )}
      </div>

      {/* Tabela */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-5 h-5 rounded-full border-2 animate-spin"
            style={{ borderColor: 'var(--brand)', borderTopColor: 'transparent' }} />
        </div>
      ) : error ? (
        <div className="text-center py-16" style={{ color: 'var(--danger)' }}>Erro: {error}</div>
      ) : transactions.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-20 gap-3 text-center"
          style={{ borderStyle: 'dashed' }}>
          <ArrowLeftRight size={28} style={{ color: 'var(--text-muted)' }} />
          <p style={{ color: 'var(--text-secondary)' }}>Nenhuma transação em {month}</p>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Tente outro mês ou importe um CSV</p>
          <a href="/dashboard/import" className="btn btn-primary btn-sm mt-1">
            <Upload size={13} /> Importar CSV
          </a>
        </div>
      ) : (
        <div className="card overflow-hidden animate-fade-up-3">
          <table className="table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Tipo</th>
                <th>Descrição</th>
                <th>Categoria</th>
                <th>Quem</th>
                <th style={{ textAlign: 'right' }}>Valor</th>
                {/* Menu global no cabeçalho */}
                <th style={{ width: 44, padding: '10px 8px' }}>
                  <BulkMenu
                    transactions={transactions}
                    onDone={refetch}
                  />
                </th>
              </tr>
            </thead>
            <tbody>
              {transactions.map(tx => (
                <tr key={tx.id}>
                  <td style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, whiteSpace: 'nowrap' }}>
                    {formatDate(tx.date)}
                  </td>
                  <td>
                    <span className={tx.transaction_type === 'EXPENSE' ? 'badge badge-danger' : 'badge badge-success'}>
                      {tx.transaction_type === 'EXPENSE' ? 'Gasto' : 'Crédito'}
                    </span>
                  </td>
                  <td>
                    <p style={{ color: 'var(--text)', fontWeight: 500, fontSize: 13 }}>{tx.description}</p>
                    <p style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 1 }}>{tx.raw_title}</p>
                  </td>
                  <td>
                    {tx.categories ? (
                      <span className="badge" style={{
                        color: tx.categories.color,
                        background: `${tx.categories.color}18`,
                        borderColor: `${tx.categories.color}40`,
                      }}>
                        {tx.categories.name}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>
                    )}
                  </td>
                  <td style={{ fontSize: 12 }}>{tx.imported_by_name ?? '—'}</td>
                  <td style={{
                    textAlign: 'right', fontFamily: 'DM Mono, monospace',
                    fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap',
                    color: tx.transaction_type === 'EXPENSE' ? 'var(--danger)' : 'var(--success)',
                  }}>
                    {hidden ? '••••••' : `${tx.transaction_type === 'EXPENSE' ? '-' : '+'}${formatCurrency(tx.amount)}`}
                  </td>
                  <td style={{ padding: '8px', width: 44 }}>
                    <RowMenu txId={tx.id} onDone={refetch} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Menu de ações por linha ──────────────────────────────────────
function RowMenu({ txId, onDone }: { txId: string; onDone: () => void }) {
  const [open, setOpen]     = useState(false)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  async function softDelete() {
    setLoading(true)
    await supabase.from('transactions')
      .update({ deleted_at: new Date().toISOString() }).eq('id', txId)
    setLoading(false); setOpen(false); onDone()
  }

  async function hardDelete() {
    if (!confirm('Excluir permanentemente? Esta ação não pode ser desfeita.')) return
    setLoading(true)
    await supabase.from('transactions').delete().eq('id', txId)
    setLoading(false); setOpen(false); onDone()
  }

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          background: 'transparent', border: 'none', cursor: 'pointer',
          color: 'var(--text-muted)', fontSize: 18, lineHeight: 1,
          padding: '2px 6px', borderRadius: 6,
        }}
        onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-elevated)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
      >
        ···
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 40 }} />
          <div style={{
            position: 'absolute', right: 0, top: '100%', zIndex: 50,
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 10, padding: 4, minWidth: 210,
            boxShadow: 'var(--shadow-lg)',
          }}>
            <MenuBtn onClick={softDelete} color="var(--warning)" bg="var(--warning-bg)" disabled={loading}>
              ⊖ Ocultar (mantém no histórico)
            </MenuBtn>
            <MenuBtn onClick={hardDelete} color="var(--danger)" bg="var(--danger-bg)" disabled={loading}>
              ✕ Excluir permanentemente
            </MenuBtn>
          </div>
        </>
      )}
    </div>
  )
}

// ── Menu de ações em lote (cabeçalho) ───────────────────────────
function BulkMenu({ transactions, onDone }: { transactions: any[]; onDone: () => void }) {
  const [open, setOpen]     = useState(false)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()
  const ids = transactions.map(t => t.id)

  async function bulkSoftDelete() {
    if (!confirm(`Ocultar todas as ${ids.length} transações visíveis? Elas serão mantidas no histórico.`)) return
    setLoading(true)
    await supabase.from('transactions')
      .update({ deleted_at: new Date().toISOString() })
      .in('id', ids)
    setLoading(false); setOpen(false); onDone()
  }

  async function bulkHardDelete() {
    if (!confirm(`Excluir permanentemente todas as ${ids.length} transações visíveis? Esta ação não pode ser desfeita.`)) return
    setLoading(true)
    await supabase.from('transactions').delete().in('id', ids)
    setLoading(false); setOpen(false); onDone()
  }

  if (ids.length === 0) return null

  return (
    <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
      <button
        onClick={() => setOpen(!open)}
        title={`Ações em lote (${ids.length} transações)`}
        style={{
          background: open ? 'var(--bg-elevated)' : 'transparent',
          border: '1px solid ' + (open ? 'var(--border-strong)' : 'transparent'),
          cursor: 'pointer', color: 'var(--text-muted)',
          fontSize: 16, lineHeight: 1, padding: '2px 6px', borderRadius: 6,
          transition: 'all 0.15s',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-elevated)')}
        onMouseLeave={e => !open && (e.currentTarget.style.background = 'transparent')}
      >
        ···
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 40 }} />
          <div style={{
            position: 'absolute', right: 0, top: '100%', zIndex: 50,
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 10, padding: 4, minWidth: 240,
            boxShadow: 'var(--shadow-lg)',
          }}>
            {/* Label */}
            <p style={{
              fontSize: 11, color: 'var(--text-muted)', padding: '6px 12px 4px',
              fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em',
            }}>
              {ids.length} transações visíveis
            </p>
            <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
            <MenuBtn onClick={bulkSoftDelete} color="var(--warning)" bg="var(--warning-bg)" disabled={loading}>
              ⊖ Ocultar todas (mantém histórico)
            </MenuBtn>
            <MenuBtn onClick={bulkHardDelete} color="var(--danger)" bg="var(--danger-bg)" disabled={loading}>
              ✕ Excluir todas permanentemente
            </MenuBtn>
          </div>
        </>
      )}
    </div>
  )
}

// ── Botão de menu reutilizável ───────────────────────────────────
function MenuBtn({ onClick, color, bg, disabled, children }: {
  onClick: () => void; color: string; bg: string
  disabled?: boolean; children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        width: '100%', padding: '8px 12px', borderRadius: 7,
        fontSize: 13, color, background: 'transparent',
        border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
        textAlign: 'left', opacity: disabled ? 0.5 : 1,
        transition: 'background 0.1s',
      }}
      onMouseEnter={e => !disabled && (e.currentTarget.style.background = bg)}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      {children}
    </button>
  )
}
