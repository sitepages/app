'use client'

import { useState } from 'react'
import { useBudgets }    from '@/hooks/useBudgets'
import { useCategories } from '@/hooks/useCategories'
import { Plus, X, Copy, Trash2, AlertTriangle, CheckCircle, AlertCircle, Calendar } from 'lucide-react'

const HOUSEHOLD_ID = process.env.NEXT_PUBLIC_HOUSEHOLD_ID!

function formatCurrency(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}
function getDefaultMonth() { return new Date().toISOString().slice(0, 7) }
function monthLabel(m: string) {
  const [y, mo] = m.split('-')
  const names = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
  return `${names[parseInt(mo) - 1]} ${y}`
}

export default function BudgetPage() {
  const [month, setMonth]       = useState(getDefaultMonth())
  const [showForm, setShowForm] = useState(false)
  const [copying, setCopying]   = useState(false)
  const [copyMsg, setCopyMsg]   = useState<string | null>(null)

  const { budgets, loading, totalLimit, totalSpent, exceeded, warning,
          upsertBudget, deleteBudget, copyFromPrevMonth } = useBudgets(HOUSEHOLD_ID, month)
  const { categories } = useCategories()

  const availableCategories = categories.filter(c => !budgets.find(b => b.category_id === c.id))

  async function handleCopy() {
    setCopying(true)
    const result = await copyFromPrevMonth() as any
    setCopying(false)
    if (result.error) setCopyMsg(`Erro: ${result.error.message}`)
    else setCopyMsg(`${result.copied} categorias copiadas do mês anterior!`)
    setTimeout(() => setCopyMsg(null), 3000)
  }

  return (
    <div className="p-4 md:p-7 max-w-[900px] mx-auto">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between mb-4 md:mb-7 animate-fade-up">
        <div>
          <h1 className="page-title">Orçamento</h1>
          <p className="page-subtitle">Limites de gasto por categoria</p>
        </div>
        <div className="flex flex-wrap gap-2 self-start">
          <button onClick={handleCopy} disabled={copying} className="btn btn-secondary">
            <Copy size={14} /><span className="hidden sm:inline">{copying ? 'Copiando...' : 'Copiar mês anterior'}</span><span className="sm:hidden">{copying ? '...' : 'Copiar'}</span>
          </button>
          <button onClick={() => setShowForm(true)} className="btn btn-primary">
            <Plus size={14} /> <span className="hidden sm:inline">Nova categoria</span><span className="sm:hidden">Nova</span>
          </button>
        </div>
      </div>

      {/* Mês */}
      <div className="card px-4 py-3 mb-6 flex items-center gap-3 animate-fade-up-1" style={{ width: 'fit-content' }}>
        <Calendar size={13} style={{ color: 'var(--text-muted)' }} />
        <input type="month" value={month} onChange={e => setMonth(e.target.value)}
          className="input" style={{ width: 'auto' }} />
        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{monthLabel(month)}</span>
      </div>

      {/* Feedback */}
      {copyMsg && (
        <div className="rounded-xl px-4 py-3 mb-5 text-sm flex items-center gap-2"
          style={{
            background: copyMsg.startsWith('Erro') ? 'var(--danger-bg)' : 'var(--success-bg)',
            border: `1px solid ${copyMsg.startsWith('Erro') ? 'rgba(248,113,113,0.2)' : 'rgba(0,196,122,0.2)'}`,
            color: copyMsg.startsWith('Erro') ? 'var(--danger)' : 'var(--success)',
          }}>
          {copyMsg.startsWith('Erro') ? <AlertCircle size={14} /> : <CheckCircle size={14} />}
          {copyMsg}
        </div>
      )}

      {/* Summary */}
      {!loading && budgets.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-7 animate-fade-up-1">
          {[
            { label: 'Limite Total', value: totalLimit,              color: 'var(--text)'    },
            { label: 'Gasto Total',  value: totalSpent,              color: 'var(--danger)'  },
            { label: 'Restante',     value: totalLimit - totalSpent, color: 'var(--success)' },
          ].map(c => (
            <div key={c.label} className="stat-card">
              <p className="stat-label">{c.label}</p>
              <p className="stat-value" style={{ color: c.color }}>{formatCurrency(c.value)}</p>
            </div>
          ))}
          <div className="stat-card">
            <p className="stat-label">Alertas</p>
            <div className="flex items-center gap-3 mt-2">
              {exceeded > 0 && (
                <div className="flex items-center gap-1.5">
                  <AlertCircle size={14} style={{ color: 'var(--danger)' }} />
                  <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--danger)', fontFamily: 'DM Mono, monospace' }}>{exceeded}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>acima</span>
                </div>
              )}
              {warning > 0 && (
                <div className="flex items-center gap-1.5">
                  <AlertTriangle size={14} style={{ color: 'var(--warning)' }} />
                  <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--warning)', fontFamily: 'DM Mono, monospace' }}>{warning}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>atenção</span>
                </div>
              )}
              {exceeded === 0 && warning === 0 && (
                <div className="flex items-center gap-1.5">
                  <CheckCircle size={14} style={{ color: 'var(--success)' }} />
                  <span style={{ fontSize: 13, color: 'var(--success)' }}>Tudo ok</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Lista */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-5 h-5 rounded-full border-2 animate-spin"
            style={{ borderColor: 'var(--brand)', borderTopColor: 'transparent' }} />
        </div>
      ) : budgets.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-20 gap-4 text-center animate-fade-up-2"
          style={{ borderStyle: 'dashed' }}>
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: 'var(--brand-bg)', border: '1px solid var(--brand-border)' }}>
            <AlertCircle size={22} style={{ color: 'var(--brand)' }} />
          </div>
          <div>
            <p className="font-semibold" style={{ color: 'var(--text)' }}>Nenhum orçamento para {monthLabel(month)}</p>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Defina limites ou copie do mês anterior</p>
          </div>
          <div className="flex gap-3 mt-2">
            <button onClick={handleCopy} className="btn btn-secondary"><Copy size={14} /> Copiar mês anterior</button>
            <button onClick={() => setShowForm(true)} className="btn btn-primary"><Plus size={14} /> Definir limite</button>
          </div>
        </div>
      ) : (
        <div className="space-y-3 animate-fade-up-2">
          {budgets.map(budget => (
            <BudgetRow key={budget.id} budget={budget}
              onDelete={() => deleteBudget(budget.id)}
              onEdit={newLimit => upsertBudget(budget.category_id, newLimit)} />
          ))}
        </div>
      )}

      {showForm && (
        <BudgetForm categories={availableCategories}
          onSave={async (categoryId, limit) => { await upsertBudget(categoryId, limit); setShowForm(false) }}
          onClose={() => setShowForm(false)} />
      )}
    </div>
  )
}

function BudgetRow({ budget, onDelete, onEdit }: { budget: any; onDelete: () => void; onEdit: (v: number) => Promise<void> }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue]     = useState(String(budget.amount_limit))

  const statusColor = budget.status === 'exceeded' ? 'var(--danger)' : budget.status === 'warning' ? 'var(--warning)' : 'var(--success)'
  const barColor    = budget.status === 'exceeded' ? 'var(--danger)' : budget.status === 'warning' ? 'var(--warning)' : budget.categories?.color ?? 'var(--brand)'

  return (
    <div className="card px-5 py-4"
      style={budget.status === 'exceeded' ? { borderColor: 'rgba(248,113,113,0.3)' } :
             budget.status === 'warning'  ? { borderColor: 'rgba(245,158,11,0.3)'  } : {}}>
      <div className="flex items-start gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full" style={{ background: budget.categories?.color ?? '#6B7280' }} />
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{budget.categories?.name ?? '—'}</span>
            {budget.status === 'exceeded' && <span className="badge badge-danger" style={{ fontSize: 10 }}>Acima do limite</span>}
            {budget.status === 'warning'  && <span className="badge badge-warning" style={{ fontSize: 10 }}>Atenção</span>}
          </div>
          <div className="progress-track mb-2" style={{ height: 7 }}>
            <div className="progress-fill" style={{
              width: `${Math.min(budget.percent, 100)}%`, background: barColor,
              boxShadow: budget.status === 'exceeded' ? `0 0 8px ${barColor}60` : 'none',
            }} />
          </div>
          <div className="flex items-center gap-4">
            <span style={{ fontSize: 12, color: statusColor, fontFamily: 'DM Mono, monospace', fontWeight: 600 }}>
              {formatCurrency(budget.spent)}
            </span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>de</span>
            {editing ? (
              <div className="flex items-center gap-2">
                <input type="number" value={value} onChange={e => setValue(e.target.value)}
                  className="input" style={{ width: 110, padding: '3px 8px', fontSize: 12 }} autoFocus
                  onKeyDown={async e => {
                    if (e.key === 'Enter') { await onEdit(parseFloat(value) || 0); setEditing(false) }
                    if (e.key === 'Escape') setEditing(false)
                  }} />
                <button onClick={async () => { await onEdit(parseFloat(value) || 0); setEditing(false) }}
                  className="btn btn-primary btn-sm" style={{ padding: '3px 8px', fontSize: 12 }}>✓</button>
                <button onClick={() => setEditing(false)} className="btn btn-ghost btn-sm" style={{ padding: '3px 8px' }}>
                  <X size={12} />
                </button>
              </div>
            ) : (
              <button onClick={() => { setValue(String(budget.amount_limit)); setEditing(true) }}
                style={{ fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'DM Mono, monospace',
                         background: 'transparent', border: 'none', cursor: 'pointer', textDecoration: 'underline dotted' }}>
                {formatCurrency(Number(budget.amount_limit))}
              </button>
            )}
            <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 'auto' }}>
              {budget.remaining >= 0
                ? <span style={{ color: 'var(--success)' }}>Resta {formatCurrency(budget.remaining)}</span>
                : <span style={{ color: 'var(--danger)' }}>Excedeu {formatCurrency(Math.abs(budget.remaining))}</span>}
            </span>
            <span style={{ fontSize: 12, fontWeight: 600, color: statusColor, fontFamily: 'DM Mono, monospace' }}>
              {Math.round(budget.percent)}%
            </span>
          </div>
        </div>
        <button onClick={() => { if (confirm('Remover esta categoria do orçamento?')) onDelete() }}
          className="btn btn-ghost btn-sm" style={{ padding: '5px', color: 'var(--text-muted)', flexShrink: 0 }}>
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  )
}

function BudgetForm({ categories, onSave, onClose }: {
  categories: any[]; onSave: (id: string, limit: number) => Promise<void>; onClose: () => void
}) {
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? '')
  const [limit, setLimit]           = useState('')
  const [saving, setSaving]         = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!categoryId || !limit) return
    setSaving(true)
    await onSave(categoryId, parseFloat(limit))
    setSaving(false)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.6)',
                  backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', padding: 24 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16,
                    padding: 28, width: '100%', maxWidth: 420, boxShadow: 'var(--shadow-lg)' }}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-semibold text-base" style={{ color: 'var(--text)', letterSpacing: '-0.2px' }}>
            Definir limite de orçamento
          </h2>
          <button onClick={onClose} className="btn btn-ghost btn-sm" style={{ padding: '4px 8px' }}>
            <X size={16} />
          </button>
        </div>
        {categories.length === 0 ? (
          <div className="text-center py-8">
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Todas as categorias já têm orçamento neste mês.</p>
            <button onClick={onClose} className="btn btn-secondary mt-4">Fechar</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
                style={{ color: 'var(--text-muted)' }}>Categoria</label>
              <select value={categoryId} onChange={e => setCategoryId(e.target.value)} className="input" required>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
                style={{ color: 'var(--text-muted)' }}>Limite mensal (R$)</label>
              <input type="number" step="0.01" min="1" required value={limit}
                placeholder="Ex: 800,00" className="input" autoFocus
                onChange={e => setLimit(e.target.value)} />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onClose} className="btn btn-secondary flex-1">Cancelar</button>
              <button type="submit" disabled={saving} className="btn btn-primary flex-1">
                {saving ? 'Salvando...' : 'Definir limite'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
