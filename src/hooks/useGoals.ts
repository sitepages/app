import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/services/supabase/client'

export interface SavingsGoal {
  id:             string
  household_id:   string
  name:           string
  target_amount:  number
  current_amount: number
  target_date:    string | null
  account_id:     string | null
  is_completed:   boolean
  notes:          string | null
  created_at:     string
  updated_at:     string
}

export function useGoals(householdId: string) {
  const [goals, setGoals]   = useState<SavingsGoal[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('savings_goals')
      .select('*')
      .eq('household_id', householdId)
      .order('is_completed', { ascending: true })
      .order('created_at', { ascending: false })
    setGoals(data ?? [])
    setLoading(false)
  }, [householdId])

  useEffect(() => { fetch() }, [fetch])

  async function createGoal(input: Omit<SavingsGoal, 'id' | 'household_id' | 'is_completed' | 'created_at' | 'updated_at'>) {
    const { error } = await supabase.from('savings_goals').insert({
      ...input,
      household_id: householdId,
      is_completed: false,
    })
    if (!error) await fetch()
    return { error }
  }

  async function updateGoal(id: string, patch: Partial<SavingsGoal>) {
    const { error } = await supabase
      .from('savings_goals')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (!error) await fetch()
    return { error }
  }

  async function deleteGoal(id: string) {
    const { error } = await supabase.from('savings_goals').delete().eq('id', id)
    if (!error) await fetch()
    return { error }
  }

  async function addProgress(id: string, amount: number) {
    const goal = goals.find(g => g.id === id)
    if (!goal) return { error: 'Meta não encontrada' }
    const newAmount = Math.min(goal.current_amount + amount, goal.target_amount)
    const isCompleted = newAmount >= goal.target_amount
    return updateGoal(id, { current_amount: newAmount, is_completed: isCompleted })
  }

  // Cálculos auxiliares
  function getMonthsLeft(targetDate: string | null): number | null {
    if (!targetDate) return null
    const now  = new Date()
    const end  = new Date(targetDate)
    const diff = (end.getFullYear() - now.getFullYear()) * 12 + (end.getMonth() - now.getMonth())
    return Math.max(diff, 0)
  }

  function getMonthlySavings(goal: SavingsGoal): number | null {
    const months = getMonthsLeft(goal.target_date)
    if (months === null || months === 0) return null
    const remaining = goal.target_amount - goal.current_amount
    return Math.max(remaining / months, 0)
  }

  function getProgress(goal: SavingsGoal): number {
    if (goal.target_amount === 0) return 0
    return Math.min((goal.current_amount / goal.target_amount) * 100, 100)
  }

  return {
    goals, loading,
    createGoal, updateGoal, deleteGoal, addProgress,
    getMonthsLeft, getMonthlySavings, getProgress,
    refetch: fetch,
  }
}
