'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/services/supabase/client'

export interface InstallmentPlan {
  id:                  string
  household_id:        string
  transaction_id:      string | null
  description:         string
  total_amount:        number
  installment_amount:  number
  total_installments:  number
  current_installment: number
  start_date:          string
  account_id:          string | null
  category_id:         string | null
  is_active:           boolean
  created_at:          string
  // calculados
  remaining_installments: number
  committed_value:        number
  paid_installments:      number
  percent_paid:           number
  // joined
  categories:  { name: string; color: string } | null
  accounts:    { name: string } | null
}

export function useInstallments(householdId: string) {
  const [plans, setPlans]         = useState<InstallmentPlan[]>([])
  const [completed, setCompleted] = useState<InstallmentPlan[]>([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()

    const { data, error } = await supabase
      .from('installment_plans')
      .select('*, categories(name, color), accounts(name)')
      .eq('household_id', householdId)
      .order('created_at', { ascending: false })

    if (error) { setError(error.message); setLoading(false); return }

    const enrich = (p: any) => {
      const remaining = p.total_installments - p.current_installment
      const committed = remaining * Number(p.installment_amount)
      const paid      = p.current_installment - 1
      const percent   = Math.round((paid / p.total_installments) * 100)
      return { ...p, remaining_installments: remaining, committed_value: committed,
               paid_installments: paid, percent_paid: percent }
    }

    const all = (data ?? []).map(enrich)
    setPlans(all.filter(p => p.is_active))
    setCompleted(all.filter(p => !p.is_active))
    setLoading(false)
  }, [householdId])

  useEffect(() => { fetch() }, [fetch])

  // Total comprometido em todas as parcelas ativas
  const totalCommitted = plans.reduce((s, p) => s + p.committed_value, 0)

  // Projeção mês a mês (próximos 12 meses)
  function getMonthlyProjection(): { month: string; total: number }[] {
    const projection: Record<string, number> = {}
    const today = new Date()

    plans.forEach(plan => {
      const startDate = new Date(plan.start_date)
      // Estima o mês da parcela atual
      const currentMonthDate = new Date(startDate)
      currentMonthDate.setMonth(startDate.getMonth() + (plan.current_installment - 1))

      // Projeta as parcelas restantes
      for (let i = 0; i < plan.remaining_installments; i++) {
        const futureDate = new Date(currentMonthDate)
        futureDate.setMonth(currentMonthDate.getMonth() + i + 1)

        const monthKey = `${futureDate.getFullYear()}-${String(futureDate.getMonth() + 1).padStart(2, '0')}`
        projection[monthKey] = (projection[monthKey] ?? 0) + Number(plan.installment_amount)
      }
    })

    // Retorna próximos 6 meses ordenados
    return Object.entries(projection)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(0, 6)
      .map(([month, total]) => ({ month, total }))
  }

  async function createPlan(data: Omit<InstallmentPlan, 'id' | 'household_id' | 'created_at' | 'remaining_installments' | 'committed_value' | 'paid_installments' | 'percent_paid' | 'categories' | 'accounts'>) {
    const supabase = createClient()
    const { error } = await supabase
      .from('installment_plans')
      .insert({ ...data, household_id: householdId })
    if (!error) fetch()
    return { error }
  }

  async function updatePlan(id: string, data: Partial<InstallmentPlan>) {
    const supabase = createClient()
    const { error } = await supabase
      .from('installment_plans')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (!error) fetch()
    return { error }
  }

  async function reactivatePlan(id: string) {
    const supabase = createClient()
    const { error } = await supabase
      .from('installment_plans')
      .update({ is_active: true, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (!error) fetch()
    return { error }
  }

  async function updateInstallment(id: string, current_installment: number) {
    const supabase = createClient()
    const { error } = await supabase
      .from('installment_plans')
      .update({ current_installment, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (!error) fetch()
    return { error }
  }

  async function closePlan(id: string) {
    const supabase = createClient()
    const { error } = await supabase
      .from('installment_plans')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (!error) fetch()
    return { error }
  }

  async function deletePlan(id: string) {
    const supabase = createClient()
    const { error } = await supabase.from('installment_plans').delete().eq('id', id)
    if (!error) fetch()
    return { error }
  }

  return {
    plans, completedPlans: completed, loading, error,
    totalCommitted,
    getMonthlyProjection,
    createPlan, updatePlan, updateInstallment, closePlan, reactivatePlan, deletePlan,
    refetch: fetch,
  }
}

/**
 * Busca o histórico de pagamentos de um plano específico
 */
export async function fetchInstallmentPayments(planId: string) {
  const supabase = createClient()
  const { data } = await supabase
    .from('installment_payments')
    .select('id, installment_number, amount, payment_date, competence_month')
    .eq('plan_id', planId)
    .order('installment_number', { ascending: true })
  return data ?? []
}

/**
 * Vincula manualmente uma transação a um plano (resolve needs_review)
 */
export async function linkTransactionToPlan(planId: string, transactionId: string, installmentNumber: number, amount: number, date: string, competenceMonth: string, householdId: string) {
  const supabase = createClient()

  // Registra o pagamento
  await supabase.from('installment_payments').insert({
    plan_id: planId, household_id: householdId,
    transaction_id: transactionId, installment_number: installmentNumber,
    amount, payment_date: date, competence_month: competenceMonth,
  })

  // Remove o flag de revisão e avança a parcela
  const { data: plan } = await supabase
    .from('installment_plans').select('current_installment, total_installments').eq('id', planId).single()

  if (plan) {
    const newCurrent  = Math.max(plan.current_installment, installmentNumber)
    const isCompleted = newCurrent >= plan.total_installments
    await supabase.from('installment_plans').update({
      current_installment: newCurrent, needs_review: false,
      review_reason: null, is_active: !isCompleted,
      updated_at: new Date().toISOString(),
    }).eq('id', planId)
  }
}
