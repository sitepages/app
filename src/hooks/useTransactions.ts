'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/services/supabase/client'

export interface Transaction {
  id:               string
  date:             string
  competence_month: string
  description:      string
  raw_title:        string
  amount:           number
  transaction_type: 'EXPENSE' | 'INCOME' | 'TRANSFER'
  is_fixed:         boolean
  status:           'PAID' | 'PENDING' | 'PLANNED'
  source:           string
  imported_by:      string | null
  category_id:      string | null
  categories:       { name: string; icon: string; color: string } | null
  imported_by_name: string | null  // resolvido manualmente
}

export interface TransactionFilters {
  month?:       string
  category_id?: string
  imported_by?: string
  status?:      string
  type?:        'EXPENSE' | 'INCOME' | 'TRANSFER'
}

export function useTransactions(householdId: string, filters: TransactionFilters = {}) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState<string | null>(null)

  const fetchTransactions = useCallback(async () => {
    setLoading(true)
    setError(null)
    const supabase = createClient()

    // 1. Busca membros do household para resolver display_name
    const { data: members } = await supabase
      .from('household_members')
      .select('user_id, display_name')
      .eq('household_id', householdId)
      .is('deleted_at', null)

    const memberMap: Record<string, string> = {}
    members?.forEach(m => { memberMap[m.user_id] = m.display_name })

    // 2. Busca transações sem join com household_members
    let query = supabase
      .from('transactions')
      .select(`
        id, date, competence_month, description, raw_title,
        amount, transaction_type, is_fixed, status, source,
        imported_by, category_id,
        categories ( name, icon, color )
      `)
      .eq('household_id', householdId)
      .is('deleted_at', null)
      .order('date', { ascending: false })

    if (filters.month)       query = query.eq('competence_month', filters.month)
    if (filters.category_id) query = query.eq('category_id', filters.category_id)
    if (filters.imported_by) query = query.eq('imported_by', filters.imported_by)
    if (filters.status)      query = query.eq('status', filters.status)
    if (filters.type)        query = query.eq('transaction_type', filters.type)

    const { data, error } = await query

    if (error) {
      setError(error.message)
    } else {
      // 3. Resolve display_name manualmente
      const enriched = (data ?? []).map((tx: any) => ({
        ...tx,
        imported_by_name: tx.imported_by ? (memberMap[tx.imported_by] ?? '—') : '—',
      }))
      setTransactions(enriched)
    }

    setLoading(false)
  }, [householdId, JSON.stringify(filters)])

  useEffect(() => { fetchTransactions() }, [fetchTransactions])

  return { transactions, loading, error, refetch: fetchTransactions }
}
