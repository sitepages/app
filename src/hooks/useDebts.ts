'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/services/supabase/client'

export interface Debt {
  id:                string
  household_id:      string
  creditor_name:     string
  description:       string
  original_amount:   number
  current_balance:   number
  interest_type:     'NONE' | 'SIMPLE' | 'COMPOUND' | 'PRICE'
  interest_rate:     number
  interest_period:   'MONTHLY' | 'YEARLY'
  start_date:        string
  due_date:          string | null
  next_payment_date: string | null
  payment_amount:    number | null
  account_id:        string | null
  status:            'ACTIVE' | 'PAID' | 'RENEGOTIATED' | 'DEFAULTED'
  notes:             string | null
  created_at:        string
  percent_paid:      number
  total_paid:        number
  accounts:          { name: string } | null
}

export interface DebtPayment {
  id:             string
  debt_id:        string
  payment_date:   string
  amount_paid:    number
  principal_paid: number
  interest_paid:  number
  balance_after:  number
  notes:          string | null
}

export const INTEREST_TYPES = {
  NONE:     { label: 'Sem juros',       color: '#00C47A' },
  SIMPLE:   { label: 'Juros simples',   color: '#F59E0B' },
  COMPOUND: { label: 'Juros compostos', color: '#F97316' },
  PRICE:    { label: 'Tabela Price',    color: '#EF4444' },
}

export const DEBT_STATUS = {
  ACTIVE:       { label: 'Ativa',       color: 'var(--danger)',  bg: 'var(--danger-bg)'  },
  PAID:         { label: 'Quitada',     color: 'var(--success)', bg: 'var(--success-bg)' },
  RENEGOTIATED: { label: 'Renegociada', color: 'var(--warning)', bg: 'var(--warning-bg)' },
  DEFAULTED:    { label: 'Em atraso',   color: '#F97316',        bg: 'rgba(249,115,22,0.1)' },
}

export function useDebts(householdId: string) {
  const [debts, setDebts]     = useState<Debt[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()

    const { data, error } = await supabase
      .from('debts')
      .select('*, accounts(name)')
      .eq('household_id', householdId)
      .order('status')
      .order('next_payment_date', { ascending: true, nullsFirst: false })

    if (error) { setError(error.message); setLoading(false); return }

    const { data: payments } = await supabase
      .from('debt_payments')
      .select('debt_id, amount_paid')
      .eq('household_id', householdId)

    const paidMap: Record<string, number> = {}
    payments?.forEach(p => {
      paidMap[p.debt_id] = (paidMap[p.debt_id] ?? 0) + Number(p.amount_paid)
    })

    const enriched = (data ?? []).map(d => ({
      ...d,
      total_paid:   paidMap[d.id] ?? 0,
      percent_paid: Number(d.original_amount) > 0
        ? Math.round(((paidMap[d.id] ?? 0) / Number(d.original_amount)) * 100)
        : 0,
    }))

    setDebts(enriched)
    setLoading(false)
  }, [householdId])

  useEffect(() => { fetch() }, [fetch])

  const activeDebts   = debts.filter(d => d.status === 'ACTIVE')
  const totalBalance  = activeDebts.reduce((s, d) => s + Number(d.current_balance), 0)
  const totalOriginal = activeDebts.reduce((s, d) => s + Number(d.original_amount), 0)
  const totalPaid     = debts.reduce((s, d) => s + d.total_paid, 0)
  const nextPayment   = activeDebts
    .filter(d => d.next_payment_date)
    .sort((a, b) => (a.next_payment_date ?? '').localeCompare(b.next_payment_date ?? ''))[0]

  async function createDebt(data: any) {
    const supabase = createClient()
    const { error } = await supabase
      .from('debts')
      .insert({ ...data, household_id: householdId })
    if (!error) fetch()
    return { error }
  }

  async function updateDebt(id: string, data: any) {
    const supabase = createClient()
    const { error } = await supabase
      .from('debts')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (!error) fetch()
    return { error }
  }

  async function registerPayment(debtId: string, payment: any) {
    const supabase = createClient()
    const { error } = await supabase
      .from('debt_payments')
      .insert({ ...payment, debt_id: debtId, household_id: householdId })

    if (!error) {
      const newStatus = payment.balance_after <= 0 ? 'PAID' : 'ACTIVE'
      await supabase.from('debts').update({
        current_balance: Math.max(0, payment.balance_after),
        status:          newStatus,
        updated_at:      new Date().toISOString(),
      }).eq('id', debtId)
      fetch()
    }
    return { error }
  }

  async function fetchPayments(debtId: string): Promise<DebtPayment[]> {
    const supabase = createClient()
    const { data } = await supabase
      .from('debt_payments')
      .select('*')
      .eq('debt_id', debtId)
      .order('payment_date', { ascending: false })
    return data ?? []
  }

  return {
    debts, loading, error,
    totalBalance, totalOriginal, totalPaid, nextPayment,
    createDebt, updateDebt, registerPayment, fetchPayments,
    refetch: fetch,
  }
}
