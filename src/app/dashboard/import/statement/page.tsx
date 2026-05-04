'use client'

import { useState }             from 'react'
import { createClient }         from '@/services/supabase/client'
import { useStatementImport }   from '@/hooks/useStatementImport'
import { useCategories }        from '@/hooks/useCategories'
import { useAccounts }          from '@/hooks/useAccounts'
import StatementUpload          from '@/components/import/StatementUpload'
import StatementPreview         from '@/components/import/StatementPreview'
import {
  Loader2, CheckCircle2, AlertCircle, Upload,
  ArrowRight, RefreshCw, Building2, ChevronDown,
} from 'lucide-react'

const HOUSEHOLD_ID = process.env.NEXT_PUBLIC_HOUSEHOLD_ID!

export default function StatementImportPage() {
  const { state, upload, toggleEntry, updateCategory, confirm, reset } = useStatementImport()
  const { categories }                = useCategories()
  const { accounts }                  = useAccounts(HOUSEHOLD_ID)
  const [accountId, setAccountId]     = useState('')

  const checkingAccounts = accounts.filter(a => a.type === 'CHECKING')
  const isLoading        = ['uploading', 'parsing', 'classifying', 'saving'].includes(state.step)

  async function handleFile(file: File) {
    if (!accountId) return
    await upload(file, HOUSEHOLD_ID, accountId)
  }

  async function handleConfirm() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await confirm(HOUSEHOLD_ID, accountId, user.id)
  }

  const selectedCount = state.entries.filter(pe => pe.checked).length

  return (
    <div className="p-4 md:p-7 max-w-[1000px] mx-auto">

      {/* Header */}
      <div className="page-header animate-fade-up">
        <h1 className="page-title">Importar Extrato</h1>
        <p className="page-subtitle">Importe o PDF do extrato Itaú — lançamentos classificados automaticamente</p>
      </div>

      <StepIndicator step={state.step} />

      <div className="mt-8 space-y-6">

        {/* Step 1: Account selection (always visible unless done/error) */}
        {!['done', 'error'].includes(state.step) && (
          <div className="animate-fade-up-1 card" style={{ padding: '20px 24px' }}>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-3"
              style={{ color: 'var(--text-muted)' }}>
              Conta corrente
            </label>

            {checkingAccounts.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                Nenhuma conta corrente cadastrada. Adicione uma em Patrimônio primeiro.
              </p>
            ) : (
              <div style={{ position: 'relative', maxWidth: 360 }}>
                <Building2 size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                <ChevronDown size={14} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                <select
                  value={accountId}
                  onChange={e => setAccountId(e.target.value)}
                  disabled={state.step !== 'idle'}
                  className="input"
                  style={{ paddingLeft: 36, paddingRight: 36, appearance: 'none', width: '100%' }}
                >
                  <option value="">Selecione a conta...</option>
                  {checkingAccounts.map(a => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Upload */}
        {state.step === 'idle' && (
          <div className="animate-fade-up-2">
            {!accountId ? (
              <div className="card flex flex-col items-center justify-center py-16 gap-3 text-center" style={{ borderStyle: 'dashed' }}>
                <Building2 size={28} style={{ color: 'var(--text-muted)' }} />
                <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Selecione a conta corrente antes de carregar o extrato</p>
              </div>
            ) : (
              <StatementUpload onFile={handleFile} />
            )}
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Loader2 size={28} className="animate-spin" style={{ color: 'var(--brand)' }} />
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
              {state.step === 'uploading'    && 'Enviando PDF...'}
              {state.step === 'parsing'      && 'Lendo extrato...'}
              {state.step === 'classifying'  && 'Classificando lançamentos...'}
              {state.step === 'saving'       && 'Salvando no banco...'}
            </p>
          </div>
        )}

        {/* Error */}
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

        {/* Done */}
        {state.step === 'done' && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ background: state.savedCount === 0 ? 'var(--bg-elevated)' : 'var(--success-bg)', border: `1px solid ${state.savedCount === 0 ? 'var(--border)' : 'rgba(0,196,122,0.2)'}` }}>
              {state.savedCount === 0
                ? <AlertCircle size={24} style={{ color: 'var(--text-muted)' }} />
                : <CheckCircle2 size={24} style={{ color: 'var(--success)' }} />
              }
            </div>
            <div className="text-center">
              {state.savedCount === 0 ? (
                <p className="font-semibold" style={{ color: 'var(--text)' }}>Nenhum lançamento importado</p>
              ) : (
                <p className="font-semibold" style={{ color: 'var(--text)' }}>
                  {state.savedCount} lançamentos importados com sucesso
                </p>
              )}
            </div>
            <div className="flex gap-3 mt-2">
              <button onClick={reset} className="btn btn-secondary">
                <Upload size={14} /> Importar outro
              </button>
              <a href="/dashboard/transactions" className="btn btn-primary">
                Ver transações <ArrowRight size={14} />
              </a>
            </div>
          </div>
        )}

        {/* Preview */}
        {state.step === 'preview' && (
          <div className="animate-fade-up-2 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl px-5 py-4"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <div>
                <p className="font-semibold text-sm" style={{ color: 'var(--text)' }}>
                  {state.entries.length} lançamentos encontrados
                  {state.ignoredCount > 0 && (
                    <span className="ml-2 badge badge-warning">{state.ignoredCount} ignorados</span>
                  )}
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  {selectedCount} selecionados para importar. Ajuste as categorias antes de confirmar.
                </p>
              </div>
              <div className="flex gap-3">
                <button onClick={reset} className="btn btn-ghost btn-sm">Cancelar</button>
                <button
                  onClick={handleConfirm}
                  disabled={selectedCount === 0}
                  className="btn btn-primary"
                >
                  <Upload size={14} /> Confirmar {selectedCount > 0 ? `(${selectedCount})` : ''}
                </button>
              </div>
            </div>

            <StatementPreview
              entries={state.entries}
              categories={categories}
              onToggle={toggleEntry}
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
    { keys: ['idle'],                              label: 'Conta & Upload' },
    { keys: ['uploading', 'parsing', 'classifying'], label: 'Processando'  },
    { keys: ['preview'],                           label: 'Revisão'       },
    { keys: ['saving', 'done'],                    label: 'Confirmar'     },
  ]
  const currentIdx = steps.findIndex(s => s.keys.includes(step))

  return (
    <div className="animate-fade-up-1">
      <div className="flex sm:hidden items-center gap-3">
        <div className="flex-1 rounded-full overflow-hidden" style={{ height: 6, background: 'var(--bg-elevated)' }}>
          <div className="h-full rounded-full transition-all"
            style={{ width: `${((currentIdx + 1) / steps.length) * 100}%`, background: 'var(--brand)' }} />
        </div>
        <span style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
          {currentIdx + 1} / {steps.length} — <span style={{ color: 'var(--brand)', fontWeight: 600 }}>{steps[currentIdx]?.label}</span>
        </span>
      </div>

      <div className="hidden sm:flex items-center gap-1">
        {steps.map((s, i) => {
          const done   = i < currentIdx
          const active = i === currentIdx
          return (
            <div key={s.label} className="flex items-center gap-1">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                style={{
                  background: active ? 'var(--brand-bg)'              : 'transparent',
                  color:      active ? 'var(--brand)'                 : done ? 'var(--success)' : 'var(--text-muted)',
                  border:     active ? '1px solid var(--brand-border)' : '1px solid transparent',
                }}>
                {done ? '✓' : i + 1}. {s.label}
              </div>
              {i < steps.length - 1 && (
                <div className="w-8 h-px" style={{ background: i < currentIdx ? 'var(--success)' : 'var(--border)' }} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
