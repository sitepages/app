'use client'

import { useState } from 'react'
import { parseNubankFile }          from '@/lib/csv-parser'
import { classifyTransactions, fetchOthersCategoryId } from '@/lib/classifier'
import { createClient }             from '@/services/supabase/client'
import type { ParsedTransaction }   from '@/lib/csv-parser'
import type { ClassifiedTransaction } from '@/lib/classifier'

export type ImportStep = 'idle' | 'parsing' | 'classifying' | 'preview' | 'saving' | 'done' | 'error'

export interface ImportState {
  step:         ImportStep
  transactions: ClassifiedTransaction[]
  error:        string | null
  savedCount:   number
}

export function useImport() {
  const [state, setState] = useState<ImportState>({
    step:         'idle',
    transactions: [],
    error:        null,
    savedCount:   0,
  })

  async function processFile(file: File) {
    setState(s => ({ ...s, step: 'parsing', error: null }))

    try {
      // 1. Parse do CSV
      const result = await parseNubankFile(file)

      if (result.transactions.length === 0) {
        setState(s => ({ ...s, step: 'error', error: 'Nenhuma transação válida encontrada no arquivo.' }))
        return
      }

      setState(s => ({ ...s, step: 'classifying' }))

      // 2. Classificação automática
      const othersId     = await fetchOthersCategoryId()
      const classified   = await classifyTransactions(result.transactions, othersId ?? undefined)

      setState(s => ({
        ...s,
        step:         'preview',
        transactions: classified,
      }))

    } catch (err) {
      setState(s => ({
        ...s,
        step:  'error',
        error: err instanceof Error ? err.message : 'Erro desconhecido ao processar arquivo.',
      }))
    }
  }

  function updateCategory(index: number, category_id: string) {
    setState(s => ({
      ...s,
      transactions: s.transactions.map((tx, i) =>
        i === index ? { ...tx, category_id } : tx
      ),
    }))
  }

  async function confirmImport(householdId: string, importedBy: string) {
    setState(s => ({ ...s, step: 'saving' }))

    const supabase = createClient()

    const rows = state.transactions.map(tx => ({
      household_id: householdId,
      imported_by:  importedBy,
      date:         tx.date,
      description:  tx.description,
      raw_title:    tx.raw_title,
      amount:       tx.amount,
      category_id:  tx.category_id,
      status:       tx.status,
      source:       'nubank_csv',
    }))

    const { error, count } = await supabase
      .from('transactions')
      .insert(rows, { count: 'exact' })

    if (error) {
      setState(s => ({ ...s, step: 'error', error: `Erro ao salvar: ${error.message}` }))
      return
    }

    setState(s => ({ ...s, step: 'done', savedCount: count ?? rows.length }))
  }

  function reset() {
    setState({ step: 'idle', transactions: [], error: null, savedCount: 0 })
  }

  return { state, processFile, updateCategory, confirmImport, reset }
}
