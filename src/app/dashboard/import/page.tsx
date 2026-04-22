'use client'

import { useEffect } from 'react'
import { createClient }        from '@/services/supabase/client'
import { useImport }           from '@/hooks/useImport'
import { useCategories }       from '@/hooks/useCategories'
import FileDropzone            from '@/components/import/FileDropzone'
import ImportPreviewTable      from '@/components/import/ImportPreviewTable'
import { Loader2, CheckCircle2, AlertCircle, Upload, ArrowRight } from 'lucide-react'

const HOUSEHOLD_ID = process.env.NEXT_PUBLIC_HOUSEHOLD_ID!

export default function ImportPage() {
  const { state, processFile, updateCategory, confirmImport, reset } = useImport()
  const { categories } = useCategories()

  async function handleConfirm() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await confirmImport(HOUSEHOLD_ID, user.id)
  }

  const isLoading = state.step === 'parsing' || state.step === 'classifying' || state.step === 'saving'

  return (
    <div className="p-8 max-w-6xl mx-auto">

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-100 mb-1">Importar Extrato</h1>
        <p className="text-slate-500 text-sm">
          Importe seu CSV do Nubank. As transações serão classificadas automaticamente.
        </p>
      </div>

      {/* Step indicator */}
      <StepIndicator step={state.step} />

      <div className="mt-8">

        {/* Estado: idle */}
        {state.step === 'idle' && (
          <FileDropzone onFile={processFile} />
        )}

        {/* Estado: carregando */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 size={32} className="animate-spin text-indigo-400" />
            <p className="text-slate-400">
              {state.step === 'parsing'      && 'Lendo arquivo...'}
              {state.step === 'classifying'  && 'Classificando transações...'}
              {state.step === 'saving'       && 'Salvando no banco...'}
            </p>
          </div>
        )}

        {/* Estado: erro */}
        {state.step === 'error' && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-14 h-14 bg-red-500/10 rounded-2xl flex items-center justify-center">
              <AlertCircle size={28} className="text-red-400" />
            </div>
            <div className="text-center">
              <p className="text-slate-200 font-medium mb-1">Algo deu errado</p>
              <p className="text-slate-500 text-sm max-w-sm">{state.error}</p>
            </div>
            <button
              onClick={reset}
              className="mt-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm px-5 py-2.5 rounded-xl transition-colors"
            >
              Tentar novamente
            </button>
          </div>
        )}

        {/* Estado: done */}
        {state.step === 'done' && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center">
              <CheckCircle2 size={28} className="text-emerald-400" />
            </div>
            <div className="text-center">
              <p className="text-slate-200 font-medium mb-1">
                {state.savedCount} transações importadas!
              </p>
              <p className="text-slate-500 text-sm">Tudo salvo com sucesso.</p>
            </div>
            <div className="flex gap-3 mt-2">
              <button
                onClick={reset}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm px-5 py-2.5 rounded-xl transition-colors"
              >
                Importar outro arquivo
              </button>
              <a
                href="/dashboard/transactions"
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm px-5 py-2.5 rounded-xl transition-colors flex items-center gap-2"
              >
                Ver transações <ArrowRight size={15} />
              </a>
            </div>
          </div>
        )}

        {/* Estado: preview */}
        {state.step === 'preview' && (
          <div className="space-y-6">
            {/* Resumo */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-300 font-medium">
                  {state.transactions.length} transações encontradas
                </p>
                <p className="text-slate-500 text-sm">
                  {state.transactions.filter(tx => tx.category_id).length} classificadas automaticamente.
                  Ajuste as categorias se necessário.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={reset}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-400 text-sm px-4 py-2.5 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirm}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-colors flex items-center gap-2 shadow-lg shadow-indigo-600/20"
                >
                  <Upload size={15} />
                  Confirmar importação
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
    { key: ['idle'],                          label: '1. Upload'       },
    { key: ['parsing', 'classifying'],        label: '2. Processando'  },
    { key: ['preview'],                       label: '3. Revisão'      },
    { key: ['saving', 'done'],                label: '4. Confirmar'    },
  ]

  const currentIndex = steps.findIndex(s => s.key.includes(step))

  return (
    <div className="flex items-center gap-2">
      {steps.map((s, i) => {
        const done   = i < currentIndex
        const active = i === currentIndex
        return (
          <div key={s.label} className="flex items-center gap-2">
            <div className={`
              flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all
              ${active ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-600/30' : ''}
              ${done   ? 'text-emerald-400' : ''}
              ${!active && !done ? 'text-slate-600' : ''}
            `}>
              {done ? '✓' : i + 1}. {s.label}
            </div>
            {i < steps.length - 1 && (
              <div className={`w-6 h-px ${i < currentIndex ? 'bg-emerald-500/50' : 'bg-slate-800'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}
