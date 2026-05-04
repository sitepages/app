'use client'

import { useState } from 'react'
import { parseNubankFile }                              from '@/lib/csv-parser'
import { classifyTransactions, fetchOthersCategoryId } from '@/lib/classifier'
import { createClient }                                from '@/services/supabase/client'
import type { ClassifiedTransaction }                  from '@/lib/classifier'
import { processInstallments }                         from '@/lib/installment-matcher'

export type ImportStep = 'idle' | 'parsing' | 'classifying' | 'preview' | 'saving' | 'done' | 'error'

export interface ImportState {
  step:              ImportStep
  transactions:      ClassifiedTransaction[]
  error:             string | null
  savedCount:        number
  skipped:           number
  duplicatesIgnored: number
  errorsCount:       number
  batchId:           string | null
}

export function useImport() {
  const [state, setState] = useState<ImportState>({
    step: 'idle', transactions: [], error: null,
    savedCount: 0, skipped: 0, duplicatesIgnored: 0, errorsCount: 0, batchId: null,
  })

  async function processFile(file: File) {
    setState(s => ({ ...s, step: 'parsing', error: null }))
    try {
      const result = await parseNubankFile(file)
      if (result.transactions.length === 0) {
        setState(s => ({ ...s, step: 'error', error: 'Nenhuma transação válida encontrada.' }))
        return
      }
      setState(s => ({ ...s, step: 'classifying' }))
      const othersId   = await fetchOthersCategoryId()
      const classified = await classifyTransactions(result.transactions, othersId ?? undefined)
      setState(s => ({ ...s, step: 'preview', transactions: classified, skipped: result.skipped }))
    } catch (err) {
      setState(s => ({ ...s, step: 'error', error: err instanceof Error ? err.message : 'Erro desconhecido.' }))
    }
  }

  function updateCategory(index: number, category_id: string) {
    setState(s => ({
      ...s,
      transactions: s.transactions.map((tx, i) => i === index ? { ...tx, category_id } : tx),
    }))
  }

  function toggleFixed(index: number) {
    setState(s => ({
      ...s,
      transactions: s.transactions.map((tx, i) => i === index ? { ...tx, is_fixed: !tx.is_fixed } : tx),
    }))
  }

  async function confirmImport(
    householdId: string,
    importedBy:  string,
    filename:    string,
    accountId:   string | null = null
  ) {
    setState(s => ({ ...s, step: 'saving' }))
    const supabase = createClient()
    const total    = state.transactions.length

    // 1. Criar o batch de importação
    const { data: batch, error: batchError } = await supabase
      .from('import_batches')
      .insert({
        household_id: householdId,
        imported_by:  importedBy,
        filename,
        total_rows:   total,
      })
      .select('id')
      .single()

    if (batchError || !batch) {
      setState(s => ({ ...s, step: 'error', error: `Erro ao criar batch: ${batchError?.message}` }))
      return
    }

    // 2. Inserir transações vinculadas ao batch
    const rows = state.transactions.map(tx => ({
      household_id:     householdId,
      imported_by:      importedBy,
      import_batch_id:  batch.id,
      ...(accountId ? { account_id: accountId } : {}),
      date:             tx.date,
      competence_month: tx.competence_month,
      description:      tx.description,
      raw_title:        tx.raw_title,
      amount:           tx.transaction_type === 'EXPENSE' ? -tx.amount : tx.amount,
      transaction_type: tx.transaction_type,
      is_fixed:         tx.is_fixed,
      category_id:      tx.category_id,
      status:           tx.status,
      source:           'NUBANK_CSV',
    }))

    const { error, count } = await supabase
      .from('transactions')
      .upsert(rows, {
        onConflict:       'household_id,date,raw_title,amount',
        ignoreDuplicates: true,
        count:            'exact',
      })

    if (error) {
      setState(s => ({ ...s, step: 'error', error: `Erro ao salvar: ${error.message}` }))
      return
    }

    const saved             = count ?? 0
    const duplicatesIgnored = total - saved

    // 3. Atualizar batch com resultado real
    await supabase
      .from('import_batches')
      .update({ saved_rows: saved, skipped_rows: duplicatesIgnored })
      .eq('id', batch.id)

    setState(s => ({ ...s, step: 'done', savedCount: saved, duplicatesIgnored, errorsCount: 0, batchId: batch.id }))
  }

  function reset() {
    setState({
      step: 'idle', transactions: [], error: null,
      savedCount: 0, skipped: 0, duplicatesIgnored: 0, errorsCount: 0, batchId: null,
    })
  }

  return { state, processFile, updateCategory, toggleFixed, confirmImport, reset }
}
