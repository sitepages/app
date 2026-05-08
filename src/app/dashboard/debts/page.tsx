'use client'

import { useState } from 'react'
import { useDebts, INTEREST_TYPES, DEBT_STATUS } from '@/hooks/useDebts'
import { useAccounts } from '@/hooks/useAccounts'
import {
  Plus, X, TrendingDown, Wallet, Calendar,
  ChevronDown, ChevronUp, Trash2, Pencil, DollarSign,
} from 'lucide-react'
import { useHideValues } from '@/hooks/useHideValues'

const HOUSEHOLD_ID = process.env.NEXT_PUBLIC_HOUSEHOLD_ID!

function fmt(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}
function fmtDate(iso: string) {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

export default function DebtsPage() {
  const { debts, loading, totalBalance, totalOriginal, totalPaid, nextPayment,
          createDebt, updateDebt, registerPayment, fetchPayments } = useDebts(HOUSEHOLD_ID)
  const { accounts } = useAccounts(HOUSEHOLD_ID)

  const [showForm, setShowForm]   = useState(false)
  const [editing, setEditing]     = useState<any>(null)
  const [paying, setPaying]       = useState<any>(null)
  const [viewingId, setViewingId] = useState<string | null>(null)
  const [payments, setPayments]   = useState<any[]>([])
  const { hidden }                = useHideValues()
  const h = (v: number) => hidden ? '••••••' : fmt(v)

  const activeDebts = debts.filter(d => d.status === 'ACTIVE' || d.status === 'DEFAULTED')
  const otherDebts  = debts.filter(d => d.status === 'PAID' || d.status === 'RENEGOTIATED')

  async function handleViewPayments(debtId: string) {
    if (viewingId === debtId) { setViewingId(null); return }
    const data = await fetchPayments(debtId)
    setPayments(data)
    setViewingId(debtId)
  }

  return (
    <div className="p-4 md:p-7 max-w-[1000px] mx-auto">

      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between mb-4 md:mb-7 animate-fade-up">
        <div>
          <h1 className="page-title">Dívidas</h1>
          <p className="page-subtitle">Controle de dívidas ativas e histórico de pagamentos</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn btn-primary self-start">
          <Plus size={14} /> Nova dívida
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-7 animate-fade-up-1">
        <div className="stat-card" style={{ borderColor: 'rgba(248,113,113,0.2)' }}>
          <div className="flex items-center justify-between mb-3">
            <p className="stat-label">Saldo Devedor</p>
            <span className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: 'var(--danger-bg)', color: 'var(--danger)' }}>
              <TrendingDown size={13} />
            </span>
          </div>
          <p className="stat-value" style={{ color: 'var(--danger)' }}>{h(totalBalance)}</p>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
            {activeDebts.length} dívida{activeDebts.length !== 1 ? 's' : ''} ativa{activeDebts.length !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between mb-3">
            <p className="stat-label">Total Original</p>
            <span className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: 'var(--info-bg)', color: 'var(--info)' }}>
              <Wallet size={13} />
            </span>
          </div>
          <p className="stat-value" style={{ color: 'var(--info)' }}>{h(totalOriginal)}</p>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>valor total contraído</p>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between mb-3">
            <p className="stat-label">Total Pago</p>
            <span className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: 'var(--success-bg)', color: 'var(--success)' }}>
              <DollarSign size={13} />
            </span>
          </div>
          <p className="stat-value" style={{ color: 'var(--success)' }}>{h(totalPaid)}</p>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>em todos os registros</p>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between mb-3">
            <p className="stat-label">Próximo Pagamento</p>
            <span className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: 'var(--warning-bg)', color: 'var(--warning)' }}>
              <Calendar size={13} />
            </span>
          </div>
          {nextPayment ? (
            <>
              <p className="stat-value" style={{ color: 'var(--warning)', fontSize: 20 }}>
                {h(Number(nextPayment.payment_amount ?? 0))}
              </p>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                {fmtDate(nextPayment.next_payment_date ?? '')} · {nextPayment.creditor_name}
              </p>
            </>
          ) : (
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 8 }}>Nenhum agendado</p>
          )}
        </div>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-5 h-5 rounded-full border-2 animate-spin"
            style={{ borderColor: 'var(--brand)', borderTopColor: 'transparent' }} />
        </div>
      ) : debts.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-20 gap-4 text-center animate-fade-up-2"
          style={{ borderStyle: 'dashed' }}>
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: 'var(--brand-bg)', border: '1px solid var(--brand-border)' }}>
            <TrendingDown size={22} style={{ color: 'var(--brand)' }} />
          </div>
          <div>
            <p className="font-semibold" style={{ color: 'var(--text)' }}>Nenhuma dívida cadastrada</p>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
              Cadastre suas dívidas para acompanhar saldo devedor e pagamentos
            </p>
          </div>
          <button onClick={() => setShowForm(true)} className="btn btn-primary mt-2">
            <Plus size={14} /> Cadastrar dívida
          </button>
        </div>
      ) : (
        <div className="space-y-6 animate-fade-up-2">
          {activeDebts.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-3"
                style={{ color: 'var(--text-muted)' }}>Ativas</p>
              <div className="space-y-3">
                {activeDebts.map(debt => (
                  <DebtCard key={debt.id} debt={debt}
                    hidden={hidden}
                    onEdit={() => setEditing(debt)}
                    onPay={() => setPaying(debt)}
                    onViewPayments={() => handleViewPayments(debt.id)}
                    showingPayments={viewingId === debt.id}
                    payments={viewingId === debt.id ? payments : []}
                    onUpdateStatus={status => updateDebt(debt.id, { status })}
                  />
                ))}
              </div>
            </div>
          )}
          {otherDebts.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-3"
                style={{ color: 'var(--text-muted)' }}>Histórico</p>
              <div className="space-y-3">
                {otherDebts.map(debt => (
                  <DebtCard key={debt.id} debt={debt}
                    hidden={hidden}
                    onEdit={() => setEditing(debt)}
                    onPay={() => setPaying(debt)}
                    onViewPayments={() => handleViewPayments(debt.id)}
                    showingPayments={viewingId === debt.id}
                    payments={viewingId === debt.id ? payments : []}
                    onUpdateStatus={status => updateDebt(debt.id, { status })}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {(showForm || editing) && (
        <DebtForm accounts={accounts} debt={editing}
          onSave={async data => {
            if (editing) { await updateDebt(editing.id, data); setEditing(null) }
            else { await createDebt(data); setShowForm(false) }
          }}
          onClose={() => { setShowForm(false); setEditing(null) }} />
      )}

      {paying && (
        <PaymentForm debt={paying} accounts={accounts} hidden={hidden}
          onSave={async data => { await registerPayment(paying.id, data); setPaying(null) }}
          onClose={() => setPaying(null)} />
      )}
    </div>
  )
}

// ── Card de dívida ────────────────────────────────────────────────
function DebtCard({ debt, onEdit, onPay, onViewPayments, showingPayments, payments, onUpdateStatus, hidden }: {
  debt: any; onEdit: () => void; onPay: () => void
  onViewPayments: () => void; showingPayments: boolean
  payments: any[]; onUpdateStatus: (s: string) => void; hidden: boolean
}) {
  const status    = DEBT_STATUS[debt.status as keyof typeof DEBT_STATUS]
  const interest  = INTEREST_TYPES[debt.interest_type as keyof typeof INTEREST_TYPES]
  const isActive  = debt.status === 'ACTIVE' || debt.status === 'DEFAULTED'
  const barColor  = debt.percent_paid >= 100 ? 'var(--success)' :
                    debt.percent_paid >= 60  ? 'var(--brand)'   : 'var(--warning)'

  return (
    <div className="card overflow-hidden" style={!isActive ? { opacity: 0.75 } : {}}>
      <div className="px-5 py-4">
        <div className="flex items-start gap-4">
          <div className="flex-1 min-w-0">

            {/* Título */}
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <p className="font-semibold text-sm" style={{ color: 'var(--text)' }}>{debt.description}</p>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>— {debt.creditor_name}</span>
              <span className="badge" style={{ fontSize: 10, color: status.color, background: status.bg }}>
                {status.label}
              </span>
              {debt.interest_type !== 'NONE' && (
                <span className="badge badge-neutral" style={{ fontSize: 10 }}>
                  {interest.label}{debt.interest_rate > 0 ? ` ${debt.interest_rate}%` : ''}
                  {debt.interest_period === 'MONTHLY' ? '/mês' : '/ano'}
                </span>
              )}
            </div>

            {/* Barra */}
            <div className="progress-track my-3" style={{ height: 6 }}>
              <div className="progress-fill" style={{ width: `${debt.percent_paid}%`, background: barColor }} />
            </div>

            {/* Métricas */}
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Saldo:{' '}
                <span style={{ color: 'var(--danger)', fontFamily: 'DM Mono, monospace', fontWeight: 600 }}>
                  {hidden ? '••••••' : fmt(Number(debt.current_balance))}
                </span>
              </span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Original:{' '}
                <span style={{ fontFamily: 'DM Mono, monospace', color: 'var(--text-secondary)' }}>
                  {hidden ? '••••••' : fmt(Number(debt.original_amount))}
                </span>
              </span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Pago:{' '}
                <span style={{ color: 'var(--success)', fontFamily: 'DM Mono, monospace' }}>
                  {hidden ? '••••••' : fmt(debt.total_paid)} ({debt.percent_paid}%)
                </span>
              </span>
              {debt.payment_amount && (
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  Parcela:{' '}
                  <span style={{ fontFamily: 'DM Mono, monospace', color: 'var(--warning)', fontWeight: 600 }}>
                    {hidden ? '••••••' : fmt(Number(debt.payment_amount))}/mês
                  </span>
                </span>
              )}
              {debt.next_payment_date && (
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  Próximo: <span style={{ color: 'var(--text-secondary)' }}>{fmtDate(debt.next_payment_date)}</span>
                </span>
              )}
              {debt.due_date && (
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  Vence: <span style={{ color: 'var(--text-secondary)' }}>{fmtDate(debt.due_date)}</span>
                </span>
              )}
            </div>
          </div>

          {/* Ações */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {isActive && (
              <button onClick={onPay} className="btn btn-primary btn-sm">
                <DollarSign size={13} /> Pagar
              </button>
            )}
            <button onClick={onEdit} className="btn btn-ghost btn-sm" style={{ padding: '5px' }}>
              <Pencil size={13} />
            </button>
            {!isActive && (
              <button onClick={() => onUpdateStatus('ACTIVE')}
                className="btn btn-ghost btn-sm" style={{ fontSize: 11, color: 'var(--brand)' }}>
                Reativar
              </button>
            )}
          </div>
        </div>

        {/* Toggle histórico */}
        <button onClick={onViewPayments}
          style={{ background: 'transparent', border: 'none', cursor: 'pointer',
                   fontSize: 12, color: 'var(--text-muted)', padding: '8px 0 0',
                   display: 'flex', alignItems: 'center', gap: 4 }}>
          {showingPayments ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          {showingPayments ? 'Ocultar' : 'Ver'} histórico de pagamentos
        </button>
      </div>

      {/* Histórico expandido */}
      {showingPayments && (
        <div style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>
          {payments.length === 0 ? (
            <p style={{ padding: '14px 20px', fontSize: 13, color: 'var(--text-muted)' }}>
              Nenhum pagamento registrado ainda.
            </p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Data', 'Total pago', 'Principal', 'Juros', 'Saldo após'].map((h, i) => (
                    <th key={h} style={{
                      padding: '8px 16px',
                      textAlign: i === 0 ? 'left' : 'right',
                      fontSize: 10, fontWeight: 600,
                      textTransform: 'uppercase', letterSpacing: '0.06em',
                      color: 'var(--text-muted)',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {payments.map(p => (
                  <tr key={p.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '8px 16px', fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'DM Mono, monospace' }}>
                      {fmtDate(p.payment_date)}
                    </td>
                    <td style={{ padding: '8px 16px', fontSize: 12, textAlign: 'right', color: 'var(--success)', fontFamily: 'DM Mono, monospace', fontWeight: 600 }}>
                      {hidden ? '••••••' : fmt(Number(p.amount_paid))}
                    </td>
                    <td style={{ padding: '8px 16px', fontSize: 12, textAlign: 'right', color: 'var(--text-secondary)', fontFamily: 'DM Mono, monospace' }}>
                      {hidden ? '••••••' : fmt(Number(p.principal_paid))}
                    </td>
                    <td style={{ padding: '8px 16px', fontSize: 12, textAlign: 'right', fontFamily: 'DM Mono, monospace',
                                 color: Number(p.interest_paid) > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>
                      {hidden ? '••••••' : fmt(Number(p.interest_paid))}
                    </td>
                    <td style={{ padding: '8px 16px', fontSize: 12, textAlign: 'right', color: 'var(--text)', fontFamily: 'DM Mono, monospace' }}>
                      {hidden ? '••••••' : fmt(Number(p.balance_after))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}

// ── Formulário de dívida ──────────────────────────────────────────
function DebtForm({ accounts, debt, onSave, onClose }: {
  accounts: any[]; debt?: any
  onSave: (data: any) => Promise<void>; onClose: () => void
}) {
  const today = new Date().toISOString().split('T')[0]
  const [form, setForm] = useState({
    creditor_name:     debt?.creditor_name     ?? '',
    description:       debt?.description       ?? '',
    original_amount:   debt?.original_amount   ?? '',
    current_balance:   debt?.current_balance   ?? '',
    interest_type:     debt?.interest_type     ?? 'NONE',
    interest_rate:     debt?.interest_rate     ?? '',
    interest_period:   debt?.interest_period   ?? 'MONTHLY',
    start_date:        debt?.start_date        ?? today,
    due_date:          debt?.due_date          ?? '',
    next_payment_date: debt?.next_payment_date ?? '',
    payment_amount:    debt?.payment_amount    ?? '',
    account_id:        debt?.account_id        ?? '',
    status:            debt?.status            ?? 'ACTIVE',
    notes:             debt?.notes             ?? '',
  })
  const [saving, setSaving] = useState(false)
  const f = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await onSave({
      ...form,
      original_amount:   parseFloat(String(form.original_amount))   || 0,
      current_balance:   parseFloat(String(form.current_balance))   || parseFloat(String(form.original_amount)) || 0,
      interest_rate:     parseFloat(String(form.interest_rate))     || 0,
      payment_amount:    parseFloat(String(form.payment_amount))    || null,
      account_id:        form.account_id        || null,
      due_date:          form.due_date          || null,
      next_payment_date: form.next_payment_date || null,
      notes:             form.notes             || null,
    })
    setSaving(false)
  }

  return (
    <Modal title={debt ? 'Editar dívida' : 'Cadastrar dívida'} onClose={onClose} wide>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Credor">
            <input value={form.creditor_name} required className="input"
              placeholder="Ex: Banco X, Fulano" onChange={e => f('creditor_name', e.target.value)} />
          </Field>
          <Field label="Descrição">
            <input value={form.description} required className="input"
              placeholder="Ex: Empréstimo, Financiamento" onChange={e => f('description', e.target.value)} />
          </Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Valor original (R$)">
            <input type="number" step="0.01" min="0.01" required
              value={form.original_amount} placeholder="0,00" className="input"
              onChange={e => f('original_amount', e.target.value)} />
          </Field>
          <Field label="Saldo atual (R$)">
            <input type="number" step="0.01" min="0"
              value={form.current_balance} placeholder="Se novo, deixe igual ao original" className="input"
              onChange={e => f('current_balance', e.target.value)} />
          </Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label="Tipo de juros">
            <select value={form.interest_type} className="input" onChange={e => f('interest_type', e.target.value)}>
              {Object.entries(INTEREST_TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </Field>
          {form.interest_type !== 'NONE' && (
            <>
              <Field label="Taxa (%)">
                <input type="number" step="0.01" min="0" value={form.interest_rate}
                  placeholder="Ex: 2.5" className="input" onChange={e => f('interest_rate', e.target.value)} />
              </Field>
              <Field label="Período">
                <select value={form.interest_period} className="input" onChange={e => f('interest_period', e.target.value)}>
                  <option value="MONTHLY">Mensal</option>
                  <option value="YEARLY">Anual</option>
                </select>
              </Field>
            </>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Data de início">
            <input type="date" value={form.start_date} required className="input"
              onChange={e => f('start_date', e.target.value)} />
          </Field>
          <Field label="Data de vencimento">
            <input type="date" value={form.due_date} className="input"
              onChange={e => f('due_date', e.target.value)} />
          </Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Valor da parcela (R$)">
            <input type="number" step="0.01" min="0" value={form.payment_amount}
              placeholder="Opcional" className="input" onChange={e => f('payment_amount', e.target.value)} />
          </Field>
          <Field label="Próximo pagamento">
            <input type="date" value={form.next_payment_date} className="input"
              onChange={e => f('next_payment_date', e.target.value)} />
          </Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Conta de pagamento">
            <select value={form.account_id} className="input" onChange={e => f('account_id', e.target.value)}>
              <option value="">Não especificado</option>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </Field>
          <Field label="Status">
            <select value={form.status} className="input" onChange={e => f('status', e.target.value)}>
              <option value="ACTIVE">Ativa</option>
              <option value="DEFAULTED">Em atraso</option>
              <option value="RENEGOTIATED">Renegociada</option>
              <option value="PAID">Quitada</option>
            </select>
          </Field>
        </div>

        <Field label="Observações (opcional)">
          <input value={form.notes} className="input" placeholder="Detalhes adicionais..."
            onChange={e => f('notes', e.target.value)} />
        </Field>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn btn-secondary flex-1">Cancelar</button>
          <button type="submit" disabled={saving} className="btn btn-primary flex-1">
            {saving ? 'Salvando...' : debt ? 'Salvar alterações' : 'Cadastrar dívida'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ── Formulário de pagamento ───────────────────────────────────────
function PaymentForm({ debt, accounts, onSave, onClose, hidden }: {
  debt: any; accounts: any[]
  onSave: (data: any) => Promise<void>; onClose: () => void; hidden: boolean
}) {
  const today = new Date().toISOString().split('T')[0]
  const [form, setForm] = useState({
    payment_date: today,
    amount_paid:  String(debt.payment_amount ?? ''),
    interest_paid: '0',
    account_id:   debt.account_id ?? '',
    notes:        '',
  })
  const [saving, setSaving] = useState(false)
  const f = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }))

  const amountPaid    = parseFloat(form.amount_paid)    || 0
  const interestPaid  = parseFloat(form.interest_paid)  || 0
  const principalPaid = amountPaid - interestPaid
  const balanceAfter  = Math.max(0, Number(debt.current_balance) - principalPaid)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await onSave({
      payment_date: form.payment_date,
      amount_paid: amountPaid, principal_paid: principalPaid,
      interest_paid: interestPaid, balance_after: balanceAfter,
      account_id: form.account_id || null,
      notes: form.notes || null,
    })
    setSaving(false)
  }

  return (
    <Modal title="Registrar pagamento" onClose={onClose}
      subtitle={`${debt.description} — saldo atual: `}
      subtitleValue={hidden ? '••••••' : fmt(Number(debt.current_balance))}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Data do pagamento">
            <input type="date" value={form.payment_date} required className="input"
              onChange={e => f('payment_date', e.target.value)} />
          </Field>
          <Field label="Total pago (R$)">
            <input type="number" step="0.01" min="0.01" required autoFocus
              value={form.amount_paid} placeholder="0,00" className="input"
              onChange={e => f('amount_paid', e.target.value)} />
          </Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Juros pagos (R$)">
            <input type="number" step="0.01" min="0"
              value={form.interest_paid} placeholder="0,00" className="input"
              onChange={e => f('interest_paid', e.target.value)} />
          </Field>
          <Field label="Conta debitada">
            <select value={form.account_id} className="input" onChange={e => f('account_id', e.target.value)}>
              <option value="">Não especificado</option>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </Field>
        </div>

        {amountPaid > 0 && (
          <div className="rounded-xl p-4" style={{ background: 'var(--bg-elevated)' }}>
            <div className="flex justify-between text-xs mb-1.5">
              <span style={{ color: 'var(--text-muted)' }}>Abate no principal</span>
              <span style={{ fontFamily: 'DM Mono, monospace', color: 'var(--success)', fontWeight: 600 }}>
                {fmt(principalPaid)}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span style={{ color: 'var(--text-muted)' }}>Saldo após pagamento</span>
              <span style={{ fontFamily: 'DM Mono, monospace', fontWeight: 600,
                             color: balanceAfter <= 0 ? 'var(--success)' : 'var(--danger)' }}>
                {balanceAfter <= 0 ? 'QUITADO! 🎉' : fmt(balanceAfter)}
              </span>
            </div>
          </div>
        )}

        <Field label="Observações">
          <input value={form.notes} className="input" placeholder="Opcional"
            onChange={e => f('notes', e.target.value)} />
        </Field>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn btn-secondary flex-1">Cancelar</button>
          <button type="submit" disabled={saving} className="btn btn-primary flex-1">
            {saving ? 'Salvando...' : 'Registrar pagamento'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ── Componentes auxiliares ────────────────────────────────────────
function Modal({ title, subtitle, subtitleValue, onClose, wide, children }: {
  title: string; subtitle?: string; subtitleValue?: string
  onClose: () => void; wide?: boolean; children: React.ReactNode
}) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.6)',
                  backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', padding: 24, overflowY: 'auto' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16,
                    padding: 28, width: '100%', maxWidth: wide ? 560 : 460,
                    boxShadow: 'var(--shadow-lg)', margin: 'auto' }}>
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold text-base" style={{ color: 'var(--text)', letterSpacing: '-0.2px' }}>
            {title}
          </h2>
          <button onClick={onClose} className="btn btn-ghost btn-sm" style={{ padding: '4px 8px' }}>
            <X size={16} />
          </button>
        </div>
        {subtitle && (
          <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
            {subtitle}
            {subtitleValue && (
              <span style={{ color: 'var(--danger)', fontFamily: 'DM Mono, monospace', fontWeight: 600 }}>
                {subtitleValue}
              </span>
            )}
          </p>
        )}
        {!subtitle && <div style={{ marginBottom: 24 }} />}
        {children}
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
        style={{ color: 'var(--text-muted)' }}>{label}</label>
      {children}
    </div>
  )
}
