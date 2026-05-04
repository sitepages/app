'use client'

import { useState, useRef }    from 'react'
import { createClient }        from '@/services/supabase/client'
import { useImport }           from '@/hooks/useImport'
import { useCategories }       from '@/hooks/useCategories'
import { useDeleteTransaction } from '@/hooks/useDeleteTransaction'
import FileDropzone            from '@/components/import/FileDropzone'
import ImportPreviewTable      from '@/components/import/ImportPreviewTable'
import { Loader2, CheckCircle2, AlertCircle, Upload, ArrowRight, RefreshCw, Undo2 } from 'lucide-react'

const HOUSEHOLD_ID = process.env.NEXT_PUBLIC_HOUSEHOLD_ID!

export default function ImportPage() {
  const { state, processFile, updateCategory, confirmImport, reset } = useImport()
  const { categories } = useCategories()
  const [filename, setFilename]         = useState('')
  const [undoing, setUndoing]           = useState(false)
  const [undoSuccess, setUndoSuccess]   = useState(false)
  const { hardDeleteBatch }             = useDeleteTransaction()

  const isLoading = ['parsing', 'classifying', 'saving'].includes(state.step)

  async function handleConfirm() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await confirmImport(HOUSEHOLD_ID, user.id, filename, null)
  }

  async function handleUndo() {
    if (!state.batchId) return
    setUndoing(true)
    const { error } = await hardDeleteBatch(state.batchId)
    setUndoing(false)
    if (!error) {
      setUndoSuccess(true)
      setTimeout(() => { reset(); setUndoSuccess(false) }, 2000)
    }
  }

  function handleFile(file: File) {
    setFilename(file.name)
    processFile(file)
  }

  return (
    <div className="p-7 max-w-[1100px] mx-auto">

      {/* Header */}
      <div className="page-header animate-fade-up">
        <h1 className="page-title">Importar Extrato</h1>
        <p className="page-subtitle">Importe seu CSV do Nubank — transações classificadas automaticamente</p>
      </div>

      <StepIndicator step={state.step} />

      <div className="mt-8">

        {/* idle */}
        {state.step === 'idle' && (
          <FileDropzone onFile={handleFile} />
        )}

        {/* loading */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Loader2 size={28} className="animate-spin" style={{ color: 'var(--brand)' }} />
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
              {state.step === 'parsing'     && 'Lendo arquivo...'}
              {state.step === 'classifying' && 'Classificando transações...'}
              {state.step === 'saving'      && 'Salvando no banco...'}
            </p>
          </div>
        )}

        {/* error */}
        {state.step === 'error' && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ background: 'var(--danger-bg)', border: '1px solid rgba(248,113,113,0.2)' }}>
              <AlertCircle size={24} style={{ color: 'var(--danger)' }} />
            </div>
            <div className="text-center">
              <p className="font-semibold mb-1" style={{ color: 'var(--text)' }}>Algo deu errado</p>
              <p className="text-sm max-w-sm" style={{ color: 'var(--text-muted)' }}>{state.error}</p>
            </div>
            <button onClick={reset} className="btn btn-secondary mt-2">
              <RefreshCw size={14} /> Tentar novamente
            </button>
          </div>
        )}

        {/* done */}
        {state.step === 'done' && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ background: undoSuccess ? 'var(--warning-bg)' : 'var(--success-bg)', border: `1px solid ${undoSuccess ? 'rgba(245,158,11,0.2)' : 'rgba(0,196,122,0.2)'}` }}>
              {undoSuccess
                ? <Undo2 size={24} style={{ color: 'var(--warning)' }} />
                : <CheckCircle2 size={24} style={{ color: 'var(--success)' }} />
              }
            </div>
            <div className="text-center">
              {undoSuccess ? (
                <p className="font-semibold" style={{ color: 'var(--warning)' }}>Importação desfeita!</p>
              ) : (
                <>
                  <p className="font-semibold mb-1" style={{ color: 'var(--text)' }}>
                    {state.savedCount} transações importadas!
                  </p>
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                    {state.duplicatesIgnored > 0
                      ? `${state.duplicatesIgnored} já existiam e foram ignoradas.`
                      : 'Tudo salvo com sucesso.'
                    }
                  </p>
                </>
              )}
            </div>

            {!undoSuccess && (
              <div className="flex gap-3 mt-2">
                <button onClick={reset} className="btn btn-secondary">
                  <Upload size={14} /> Importar outro
                </button>
                <a href="/dashboard/transactions" className="btn btn-primary">
                  Ver transações <ArrowRight size={14} />
                </a>
              </div>
            )}

            {/* Desfazer importação */}
            {state.batchId && !undoSuccess && (
              <button
                onClick={handleUndo}
                disabled={undoing}
                className="btn btn-ghost btn-sm mt-1"
                style={{ color: 'var(--danger)' }}
              >
                {undoing
                  ? <><Loader2 size={13} className="animate-spin" /> Desfazendo...</>
                  : <><Undo2 size={13} /> Desfazer esta importação</>
                }
              </button>
            )}
          </div>
        )}

        {/* preview */}
        {state.step === 'preview' && (
          <div className="space-y-5">
            <div
              className="flex items-center justify-between rounded-xl px-5 py-4"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
            >
              <div>
                <p className="font-semibold text-sm" style={{ color: 'var(--text)' }}>
                  {state.transactions.length} transações encontradas
                  {state.skipped > 0 && (
                    <span className="ml-2 badge badge-warning">{state.skipped} ignoradas</span>
                  )}
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  {state.transactions.filter(tx => tx.category_id && tx.transaction_type === 'EXPENSE').length} classificadas automaticamente.
                  Ajuste as categorias antes de confirmar.
                </p>
              </div>
              <div className="flex gap-3">
                <button onClick={reset} className="btn btn-ghost btn-sm">Cancelar</button>
                <button onClick={handleConfirm} className="btn btn-primary">
                  <Upload size={14} /> Confirmar importação
                </button>
              </div>
            </div>

            <ImportPreviewTable
              transactions={state.transactions}
              categories={categories}
              onChangeCategory={updateCategory}
            />
          </div>
        )}
      </div>
    </div>
  )
}

function StepIndicator({ step }: { step: string }) {
  const steps = [
    { keys: ['idle'],                   label: 'Upload'      },
    { keys: ['parsing', 'classifying'], label: 'Processando' },
    { keys: ['preview'],                label: 'Revisão'     },
    { keys: ['saving', 'done'],         label: 'Confirmar'   },
  ]
  const currentIdx = steps.findIndex(s => s.keys.includes(step))

  return (
    <div className="flex items-center gap-1 animate-fade-up-1">
      {steps.map((s, i) => {
        const done   = i < currentIdx
        const active = i === currentIdx
        return (
          <div key={s.label} className="flex items-center gap-1">
            <div
              className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all"
              style={{
                background:  active ? 'var(--brand-bg)'        : 'transparent',
                color:       active ? 'var(--brand)'           : done ? 'var(--success)' : 'var(--text-muted)',
                border:      active ? '1px solid var(--brand-border)' : '1px solid transparent',
              }}
            >
              {done ? '✓' : i + 1}. {s.label}
            </div>
            {i < steps.length - 1 && (
              <div className="w-8 h-px"
                style={{ background: i < currentIdx ? 'var(--success)' : 'var(--border)' }} />
            )}
          </div>
        )
      })}
    </div>
  )
}
