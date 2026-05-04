'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/services/supabase/client'
import { Plus, Pencil, Trash2, X, Download,
         Utensils, BookOpen, Gamepad2, Home, Circle, Heart, Shield, Car,
         ShoppingCart, Plane, Smartphone, Film, DollarSign, GraduationCap,
         Zap, Shirt, PawPrint, Dumbbell } from 'lucide-react'

const HOUSEHOLD_ID = process.env.NEXT_PUBLIC_HOUSEHOLD_ID!

const PRESET_COLORS = [
  '#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981',
  '#3b82f6','#ef4444','#14b8a6','#f97316','#84cc16',
]

// Mapa nome Lucide (banco) → componente React
const LUCIDE_MAP: Record<string, React.FC<{ size?: number; color?: string }>> = {
  utensils: Utensils, book: BookOpen, gamepad: Gamepad2, home: Home,
  circle: Circle, heart: Heart, shield: Shield, car: Car,
  'shopping-cart': ShoppingCart, plane: Plane, smartphone: Smartphone,
  film: Film, 'dollar-sign': DollarSign, 'graduation-cap': GraduationCap,
  zap: Zap, shirt: Shirt, paw: PawPrint, dumbbell: Dumbbell,
}

// Renderiza ícone: nome Lucide → componente; senão → emoji
function CategoryIcon({ icon, color, size = 15 }: { icon: string | null; color?: string; size?: number }) {
  if (!icon) return <span style={{ fontSize: size }}>📦</span>
  const LucideIcon = LUCIDE_MAP[icon.toLowerCase()]
  if (LucideIcon) return <LucideIcon size={size} color={color ?? 'currentColor'} />
  return <span style={{ fontSize: size - 1 }}>{icon}</span>
}

// Picker mostra Lucide + emoji
const PRESET_ICONS = [
  'utensils','home','car','heart','shield','book','gamepad','circle',
  '🛒','🍔','💊','📱','🎬','✈️','💰','🎓','⚡','👗','🐾','🏋️',
]

interface Category {
  id:         string
  name:       string
  icon:       string | null
  color:      string | null
  applies_to: string | null
}

interface CategoryRule {
  id:          string
  keyword:     string
  category_id: string
}

export default function SettingsPage() {
  const [categories, setCategories]   = useState<Category[]>([])
  const [rules, setRules]             = useState<CategoryRule[]>([])
  const [activeTab, setActiveTab]     = useState<'categories' | 'rules' | 'export'>('categories')
  const [loading, setLoading]         = useState(true)
  const [showCatForm, setShowCatForm] = useState(false)
  const [editCat, setEditCat]         = useState<Category | null>(null)
  const [showRuleForm, setShowRuleForm] = useState(false)
  const [rulesFilter, setRulesFilter] = useState('')
  const supabase = createClient()

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    const [{ data: cats }, { data: rls }] = await Promise.all([
      supabase.from('categories').select('*').order('name'),
      supabase.from('category_rules').select('*').order('keyword'),
    ])
    setCategories(cats ?? [])
    setRules(rls ?? [])
    setLoading(false)
  }

  async function deleteCategory(id: string) {
    if (!confirm('Excluir esta categoria? As transações vinculadas ficarão sem categoria.')) return
    await supabase.from('categories').delete().eq('id', id)
    loadData()
  }

  async function deleteRule(id: string) {
    await supabase.from('category_rules').delete().eq('id', id)
    loadData()
  }

  const catMap = Object.fromEntries(categories.map(c => [c.id, c]))
  const filteredRules = rules.filter(r =>
    !rulesFilter || r.keyword.toLowerCase().includes(rulesFilter.toLowerCase()) ||
    catMap[r.category_id]?.name.toLowerCase().includes(rulesFilter.toLowerCase())
  )

  async function exportTransactions() {
    const { data } = await supabase
      .from('transactions')
      .select('date, competence_month, description, amount, transaction_type, is_fixed, status, category_id')
      .eq('household_id', HOUSEHOLD_ID)
      .is('deleted_at', null)
      .order('date', { ascending: false })

    if (!data) return

    const rows = [
      ['Data', 'Mês Competência', 'Descrição', 'Valor', 'Tipo', 'Fixo', 'Status', 'Categoria'],
      ...data.map(t => [
        t.date,
        t.competence_month,
        t.description,
        String(t.amount),
        t.transaction_type,
        t.is_fixed ? 'Sim' : 'Não',
        t.status,
        catMap[t.category_id]?.name ?? '',
      ])
    ]

    const csv = rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `financacasa-transacoes-${new Date().toISOString().slice(0,10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function exportIncome() {
    const { data } = await supabase
      .from('income_entries')
      .select('date, competence_month, description, amount, category')
      .eq('household_id', HOUSEHOLD_ID)
      .order('date', { ascending: false })

    if (!data) return

    const rows = [
      ['Data', 'Mês Competência', 'Descrição', 'Valor', 'Categoria'],
      ...data.map(r => [r.date, r.competence_month, r.description, String(r.amount), r.category])
    ]

    const csv = rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `financacasa-rendas-${new Date().toISOString().slice(0,10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="w-5 h-5 rounded-full border-2 animate-spin"
        style={{ borderColor: 'var(--brand)', borderTopColor: 'transparent' }} />
    </div>
  )

  return (
    <div className="p-4 md:p-7 max-w-[900px] mx-auto">

      {/* Header */}
      <div className="mb-4 md:mb-7 animate-fade-up">
        <h1 className="page-title">Configurações</h1>
        <p className="page-subtitle">Categorias, regras de classificação e exportação</p>
      </div>

      {/* Tabs */}
      <div className="overflow-x-auto mb-6 animate-fade-up-1">
      <div className="flex gap-1"
        style={{ background: 'var(--bg-elevated)', borderRadius: 10, padding: 4, width: 'fit-content' }}>
        {[
          { id: 'categories', label: '🏷️ Categorias', count: categories.length },
          { id: 'rules', label: '⚡ Regras', count: rules.length },
          { id: 'export', label: '📤 Exportar', count: null },
        ].map(tab => (
          <button key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            style={{
              padding: '6px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500,
              background: activeTab === tab.id ? 'var(--bg-card)' : 'transparent',
              color: activeTab === tab.id ? 'var(--text)' : 'var(--text-muted)',
              border: activeTab === tab.id ? '1px solid var(--border)' : '1px solid transparent',
              transition: 'all 0.15s', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
            {tab.label}
            {tab.count !== null && (
              <span style={{ fontSize: 11, background: 'var(--bg-elevated)', borderRadius: 20,
                padding: '1px 6px', color: 'var(--text-muted)' }}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>
      </div>

      {/* ── Tab: Categorias ── */}
      {activeTab === 'categories' && (
        <div className="animate-fade-up-2">
          <div className="flex justify-end mb-4">
            <button onClick={() => { setEditCat(null); setShowCatForm(true) }} className="btn btn-primary">
              <Plus size={14} /> Nova categoria
            </button>
          </div>

          <div className="card overflow-hidden">
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Categoria','Aplica-se a','Regras vinculadas',''].map((h, i) => (
                    <th key={i} style={{ padding: '10px 16px', textAlign: i === 0 ? 'left' : i === 3 ? 'right' : 'center',
                      fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
                      letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {categories.map(cat => {
                  const ruleCount = rules.filter(r => r.category_id === cat.id).length
                  return (
                    <tr key={cat.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '10px 16px' }}>
                        <div className="flex items-center gap-3">
                          <div style={{ width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                            background: `${cat.color ?? '#6366f1'}22`, border: `1px solid ${cat.color ?? '#6366f1'}44`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <CategoryIcon icon={cat.icon} color={cat.color ?? '#6366f1'} size={15} />
                          </div>
                          <div>
                            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{cat.name}</p>
                            <div style={{ width: 40, height: 3, borderRadius: 2, marginTop: 3,
                              background: cat.color ?? '#6366f1' }} />
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                        <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 20,
                          background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>
                          {cat.applies_to === 'INCOME' ? 'Receita' :
                           cat.applies_to === 'EXPENSE' ? 'Gasto' : 'Ambos'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 16px', textAlign: 'center', fontSize: 13,
                        fontFamily: 'DM Mono, monospace', color: 'var(--text-secondary)' }}>
                        {ruleCount}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => { setEditCat(cat); setShowCatForm(true) }}
                            className="btn btn-ghost btn-sm" style={{ padding: '5px' }}>
                            <Pencil size={13} />
                          </button>
                          <button onClick={() => deleteCategory(cat.id)}
                            className="btn btn-ghost btn-sm" style={{ padding: '5px', color: 'var(--danger)' }}>
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
        </div>
      )}

      {/* ── Tab: Regras ── */}
      {activeTab === 'rules' && (
        <div className="animate-fade-up-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
            <input value={rulesFilter} onChange={e => setRulesFilter(e.target.value)}
              className="input" placeholder="Filtrar por keyword ou categoria..." style={{ maxWidth: 300 }} />
            <button onClick={() => setShowRuleForm(true)} className="btn btn-primary self-start sm:self-auto">
              <Plus size={14} /> Nova regra
            </button>
          </div>

          <div className="card overflow-hidden">
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Keyword','Categoria',''].map((h, i) => (
                    <th key={i} style={{ padding: '10px 16px', textAlign: i === 0 ? 'left' : i === 2 ? 'right' : 'left',
                      fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
                      letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredRules.map(rule => {
                  const cat = catMap[rule.category_id]
                  return (
                    <tr key={rule.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '8px 16px' }}>
                        <code style={{ fontSize: 12, background: 'var(--bg-elevated)', padding: '2px 8px',
                          borderRadius: 6, color: 'var(--text)', fontFamily: 'DM Mono, monospace' }}>
                          {rule.keyword}
                        </code>
                      </td>
                      <td style={{ padding: '8px 16px' }}>
                        {cat ? (
                          <div className="flex items-center gap-2">
                            <div style={{ width: 8, height: 8, borderRadius: 2, background: cat.color ?? '#6366f1' }} />
                            <span style={{ fontSize: 13, color: 'var(--text)' }}>{cat.name}</span>
                          </div>
                        ) : (
                          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                        <button onClick={() => deleteRule(rule.id)}
                          className="btn btn-ghost btn-sm" style={{ padding: '4px', color: 'var(--danger)' }}>
                          <X size={13} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {filteredRules.length === 0 && (
              <div className="py-12 text-center">
                <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Nenhuma regra encontrada</p>
              </div>
            )}
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
            {filteredRules.length} de {rules.length} regras
          </p>
        </div>
      )}

      {/* ── Tab: Export ── */}
      {activeTab === 'export' && (
        <div className="space-y-4 animate-fade-up-2">
          <div className="card p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'var(--success-bg)', border: '1px solid rgba(0,196,122,0.2)' }}>
                <Download size={18} style={{ color: 'var(--success)' }} />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm mb-1" style={{ color: 'var(--text)' }}>
                  Exportar Transações
                </p>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
                  Baixa todas as transações registradas em formato CSV, incluindo data, descrição, valor, categoria e status.
                </p>
                <button onClick={exportTransactions} className="btn btn-primary">
                  <Download size={14} /> Baixar transações (.csv)
                </button>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'var(--brand-bg)', border: '1px solid var(--brand-border)' }}>
                <Download size={18} style={{ color: 'var(--brand)' }} />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm mb-1" style={{ color: 'var(--text)' }}>
                  Exportar Rendas
                </p>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
                  Exporta todas as entradas de renda registradas manualmente (salários, freelances, etc.).
                </p>
                <button onClick={exportIncome} className="btn btn-secondary">
                  <Download size={14} /> Baixar rendas (.csv)
                </button>
              </div>
            </div>
          </div>

          <div className="card p-5" style={{ border: '1px solid var(--border)', opacity: 0.6 }}>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'var(--bg-elevated)' }}>
                <Download size={18} style={{ color: 'var(--text-muted)' }} />
              </div>
              <div>
                <p className="font-semibold text-sm mb-1" style={{ color: 'var(--text-muted)' }}>
                  Exportar para Excel (.xlsx)
                </p>
                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  Em breve — exportação com múltiplas abas (transações, rendas, mercado).
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modais */}
      {showCatForm && (
        <CategoryForm
          initial={editCat}
          onSave={async (data) => {
            if (editCat) {
              await supabase.from('categories').update(data).eq('id', editCat.id)
            } else {
              await supabase.from('categories').insert(data)
            }
            setShowCatForm(false)
            setEditCat(null)
            loadData()
          }}
          onClose={() => { setShowCatForm(false); setEditCat(null) }}
        />
      )}

      {showRuleForm && (
        <RuleForm
          categories={categories}
          onSave={async (data) => {
            await supabase.from('category_rules').insert(data)
            setShowRuleForm(false)
            loadData()
          }}
          onClose={() => setShowRuleForm(false)}
        />
      )}
    </div>
  )
}

// ── Formulário de categoria ───────────────────────────────────────
function CategoryForm({ initial, onSave, onClose }: {
  initial: Category | null
  onSave: (d: any) => Promise<void>
  onClose: () => void
}) {
  const [form, setForm] = useState({
    name:       initial?.name ?? '',
    icon:       initial?.icon ?? '📦',
    color:      initial?.color ?? PRESET_COLORS[0],
    applies_to: initial?.applies_to ?? 'EXPENSE',
  })
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true)
    await onSave(form)
    setSaving(false)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.6)',
                  backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', padding: 24 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16,
                    padding: 28, width: '100%', maxWidth: 440, boxShadow: 'var(--shadow-lg)' }}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-semibold text-base" style={{ color: 'var(--text)' }}>
            {initial ? 'Editar categoria' : 'Nova categoria'}
          </h2>
          <button onClick={onClose} className="btn btn-ghost btn-sm" style={{ padding: '4px 8px' }}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Preview */}
          <div className="flex items-center gap-3 rounded-xl p-3"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
            <div style={{ width: 36, height: 36, borderRadius: 10,
              background: `${form.color}22`, border: `1px solid ${form.color}44`,
              display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CategoryIcon icon={form.icon} color={form.color} size={18} />
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{form.name || 'Nome da categoria'}</p>
              <div style={{ width: 48, height: 3, borderRadius: 2, marginTop: 4, background: form.color }} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
              style={{ color: 'var(--text-muted)' }}>Nome</label>
            <input value={form.name} required className="input" placeholder="Ex: Alimentação, Transporte"
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-2"
              style={{ color: 'var(--text-muted)' }}>Cor</label>
            <div className="flex gap-2 flex-wrap">
              {PRESET_COLORS.map(c => (
                <button key={c} type="button"
                  onClick={() => setForm(f => ({ ...f, color: c }))}
                  style={{ width: 28, height: 28, borderRadius: 8, background: c, border: 'none', cursor: 'pointer',
                    outline: form.color === c ? `3px solid ${c}` : 'none', outlineOffset: 2 }} />
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-2"
              style={{ color: 'var(--text-muted)' }}>Ícone</label>
            <div className="flex gap-2 flex-wrap">
              {PRESET_ICONS.map(icon => (
                <button key={icon} type="button"
                  onClick={() => setForm(f => ({ ...f, icon }))}
                  style={{ width: 36, height: 36, borderRadius: 8, cursor: 'pointer', border: 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: form.icon === icon ? 'var(--brand-bg)' : 'var(--bg-elevated)',
                    outline: form.icon === icon ? '2px solid var(--brand)' : 'none' }}>
                  <CategoryIcon icon={icon} color={form.icon === icon ? 'var(--brand)' : 'var(--text-muted)'} size={16} />
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
              style={{ color: 'var(--text-muted)' }}>Aplica-se a</label>
            <select value={form.applies_to} className="input"
              onChange={e => setForm(f => ({ ...f, applies_to: e.target.value }))}>
              <option value="EXPENSE">Gastos</option>
              <option value="INCOME">Receitas</option>
              <option value="BOTH">Ambos</option>
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn btn-secondary flex-1">Cancelar</button>
            <button type="submit" disabled={saving} className="btn btn-primary flex-1">
              {saving ? 'Salvando...' : (initial ? 'Salvar' : 'Criar')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Formulário de regra ───────────────────────────────────────────
function RuleForm({ categories, onSave, onClose }: {
  categories: Category[]
  onSave: (d: any) => Promise<void>
  onClose: () => void
}) {
  const [keyword,    setKeyword]    = useState('')
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? '')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true)
    await onSave({ keyword: keyword.trim().toLowerCase(), category_id: categoryId })
    setSaving(false)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.6)',
                  backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', padding: 24 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16,
                    padding: 28, width: '100%', maxWidth: 400, boxShadow: 'var(--shadow-lg)' }}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-semibold text-base" style={{ color: 'var(--text)' }}>Nova regra de classificação</h2>
          <button onClick={onClose} className="btn btn-ghost btn-sm" style={{ padding: '4px 8px' }}>
            <X size={16} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
              style={{ color: 'var(--text-muted)' }}>Keyword</label>
            <input value={keyword} required className="input"
              placeholder="Ex: uber, ifood, netflix"
              onChange={e => setKeyword(e.target.value)} autoFocus />
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
              Quando o título da transação contiver esta palavra, será classificada automaticamente.
            </p>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
              style={{ color: 'var(--text-muted)' }}>Categoria</label>
            <select value={categoryId} className="input" onChange={e => setCategoryId(e.target.value)}>
              {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn btn-secondary flex-1">Cancelar</button>
            <button type="submit" disabled={saving} className="btn btn-primary flex-1">
              {saving ? 'Salvando...' : 'Criar regra'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
