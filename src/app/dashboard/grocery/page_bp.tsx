'use client'
import { useState } from 'react'
import { useGrocery, SUBCATEGORIES } from '@/hooks/useGrocery'
import { createClient } from '@/services/supabase/client'
import { ShoppingCart, Plus, X, Trash2, ChevronDown, ChevronUp, QrCode, Loader2, Check } from 'lucide-react'

const HOUSEHOLD_ID = process.env.NEXT_PUBLIC_HOUSEHOLD_ID!
const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
function getDefaultMonth() { return new Date().toISOString().slice(0, 7) }
function monthLabel(m: string) {
  const [y, mo] = m.split('-')
  const n = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
  return `${n[parseInt(mo)-1]} ${y}`
}
function fmtDate(iso: string) { const [y,m,d] = iso.split('-'); return `${d}/${m}/${y}` }

export default function GroceryPage() {
  const [month, setMonth]                   = useState(getDefaultMonth())
  const [showNewSession, setShowNewSession] = useState(false)
  const [showQrModal, setShowQrModal]       = useState(false)
  const [expandedId, setExpandedId]         = useState<string | null>(null)
  const [sessionItems, setSessionItems]     = useState<any[]>([])
  const [showAddItem, setShowAddItem]       = useState(false)
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)

  const { sessions, products, loading, getMonthStats, fetchItems,
          createSession, addItem, deleteSession, deleteItem } = useGrocery(HOUSEHOLD_ID)

  const stats    = getMonthStats(month)
  const prevMonth = (() => {
    const [y, m] = month.split('-').map(Number)
    const d = new Date(y, m - 2, 1)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })()
  const prevStats = getMonthStats(prevMonth)
  const diff      = stats.total - prevStats.total
  const diffPct   = prevStats.total > 0 ? Math.round((diff / prevStats.total) * 100) : null
  const monthSessions = sessions.filter(s => s.date.startsWith(month))

  async function handleExpand(sessionId: string) {
    if (expandedId === sessionId) { setExpandedId(null); return }
    const items = await fetchItems(sessionId)
    setSessionItems(items)
    setExpandedId(sessionId)
  }

  // Quando QR scan cria sessão com itens, expande automaticamente
  async function handleQrScanSave(sessionId: string) {
    const items = await fetchItems(sessionId)
    setSessionItems(items)
    setExpandedId(sessionId)
    setShowQrModal(false)
  }

  return (
    <div className="p-7 max-w-[1000px] mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between mb-7 animate-fade-up">
        <div>
          <h1 className="page-title">Mercado</h1>
          <p className="page-subtitle">Acompanhamento de compras em supermercado</p>
        </div>
        <div className="flex gap-3">
          <input type="month" value={month} onChange={e => setMonth(e.target.value)}
            className="input" style={{ width: 'auto' }} />
          <button onClick={() => setShowQrModal(true)} className="btn btn-secondary">
            <QrCode size={14} /> Escanear QR code
          </button>
          <button onClick={() => setShowNewSession(true)} className="btn btn-primary">
            <Plus size={14} /> Nova compra
          </button>
        </div>
      </div>

      {/* Cards resumo */}
      <div className="grid grid-cols-4 gap-4 mb-7 animate-fade-up-1">
        <div className="stat-card col-span-2" style={{ borderColor: 'var(--brand-border)' }}>
          <div className="flex items-center justify-between mb-3">
            <p className="stat-label">Total {monthLabel(month)}</p>
            <span className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: 'var(--danger-bg)', color: 'var(--danger)' }}>
              <ShoppingCart size={13} />
            </span>
          </div>
          <p className="stat-value" style={{ color: 'var(--danger)' }}>{fmt(stats.total)}</p>
          <p style={{ fontSize: 11, marginTop: 6,
                      color: diffPct !== null ? (diff > 0 ? 'var(--danger)' : 'var(--success)') : 'var(--text-muted)' }}>
            {diffPct !== null
              ? `${diff > 0 ? '▲' : '▼'} ${Math.abs(diffPct)}% vs ${monthLabel(prevMonth)}`
              : `${stats.count} compra${stats.count !== 1 ? 's' : ''} no mês`}
          </p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Compras</p>
          <p className="stat-value" style={{ color: 'var(--info)' }}>{stats.count}</p>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>no mês</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Ticket Médio</p>
          <p className="stat-value" style={{ color: 'var(--warning)' }}>{fmt(stats.avg)}</p>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>por compra</p>
        </div>
      </div>

      {/* Lista de compras */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-5 h-5 rounded-full border-2 animate-spin"
            style={{ borderColor: 'var(--brand)', borderTopColor: 'transparent' }} />
        </div>
      ) : monthSessions.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-20 gap-4 text-center"
          style={{ borderStyle: 'dashed' }}>
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: 'var(--brand-bg)', border: '1px solid var(--brand-border)' }}>
            <ShoppingCart size={22} style={{ color: 'var(--brand)' }} />
          </div>
          <div>
            <p className="font-semibold" style={{ color: 'var(--text)' }}>
              Nenhuma compra em {monthLabel(month)}
            </p>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
              Escaneie o QR code do cupom fiscal ou registre manualmente
            </p>
          </div>
          <div className="flex gap-3 mt-2">
            <button onClick={() => setShowQrModal(true)} className="btn btn-secondary">
              <QrCode size={14} /> Escanear QR code
            </button>
            <button onClick={() => setShowNewSession(true)} className="btn btn-primary">
              <Plus size={14} /> Registrar manual
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3 animate-fade-up-2">
          {monthSessions.map(session => (
            <div key={session.id} className="card overflow-hidden">
              <div className="px-5 py-4">
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <p className="font-semibold text-sm" style={{ color: 'var(--text)' }}>
                        {session.store_name}
                      </p>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {fmtDate(session.date)}
                      </span>
                    </div>
                    {session.notes && (
                      <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{session.notes}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <p style={{ fontSize: 16, fontFamily: 'DM Mono, monospace', fontWeight: 700, color: 'var(--danger)' }}>
                      {fmt(Number(session.total_amount))}
                    </p>
                    <button onClick={() => { setActiveSessionId(session.id); setShowAddItem(true) }}
                      className="btn btn-secondary btn-sm">
                      <Plus size={12} /> Item
                    </button>
                    <button onClick={() => handleExpand(session.id)}
                      className="btn btn-ghost btn-sm" style={{ padding: '5px' }}>
                      {expandedId === session.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                    <button onClick={() => { if (confirm('Excluir esta compra?')) deleteSession(session.id) }}
                      className="btn btn-ghost btn-sm" style={{ padding: '5px', color: 'var(--danger)' }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Itens expandidos */}
              {expandedId === session.id && (
                <div style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>
                  {sessionItems.length === 0 ? (
                    <div className="flex items-center justify-between px-5 py-4">
                      <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Nenhum item registrado</p>
                      <button onClick={() => { setActiveSessionId(session.id); setShowAddItem(true) }}
                        className="btn btn-primary btn-sm">
                        <Plus size={12} /> Adicionar item
                      </button>
                    </div>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border)' }}>
                          {['Item','Subcategoria','Qtd','Preço unit.','Total',''].map((h, i) => (
                            <th key={i} style={{
                              padding: '8px 14px', textAlign: i >= 2 ? 'right' : 'left',
                              fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
                              letterSpacing: '0.06em', color: 'var(--text-muted)',
                            }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {sessionItems.map(item => (
                          <tr key={item.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                            <td style={{ padding: '8px 14px', fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>
                              {item.name}
                            </td>
                            <td style={{ padding: '8px 14px', fontSize: 12, color: 'var(--text-muted)' }}>
                              {item.subcategory ?? '—'}
                            </td>
                            <td style={{ padding: '8px 14px', textAlign: 'right', fontSize: 12,
                                         fontFamily: 'DM Mono, monospace', color: 'var(--text-secondary)' }}>
                              {item.quantity} {item.unit}
                            </td>
                            <td style={{ padding: '8px 14px', textAlign: 'right', fontSize: 12,
                                         fontFamily: 'DM Mono, monospace', color: 'var(--text-secondary)' }}>
                              {fmt(Number(item.unit_price))}
                            </td>
                            <td style={{ padding: '8px 14px', textAlign: 'right', fontSize: 13,
                                         fontFamily: 'DM Mono, monospace', fontWeight: 600, color: 'var(--danger)' }}>
                              {fmt(Number(item.total_price))}
                            </td>
                            <td style={{ padding: '8px 8px', width: 36 }}>
                              <button onClick={() => deleteItem(item.id, session.id)}
                                className="btn btn-ghost btn-sm" style={{ padding: '4px', color: 'var(--danger)' }}>
                                <X size={12} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr style={{ background: 'var(--bg-card)', borderTop: '1px solid var(--border)' }}>
                          <td colSpan={4} style={{ padding: '8px 14px', fontSize: 12, color: 'var(--text-muted)' }}>
                            {sessionItems.length} itens
                          </td>
                          <td style={{ padding: '8px 14px', textAlign: 'right',
                                       fontFamily: 'DM Mono, monospace', fontWeight: 700, color: 'var(--danger)', fontSize: 14 }}>
                            {fmt(sessionItems.reduce((s, i) => s + Number(i.total_price), 0))}
                          </td>
                          <td />
                        </tr>
                      </tfoot>
                    </table>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modais */}
      {showQrModal && (
        <QrCodeModal
          householdId={HOUSEHOLD_ID}
          supabaseUrl={SUPABASE_URL}
          supabaseAnon={SUPABASE_ANON}
          onSave={handleQrScanSave}
          onManual={() => { setShowQrModal(false); setShowNewSession(true) }}
          onClose={() => setShowQrModal(false)}
          createSession={createSession}
          addItem={addItem}
        />
      )}

      {showNewSession && (
        <SessionForm
          onSave={async (data) => { await createSession(data); setShowNewSession(false) }}
          onClose={() => setShowNewSession(false)}
        />
      )}

      {showAddItem && activeSessionId && (
        <ItemForm
          products={products}
          onSave={async (item) => {
            await addItem(activeSessionId, item)
            const items = await fetchItems(activeSessionId)
            setSessionItems(items)
            setExpandedId(activeSessionId)
            setShowAddItem(false)
          }}
          onClose={() => setShowAddItem(false)}
        />
      )}
    </div>
  )
}

// ── Modal QR Code ─────────────────────────────────────────────────
function QrCodeModal({ householdId, supabaseUrl, supabaseAnon, onSave, onManual, onClose, createSession, addItem }: {
  householdId: string; supabaseUrl: string; supabaseAnon: string
  onSave: (sessionId: string) => void; onManual: () => void; onClose: () => void
  createSession: (d: any) => Promise<{ sessionId?: string; error: any }>
  addItem: (sessionId: string, item: any) => Promise<void>
}) {
  const [url, setUrl]       = useState('')
  const [step, setStep]     = useState<'input' | 'loading' | 'preview' | 'saving' | 'done' | 'error'>('input')
  const [nfce, setNfce]     = useState<any>(null)
  const [error, setError]   = useState('')
  const [items, setItems]   = useState<any[]>([])

  async function handleFetch() {
    if (!url.trim()) return
    setStep('loading')
    setError('')
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token ?? supabaseAnon

      const res = await fetch(`${supabaseUrl}/functions/v1/parse-nfce`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ url: url.trim() }),
      })

      const data = await res.json()
      if (!res.ok || data.error) {
        setError(data.error ?? 'Erro ao processar o cupom')
        setStep('error')
        return
      }

      setNfce(data)
      setItems(data.items.map((item: any, i: number) => ({ ...item, selected: true, idx: i })))
      setStep('preview')
    } catch (err) {
      setError('Erro de conexão. Verifique a URL e tente novamente.')
      setStep('error')
    }
  }

  async function handleSave() {
    setStep('saving')
    const selectedItems = items.filter(i => i.selected)
    const { sessionId, error } = await createSession({
      store_name: nfce.store_name, date: nfce.date, notes: `NFC-e importada automaticamente`,
    })
    if (error || !sessionId) { setError('Erro ao criar sessão'); setStep('error'); return }

    for (const item of selectedItems) {
      await addItem(sessionId, {
        name:        item.name,
        quantity:    item.quantity,
        unit:        item.unit,
        unit_price:  item.unit_price,
        total_price: item.total_price,
        subcategory: null,
        product_id:  null,
        household_id: householdId,
      })
    }
    setStep('done')
    setTimeout(() => onSave(sessionId), 1500)
  }

  function toggleItem(idx: number) {
    setItems(prev => prev.map(i => i.idx === idx ? { ...i, selected: !i.selected } : i))
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.7)',
                  backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', padding: 24, overflowY: 'auto' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16,
                    padding: 28, width: '100%', maxWidth: 600, boxShadow: 'var(--shadow-lg)', maxHeight: '90vh', overflowY: 'auto' }}>

        <div className="flex items-center justify-between mb-6">
          <h2 className="font-semibold text-base" style={{ color: 'var(--text)', letterSpacing: '-0.2px' }}>
            Escanear QR code do cupom fiscal
          </h2>
          <button onClick={onClose} className="btn btn-ghost btn-sm" style={{ padding: '4px 8px' }}>
            <X size={16} />
          </button>
        </div>

        {/* Step: input */}
        {step === 'input' && (
          <div className="space-y-4">
            <div className="rounded-xl p-4" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
              <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
                Como usar
              </p>
              <ol style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.8, paddingLeft: 16 }}>
                <li>Abra a câmera do celular e aponte para o QR code do cupom</li>
                <li>Acesse o link que aparecer (site da Fazenda/SEFAZ)</li>
                <li>Copie a URL do navegador</li>
                <li>Cole aqui abaixo e clique em Processar</li>
              </ol>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
                style={{ color: 'var(--text-muted)' }}>URL do QR code</label>
              <input value={url} onChange={e => setUrl(e.target.value)}
                className="input" placeholder="https://www.fazenda.pr.gov.br/nfce/qrcode?p=..."
                onKeyDown={e => e.key === 'Enter' && handleFetch()} autoFocus />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={onManual} className="btn btn-secondary flex-1">
                Inserir manualmente
              </button>
              <button onClick={handleFetch} disabled={!url.trim()} className="btn btn-primary flex-1">
                <QrCode size={14} /> Processar cupom
              </button>
            </div>
          </div>
        )}

        {/* Step: loading */}
        {step === 'loading' && (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <Loader2 size={28} className="animate-spin" style={{ color: 'var(--brand)' }} />
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Buscando dados do cupom na SEFAZ...</p>
          </div>
        )}

        {/* Step: error */}
        {step === 'error' && (
          <div className="flex flex-col items-center justify-center py-8 gap-4 text-center">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ background: 'var(--danger-bg)' }}>
              <X size={20} style={{ color: 'var(--danger)' }} />
            </div>
            <div>
              <p className="font-semibold" style={{ color: 'var(--text)' }}>Não foi possível processar</p>
              <p className="text-sm mt-1 max-w-sm" style={{ color: 'var(--text-muted)' }}>{error}</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep('input')} className="btn btn-secondary">Tentar novamente</button>
              <button onClick={onManual} className="btn btn-primary">Inserir manualmente</button>
            </div>
          </div>
        )}

        {/* Step: preview */}
        {step === 'preview' && nfce && (
          <div className="space-y-4">
            {/* Resumo da NFC-e */}
            <div className="rounded-xl p-4 flex items-center justify-between"
              style={{ background: 'var(--success-bg)', border: '1px solid rgba(0,196,122,0.2)' }}>
              <div>
                <p className="font-semibold text-sm" style={{ color: 'var(--text)' }}>{nfce.store_name}</p>
                <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {nfce.date} · {nfce.item_count} itens encontrados
                </p>
              </div>
              <p style={{ fontSize: 18, fontFamily: 'DM Mono, monospace', fontWeight: 700, color: 'var(--success)' }}>
                {fmt(nfce.total)}
              </p>
            </div>

            {/* Lista de itens para confirmar */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                  Itens ({items.filter(i => i.selected).length} selecionados)
                </p>
                <div className="flex gap-2">
                  <button onClick={() => setItems(prev => prev.map(i => ({ ...i, selected: true })))}
                    className="btn btn-ghost btn-sm" style={{ fontSize: 11 }}>Todos</button>
                  <button onClick={() => setItems(prev => prev.map(i => ({ ...i, selected: false })))}
                    className="btn btn-ghost btn-sm" style={{ fontSize: 11 }}>Nenhum</button>
                </div>
              </div>
              <div style={{ maxHeight: 320, overflowY: 'auto', borderRadius: 10,
                             border: '1px solid var(--border)' }}>
                {items.map(item => (
                  <div key={item.idx}
                    onClick={() => toggleItem(item.idx)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '10px 14px', cursor: 'pointer',
                      borderBottom: '1px solid var(--border-subtle)',
                      background: item.selected ? 'transparent' : 'rgba(0,0,0,0.3)',
                      opacity: item.selected ? 1 : 0.5,
                      transition: 'all 0.15s',
                    }}>
                    <div style={{
                      width: 18, height: 18, borderRadius: 4, flexShrink: 0,
                      background: item.selected ? 'var(--brand)' : 'var(--bg-elevated)',
                      border: `1px solid ${item.selected ? 'var(--brand)' : 'var(--border-strong)'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {item.selected && <Check size={11} color="white" />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500,
                                   overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.name}
                      </p>
                      <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {item.quantity} {item.unit} × {fmt(item.unit_price)}
                      </p>
                    </div>
                    <p style={{ fontSize: 13, fontFamily: 'DM Mono, monospace',
                                 fontWeight: 600, color: 'var(--danger)', flexShrink: 0 }}>
                      {fmt(item.total_price)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => setStep('input')} className="btn btn-secondary flex-1">Voltar</button>
              <button onClick={handleSave} disabled={items.filter(i => i.selected).length === 0}
                className="btn btn-primary flex-1">
                Salvar {items.filter(i => i.selected).length} itens
              </button>
            </div>
          </div>
        )}

        {/* Step: saving */}
        {step === 'saving' && (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <Loader2 size={28} className="animate-spin" style={{ color: 'var(--brand)' }} />
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Salvando itens...</p>
          </div>
        )}

        {/* Step: done */}
        {step === 'done' && (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ background: 'var(--success-bg)', border: '1px solid rgba(0,196,122,0.2)' }}>
              <Check size={24} style={{ color: 'var(--success)' }} />
            </div>
            <p className="font-semibold" style={{ color: 'var(--text)' }}>Compra registrada!</p>
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Redirecionando...</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Formulário nova sessão ────────────────────────────────────────
function SessionForm({ onSave, onClose }: {
  onSave: (d: any) => Promise<void>; onClose: () => void
}) {
  const today = new Date().toISOString().split('T')[0]
  const [form, setForm] = useState({ store_name: '', date: today, total_amount: '', notes: '' })
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true)
    await onSave({
      store_name: form.store_name, date: form.date, notes: form.notes,
      total_amount: parseFloat(form.total_amount) || 0,
    })
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
          <h2 className="font-semibold text-base" style={{ color: 'var(--text)' }}>Registrar compra</h2>
          <button onClick={onClose} className="btn btn-ghost btn-sm" style={{ padding: '4px 8px' }}>
            <X size={16} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
              style={{ color: 'var(--text-muted)' }}>Supermercado</label>
            <input value={form.store_name} required className="input"
              placeholder="Ex: Catuai, Supermercado Bom Dia"
              onChange={e => setForm(f => ({ ...f, store_name: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
                style={{ color: 'var(--text-muted)' }}>Data</label>
              <input type="date" value={form.date} required className="input"
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
                style={{ color: 'var(--text-muted)' }}>Total (R$)</label>
              <input type="number" step="0.01" value={form.total_amount} className="input"
                placeholder="0,00" onChange={e => setForm(f => ({ ...f, total_amount: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
              style={{ color: 'var(--text-muted)' }}>Observações (opcional)</label>
            <input value={form.notes} className="input" placeholder="Compra semanal, etc."
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
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

// ── Formulário novo item ──────────────────────────────────────────
function ItemForm({ products, onSave, onClose }: {
  products: any[]; onSave: (d: any) => Promise<void>; onClose: () => void
}) {
  const [form, setForm] = useState({
    name: '', quantity: '1', unit: 'UN', unit_price: '', subcategory: '',
    product_id: null as string | null,
    household_id: HOUSEHOLD_ID,
  })
  const [saving, setSaving] = useState(false)
  const total = (parseFloat(form.quantity) || 0) * (parseFloat(form.unit_price) || 0)

  function handleProductSelect(productId: string) {
    if (!productId) { setForm(f => ({ ...f, product_id: null })); return }
    const prod = products.find(p => p.id === productId)
    if (prod) setForm(f => ({
      ...f, product_id: productId, name: prod.name,
      unit: prod.unit ?? 'UN', subcategory: prod.subcategory ?? '',
      unit_price: prod.last_price ? String(prod.last_price) : '',
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true)
    await onSave({
      ...form, quantity: parseFloat(form.quantity), unit_price: parseFloat(form.unit_price),
      total_price: total, subcategory: form.subcategory || null,
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
          <h2 className="font-semibold text-base" style={{ color: 'var(--text)' }}>Adicionar item</h2>
          <button onClick={onClose} className="btn btn-ghost btn-sm" style={{ padding: '4px 8px' }}>
            <X size={16} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {products.length > 0 && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
                style={{ color: 'var(--text-muted)' }}>Produto do catálogo (opcional)</label>
              <select className="input" onChange={e => handleProductSelect(e.target.value)}>
                <option value="">Novo produto</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.last_price ? `— últ. ${fmt(Number(p.last_price))}` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
              style={{ color: 'var(--text-muted)' }}>Nome do produto</label>
            <input value={form.name} required className="input" placeholder="Ex: Arroz 5kg, Frango, Leite"
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
                style={{ color: 'var(--text-muted)' }}>Qtd</label>
              <input type="number" step="0.001" min="0.001" value={form.quantity} required className="input"
                onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
                style={{ color: 'var(--text-muted)' }}>Unidade</label>
              <select value={form.unit} className="input" onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}>
                {['UN','KG','G','L','ML','PCT'].map(u => <option key={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
                style={{ color: 'var(--text-muted)' }}>Preço unit.</label>
              <input type="number" step="0.01" min="0.01" value={form.unit_price} required className="input"
                placeholder="0,00" onChange={e => setForm(f => ({ ...f, unit_price: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
              style={{ color: 'var(--text-muted)' }}>Subcategoria</label>
            <select value={form.subcategory} className="input"
              onChange={e => setForm(f => ({ ...f, subcategory: e.target.value }))}>
              <option value="">Sem subcategoria</option>
              {SUBCATEGORIES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          {total > 0 && (
            <div className="rounded-xl px-4 py-3" style={{ background: 'var(--bg-elevated)' }}>
              <div className="flex justify-between">
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Total do item</span>
                <span style={{ fontSize: 15, fontFamily: 'DM Mono, monospace', fontWeight: 700, color: 'var(--danger)' }}>
                  {fmt(total)}
                </span>
              </div>
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn btn-secondary flex-1">Cancelar</button>
            <button type="submit" disabled={saving} className="btn btn-primary flex-1">
              {saving ? 'Salvando...' : 'Adicionar item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
