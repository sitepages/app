'use client'

import { useState } from 'react'
import { createClient }                                 from '@/services/supabase/client'
import { parseItauPDF }                                 from '@/lib/itau-parser'
import { classifyStatementEntry }                       from '@/lib/statement-classifier'
import { fetchCategoryRules, fetchOthersCategoryId }    from '@/lib/classifier'
import type { ItauStatement }                           from '@/lib/itau-parser'
import type { StatementPreviewEntry }                   from '@/lib/statement-classifier'

export type StatementImportStep =
  | 'idle' | 'uploading' | 'parsing' | 'classifying' | 'preview' | 'saving' | 'done' | 'error'

interface State {
  step:         StatementImportStep
  statement:    ItauStatement | null
  entries:      StatementPreviewEntry[]
  ignoredCount: number
  error:        string | null
  savedCount:   number
}

export function useStatementImport() {
  const [state, setState] = useState<State>({
    step: 'idle', statement: null, entries: [], ignoredCount: 0, error: null, savedCount: 0,
  })

  async function upload(file: File, householdId: string, accountId: string) {
    setState(s => ({ ...s, step: 'uploading', error: null }))
    try {
      const formData = new FormData()
      formData.append('pdf', file)

      const res = await fetch('/api/parse-statement', { method: 'POST', body: formData })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? 'Erro ao processar PDF')
      }
      const { text } = await res.json()

      setState(s => ({ ...s, step: 'parsing' }))
      const statement = parseItauPDF(text)

      if (statement.entries.length === 0) {
        throw new Error('Nenhum lançamento encontrado. Verifique se é um extrato do Itaú.')
      }

      setState(s => ({ ...s, step: 'classifying' }))
      const [rules, othersId] = await Promise.all([fetchCategoryRules(), fetchOthersCategoryId()])
      const classified = statement.entries.map(e => classifyStatementEntry(e, rules, othersId))

      // Check duplicates against existing BANK_STATEMENT transactions
      const supabase      = createClient()
      const visibleEntries = classified.filter(pe => !pe.entry.shouldIgnore && !pe.isIncome)
      const datesAmounts  = visibleEntries.map(pe => ({
        date:      pe.entry.date,
        amount:    Math.abs(pe.entry.amount),
        raw_title: pe.entry.rawDescription,
      }))

      const duplicateKeys = new Set<string>()
      if (datesAmounts.length > 0) {
        const { data: existing } = await supabase
          .from('transactions')
          .select('date, amount, raw_title')
          .eq('household_id', householdId)
          .eq('account_id', accountId)
          .eq('source', 'BANK_STATEMENT')

        existing?.forEach(row => {
          duplicateKeys.add(`${row.date}|${row.amount}|${row.raw_title}`)
        })
      }

      const withDuplicates = classified.map(pe => {
        const key = `${pe.entry.date}|${Math.abs(pe.entry.amount)}|${pe.entry.rawDescription}`
        const isDup = duplicateKeys.has(key)
        return { ...pe, duplicate: isDup, checked: pe.checked && !isDup }
      })

      const ignoredCount = statement.entries.filter(e => e.shouldIgnore).length

      setState(s => ({ ...s, step: 'preview', statement, entries: withDuplicates, ignoredCount }))
    } catch (err) {
      setState(s => ({ ...s, step: 'error', error: err instanceof Error ? err.message : 'Erro desconhecido' }))
    }
  }

  function toggleEntry(index: number) {
    setState(s => ({
      ...s,
      entries: s.entries.map((pe, i) => {
        if (i !== index) return pe
        if (pe.entry.entryType === 'CARD_PAYMENT') return pe  // never toggleable
        return { ...pe, checked: !pe.checked }
      }),
    }))
  }

  function updateCategory(index: number, categoryId: string) {
    setState(s => ({
      ...s,
      entries: s.entries.map((pe, i) => i === index ? { ...pe, category_id: categoryId } : pe),
    }))
  }

  async function confirm(householdId: string, accountId: string, userId: string) {
    setState(s => ({ ...s, step: 'saving' }))
    const supabase      = createClient()
    const selected      = state.entries.filter(pe => pe.checked)

    if (selected.length === 0) {
      setState(s => ({ ...s, step: 'done', savedCount: 0 }))
      return
    }

    const { data: batch, error: batchError } = await supabase
      .from('import_batches')
      .insert({
        household_id: householdId,
        imported_by:  userId,
        filename:     `extrato_itau${state.statement?.periodStart ? '_' + state.statement.periodStart : ''}.pdf`,
        total_rows:   selected.length,
      })
      .select('id')
      .single()

    if (batchError || !batch) {
      setState(s => ({ ...s, step: 'error', error: `Erro ao criar batch: ${batchError?.message}` }))
      return
    }

    const expenses = selected.filter(pe => !pe.isIncome)
    const incomes  = selected.filter(pe => pe.isIncome)

    if (expenses.length > 0) {
      await supabase.from('transactions').insert(
        expenses.map(pe => ({
          household_id:     householdId,
          account_id:       accountId,
          imported_by:      userId,
          import_batch_id:  batch.id,
          date:             pe.entry.date,
          competence_month: pe.entry.date.slice(0, 7),
          description:      pe.entry.cleanDescription,
          raw_title:        pe.entry.rawDescription,
          amount:           Math.abs(pe.entry.amount),
          transaction_type: 'EXPENSE',
          status:           'PAID',
          category_id:      pe.category_id,
          source:           'BANK_STATEMENT',
          pix_recipient:    pe.entry.pixRecipient,
        }))
      )
    }

    if (incomes.length > 0) {
      await supabase.from('income_entries').insert(
        incomes.map(pe => ({
          household_id:     householdId,
          account_id:       accountId,
          user_id:          userId,
          amount:           Math.abs(pe.entry.amount),
          description:      pe.entry.cleanDescription,
          category:         pe.incomeCategory,
          date:             pe.entry.date,
          competence_month: pe.entry.date.slice(0, 7),
        }))
      )
    }

    const savedCount = expenses.length + incomes.length
    await supabase.from('import_batches').update({ saved_rows: savedCount }).eq('id', batch.id)

    setState(s => ({ ...s, step: 'done', savedCount }))
  }

  function reset() {
    setState({ step: 'idle', statement: null, entries: [], ignoredCount: 0, error: null, savedCount: 0 })
  }

  return { state, upload, toggleEntry, updateCategory, confirm, reset }
}
