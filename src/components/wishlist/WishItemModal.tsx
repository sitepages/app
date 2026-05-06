'use client'
import { useState, useRef, useEffect } from 'react'
import { X, Upload, Link as LinkIcon, Plus } from 'lucide-react'
import type { WishItem, WishCategory, CreateWishItemDTO, WishItemStatus } from '@/lib/types/wishlist'

interface Props {
  item?: WishItem | null
  categories: WishCategory[]
  onSave: (data: CreateWishItemDTO) => Promise<void>
  onAddCategory: (name: string, icon?: string) => Promise<WishCategory | null>
  onUploadImage: (file: File) => Promise<string>
  onClose: () => void
}

const STATUS_OPTIONS: { value: WishItemStatus; label: string }[] = [
  { value: 'quero', label: 'Quero' },
  { value: 'economizando', label: 'Economizando' },
  { value: 'comprado', label: 'Comprado' },
]

export default function WishItemModal({
  item, categories, onSave, onAddCategory, onUploadImage, onClose,
}: Props) {
  const [name, setName]             = useState(item?.name ?? '')
  const [description, setDesc]      = useState(item?.description ?? '')
  const [categoryId, setCategoryId] = useState(item?.category_id ?? '')
  const [targetPrice, setPrice]     = useState(item?.target_price?.toString() ?? '')
  const [savedAmount, setSaved]     = useState(item?.saved_amount?.toString() ?? '0')
  const [targetDate, setDate]       = useState(item?.target_date ?? '')
  const [url, setUrl]               = useState(item?.url ?? '')
  const [imageUrl, setImageUrl]     = useState(item?.image_url ?? '')
  const [status, setStatus]         = useState<WishItemStatus>(item?.status ?? 'quero')
  const [saving, setSaving]         = useState(false)
  const [imageMode, setImageMode]   = useState<'url' | 'upload'>('url')
  const [uploading, setUploading]   = useState(false)
  const [preview, setPreview]       = useState(item?.image_url ?? '')
  const [newCatName, setNewCatName] = useState('')
  const [newCatIcon, setNewCatIcon] = useState('')
  const [addingCat, setAddingCat]   = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => { setPreview(imageUrl) }, [imageUrl])

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPreview(URL.createObjectURL(file))
    setUploading(true)
    try {
      const publicUrl = await onUploadImage(file)
      setImageUrl(publicUrl)
    } finally {
      setUploading(false)
    }
  }

  async function handleAddCategory() {
    if (!newCatName.trim()) return
    setAddingCat(true)
    const cat = await onAddCategory(newCatName.trim(), newCatIcon.trim() || undefined)
    if (cat) setCategoryId(cat.id)
    setNewCatName('')
    setNewCatIcon('')
    setAddingCat(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    await onSave({
      name: name.trim(),
      description: description.trim() || undefined,
      category_id: categoryId || undefined,
      target_price: targetPrice ? parseFloat(targetPrice) : undefined,
      saved_amount: savedAmount ? parseFloat(savedAmount) : 0,
      target_date: targetDate || undefined,
      url: url.trim() || undefined,
      image_url: imageUrl || undefined,
      status,
    })
    setSaving(false)
    onClose()
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 16, padding: 28, width: '100%', maxWidth: 520,
        boxShadow: 'var(--shadow-lg)', maxHeight: '90vh', overflowY: 'auto',
      }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-base" style={{ color: 'var(--text)' }}>
            {item ? 'Editar item' : 'Novo item'}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nome */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>
              Nome *
            </label>
            <input
              className="input w-full"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ex: iPhone 16, Tênis Nike..."
              required
            />
          </div>

          {/* Descrição */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>
              Descrição
            </label>
            <textarea
              className="input w-full"
              value={description}
              onChange={e => setDesc(e.target.value)}
              rows={2}
              placeholder="Detalhes sobre o item..."
              style={{ resize: 'none' }}
            />
          </div>

          {/* Categoria */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>
              Categoria
            </label>
            <select className="input w-full" value={categoryId} onChange={e => setCategoryId(e.target.value)}>
              <option value="">Sem categoria</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>
                  {c.icon ? `${c.icon} ` : ''}{c.name}
                </option>
              ))}
            </select>
            {/* Nova categoria inline */}
            <div className="flex gap-2 mt-2">
              <input
                className="input flex-1 text-sm"
                value={newCatName}
                onChange={e => setNewCatName(e.target.value)}
                placeholder="Nova categoria..."
                style={{ padding: '6px 10px' }}
              />
              <input
                className="input text-sm"
                value={newCatIcon}
                onChange={e => setNewCatIcon(e.target.value)}
                placeholder="Emoji"
                style={{ padding: '6px 10px', width: 72 }}
              />
              <button
                type="button"
                onClick={handleAddCategory}
                disabled={!newCatName.trim() || addingCat}
                className="btn btn-secondary"
                style={{ padding: '6px 10px', fontSize: 12 }}
              >
                <Plus size={13} />
              </button>
            </div>
          </div>

          {/* Preços */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>
                Valor alvo (R$)
              </label>
              <input
                className="input w-full"
                type="number"
                min="0"
                step="0.01"
                value={targetPrice}
                onChange={e => setPrice(e.target.value)}
                placeholder="0,00"
                style={{ fontFamily: 'DM Mono, monospace' }}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>
                Já juntado (R$)
              </label>
              <input
                className="input w-full"
                type="number"
                min="0"
                step="0.01"
                value={savedAmount}
                onChange={e => setSaved(e.target.value)}
                placeholder="0,00"
                style={{ fontFamily: 'DM Mono, monospace' }}
              />
            </div>
          </div>

          {/* Prazo + Link */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>
                Prazo
              </label>
              <input
                className="input w-full"
                type="date"
                value={targetDate}
                onChange={e => setDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>
                Link do produto
              </label>
              <input
                className="input w-full"
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>
          </div>

          {/* Imagem */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>
              Imagem
            </label>
            <div className="flex gap-2 mb-2">
              {(['url', 'upload'] as const).map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setImageMode(m)}
                  className={`btn btn-sm ${imageMode === m ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ fontSize: 12, padding: '4px 10px' }}
                >
                  {m === 'url' ? <><LinkIcon size={12} /> URL</> : <><Upload size={12} /> Upload</>}
                </button>
              ))}
            </div>
            {imageMode === 'url' ? (
              <input
                className="input w-full"
                value={imageUrl}
                onChange={e => setImageUrl(e.target.value)}
                placeholder="https://..."
              />
            ) : (
              <>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handleFileChange}
                />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="btn btn-secondary w-full"
                  disabled={uploading}
                >
                  {uploading ? 'Enviando...' : 'Escolher arquivo'}
                </button>
              </>
            )}
            {preview && (
              <div style={{ marginTop: 8, aspectRatio: '16/9', overflow: 'hidden', borderRadius: 8 }}>
                <img src={preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            )}
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>
              Coluna
            </label>
            <div className="flex gap-2">
              {STATUS_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setStatus(opt.value)}
                  className={`btn flex-1 text-sm ${status === opt.value ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '6px 0', justifyContent: 'center' }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn btn-secondary flex-1">
              Cancelar
            </button>
            <button type="submit" disabled={saving || !name.trim()} className="btn btn-primary flex-1">
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
