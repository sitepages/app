'use client'

import { useRef, useState }  from 'react'
import { Upload, FileText, X } from 'lucide-react'

interface Props {
  onFile:    (file: File) => void
  disabled?: boolean
}

export default function StatementUpload({ onFile, disabled }: Props) {
  const [dragging, setDragging] = useState(false)
  const [selected, setSelected] = useState<File | null>(null)
  const inputRef                = useRef<HTMLInputElement>(null)

  function handleFile(file: File) {
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      alert('Por favor, selecione um arquivo PDF')
      return
    }
    setSelected(file)
    onFile(file)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  function clear(e: React.MouseEvent) {
    e.stopPropagation()
    setSelected(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div
      onClick={() => !disabled && inputRef.current?.click()}
      onDragOver={e => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      style={{
        border:         `2px dashed ${dragging ? 'var(--brand)' : selected ? 'rgba(0,196,122,0.5)' : 'var(--border)'}`,
        borderRadius:   16,
        padding:        '48px 24px',
        display:        'flex',
        flexDirection:  'column',
        alignItems:     'center',
        justifyContent: 'center',
        gap:            16,
        textAlign:      'center',
        cursor:         disabled ? 'not-allowed' : 'pointer',
        opacity:        disabled ? 0.5 : 1,
        background:     dragging ? 'rgba(0,196,122,0.05)' : 'var(--bg-card)',
        transition:     'all 0.2s',
        position:       'relative',
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,application/pdf"
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
        disabled={disabled}
      />

      {selected ? (
        <>
          <div style={{ width: 48, height: 48, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,196,122,0.12)' }}>
            <FileText size={22} style={{ color: 'var(--brand)' }} />
          </div>
          <div>
            <p style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>{selected.name}</p>
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>{(selected.size / 1024).toFixed(1)} KB</p>
          </div>
          <button
            onClick={clear}
            style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}
          >
            <X size={16} />
          </button>
        </>
      ) : (
        <>
          <div style={{ width: 48, height: 48, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-elevated)' }}>
            <Upload size={22} style={{ color: 'var(--text-muted)' }} />
          </div>
          <div>
            <p style={{ fontWeight: 500, color: 'var(--text)', marginBottom: 4 }}>
              {dragging ? 'Solte aqui' : 'Arraste o extrato PDF ou clique para selecionar'}
            </p>
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Extrato Itaú — formato .pdf</p>
          </div>
        </>
      )}
    </div>
  )
}
