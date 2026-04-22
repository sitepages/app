'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/services/supabase/client'

export interface Transaction {
  id:           string
  date:         string
  description:  string
  raw_title:    string
  amount:       number
  status:       'PAID' | 'PENDING' | 'PLANNED'
  source:       string
  imported_by:  string | null
  category_id:  string | null
  categories:   { name: string; icon: string; color: string } | null
  household_members: { display_name: string } | null
}

export interface TransactionFilters {
  month?:      string   // "2024-01"
  category_id?: string
  imported_by?: string  // user_id para filtrar por pessoa
  status?:     string
}

export function useTransactions(householdId: string, filters: TransactionFilters = {}) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState<string | null>(null)

  const fetchTransactions = useCallback(async () => {
    setLoading(true)
    setError(null)
    const supabase = createClient()

    let query = supabase
      .from('transactions')
      .select(`
        id, date, description, raw_title, amount, status, source, imported_by, category_id,
        categories ( name, icon, color ),
        household_members!imported_by ( display_name )
      `)
      .eq('household_id', householdId)
      .order('date', { ascending: false })

    if (filters.month) {
      const [year, month] = filters.month.split('-')
      const from = `${year}-${month}-01`
      const to   = new Date(Number(year), Number(month), 0).toISOString().split('T')[0]
      query = query.gte('date', from).lte('date', to)
    }

    if (filters.category_id) query = query.eq('category_id', filters.category_id)
    if (filters.imported_by) query = query.eq('imported_by', filters.imported_by)
    if (filters.status)      query = query.eq('status', filters.status)

    const { data, error } = await query

    if (error) {
      setError(error.message)
    } else {
      setTransactions((data as unknown as Transaction[]) ?? [])
    }

    setLoading(false)
  }, [householdId, JSON.stringify(filters)])

  useEffect(() => { fetchTransactions() }, [fetchTransactions])

  return { transactions, loading, error, refetch: fetchTransactions }
}
