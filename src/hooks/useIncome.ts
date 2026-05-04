'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/services/supabase/client'

export interface IncomeEntry {
  id:               string
  household_id:     string
  user_id:          string
  amount:           number
  description:      string
  category:         'SALARY' | 'FREELANCE' | 'INVESTMENT_RETURN' | 'RENTAL' | 'FOOD_CARD' | 'OTHER'
  date:             string
  competence_month: string
  account_id:       string | null
  is_recurring:     boolean
  notes:            string | null
  created_at:       string
  accounts:         { name: string; type: string } | null
  member_name?:     string
}

export const INCOME_CATEGORIES = {
  SALARY:            { label: 'Salário',            color: '#00C47A', bg: 'rgba(0,196,122,0.1)'   },
  FREELANCE:         { label: 'Freelance',           color: '#3B82F6', bg: 'rgba(59,130,246,0.1)'  },
  INVESTMENT_RETURN: { label: 'Rendimento',          color: '#F59E0B', bg: 'rgba(245,158,11,0.1)'  },
  RENTAL:            { label: 'Aluguel recebido',    color: '#8B5CF6', bg: 'rgba(139,92,246,0.1)'  },
  FOOD_CARD:         { label: 'Vale Alimentação',    color: '#F97316', bg: 'rgba(249,115,22,0.1)'  },
  OTHER:             { label: 'Outro',               color: '#6B7280', bg: 'rgba(107,114,128,0.1)' },
}

export function useIncome(householdId: string, month?: string) {
  const [entries, setEntries]   = useState<IncomeEntry[]>([])
  const [members, setMembers]   = useState<Record<string, string>>({})
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()

    // Busca membros para resolver display_name
    const { data: memberData } = await supabase
      .from('household_members')
      .select('user_id, display_name')
      .eq('household_id', householdId)

    const memberMap: Record<string, string> = {}
    memberData?.forEach(m => { memberMap[m.user_id] = m.display_name })
    setMembers(memberMap)

    let query = supabase
      .from('income_entries')
      .select('*, accounts(name, type)')
      .eq('household_id', householdId)
      .order('date', { ascending: false })

    if (month) query = query.eq('competence_month', month)

    const { data, error } = await query

    if (error) {
      setError(error.message)
    } else {
      const enriched = (data ?? []).map((e: any) => ({
        ...e,
        member_name: memberMap[e.user_id] ?? '—',
      }))
      setEntries(enriched)
    }
    setLoading(false)
  }, [householdId, month])

  useEffect(() => { fetch() }, [fetch])

  const total = entries.reduce((s, e) => s + Number(e.amount), 0)

  const byCategory = Object.keys(INCOME_CATEGORIES).map(cat => ({
    category: cat,
    label: INCOME_CATEGORIES[cat as keyof typeof INCOME_CATEGORIES].label,
    color: INCOME_CATEGORIES[cat as keyof typeof INCOME_CATEGORIES].color,
    total: entries.filter(e => e.category === cat).reduce((s, e) => s + Number(e.amount), 0),
  })).filter(c => c.total > 0)

  const byMember = Object.entries(members).map(([userId, name]) => ({
    userId, name,
    total: entries.filter(e => e.user_id === userId).reduce((s, e) => s + Number(e.amount), 0),
  })).filter(m => m.total > 0)

  async function createEntry(data: Omit<IncomeEntry, 'id' | 'household_id' | 'created_at' | 'accounts' | 'member_name'>) {
    const supabase = createClient()
    const { error } = await supabase
      .from('income_entries')
      .insert({ ...data, household_id: householdId })
    if (!error) fetch()
    return { error }
  }

  async function updateEntry(id: string, data: Partial<IncomeEntry>) {
    const supabase = createClient()
    const { error } = await supabase
      .from('income_entries')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (!error) fetch()
    return { error }
  }

  async function deleteEntry(id: string) {
    const supabase = createClient()
    const { error } = await supabase
      .from('income_entries')
      .delete()
      .eq('id', id)
    if (!error) fetch()
    return { error }
  }

  return { entries, loading, error, total, byCategory, byMember, createEntry, updateEntry, deleteEntry, refetch: fetch }
}
