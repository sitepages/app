'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/services/supabase/client'

export interface Account {
  id:           string
  household_id: string
  owner_id:     string | null
  name:         string
  type:         'CHECKING' | 'SAVINGS' | 'INVESTMENT' | 'CDI' | 'FOOD_CARD' | 'OTHER'
  balance:      number
  balance_date: string
  is_active:    boolean
  notes:        string | null
  created_at:   string
  updated_at:   string
}

export interface AccountSummary {
  disponivel:  number  // CHECKING + FOOD_CARD
  investido:   number  // SAVINGS + INVESTMENT + CDI
  total:       number
}

export const ACCOUNT_TYPES = {
  CHECKING:   { label: 'Conta Corrente', color: '#3B82F6', bg: 'rgba(59,130,246,0.1)'  },
  SAVINGS:    { label: 'Poupança',        color: '#10B981', bg: 'rgba(16,185,129,0.1)'  },
  INVESTMENT: { label: 'Investimentos',   color: '#8B5CF6', bg: 'rgba(139,92,246,0.1)'  },
  CDI:        { label: 'CDI / CDB',       color: '#F59E0B', bg: 'rgba(245,158,11,0.1)'  },
  FOOD_CARD:  { label: 'Vale Alimentação (legado)', color: '#F97316', bg: 'rgba(249,115,22,0.1)' },
  OTHER:      { label: 'Outros',          color: '#6B7280', bg: 'rgba(107,114,128,0.1)' },
}

export function useAccounts(householdId: string) {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)

  const fetchAccounts = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('household_id', householdId)
      .eq('is_active', true)
      .order('type')
      .order('name')

    if (error) setError(error.message)
    else setAccounts(data ?? [])
    setLoading(false)
  }, [householdId])

  useEffect(() => { fetchAccounts() }, [fetchAccounts])

  const summary: AccountSummary = {
    disponivel: accounts
      .filter(a => ['CHECKING'].includes(a.type))        // VA agora é renda, não patrimônio
      .reduce((s, a) => s + Number(a.balance), 0),
    investido: accounts
      .filter(a => ['SAVINGS', 'INVESTMENT', 'CDI'].includes(a.type))
      .reduce((s, a) => s + Number(a.balance), 0),
    total: accounts
      .filter(a => a.type !== 'FOOD_CARD')               // VA não entra no patrimônio total
      .reduce((s, a) => s + Number(a.balance), 0),
  }

  async function createAccount(data: Omit<Account, 'id' | 'household_id' | 'created_at' | 'updated_at'>) {
    const supabase = createClient()
    const { error } = await supabase
      .from('accounts')
      .insert({ ...data, household_id: householdId })
    if (!error) fetchAccounts()
    return { error }
  }

  async function updateAccount(id: string, data: Partial<Account>) {
    const supabase = createClient()
    const { error } = await supabase
      .from('accounts')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (!error) fetchAccounts()
    return { error }
  }

  async function updateBalance(id: string, balance: number) {
    return updateAccount(id, { balance, balance_date: new Date().toISOString().split('T')[0] })
  }

  async function deactivateAccount(id: string) {
    return updateAccount(id, { is_active: false })
  }

  return { accounts, loading, error, summary, fetchAccounts, createAccount, updateAccount, updateBalance, deactivateAccount }
}
