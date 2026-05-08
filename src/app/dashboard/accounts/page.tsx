'use client'

import { useState, useEffect } from 'react'
import { useHideValues } from '@/hooks/useHideValues'
import { createClient } from '@/services/supabase/client'
import { useAccounts, ACCOUNT_TYPES } from '@/hooks/useAccounts'
import { INCOME_CATEGORIES } from '@/hooks/useIncome'
import { useHouseholdMembers }        from '@/hooks/useHouseholdMembers'
import {
  Wallet, Plus, Pencil, EyeOff, TrendingUp,
  RefreshCw, X, Check, ChevronDown,
} from 'lucide-react'

const HOUSEHOLD_ID = process.env.NEXT_PUBLIC_HOUSEHOLD_ID!

function formatCurrency(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}
function formatDate(iso: string) {
  const [y, m, d] = iso.split('-'); return `${d}/${m}/${y}`
}

export default function AccountsPage() {
  const { hidden } = useHideValues()
  const { accounts, loading, summary, createAccount, updateAccount, updateBalance, deactivateAccount } = useAccounts(HOUSEHOLD_ID)
  const { members } = useHouseholdMembers(HOUSEHOLD_ID)
  const [showForm, setShowForm]           = useState(false)
  const [editingId, setEditingId]         = useState<string | null>(null)
  const [editBalance, setEditBalance]     = useState<{ id: string; value: string } | null>(null)
  const [expandedAccountId, setExpandedAccountId] = useState<string | null>(null)

  // Agrupa contas por tipo
  const groups = Object.entries(ACCOUNT_TYPES).map(([type, meta]) => ({
    type, meta,
    accounts: accounts.filter(a => a.type === type),
  })).filter(g => g.accounts.length > 0)

  return (
    <div className="p-4 md:p-7 max-w-[900px] mx-auto">

      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between mb-4 md:mb-7 animate-fade-up">
        <div>
          <h1 className="page-title">Patrimônio</h1>
          <p className="page-subtitle">Onde seu dinheiro está alocado</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn btn-primary self-start">
          <Plus size={14} /> Nova conta
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8 animate-fade-up-1">
        <SummaryCard label="Disponível" value={summary.disponivel}
          sub="Conta corrente + VA" color="var(--success)" hidden={hidden} />
        <SummaryCard label="Investido"  value={summary.investido}
          sub="Poupança + CDI + Invest." color="var(--info)" hidden={hidden} />
        <SummaryCard label="Total"      value={summary.total}
          sub="Patrimônio completo" color="var(--brand)"
          highlight hidden={hidden} />
      </div>

      {/* Lista de contas */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-5 h-5 rounded-full border-2 animate-spin"
            style={{ borderColor: 'var(--brand)', borderTopColor: 'transparent' }} />
        </div>
      ) : accounts.length === 0 ? (
        <EmptyState onAdd={() => setShowForm(true)} />
      ) : (
        <div className="space-y-6 animate-fade-up-2">
          {groups.map(({ type, meta, accounts: groupAccounts }) => (
            <div key={type}>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2 h-2 rounded-full" style={{ background: meta.color }} />
                <p className="text-xs font-semibold uppercase tracking-wider"
                  style={{ color: 'var(--text-muted)' }}>
                  {meta.label}
                </p>
                <span className="text-xs font-mono ml-auto" style={{ color: meta.color }}>
                  {hidden ? '••••••' : formatCurrency(groupAccounts.reduce((s, a) => s + Number(a.balance), 0))}
                </span>
              </div>

              <div className="space-y-2">
                {groupAccounts.map(account => (
                  <div key={account.id} className="card" style={{ overflow: 'hidden' }}>
                  <div className="px-5 py-4 flex items-center gap-4">

                    {/* Ícone */}
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: meta.bg, color: meta.color }}>
                      <Wallet size={16} />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm" style={{ color: 'var(--text)' }}>
                        {account.name}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        {account.owner_id
                          ? members.find(m => m.user_id === account.owner_id)?.display_name ?? '—'
                          : 'Casal'
                        }
                        {account.balance_date && (
                          <span> · Atualizado em {formatDate(account.balance_date)}</span>
                        )}
                      </p>
                    </div>

                    {/* Saldo editável */}
                    {editBalance?.id === account.id ? (
                      <div className="flex items-center gap-2">
                        <span className="text-sm" style={{ color: 'var(--text-muted)' }}>R$</span>
                        <input
                          type="number"
                          value={editBalance.value}
                          onChange={e => setEditBalance({ id: account.id, value: e.target.value })}
                          className="input text-right font-mono"
                          style={{ width: 140, padding: '6px 10px' }}
                          autoFocus
                          onKeyDown={async e => {
                            if (e.key === 'Enter') {
                              await updateBalance(account.id, parseFloat(editBalance.value) || 0)
                              setEditBalance(null)
                            }
                            if (e.key === 'Escape') setEditBalance(null)
                          }}
                        />
                        <button onClick={async () => {
                          await updateBalance(account.id, parseFloat(editBalance.value) || 0)
                          setEditBalance(null)
                        }} className="btn btn-primary btn-sm" style={{ padding: '6px 10px' }}>
                          <Check size={13} />
                        </button>
                        <button onClick={() => setEditBalance(null)}
                          className="btn btn-ghost btn-sm" style={{ padding: '6px 10px' }}>
                          <X size={13} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setEditBalance({ id: account.id, value: String(account.balance) })}
                        className="flex items-center gap-2 group"
                        title="Clique para atualizar o saldo"
                      >
                        <span className="font-mono font-semibold text-base"
                          style={{ color: Number(account.balance) >= 0 ? 'var(--text)' : 'var(--danger)' }}>
                          {hidden ? '••••••' : formatCurrency(Number(account.balance))}
                        </span>
                        <RefreshCw size={12}
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                          style={{ color: 'var(--text-muted)' }} />
                      </button>
                    )}

                    {/* Histórico de rendas */}
                    <button
                      onClick={() => setExpandedAccountId(expandedAccountId === account.id ? null : account.id)}
                      title="Histórico de rendas"
                      style={{
                        background: 'transparent', border: 'none', cursor: 'pointer',
                        color: expandedAccountId === account.id ? 'var(--brand)' : 'var(--text-muted)',
                        padding: '4px 6px', borderRadius: 6, display: 'flex', alignItems: 'center',
                        transition: 'color 0.15s',
                      }}
                    >
                      <TrendingUp size={14} />
                    </button>

                    {/* Menu */}
                    <AccountMenu
                      account={account}
                      onEdit={() => setEditingId(account.id)}
                      onDeactivate={() => deactivateAccount(account.id)}
                      onUpdateBalance={() => setEditBalance({ id: account.id, value: String(account.balance) })}
                    />
                  </div>
                  {expandedAccountId === account.id && (
                    <AccountIncomeHistory accountId={account.id} hidden={hidden} />
                  )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: nova conta */}
      {showForm && (
        <AccountForm
          members={members}
          onSave={async (data) => {
            await createAccount(data)
            setShowForm(false)
          }}
          onClose={() => setShowForm(false)}
        />
      )}

      {/* Modal: editar conta */}
      {editingId && (
        <AccountForm
          members={members}
          account={accounts.find(a => a.id === editingId)}
          onSave={async (data) => {
            await updateAccount(editingId, data)
            setEditingId(null)
          }}
          onClose={() => setEditingId(null)}
        />
      )}
    </div>
  )
}

// ── Summary Card ─────────────────────────────────────────────────
function SummaryCard({ label, value, sub, color, highlight, hidden }: {
  label: string; value: number; sub: string
  color: string; highlight?: boolean; hidden: boolean
}) {
  return (
    <div className="stat-card" style={highlight ? { borderColor: 'var(--brand-border)' } : {}}>
      <p className="stat-label">{label}</p>
      <p className="stat-value" style={{ color }}>{hidden ? '••••••' : formatCurrency(value)}</p>
      <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>{sub}</p>
    </div>
  )
}

// ── Empty State ───────────────────────────────────────────────────
function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="card flex flex-col items-center justify-center py-20 gap-4 text-center"
      style={{ borderStyle: 'dashed' }}>
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
        style={{ background: 'var(--brand-bg)', border: '1px solid var(--brand-border)' }}>
        <Wallet size={22} style={{ color: 'var(--brand)' }} />
      </div>
      <div>
        <p className="font-semibold" style={{ color: 'var(--text)' }}>Nenhuma conta cadastrada</p>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          Adicione suas contas para visualizar seu patrimônio
        </p>
      </div>
      <button onClick={onAdd} className="btn btn-primary mt-2">
        <Plus size={14} /> Adicionar primeira conta
      </button>
    </div>
  )
}

// ── Account Menu ──────────────────────────────────────────────────
function AccountMenu({ account, onEdit, onDeactivate, onUpdateBalance }: {
  account: any; onEdit: () => void
  onDeactivate: () => void; onUpdateBalance: () => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          background: 'transparent', border: 'none', cursor: 'pointer',
          color: 'var(--text-muted)', fontSize: 18, padding: '2px 6px', borderRadius: 6,
        }}
        onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-elevated)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
      >···</button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />
          <div style={{
            position: 'absolute', right: 0, top: '100%', zIndex: 50,
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 10, padding: 4, minWidth: 200,
            boxShadow: 'var(--shadow-lg)',
          }}>
            <MenuBtn onClick={() => { setOpen(false); onUpdateBalance() }} color="var(--brand)" bg="var(--brand-bg)">
              <RefreshCw size={13} /> Atualizar saldo
            </MenuBtn>
            <MenuBtn onClick={() => { setOpen(false); onEdit() }} color="var(--text)" bg="var(--bg-elevated)">
              <Pencil size={13} /> Editar conta
            </MenuBtn>
            <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
            <MenuBtn onClick={() => { setOpen(false); onDeactivate() }} color="var(--danger)" bg="var(--danger-bg)">
              <EyeOff size={13} /> Desativar conta
            </MenuBtn>
          </div>
        </>
      )}
    </div>
  )
}

// ── Account Form (criar / editar) ─────────────────────────────────
function AccountForm({ members, account, onSave, onClose }: {
  members: any[]; account?: any
  onSave: (data: any) => Promise<void>; onClose: () => void
}) {
  const [form, setForm] = useState({
    name:         account?.name         ?? '',
    type:         account?.type         ?? 'CHECKING',
    balance:      account?.balance      ?? '',
    balance_date: account?.balance_date ?? new Date().toISOString().split('T')[0],
    owner_id:     account?.owner_id     ?? '',
    notes:        account?.notes        ?? '',
    is_active:    account?.is_active    ?? true,
  })
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await onSave({
      ...form,
      balance:  parseFloat(String(form.balance)) || 0,
      owner_id: form.owner_id || null,
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
        borderRadius: 16, padding: 28, width: '100%', maxWidth: 480,
        boxShadow: 'var(--shadow-lg)',
      }}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-semibold text-base" style={{ color: 'var(--text)', letterSpacing: '-0.2px' }}>
            {account ? 'Editar conta' : 'Nova conta'}
          </h2>
          <button onClick={onClose} className="btn btn-ghost btn-sm" style={{ padding: '4px 8px' }}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Nome */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
              style={{ color: 'var(--text-muted)' }}>
              Nome da conta
            </label>
            <input
              value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Ex: Conta Corrente Jhonatas"
              required className="input"
            />
          </div>

          {/* Tipo + Dono */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
                style={{ color: 'var(--text-muted)' }}>Tipo</label>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                className="input">
                {Object.entries(ACCOUNT_TYPES).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
                style={{ color: 'var(--text-muted)' }}>Responsável</label>
              <select value={form.owner_id} onChange={e => setForm(f => ({ ...f, owner_id: e.target.value }))}
                className="input">
                <option value="">Casal</option>
                {members.map(m => (
                  <option key={m.user_id} value={m.user_id}>{m.display_name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Saldo + Data */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
                style={{ color: 'var(--text-muted)' }}>Saldo atual (R$)</label>
              <input
                type="number" step="0.01"
                value={form.balance} onChange={e => setForm(f => ({ ...f, balance: e.target.value }))}
                placeholder="0,00" className="input"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
                style={{ color: 'var(--text-muted)' }}>Data de referência</label>
              <input
                type="date" value={form.balance_date}
                onChange={e => setForm(f => ({ ...f, balance_date: e.target.value }))}
                className="input"
              />
            </div>
          </div>

          {/* Notas */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
              style={{ color: 'var(--text-muted)' }}>Observações (opcional)</label>
            <input
              value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Ex: Reserva de emergência"
              className="input"
            />
          </div>

          {/* Botões */}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn btn-secondary flex-1">
              Cancelar
            </button>
            <button type="submit" disabled={saving} className="btn btn-primary flex-1">
              {saving ? 'Salvando...' : account ? 'Salvar alterações' : 'Criar conta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Account Income History ────────────────────────────────────────
function AccountIncomeHistory({ accountId, hidden }: { accountId: string; hidden: boolean }) {
  const [entries, setEntries] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('income_entries')
      .select('id, amount, description, category, date')
      .eq('account_id', accountId)
      .order('date', { ascending: false })
      .limit(30)
      .then(({ data }) => {
        setEntries(data ?? [])
        setLoading(false)
      })
  }, [accountId])

  return (
    <div style={{ borderTop: '1px solid var(--border)', padding: '14px 20px' }}>
      <p style={{
        fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
        letterSpacing: '0.07em', color: 'var(--text-muted)', marginBottom: 10,
      }}>
        Rendas vinculadas
      </p>
      {loading ? (
        <div style={{ textAlign: 'center', padding: '8px 0' }}>
          <div className="w-4 h-4 rounded-full border-2 animate-spin mx-auto"
            style={{ borderColor: 'var(--brand)', borderTopColor: 'transparent' }} />
        </div>
      ) : entries.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '4px 0' }}>
          Nenhuma renda registrada nesta conta
        </p>
      ) : (
        <div className="space-y-2">
          {entries.map(entry => {
            const cat = INCOME_CATEGORIES[entry.category as keyof typeof INCOME_CATEGORIES]
            return (
              <div key={entry.id} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
                <span style={{
                  padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 500,
                  background: cat?.bg ?? 'var(--bg-elevated)',
                  color: cat?.color ?? 'var(--text-muted)',
                  whiteSpace: 'nowrap', flexShrink: 0,
                }}>
                  {cat?.label ?? entry.category}
                </span>
                <span style={{
                  flex: 1, color: 'var(--text)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {entry.description}
                </span>
                <span style={{ color: 'var(--text-muted)', fontSize: 11, whiteSpace: 'nowrap', flexShrink: 0 }}>
                  {formatDate(entry.date)}
                </span>
                <span style={{
                  fontFamily: 'DM Mono, monospace', color: 'var(--brand)',
                  fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0,
                }}>
                  {hidden ? '••••••' : formatCurrency(Number(entry.amount))}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function MenuBtn({ onClick, color, bg, children }: {
  onClick: () => void; color: string; bg: string; children: React.ReactNode
}) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 8,
      width: '100%', padding: '8px 12px', borderRadius: 7,
      fontSize: 13, color, background: 'transparent',
      border: 'none', cursor: 'pointer', textAlign: 'left',
    }}
      onMouseEnter={e => (e.currentTarget.style.background = bg)}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >{children}</button>
  )
}
