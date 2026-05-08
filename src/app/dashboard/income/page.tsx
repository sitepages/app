'use client'

import { useState } from 'react'
import { useHideValues } from '@/hooks/useHideValues'
import { createClient }              from '@/services/supabase/client'
import { useIncome, INCOME_CATEGORIES } from '@/hooks/useIncome'
import { useAccounts }               from '@/hooks/useAccounts'
import { Plus, TrendingUp, X, Pencil, Trash2, Calendar } from 'lucide-react'

const HOUSEHOLD_ID = process.env.NEXT_PUBLIC_HOUSEHOLD_ID!

function formatCurrency(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}
function formatDate(iso: string) {
  const [y, m, d] = iso.split('-'); return `${d}/${m}/${y}`
}
function getDefaultMonth() {
  return new Date().toISOString().slice(0, 7)
}

export default function IncomePage() {
  const [month, setMonth]         = useState(getDefaultMonth())
  const [showForm, setShowForm]   = useState(false)
  const [editing, setEditing]     = useState<any>(null)
  const { hidden } = useHideValues()
  const h = (v: number) => hidden ? '••••••' : formatCurrency(v)

  const { entries, loading, total, byCategory, byMember, createEntry, updateEntry, deleteEntry } =
    useIncome(HOUSEHOLD_ID, month)
  const { accounts } = useAccounts(HOUSEHOLD_ID)

  async function handleSave(data: any) {
    if (editing) {
      await updateEntry(editing.id, data)
      setEditing(null)
    } else {
      await createEntry(data)
      setShowForm(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir esta renda?')) return
    await deleteEntry(id)
  }

  return (
    <div className="p-4 md:p-7 max-w-[1000px] mx-auto">

      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between mb-4 md:mb-7 animate-fade-up">
        <div>
          <h1 className="page-title">Rendas</h1>
          <p className="page-subtitle">Registro manual de entradas</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn btn-primary self-start">
          <Plus size={14} /> Registrar renda
        </button>
      </div>

      {/* Filtro de mês */}
      <div className="card px-4 py-3 mb-6 flex items-center gap-3 animate-fade-up-1"
        style={{ width: 'fit-content' }}>
        <Calendar size={13} style={{ color: 'var(--text-muted)' }} />
        <input type="month" value={month} onChange={e => setMonth(e.target.value)}
          className="input" style={{ width: 'auto' }} />
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-7 animate-fade-up-1">
        {/* Total */}
        <div className="stat-card" style={{ borderColor: 'var(--brand-border)' }}>
          <p className="stat-label">Total do mês</p>
          <p className="stat-value" style={{ color: 'var(--brand)' }}>{h(total)}</p>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
            {entries.length} {entries.length === 1 ? 'lançamento' : 'lançamentos'}
          </p>
        </div>

        {/* Por pessoa */}
        <div className="stat-card sm:col-span-2">
          <p className="stat-label mb-3">Por pessoa</p>
          {byMember.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Nenhuma renda registrada</p>
          ) : (
            <div className="space-y-3">
              {byMember.map(m => (
                <div key={m.userId}>
                  <div className="flex justify-between mb-1">
                    <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{m.name}</span>
                    <span style={{ fontSize: 13, fontFamily: 'DM Mono, monospace', color: 'var(--text)' }}>
                      {h(m.total)}
                    </span>
                  </div>
                  <div className="progress-track">
                    <div className="progress-fill" style={{
                      width: `${total > 0 ? (m.total / total) * 100 : 0}%`,
                      background: 'var(--brand)',
                    }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Por categoria */}
      {byCategory.length > 0 && (
        <div className="card px-5 py-4 mb-7 animate-fade-up-2">
          <p className="text-xs font-semibold uppercase tracking-wider mb-4"
            style={{ color: 'var(--text-muted)' }}>Por categoria</p>
          <div className="flex flex-wrap gap-3">
            {byCategory.map(c => (
              <div key={c.category} className="flex items-center gap-2 px-3 py-2 rounded-xl"
                style={{ background: INCOME_CATEGORIES[c.category as keyof typeof INCOME_CATEGORIES].bg }}>
                <span className="w-2 h-2 rounded-full" style={{ background: c.color }} />
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{c.label}</span>
                <span style={{ fontSize: 13, fontFamily: 'DM Mono, monospace', color: c.color, fontWeight: 600 }}>
                  {h(c.total)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabela */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-5 h-5 rounded-full border-2 animate-spin"
            style={{ borderColor: 'var(--brand)', borderTopColor: 'transparent' }} />
        </div>
      ) : entries.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-20 gap-4 text-center"
          style={{ borderStyle: 'dashed' }}>
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: 'var(--brand-bg)', border: '1px solid var(--brand-border)' }}>
            <TrendingUp size={22} style={{ color: 'var(--brand)' }} />
          </div>
          <div>
            <p className="font-semibold" style={{ color: 'var(--text)' }}>Nenhuma renda em {month}</p>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
              Registre seus salários e outras entradas manualmente
            </p>
          </div>
          <button onClick={() => setShowForm(true)} className="btn btn-primary mt-2">
            <Plus size={14} /> Registrar primeira renda
          </button>
        </div>
      ) : (
        <div className="card overflow-hidden animate-fade-up-3">
          <table className="table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Descrição</th>
                <th>Categoria</th>
                <th>Conta</th>
                <th>Quem</th>
                <th style={{ textAlign: 'right' }}>Valor</th>
                <th style={{ width: 80, textAlign: 'center' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {entries.map(entry => {
                const cat = INCOME_CATEGORIES[entry.category]
                return (
                  <tr key={entry.id}>
                    <td style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, whiteSpace: 'nowrap' }}>
                      {formatDate(entry.date)}
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <span style={{ color: 'var(--text)', fontWeight: 500, fontSize: 13 }}>
                          {entry.description}
                        </span>
                        {entry.is_recurring && (
                          <span className="badge badge-info" style={{ fontSize: 10 }}>Recorrente</span>
                        )}
                      </div>
                      {entry.notes && (
                        <p style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 1 }}>{entry.notes}</p>
                      )}
                    </td>
                    <td>
                      <span className="badge" style={{ color: cat.color, background: cat.bg, borderColor: `${cat.color}40` }}>
                        {cat.label}
                      </span>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {entry.accounts?.name ?? '—'}
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                      {entry.member_name}
                    </td>
                    <td style={{
                      textAlign: 'right', fontFamily: 'DM Mono, monospace',
                      fontWeight: 600, fontSize: 13, color: 'var(--success)', whiteSpace: 'nowrap',
                    }}>
                      {hidden ? '••••••' : '+' + formatCurrency(Number(entry.amount))}
                    </td>
                    <td>
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => setEditing(entry)}
                          className="btn btn-ghost btn-sm" style={{ padding: '5px' }}
                          title="Editar">
                          <Pencil size={13} />
                        </button>
                        <button onClick={() => handleDelete(entry.id)}
                          className="btn btn-ghost btn-sm" style={{ padding: '5px', color: 'var(--danger)' }}
                          title="Excluir">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal: nova / editar renda */}
      {(showForm || editing) && (
        <IncomeForm
          accounts={accounts}
          entry={editing}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditing(null) }}
        />
      )}
    </div>
  )
}

// ── Formulário de renda ───────────────────────────────────────────
function IncomeForm({ accounts, entry, onSave, onClose }: {
  accounts: any[]; entry?: any
  onSave: (data: any) => Promise<void>; onClose: () => void
}) {
  const today = new Date().toISOString().split('T')[0]
  const [form, setForm] = useState({
    description:      entry?.description      ?? '',
    amount:           entry?.amount           ?? '',
    category:         entry?.category         ?? 'SALARY',
    date:             entry?.date             ?? today,
    competence_month: entry?.competence_month ?? today.slice(0, 7),
    account_id:       entry?.account_id       ?? '',
    is_recurring:     entry?.is_recurring     ?? false,
    notes:            entry?.notes            ?? '',
    user_id:          entry?.user_id          ?? '',
  })
  const [saving, setSaving]   = useState(false)
  const [userId, setUserId]   = useState<string | null>(null)

  // Pega o userId atual
  useState(() => {
    createClient().auth.getUser().then(({ data }) => {
      if (!form.user_id) setForm(f => ({ ...f, user_id: data.user?.id ?? '' }))
      setUserId(data.user?.id ?? null)
    })
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await onSave({
      ...form,
      amount:     parseFloat(String(form.amount)) || 0,
      account_id: form.account_id || null,
      user_id:    form.user_id || userId,
    })
    setSaving(false)
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 16, padding: 28, width: '100%', maxWidth: 500,
        boxShadow: 'var(--shadow-lg)',
      }}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-semibold text-base" style={{ color: 'var(--text)', letterSpacing: '-0.2px' }}>
            {entry ? 'Editar renda' : 'Registrar renda'}
          </h2>
          <button onClick={onClose} className="btn btn-ghost btn-sm" style={{ padding: '4px 8px' }}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Descrição */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
              style={{ color: 'var(--text-muted)' }}>Descrição</label>
            <input
              value={form.description} required className="input"
              placeholder="Ex: Salário março, Freelance XYZ"
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            />
          </div>

          {/* Valor + Categoria */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
                style={{ color: 'var(--text-muted)' }}>Valor (R$)</label>
              <input
                type="number" step="0.01" min="0.01" required
                value={form.amount} placeholder="0,00" className="input"
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
                style={{ color: 'var(--text-muted)' }}>Categoria</label>
              <select value={form.category} className="input"
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                {Object.entries(INCOME_CATEGORIES).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Data recebimento + Mês competência */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
                style={{ color: 'var(--text-muted)' }}>Data recebimento</label>
              <input type="date" value={form.date} required className="input"
                onChange={e => setForm(f => ({
                  ...f,
                  date: e.target.value,
                  competence_month: e.target.value.slice(0, 7),
                }))}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
                style={{ color: 'var(--text-muted)' }}>Mês competência</label>
              <input type="month" value={form.competence_month} required className="input"
                onChange={e => setForm(f => ({ ...f, competence_month: e.target.value }))}
              />
            </div>
          </div>

          {/* Conta destino */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
              style={{ color: 'var(--text-muted)' }}>Entrou em qual conta</label>
            <select value={form.account_id} className="input"
              onChange={e => setForm(f => ({ ...f, account_id: e.target.value }))}>
              <option value="">Não especificado</option>
              {accounts.map(a => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>

          {/* Recorrente + Notas */}
          <div className="flex items-start gap-4">
            <label className="flex items-center gap-2 cursor-pointer mt-1">
              <input type="checkbox" checked={form.is_recurring}
                onChange={e => setForm(f => ({ ...f, is_recurring: e.target.checked }))}
                style={{ accentColor: 'var(--brand)', width: 15, height: 15 }}
              />
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                Renda recorrente mensal
              </span>
            </label>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
              style={{ color: 'var(--text-muted)' }}>Observações (opcional)</label>
            <input value={form.notes} className="input" placeholder="Detalhes adicionais..."
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            />
          </div>

          {/* Botões */}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn btn-secondary flex-1">Cancelar</button>
            <button type="submit" disabled={saving} className="btn btn-primary flex-1">
              {saving ? 'Salvando...' : entry ? 'Salvar alterações' : 'Registrar renda'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
