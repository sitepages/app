'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/services/supabase/client'

export interface Budget {
  id:           string
  household_id: string
  category_id:  string
  month:        string
  amount_limit: number
  categories:   { name: string; color: string; icon: string } | null
}

export interface BudgetWithSpent extends Budget {
  spent:     number
  percent:   number
  remaining: number
  status:    'ok' | 'warning' | 'exceeded'
}

export function useBudgets(householdId: string, month: string) {
  const [budgets, setBudgets] = useState<BudgetWithSpent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()

    const { data: budgetData, error: bErr } = await supabase
      .from('budgets')
      .select('*, categories(name, color, icon)')
      .eq('household_id', householdId)
      .eq('month', month)

    if (bErr) { setError(bErr.message); setLoading(false); return }

    const { data: txData } = await supabase
      .from('transactions')
      .select('category_id, amount')
      .eq('household_id', householdId)
      .eq('competence_month', month)
      .eq('transaction_type', 'EXPENSE')
      .is('deleted_at', null)

    const spentMap: Record<string, number> = {}
    txData?.forEach(tx => {
      if (tx.category_id)
        spentMap[tx.category_id] = (spentMap[tx.category_id] ?? 0) + Math.abs(Number(tx.amount))
    })

    const enriched: BudgetWithSpent[] = (budgetData ?? []).map(b => {
      const spent     = spentMap[b.category_id] ?? 0
      const percent   = (spent / Number(b.amount_limit)) * 100
      const remaining = Number(b.amount_limit) - spent
      const status    = percent >= 100 ? 'exceeded' : percent >= 80 ? 'warning' : 'ok'
      return { ...b, spent, percent, remaining, status }
    })

    enriched.sort((a, b) => b.percent - a.percent)
    setBudgets(enriched)
    setLoading(false)
  }, [householdId, month])

  useEffect(() => { fetch() }, [fetch])

  const totalLimit = budgets.reduce((s, b) => s + Number(b.amount_limit), 0)
  const totalSpent = budgets.reduce((s, b) => s + b.spent, 0)
  const exceeded   = budgets.filter(b => b.status === 'exceeded').length
  const warning    = budgets.filter(b => b.status === 'warning').length

  async function upsertBudget(categoryId: string, amountLimit: number) {
    const supabase = createClient()
    const { error } = await supabase.from('budgets').upsert({
      household_id: householdId, category_id: categoryId,
      month, amount_limit: amountLimit, updated_at: new Date().toISOString(),
    }, { onConflict: 'household_id,category_id,month' })
    if (!error) fetch()
    return { error }
  }

  async function deleteBudget(id: string) {
    const supabase = createClient()
    const { error } = await supabase.from('budgets').delete().eq('id', id)
    if (!error) fetch()
    return { error }
  }

  async function copyFromPrevMonth() {
    const supabase = createClient()
    const [y, m]   = month.split('-').map(Number)
    const prevDate  = new Date(y, m - 2, 1)
    const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`

    const { data: prev } = await supabase
      .from('budgets')
      .select('category_id, amount_limit')
      .eq('household_id', householdId)
      .eq('month', prevMonth)

    if (!prev?.length) return { error: { message: 'Nenhum orçamento no mês anterior.' }, copied: 0 }

    const rows = prev.map(b => ({
      household_id: householdId, category_id: b.category_id,
      month, amount_limit: b.amount_limit, updated_at: new Date().toISOString(),
    }))

    const { error } = await supabase
      .from('budgets')
      .upsert(rows, { onConflict: 'household_id,category_id,month' })

    if (!error) fetch()
    return { error, copied: prev.length }
  }

  return {
    budgets, loading, error,
    totalLimit, totalSpent, exceeded, warning,
    upsertBudget, deleteBudget, copyFromPrevMonth, refetch: fetch,
  }
}
