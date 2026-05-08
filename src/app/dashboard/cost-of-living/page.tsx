'use client'
import { useState } from 'react'
import { useCostOfLiving, CostPeriod } from '@/hooks/useCostOfLiving'
import { useFixedCosts }   from '@/hooks/useFixedCosts'
import { useCategories }   from '@/hooks/useCategories'
import { Plus, X, Pencil, Trash2, Home } from 'lucide-react'
import { useHideValues } from '@/hooks/useHideValues'

const HOUSEHOLD_ID = process.env.NEXT_PUBLIC_HOUSEHOLD_ID!
const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

function getCurrentMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function getFullMonthLabel(m: string): string {
  const [y, mo] = m.split('-')
  const names = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho',
                  'Agosto','Setembro','Outubro','Novembro','Dezembro']
  return `${names[parseInt(mo) - 1]} ${y}`
}

function navigateMonth(m: string, delta: number): string {
  const [y, mo] = m.split('-').map(Number)
  const d = new Date(y, mo - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function monthLabel(m: string) {
  const [y, mo] = m.split('-')
  const n = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
  return `${n[parseInt(mo) - 1]}/${y.slice(2)}`
}

export default function CostOfLivingPage() {
  const [period, setPeriod]               = useState<CostPeriod>('3')
  const [viewMode, setViewMode]           = useState<'average' | 'month'>('average')
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth())

  const { data, loading } = useCostOfLiving(
    HOUSEHOLD_ID,
    period,
    viewMode === 'month' ? selectedMonth : undefined,
  )
  const { costs, upsert, remove } = useFixedCosts(HOUSEHOLD_ID)
  const { categories }            = useCategories()
  const { hidden }                = useHideValues()
  const h = (v: number) => hidden ? '••••••' : fmt(v)
  const [showForm, setShowForm]   = useState(false)
  const [editing, setEditing]     = useState<any>(null)
  const [formType, setFormType]   = useState<'FIXED' | 'VARIABLE'>('FIXED')

  const maxMonth     = data ? Math.max(...data.byMonth.map(m => m.total), 1) : 1
  const fixedCosts   = costs.filter(c => c.type === 'FIXED')
  const varCosts     = costs.filter(c => c.type === 'VARIABLE')
  const currentMonth = getCurrentMonth()

  function goToMonth(month: string) {
    setSelectedMonth(month)
    setViewMode('month')
  }

  const btnBase: React.CSSProperties = { border: 'none', cursor: 'pointer', transition: 'all 0.15s' }

  return (
    <div className="p-4 md:p-7 max-w-[1100px] mx-auto">

      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between mb-4 md:mb-7 animate-fade-up">
        <div>
          <h1 className="page-title">Custo de Vida</h1>
          <p className="page-subtitle">Quanto custa manter seu padrão de vida atual</p>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap gap-2 self-start items-center">

          {/* Month navigator */}
          <div className="flex items-center gap-0 p-1 rounded-xl"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <button
              onClick={() => goToMonth(navigateMonth(selectedMonth, -1))}
              style={{ ...btnBase, padding: '6px 10px', borderRadius: 8, background: 'transparent',
                       color: 'var(--text-muted)', fontSize: 16, lineHeight: 1 }}>
              ‹
            </button>
            <button
              onClick={() => goToMonth(selectedMonth)}
              style={{
                ...btnBase, padding: '6px 12px', borderRadius: 8, fontSize: 13, fontWeight: 500,
                minWidth: 128, textAlign: 'center',
                background: viewMode === 'month' ? 'var(--brand)' : 'transparent',
                color: viewMode === 'month' ? 'var(--text-inverse)' : 'var(--text-secondary)',
              }}>
              {getFullMonthLabel(selectedMonth)}
            </button>
            <button
              onClick={() => { if (selectedMonth < currentMonth) goToMonth(navigateMonth(selectedMonth, 1)) }}
              style={{
                ...btnBase, padding: '6px 10px', borderRadius: 8, background: 'transparent',
                fontSize: 16, lineHeight: 1,
                color: selectedMonth >= currentMonth ? 'var(--border)' : 'var(--text-muted)',
                cursor: selectedMonth >= currentMonth ? 'not-allowed' : 'pointer',
              }}>
              ›
            </button>
          </div>

          {/* Mês atual shortcut + period buttons */}
          <div className="flex gap-1 p-1 rounded-xl"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <button
              onClick={() => goToMonth(currentMonth)}
              style={{
                ...btnBase, padding: '6px 12px', borderRadius: 8, fontSize: 13, fontWeight: 500,
                background: viewMode === 'month' && selectedMonth === currentMonth
                  ? 'var(--brand)' : 'transparent',
                color: viewMode === 'month' && selectedMonth === currentMonth
                  ? 'var(--text-inverse)' : 'var(--text-muted)',
              }}>
              Mês atual
            </button>
            {(['3', '6', '12'] as CostPeriod[]).map(p => (
              <button key={p}
                onClick={() => { setViewMode('average'); setPeriod(p) }}
                style={{
                  ...btnBase, padding: '6px 12px', borderRadius: 8, fontSize: 13, fontWeight: 500,
                  background: viewMode === 'average' && period === p ? 'var(--brand)' : 'transparent',
                  color: viewMode === 'average' && period === p ? 'var(--text-inverse)' : 'var(--text-muted)',
                }}>
                {p}m
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stat cards */}
      {!loading && data && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 animate-fade-up-1">
          <div className="stat-card sm:col-span-2" style={{ borderColor: 'var(--brand-border)' }}>
            <p className="stat-label">
              {data.mode === 'month' ? 'Custo do Mês' : 'Custo Médio Mensal'}
            </p>
            <p className="stat-value" style={{ color: 'var(--brand)' }}>{h(data.totalMonthly)}</p>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
              {data.mode === 'month'
                ? getFullMonthLabel(data.selectedMonth!)
                : `média de ${data.period} meses`}
            </p>
          </div>
          <div className="stat-card">
            <p className="stat-label">Custo Diário</p>
            <p className="stat-value" style={{ color: 'var(--info)' }}>{h(data.dailyAverage)}</p>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>por dia</p>
          </div>
          <div className="stat-card">
            <p className="stat-label mb-3">Fixo vs Variável</p>
            <div className="flex rounded-lg overflow-hidden mb-2" style={{ height: 8 }}>
              <div style={{ width: `${data.fixedPercent}%`, background: 'var(--danger)', transition: 'width 0.5s' }} />
              <div style={{ flex: 1, background: 'var(--warning)' }} />
            </div>
            <div className="flex justify-between">
              <span style={{ fontSize: 11, color: 'var(--danger)' }}>Fixo {data.fixedPercent}%</span>
              <span style={{ fontSize: 11, color: 'var(--warning)' }}>Variável {data.variablePercent}%</span>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 animate-fade-up-2">

        {/* CUSTOS FIXOS */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              Custos Fixos Mensais
            </p>
            <button onClick={() => { setFormType('FIXED'); setEditing(null); setShowForm(true) }}
              className="btn btn-secondary btn-sm">
              <Plus size={12} /> Adicionar
            </button>
          </div>
          <div className="card overflow-hidden">
            {fixedCosts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3 text-center px-6">
                <Home size={24} style={{ color: 'var(--text-muted)' }} />
                <div>
                  <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>
                    Nenhum custo fixo cadastrado
                  </p>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                    Ex: Aluguel, Condomínio, Internet, Escola, Plano de saúde
                  </p>
                </div>
                <button onClick={() => { setFormType('FIXED'); setShowForm(true) }}
                  className="btn btn-primary btn-sm mt-1">
                  <Plus size={12} /> Adicionar custo fixo
                </button>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  {fixedCosts.map(cost => (
                    <tr key={cost.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '11px 16px' }}>
                        <p style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>{cost.name}</p>
                        {cost.categories && (
                          <span style={{ fontSize: 11, color: cost.categories.color }}>
                            {cost.categories.name}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '11px 16px', textAlign: 'right',
                                   fontFamily: 'DM Mono, monospace', fontWeight: 600,
                                   color: 'var(--danger)', fontSize: 13, whiteSpace: 'nowrap' }}>
                        {h(Number(cost.amount))}
                      </td>
                      <td style={{ padding: '11px 8px', width: 72 }}>
                        <div className="flex gap-1 justify-center">
                          <button onClick={() => { setEditing(cost); setFormType('FIXED'); setShowForm(true) }}
                            className="btn btn-ghost btn-sm" style={{ padding: '4px' }}>
                            <Pencil size={12} />
                          </button>
                          <button onClick={() => { if (confirm('Remover este custo?')) remove(cost.id) }}
                            className="btn btn-ghost btn-sm" style={{ padding: '4px', color: 'var(--danger)' }}>
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  <tr style={{ background: 'var(--bg-elevated)' }}>
                    <td style={{ padding: '10px 16px', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>
                      Total fixo/mês
                    </td>
                    <td style={{ padding: '10px 16px', textAlign: 'right',
                                 fontFamily: 'DM Mono, monospace', fontWeight: 700,
                                 color: 'var(--danger)', fontSize: 15 }}>
                      {h(fixedCosts.reduce((s, c) => s + Number(c.amount), 0))}
                    </td>
                    <td />
                  </tr>
                </tbody>
              </table>
            )}
          </div>
        </section>

        {/* CUSTOS VARIÁVEIS */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              Custos Variáveis
            </p>
            <button onClick={() => { setFormType('VARIABLE'); setEditing(null); setShowForm(true) }}
              className="btn btn-secondary btn-sm">
              <Plus size={12} /> Adicionar
            </button>
          </div>
          <div className="card overflow-hidden">
            {varCosts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3 text-center px-6">
                <div>
                  <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>
                    Nenhum custo variável cadastrado
                  </p>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                    Ex: Supermercado, Lazer, Combustível, Restaurantes
                  </p>
                </div>
                <button onClick={() => { setFormType('VARIABLE'); setShowForm(true) }}
                  className="btn btn-primary btn-sm mt-1">
                  <Plus size={12} /> Adicionar custo variável
                </button>
              </div>
            ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                {varCosts.map(cost => (
                  <tr key={cost.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '11px 16px' }}>
                      <p style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>{cost.name}</p>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Manual</span>
                    </td>
                    <td style={{ padding: '11px 16px', textAlign: 'right',
                                 fontFamily: 'DM Mono, monospace', fontWeight: 600,
                                 color: 'var(--warning)', fontSize: 13, whiteSpace: 'nowrap' }}>
                      {h(Number(cost.amount))}
                    </td>
                    <td style={{ padding: '11px 8px', width: 72 }}>
                      <div className="flex gap-1 justify-center">
                        <button onClick={() => { setEditing(cost); setFormType('VARIABLE'); setShowForm(true) }}
                          className="btn btn-ghost btn-sm" style={{ padding: '4px' }}>
                          <Pencil size={12} />
                        </button>
                        <button onClick={() => { if (confirm('Remover?')) remove(cost.id) }}
                          className="btn btn-ghost btn-sm" style={{ padding: '4px', color: 'var(--danger)' }}>
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {/* Total variável */}
                {data && (
                  <tr style={{ background: 'var(--bg-elevated)' }}>
                    <td style={{ padding: '10px 16px', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>
                      Total variável/mês
                    </td>
                    <td style={{ padding: '10px 16px', textAlign: 'right',
                                 fontFamily: 'DM Mono, monospace', fontWeight: 700,
                                 color: 'var(--warning)', fontSize: 15 }}>
                      {h(varCosts.reduce((s, c) => s + Number(c.amount), 0))}
                    </td>
                    <td />
                  </tr>
                )}
              </tbody>
            </table>
            )}
          </div>
        </section>

        {/* TENDÊNCIA MENSAL */}
        {data && data.byMonth.length > 1 && (
          <section className="md:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-wider mb-3"
              style={{ color: 'var(--text-muted)' }}>
              Tendência Mensal
            </p>
            <div className="card px-6 py-5">
              <div className="flex items-end gap-4" style={{ height: 100 }}>
                {data.byMonth.map(m => {
                  const fixedH       = maxMonth > 0 ? (m.fixed    / maxMonth) * 80 : 0
                  const variableH    = maxMonth > 0 ? (m.variable / maxMonth) * 80 : 0
                  const isHighlighted = m.month === data.highlightMonth
                  return (
                    <div key={m.month} className="flex-1 flex flex-col items-center gap-1.5"
                      style={{ cursor: 'pointer' }}
                      onClick={() => goToMonth(m.month)}>
                      <span style={{
                        fontSize: 10, fontFamily: 'DM Mono, monospace',
                        color:      isHighlighted ? 'var(--brand)' : 'var(--text-muted)',
                        fontWeight: isHighlighted ? 600 : 400,
                      }}>
                        {hidden ? '•••' : fmt(m.total).replace('R ', '')}
                      </span>
                      <div className="w-full flex flex-col justify-end rounded-lg overflow-hidden"
                        style={{ height: 70, background: 'var(--bg-elevated)' }}>
                        <div style={{
                          height: `${Math.max(variableH, 2)}px`,
                          background: isHighlighted ? 'rgba(245,158,11,0.95)' : 'rgba(245,158,11,0.7)',
                          transition: 'height 0.5s',
                        }} />
                        <div style={{
                          height: `${Math.max(fixedH, 2)}px`,
                          background: isHighlighted ? 'rgba(248,113,113,1)' : 'rgba(248,113,113,0.8)',
                          transition: 'height 0.5s',
                        }} />
                      </div>
                      <span style={{
                        fontSize: 10,
                        color:      isHighlighted ? 'var(--brand)' : 'var(--text-muted)',
                        fontWeight: isHighlighted ? 600 : 400,
                      }}>
                        {monthLabel(m.month)}
                      </span>
                    </div>
                  )
                })}
              </div>
              <div className="flex items-center gap-4 mt-3">
                {[
                  { color: 'rgba(248,113,113,0.8)', label: 'Fixo'     },
                  { color: 'rgba(245,158,11,0.7)',  label: 'Variável' },
                ].map(l => (
                  <div key={l.label} className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm" style={{ background: l.color }} />
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{l.label}</span>
                  </div>
                ))}
                {data.mode === 'month' && (
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto' }}>
                    Clique em uma barra para ver o mês
                  </span>
                )}
              </div>
            </div>
          </section>
        )}
      </div>

      {/* Modal */}
      {showForm && (
        <CostForm
          categories={categories}
          cost={editing}
          type={formType}
          onSave={async (formData) => {
            await upsert(formData, editing?.id)
            setShowForm(false)
            setEditing(null)
          }}
          onClose={() => { setShowForm(false); setEditing(null) }}
        />
      )}
    </div>
  )
}

// ── Formulário ────────────────────────────────────────────────────
function CostForm({ categories, cost, type, onSave, onClose }: {
  categories: any[]
  cost?: any
  type: 'FIXED' | 'VARIABLE'
  onSave: (d: any) => Promise<void>
  onClose: () => void
}) {
  const [form, setForm] = useState({
    name:        cost?.name        ?? '',
    amount:      cost?.amount      ?? '',
    category_id: cost?.category_id ?? '',
    type:        cost?.type        ?? type,
    notes:       cost?.notes       ?? '',
    is_active:   true,
  })
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await onSave({
      ...form,
      amount:      parseFloat(String(form.amount)) || 0,
      category_id: form.category_id || null,
      notes:       form.notes       || null,
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
        borderRadius: 16, padding: 28, width: '100%', maxWidth: 440,
        boxShadow: 'var(--shadow-lg)',
      }}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-semibold text-base" style={{ color: 'var(--text)', letterSpacing: '-0.2px' }}>
            {cost ? 'Editar custo' : `Novo custo ${form.type === 'FIXED' ? 'fixo' : 'variável'}`}
          </h2>
          <button onClick={onClose} className="btn btn-ghost btn-sm" style={{ padding: '4px 8px' }}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
              style={{ color: 'var(--text-muted)' }}>Nome</label>
            <input
              value={form.name} required className="input"
              placeholder="Ex: Aluguel, Condomínio, Internet"
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
                style={{ color: 'var(--text-muted)' }}>Valor mensal (R$)</label>
              <input
                type="number" step="0.01" min="0.01" required
                value={form.amount} placeholder="0,00" className="input"
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
                style={{ color: 'var(--text-muted)' }}>Tipo</label>
              <select value={form.type} className="input"
                onChange={e => setForm(f => ({ ...f, type: e.target.value as any }))}>
                <option value="FIXED">Fixo</option>
                <option value="VARIABLE">Variável</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
              style={{ color: 'var(--text-muted)' }}>Categoria (opcional)</label>
            <select value={form.category_id} className="input"
              onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}>
              <option value="">Sem categoria</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn btn-secondary flex-1">Cancelar</button>
            <button type="submit" disabled={saving} className="btn btn-primary flex-1">
              {saving ? 'Salvando...' : cost ? 'Salvar alterações' : 'Adicionar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
