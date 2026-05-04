'use client'

import { useState }           from 'react'
import { useInstallments }    from '@/hooks/useInstallments'
import { useCategories }      from '@/hooks/useCategories'
import { useAccounts }        from '@/hooks/useAccounts'
import {
  Lock, Plus, X, Trash2, CheckCircle,
  ChevronUp, ChevronDown, TrendingDown,
} from 'lucide-react'

const HOUSEHOLD_ID = process.env.NEXT_PUBLIC_HOUSEHOLD_ID!

function fmt(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}
function monthLabel(m: string) {
  const [y, mo] = m.split('-')
  const names = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
  return `${names[parseInt(mo) - 1]}/${y.slice(2)}`
}

export default function InstallmentsPage() {
  const { plans, loading, totalCommitted, getMonthlyProjection,
          createPlan, updateInstallment, closePlan, deletePlan } = useInstallments(HOUSEHOLD_ID)
  const { categories } = useCategories()
  const { accounts }   = useAccounts(HOUSEHOLD_ID)
  const [showForm, setShowForm] = useState(false)

  const projection     = getMonthlyProjection()
  const maxProjection  = Math.max(...projection.map(p => p.total), 1)
  const totalRemaining = plans.reduce((s, p) => s + p.remaining_installments, 0)

  return (
    <div className="p-7 max-w-[1000px] mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between mb-7 animate-fade-up">
        <div>
          <h1 className="page-title">Parcelas Futuras</h1>
          <p className="page-subtitle">Rendimento comprometido com compras parceladas</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn btn-primary">
          <Plus size={14} /> Adicionar parcela
        </button>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-3 gap-4 mb-6 animate-fade-up-1">
        <div className="stat-card" style={{ borderColor: 'rgba(248,113,113,0.2)' }}>
          <div className="flex items-center justify-between mb-3">
            <p className="stat-label">Rendimento Aprisionado</p>
            <span className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: 'var(--danger-bg)', color: 'var(--danger)' }}>
              <Lock size={13} />
            </span>
          </div>
          <p className="stat-value" style={{ color: 'var(--danger)' }}>{fmt(totalCommitted)}</p>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
            {plans.length} {plans.length === 1 ? 'parcela ativa' : 'parcelas ativas'}
          </p>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between mb-3">
            <p className="stat-label">Próximo Mês</p>
            <span className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: 'var(--warning-bg)', color: 'var(--warning)' }}>
              <TrendingDown size={13} />
            </span>
          </div>
          <p className="stat-value" style={{ color: 'var(--warning)' }}>
            {fmt(projection[0]?.total ?? 0)}
          </p>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
            {projection[0]?.month ? monthLabel(projection[0].month) : '—'}
          </p>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between mb-3">
            <p className="stat-label">Parcelas Restantes</p>
            <span className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: 'var(--info-bg)', color: 'var(--info)' }}>
              <TrendingDown size={13} />
            </span>
          </div>
          <p className="stat-value" style={{ color: 'var(--info)' }}>{totalRemaining}</p>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
            no total de todos os planos
          </p>
        </div>
      </div>

      {/* Projeção mensal */}
      {projection.length > 0 && (
        <div className="card px-6 py-5 mb-6 animate-fade-up-2">
          <p className="text-xs font-semibold uppercase tracking-wider mb-5"
            style={{ color: 'var(--text-muted)' }}>
            Compromissos futuros — próximos 6 meses
          </p>
          <div className="flex items-end gap-4" style={{ height: 120 }}>
            {projection.map((p, i) => {
              const heightPct = maxProjection > 0 ? (p.total / maxProjection) * 100 : 0
              const barHeight = Math.max(heightPct * 0.8, 8) // mín 8px
              const isHighest = p.total === maxProjection
              return (
                <div key={p.month} className="flex-1 flex flex-col items-center gap-2">
                  {/* Valor acima da barra */}
                  <span style={{
                    fontSize: 11,
                    color: isHighest ? 'var(--danger)' : 'var(--text-muted)',
                    fontFamily: 'DM Mono, monospace',
                    fontWeight: isHighest ? 600 : 400,
                    whiteSpace: 'nowrap',
                  }}>
                    {fmt(p.total)}
                  </span>

                  {/* Barra */}
                  <div className="w-full flex-1 flex items-end">
                    <div
                      className="w-full rounded-lg transition-all"
                      style={{
                        height: `${barHeight}px`,
                        background: isHighest
                          ? 'linear-gradient(to top, #ef4444, rgba(248,113,113,0.6))'
                          : 'linear-gradient(to top, rgba(248,113,113,0.5), rgba(248,113,113,0.2))',
                        border: isHighest ? '1px solid rgba(248,113,113,0.4)' : '1px solid rgba(248,113,113,0.15)',
                      }}
                    />
                  </div>

                  {/* Mês */}
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    {monthLabel(p.month)}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Lista de planos */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-5 h-5 rounded-full border-2 animate-spin"
            style={{ borderColor: 'var(--brand)', borderTopColor: 'transparent' }} />
        </div>
      ) : plans.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-20 gap-4 text-center animate-fade-up-3"
          style={{ borderStyle: 'dashed' }}>
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: 'var(--brand-bg)', border: '1px solid var(--brand-border)' }}>
            <Lock size={22} style={{ color: 'var(--brand)' }} />
          </div>
          <div>
            <p className="font-semibold" style={{ color: 'var(--text)' }}>Nenhuma parcela ativa</p>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
              Adicione manualmente ou importe um CSV com parcelas detectadas automaticamente
            </p>
          </div>
          <button onClick={() => setShowForm(true)} className="btn btn-primary mt-2">
            <Plus size={14} /> Adicionar parcela
          </button>
        </div>
      ) : (
        <div className="space-y-3 animate-fade-up-3">
          {plans.map(plan => (
            <InstallmentCard key={plan.id} plan={plan}
              onUpdateCurrent={n => updateInstallment(plan.id, n)}
              onClose={() => { if (confirm('Marcar como concluída?')) closePlan(plan.id) }}
              onDelete={() => { if (confirm('Excluir este plano?')) deletePlan(plan.id) }}
            />
          ))}
        </div>
      )}

      {showForm && (
        <InstallmentForm categories={categories} accounts={accounts}
          onSave={async data => { await createPlan(data); setShowForm(false) }}
          onClose={() => setShowForm(false)} />
      )}
    </div>
  )
}

// ── Card de parcela ───────────────────────────────────────────────
function InstallmentCard({ plan, onUpdateCurrent, onClose, onDelete }: {
  plan: any; onUpdateCurrent: (n: number) => Promise<void>
  onClose: () => void; onDelete: () => void
}) {
  const [updating, setUpdating] = useState(false)
  const isAlmostDone = plan.remaining_installments <= 2

  async function handleStep(dir: 1 | -1) {
    const next = plan.current_installment + dir
    if (next < 1 || next > plan.total_installments) return
    setUpdating(true)
    await onUpdateCurrent(next)
    setUpdating(false)
  }

  const barColor = isAlmostDone ? 'var(--success)' : plan.percent_paid > 60 ? 'var(--brand)' : 'var(--warning)'

  return (
    <div className="card px-5 py-4"
      style={isAlmostDone ? { borderColor: 'rgba(0,196,122,0.3)' } : {}}>
      <div className="flex items-start gap-4">
        <div className="flex-1 min-w-0">

          {/* Título + badges */}
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <p className="font-semibold text-sm" style={{ color: 'var(--text)' }}>
              {plan.description}
            </p>
            {plan.categories && (
              <span className="badge" style={{
                fontSize: 10,
                color: plan.categories.color,
                background: `${plan.categories.color}18`,
                borderColor: `${plan.categories.color}40`,
              }}>
                {plan.categories.name}
              </span>
            )}
            {isAlmostDone && (
              <span className="badge badge-success" style={{ fontSize: 10 }}>Quase pago</span>
            )}
          </div>

          {/* Barra de progresso */}
          <div className="progress-track mb-2" style={{ height: 6 }}>
            <div className="progress-fill" style={{ width: `${plan.percent_paid}%`, background: barColor }} />
          </div>

          {/* Métricas */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 mt-2">
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Parcela{' '}
              <span style={{ color: 'var(--text)', fontWeight: 700, fontFamily: 'DM Mono, monospace' }}>
                {plan.current_installment}
              </span>
              {' '}de{' '}
              <span style={{ color: 'var(--text)', fontWeight: 700, fontFamily: 'DM Mono, monospace' }}>
                {plan.total_installments}
              </span>
              {' '}({plan.percent_paid}% pago)
            </span>

            <span style={{ fontSize: 12, fontFamily: 'DM Mono, monospace', color: 'var(--warning)', fontWeight: 600 }}>
              {fmt(Number(plan.installment_amount))}/mês
            </span>

            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Comprometido:{' '}
              <span style={{ color: 'var(--danger)', fontFamily: 'DM Mono, monospace', fontWeight: 600 }}>
                {fmt(plan.committed_value)}
              </span>
            </span>

            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Total:{' '}
              <span style={{ fontFamily: 'DM Mono, monospace', color: 'var(--text-secondary)' }}>
                {fmt(Number(plan.total_amount))}
              </span>
            </span>
          </div>
        </div>

        {/* Controles */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <div className="flex flex-col gap-0.5">
            <button onClick={() => handleStep(-1)}
              disabled={updating || plan.current_installment <= 1}
              className="btn btn-ghost btn-sm" style={{ padding: '3px 7px' }} title="Voltar parcela">
              <ChevronUp size={13} />
            </button>
            <button onClick={() => handleStep(1)}
              disabled={updating || plan.current_installment >= plan.total_installments}
              className="btn btn-ghost btn-sm" style={{ padding: '3px 7px' }} title="Avançar parcela">
              <ChevronDown size={13} />
            </button>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-sm"
            style={{ padding: '5px', color: 'var(--success)' }} title="Concluir">
            <CheckCircle size={14} />
          </button>
          <button onClick={onDelete} className="btn btn-ghost btn-sm"
            style={{ padding: '5px', color: 'var(--danger)' }} title="Excluir">
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Formulário ────────────────────────────────────────────────────
function InstallmentForm({ categories, accounts, onSave, onClose }: {
  categories: any[]; accounts: any[]
  onSave: (data: any) => Promise<void>; onClose: () => void
}) {
  const today = new Date().toISOString().split('T')[0]
  const [form, setForm] = useState({
    description: '', installment_amount: '', total_installments: '',
    current_installment: '1', start_date: today, account_id: '', category_id: '',
  })
  const [saving, setSaving] = useState(false)

  const amount   = parseFloat(form.installment_amount) || 0
  const total    = parseInt(form.total_installments)   || 0
  const current  = parseInt(form.current_installment)  || 0
  const committed = amount * Math.max(0, total - current)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await onSave({
      description: form.description, installment_amount: amount,
      total_installments: total, current_installment: current,
      total_amount: amount * total, start_date: form.start_date,
      account_id: form.account_id || null, category_id: form.category_id || null,
      is_active: true,
    })
    setSaving(false)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.6)',
                  backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', padding: 24 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16,
                    padding: 28, width: '100%', maxWidth: 500, boxShadow: 'var(--shadow-lg)' }}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-semibold text-base" style={{ color: 'var(--text)', letterSpacing: '-0.2px' }}>
            Adicionar parcela
          </h2>
          <button onClick={onClose} className="btn btn-ghost btn-sm" style={{ padding: '4px 8px' }}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
              style={{ color: 'var(--text-muted)' }}>Descrição</label>
            <input value={form.description} required className="input"
              placeholder="Ex: iPhone 15, Sofá, Notebook"
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
                style={{ color: 'var(--text-muted)' }}>Valor por parcela (R$)</label>
              <input type="number" step="0.01" min="0.01" required
                value={form.installment_amount} placeholder="0,00" className="input"
                onChange={e => setForm(f => ({ ...f, installment_amount: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
                style={{ color: 'var(--text-muted)' }}>Total de parcelas</label>
              <input type="number" min="1" required
                value={form.total_installments} placeholder="Ex: 12" className="input"
                onChange={e => setForm(f => ({ ...f, total_installments: e.target.value }))} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
                style={{ color: 'var(--text-muted)' }}>Parcela atual</label>
              <input type="number" min="1" value={form.current_installment} className="input"
                onChange={e => setForm(f => ({ ...f, current_installment: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
                style={{ color: 'var(--text-muted)' }}>Data da 1ª parcela</label>
              <input type="date" value={form.start_date} className="input"
                onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
                style={{ color: 'var(--text-muted)' }}>Categoria</label>
              <select value={form.category_id} className="input"
                onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}>
                <option value="">Sem categoria</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
                style={{ color: 'var(--text-muted)' }}>Conta</label>
              <select value={form.account_id} className="input"
                onChange={e => setForm(f => ({ ...f, account_id: e.target.value }))}>
                <option value="">Não especificado</option>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
          </div>

          {/* Preview */}
          {amount > 0 && total > 0 && (
            <div className="rounded-xl p-4" style={{ background: 'var(--bg-elevated)' }}>
              <div className="flex justify-between text-xs mb-1.5">
                <span style={{ color: 'var(--text-muted)' }}>Valor total da compra</span>
                <span style={{ fontFamily: 'DM Mono, monospace', color: 'var(--text)' }}>
                  {fmt(amount * total)}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span style={{ color: 'var(--text-muted)' }}>Comprometido a partir de agora</span>
                <span style={{ fontFamily: 'DM Mono, monospace', color: 'var(--danger)', fontWeight: 600 }}>
                  {fmt(committed)}
                </span>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn btn-secondary flex-1">Cancelar</button>
            <button type="submit" disabled={saving} className="btn btn-primary flex-1">
              {saving ? 'Salvando...' : 'Adicionar parcela'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
