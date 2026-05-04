'use client'
import { useState } from 'react'
import { useGoals, SavingsGoal } from '@/hooks/useGoals'
import { Target, Plus, X, Check, Pencil, Trash2, TrendingUp, Calendar, PiggyBank } from 'lucide-react'

const HOUSEHOLD_ID = process.env.NEXT_PUBLIC_HOUSEHOLD_ID!
const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
function fmtDate(iso: string | null) {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

const GOAL_COLORS = [
  '#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#3b82f6','#ef4444','#14b8a6',
]

export default function GoalsPage() {
  const { goals, loading, createGoal, updateGoal, deleteGoal, addProgress,
          getMonthsLeft, getMonthlySavings, getProgress } = useGoals(HOUSEHOLD_ID)

  const [showForm, setShowForm]         = useState(false)
  const [editGoal, setEditGoal]         = useState<SavingsGoal | null>(null)
  const [progressGoal, setProgressGoal] = useState<SavingsGoal | null>(null)

  const activeGoals    = goals.filter(g => !g.is_completed)
  const completedGoals = goals.filter(g => g.is_completed)
  const totalTarget    = activeGoals.reduce((s, g) => s + g.target_amount, 0)
  const totalSaved     = activeGoals.reduce((s, g) => s + g.current_amount, 0)
  const totalMonthly   = activeGoals.reduce((s, g) => {
    const m = getMonthlySavings(g); return s + (m ?? 0)
  }, 0)

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="w-5 h-5 rounded-full border-2 animate-spin"
        style={{ borderColor: 'var(--brand)', borderTopColor: 'transparent' }} />
    </div>
  )

  return (
    <div className="p-4 md:p-7 max-w-[1000px] mx-auto">

      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between mb-4 md:mb-7 animate-fade-up">
        <div>
          <h1 className="page-title">Metas</h1>
          <p className="page-subtitle">Objetivos financeiros do casal</p>
        </div>
        <button onClick={() => { setEditGoal(null); setShowForm(true) }} className="btn btn-primary self-start">
          <Plus size={14} /> Nova meta
        </button>
      </div>

      {/* Cards resumo */}
      {activeGoals.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-7 animate-fade-up-1">
          <div className="stat-card">
            <div className="flex items-center justify-between mb-3">
              <p className="stat-label">Total a guardar</p>
              <span className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: 'var(--brand-bg)', color: 'var(--brand)' }}>
                <Target size={13} />
              </span>
            </div>
            <p className="stat-value">{fmt(totalTarget - totalSaved)}</p>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
              {fmt(totalSaved)} guardados de {fmt(totalTarget)}
            </p>
          </div>
          <div className="stat-card">
            <div className="flex items-center justify-between mb-3">
              <p className="stat-label">Guardar por mês</p>
              <span className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: 'var(--success-bg)', color: 'var(--success)' }}>
                <TrendingUp size={13} />
              </span>
            </div>
            <p className="stat-value" style={{ color: 'var(--success)' }}>{fmt(totalMonthly)}</p>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
              soma de todas as metas ativas
            </p>
          </div>
          <div className="stat-card">
            <div className="flex items-center justify-between mb-3">
              <p className="stat-label">Metas ativas</p>
              <span className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: 'var(--warning-bg)', color: 'var(--warning)' }}>
                <PiggyBank size={13} />
              </span>
            </div>
            <p className="stat-value" style={{ color: 'var(--warning)' }}>{activeGoals.length}</p>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
              {completedGoals.length} concluída{completedGoals.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      )}

      {/* Metas ativas */}
      {activeGoals.length === 0 && completedGoals.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-20 gap-4 text-center"
          style={{ borderStyle: 'dashed' }}>
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: 'var(--brand-bg)', border: '1px solid var(--brand-border)' }}>
            <Target size={22} style={{ color: 'var(--brand)' }} />
          </div>
          <div>
            <p className="font-semibold" style={{ color: 'var(--text)' }}>Nenhuma meta definida</p>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
              Defina objetivos como viagem, reserva de emergência ou compra de um bem
            </p>
          </div>
          <button onClick={() => { setEditGoal(null); setShowForm(true) }} className="btn btn-primary mt-2">
            <Plus size={14} /> Criar primeira meta
          </button>
        </div>
      ) : (
        <div className="space-y-4 animate-fade-up-2">
          {activeGoals.map(goal => (
            <GoalCard
              key={goal.id}
              goal={goal}
              progress={getProgress(goal)}
              monthsLeft={getMonthsLeft(goal.target_date)}
              monthlySavings={getMonthlySavings(goal)}
              onEdit={() => { setEditGoal(goal); setShowForm(true) }}
              onDelete={() => { if (confirm(`Excluir meta "${goal.name}"?`)) deleteGoal(goal.id) }}
              onAddProgress={() => setProgressGoal(goal)}
              onComplete={() => updateGoal(goal.id, { is_completed: true, current_amount: goal.target_amount })}
            />
          ))}

          {/* Metas concluídas */}
          {completedGoals.length > 0 && (
            <div className="mt-8">
              <p className="text-xs font-semibold uppercase tracking-wider mb-3"
                style={{ color: 'var(--text-muted)' }}>
                Concluídas ({completedGoals.length})
              </p>
              <div className="space-y-3">
                {completedGoals.map(goal => (
                  <div key={goal.id} className="card px-5 py-4 flex items-center gap-4"
                    style={{ opacity: 0.65 }}>
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: 'var(--success-bg)' }}>
                      <Check size={16} style={{ color: 'var(--success)' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm" style={{ color: 'var(--text)' }}>{goal.name}</p>
                      <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {fmt(goal.target_amount)} · {goal.target_date ? fmtDate(goal.target_date) : 'sem prazo'}
                      </p>
                    </div>
                    <button onClick={() => updateGoal(goal.id, { is_completed: false })}
                      className="btn btn-ghost btn-sm" style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      Reabrir
                    </button>
                    <button onClick={() => { if (confirm(`Excluir "${goal.name}"?`)) deleteGoal(goal.id) }}
                      className="btn btn-ghost btn-sm" style={{ padding: '5px', color: 'var(--danger)' }}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modais */}
      {showForm && (
        <GoalForm
          initial={editGoal}
          onSave={async (data) => {
            if (editGoal) await updateGoal(editGoal.id, data)
            else await createGoal(data)
            setShowForm(false)
            setEditGoal(null)
          }}
          onClose={() => { setShowForm(false); setEditGoal(null) }}
        />
      )}

      {progressGoal && (
        <ProgressModal
          goal={progressGoal}
          onSave={async (amount) => {
            await addProgress(progressGoal.id, amount)
            setProgressGoal(null)
          }}
          onClose={() => setProgressGoal(null)}
        />
      )}
    </div>
  )
}

// ── Card de meta ──────────────────────────────────────────────────
function GoalCard({ goal, progress, monthsLeft, monthlySavings, onEdit, onDelete, onAddProgress, onComplete }: {
  goal: SavingsGoal; progress: number; monthsLeft: number | null; monthlySavings: number | null
  onEdit: () => void; onDelete: () => void; onAddProgress: () => void; onComplete: () => void
}) {
  const remaining = goal.target_amount - goal.current_amount
  const color = goal.notes?.startsWith('#') ? goal.notes : GOAL_COLORS[0]
  // Usamos o campo notes para guardar a cor — alternativa sem coluna extra
  const displayColor = GOAL_COLORS.find(c => goal.name.length % GOAL_COLORS.length === GOAL_COLORS.indexOf(c))
    ?? GOAL_COLORS[goal.name.charCodeAt(0) % GOAL_COLORS.length]

  return (
    <div className="card overflow-hidden">
      {/* Barra de progresso no topo */}
      <div style={{ height: 3, background: 'var(--bg-elevated)' }}>
        <div style={{
          height: '100%', width: `${progress}%`,
          background: displayColor,
          transition: 'width 0.6s ease',
          borderRadius: 2,
        }} />
      </div>

      <div className="px-5 py-4">
        <div className="flex items-start gap-4">
          {/* Ícone */}
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: `${displayColor}22`, border: `1px solid ${displayColor}44` }}>
            <Target size={16} style={{ color: displayColor }} />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className="font-semibold text-sm" style={{ color: 'var(--text)' }}>{goal.name}</p>
              {goal.target_date && (
                <span className="flex items-center gap-1" style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  <Calendar size={10} /> {fmtDate(goal.target_date)}
                </span>
              )}
            </div>

            {/* Progresso visual */}
            <div className="flex items-center gap-3 mb-3">
              <div style={{ flex: 1, height: 6, background: 'var(--bg-elevated)', borderRadius: 3 }}>
                <div style={{
                  height: '100%', width: `${progress}%`,
                  background: displayColor, borderRadius: 3,
                  transition: 'width 0.6s ease',
                }} />
              </div>
              <span style={{ fontSize: 12, fontFamily: 'DM Mono, monospace', color: 'var(--text-secondary)', flexShrink: 0 }}>
                {Math.round(progress)}%
              </span>
            </div>

            {/* Valores */}
            <div className="flex items-center gap-5 flex-wrap">
              <div>
                <p style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Guardado</p>
                <p style={{ fontSize: 14, fontFamily: 'DM Mono, monospace', fontWeight: 700, color: displayColor }}>
                  {fmt(goal.current_amount)}
                </p>
              </div>
              <div>
                <p style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Falta</p>
                <p style={{ fontSize: 14, fontFamily: 'DM Mono, monospace', fontWeight: 700, color: 'var(--text)' }}>
                  {fmt(remaining)}
                </p>
              </div>
              <div>
                <p style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Meta</p>
                <p style={{ fontSize: 14, fontFamily: 'DM Mono, monospace', fontWeight: 700, color: 'var(--text-secondary)' }}>
                  {fmt(goal.target_amount)}
                </p>
              </div>
              {monthlySavings !== null && (
                <div>
                  <p style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Guardar/mês
                  </p>
                  <p style={{ fontSize: 14, fontFamily: 'DM Mono, monospace', fontWeight: 700, color: 'var(--success)' }}>
                    {fmt(monthlySavings)}
                  </p>
                </div>
              )}
              {monthsLeft !== null && (
                <div>
                  <p style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Prazo</p>
                  <p style={{ fontSize: 14, fontFamily: 'DM Mono, monospace', fontWeight: 700,
                    color: monthsLeft <= 2 ? 'var(--danger)' : 'var(--text-secondary)' }}>
                    {monthsLeft === 0 ? 'Este mês' : `${monthsLeft} meses`}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Ações */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button onClick={onAddProgress} className="btn btn-primary btn-sm">
              <Plus size={12} /> <span className="hidden sm:inline">Depósito</span>
            </button>
            <button onClick={onComplete} className="btn btn-secondary btn-sm"
              title="Marcar como concluída">
              <Check size={12} />
            </button>
            <button onClick={onEdit} className="btn btn-ghost btn-sm" style={{ padding: '5px' }}>
              <Pencil size={13} />
            </button>
            <button onClick={onDelete} className="btn btn-ghost btn-sm"
              style={{ padding: '5px', color: 'var(--danger)' }}>
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Formulário de meta ────────────────────────────────────────────
function GoalForm({ initial, onSave, onClose }: {
  initial: SavingsGoal | null
  onSave: (d: any) => Promise<void>
  onClose: () => void
}) {
  const [form, setForm] = useState({
    name:           initial?.name ?? '',
    target_amount:  initial?.target_amount ? String(initial.target_amount) : '',
    current_amount: initial?.current_amount ? String(initial.current_amount) : '0',
    target_date:    initial?.target_date ?? '',
    notes:          initial?.notes ?? '',
    account_id:     initial?.account_id ?? null as string | null,
  })
  const [saving, setSaving] = useState(false)

  const remaining    = (parseFloat(form.target_amount) || 0) - (parseFloat(form.current_amount) || 0)
  const monthsLeft   = form.target_date ? (() => {
    const now = new Date(), end = new Date(form.target_date)
    return Math.max((end.getFullYear() - now.getFullYear()) * 12 + (end.getMonth() - now.getMonth()), 0)
  })() : null
  const monthly = monthsLeft && monthsLeft > 0 ? remaining / monthsLeft : null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true)
    await onSave({
      name:           form.name,
      target_amount:  parseFloat(form.target_amount),
      current_amount: parseFloat(form.current_amount) || 0,
      target_date:    form.target_date || null,
      notes:          form.notes || null,
      account_id:     form.account_id,
    })
    setSaving(false)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.6)',
                  backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', padding: 24 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16,
                    padding: 28, width: '100%', maxWidth: 460, boxShadow: 'var(--shadow-lg)' }}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-semibold text-base" style={{ color: 'var(--text)' }}>
            {initial ? 'Editar meta' : 'Nova meta'}
          </h2>
          <button onClick={onClose} className="btn btn-ghost btn-sm" style={{ padding: '4px 8px' }}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
              style={{ color: 'var(--text-muted)' }}>Nome da meta</label>
            <input value={form.name} required className="input"
              placeholder="Ex: Viagem para Europa, Fundo de emergência"
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
                style={{ color: 'var(--text-muted)' }}>Valor alvo (R$)</label>
              <input type="number" step="0.01" min="0.01" value={form.target_amount} required className="input"
                placeholder="20000,00"
                onChange={e => setForm(f => ({ ...f, target_amount: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
                style={{ color: 'var(--text-muted)' }}>Já guardei (R$)</label>
              <input type="number" step="0.01" min="0" value={form.current_amount} className="input"
                placeholder="0,00"
                onChange={e => setForm(f => ({ ...f, current_amount: e.target.value }))} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
              style={{ color: 'var(--text-muted)' }}>Prazo (opcional)</label>
            <input type="date" value={form.target_date} className="input"
              onChange={e => setForm(f => ({ ...f, target_date: e.target.value }))} />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
              style={{ color: 'var(--text-muted)' }}>Observações (opcional)</label>
            <input value={form.notes ?? ''} className="input"
              placeholder="Destino, motivação, etc."
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>

          {/* Preview do cálculo */}
          {parseFloat(form.target_amount) > 0 && (
            <div className="rounded-xl p-4 space-y-2" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
              <div className="flex justify-between">
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Falta guardar</span>
                <span style={{ fontSize: 13, fontFamily: 'DM Mono, monospace', fontWeight: 600, color: 'var(--text)' }}>
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Math.max(remaining, 0))}
                </span>
              </div>
              {monthly !== null && monthly > 0 && (
                <div className="flex justify-between">
                  <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Guardar por mês</span>
                  <span style={{ fontSize: 13, fontFamily: 'DM Mono, monospace', fontWeight: 700, color: 'var(--success)' }}>
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(monthly)}
                  </span>
                </div>
              )}
              {monthsLeft !== null && (
                <div className="flex justify-between">
                  <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Meses restantes</span>
                  <span style={{ fontSize: 13, fontFamily: 'DM Mono, monospace', color: 'var(--text-secondary)' }}>
                    {monthsLeft}
                  </span>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn btn-secondary flex-1">Cancelar</button>
            <button type="submit" disabled={saving} className="btn btn-primary flex-1">
              {saving ? 'Salvando...' : (initial ? 'Salvar' : 'Criar meta')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Modal de depósito ─────────────────────────────────────────────
function ProgressModal({ goal, onSave, onClose }: {
  goal: SavingsGoal; onSave: (amount: number) => Promise<void>; onClose: () => void
}) {
  const [amount, setAmount] = useState('')
  const [saving, setSaving] = useState(false)
  const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
  const remaining = goal.target_amount - goal.current_amount

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const val = parseFloat(amount)
    if (!val || val <= 0) return
    setSaving(true)
    await onSave(val)
    setSaving(false)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.6)',
                  backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', padding: 24 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16,
                    padding: 28, width: '100%', maxWidth: 380, boxShadow: 'var(--shadow-lg)' }}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-semibold text-base" style={{ color: 'var(--text)' }}>Registrar depósito</h2>
          <button onClick={onClose} className="btn btn-ghost btn-sm" style={{ padding: '4px 8px' }}>
            <X size={16} />
          </button>
        </div>
        <div className="rounded-xl p-4 mb-4" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
          <p className="font-semibold text-sm mb-1" style={{ color: 'var(--text)' }}>{goal.name}</p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {fmt(goal.current_amount)} de {fmt(goal.target_amount)} · falta {fmt(remaining)}
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
              style={{ color: 'var(--text-muted)' }}>Valor depositado (R$)</label>
            <input type="number" step="0.01" min="0.01" value={amount} required
              className="input" placeholder="0,00" autoFocus
              onChange={e => setAmount(e.target.value)} />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn btn-secondary flex-1">Cancelar</button>
            <button type="submit" disabled={saving} className="btn btn-primary flex-1">
              {saving ? 'Salvando...' : 'Registrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
