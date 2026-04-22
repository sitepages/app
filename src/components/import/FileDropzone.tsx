'use client'

import { useRef, useState } from 'react'
import { Upload, FileText, X } from 'lucide-react'

interface FileDropzoneProps {
  onFile: (file: File) => void
  disabled?: boolean
}

export default function FileDropzone({ onFile, disabled }: FileDropzoneProps) {
  const [dragging, setDragging]   = useState(false)
  const [selected, setSelected]   = useState<File | null>(null)
  const inputRef                  = useRef<HTMLInputElement>(null)

  function handleFile(file: File) {
    if (!file.name.endsWith('.csv')) {
      alert('Por favor, selecione um arquivo .csv')
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

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
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
      className={`
        relative border-2 border-dashed rounded-2xl p-10
        flex flex-col items-center justify-center gap-4 text-center
        transition-all duration-200 cursor-pointer
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        ${dragging
          ? 'border-indigo-500 bg-indigo-500/10'
          : selected
            ? 'border-emerald-500/50 bg-emerald-500/5'
            : 'border-slate-700 bg-slate-900 hover:border-slate-600 hover:bg-slate-800/50'
        }
      `}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={handleChange}
        disabled={disabled}
      />

      {selected ? (
        <>
          <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center">
            <FileText size={24} className="text-emerald-400" />
          </div>
          <div>
            <p className="text-slate-200 font-medium">{selected.name}</p>
            <p className="text-slate-500 text-sm mt-0.5">
              {(selected.size / 1024).toFixed(1)} KB
            </p>
          </div>
          <button
            onClick={clear}
            className="absolute top-4 right-4 text-slate-500 hover:text-slate-300 transition-colors"
          >
            <X size={16} />
          </button>
        </>
      ) : (
        <>
          <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center">
            <Upload size={22} className="text-slate-400" />
          </div>
          <div>
            <p className="text-slate-300 font-medium">
              {dragging ? 'Solte aqui' : 'Arraste o CSV ou clique para selecionar'}
            </p>
            <p className="text-slate-600 text-sm mt-1">
              Extrato Nubank — formato .csv
            </p>
          </div>
        </>
      )}
    </div>
  )
}
