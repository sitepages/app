'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/services/supabase/client'

export interface FixedCost {
  id: string
  household_id: string
  name: string
  amount: number
  category_id: string | null
  type: 'FIXED' | 'VARIABLE'
  is_active: boolean
  notes: string | null
  categories: { name: string; color: string } | null
}

export function useFixedCosts(householdId: string) {
  const [costs, setCosts]     = useState<FixedCost[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('fixed_costs')
      .select('*, categories(name, color)')
      .eq('household_id', householdId)
      .eq('is_active', true)
      .order('type')
      .order('amount', { ascending: false })
    setCosts(data ?? [])
    setLoading(false)
  }, [householdId])

  useEffect(() => { fetch() }, [fetch])

  const fixedTotal    = costs.filter(c => c.type === 'FIXED').reduce((s, c) => s + Number(c.amount), 0)
  const variableItems = costs.filter(c => c.type === 'VARIABLE')

  async function upsert(
    data: Omit<FixedCost, 'id' | 'household_id' | 'categories'>,
    id?: string
  ) {
    const supabase = createClient()
    if (id) {
      await supabase
        .from('fixed_costs')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', id)
    } else {
      await supabase
        .from('fixed_costs')
        .insert({ ...data, household_id: householdId })
    }
    fetch()
  }

  async function remove(id: string) {
    const supabase = createClient()
    await supabase.from('fixed_costs').update({ is_active: false }).eq('id', id)
    fetch()
  }

  return { costs, loading, fixedTotal, variableItems, upsert, remove, refetch: fetch }
}
