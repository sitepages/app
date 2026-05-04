'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/services/supabase/client'

export type CostPeriod = '3' | '6' | '12'
export type ViewMode   = 'average' | 'month'

export interface CostOfLivingData {
  mode:            ViewMode
  period:          CostPeriod
  selectedMonth:   string | null
  months:          string[]
  totalMonthly:    number
  dailyAverage:    number
  fixedTotal:      number
  variableTotal:   number
  fixedPercent:    number
  variablePercent: number
  fixedItems:      { name: string; amount: number; source: string }[]
  variableItems:   { name: string; amount: number; source: string }[]
  byMonth:         { month: string; total: number; fixed: number; variable: number }[]
  highlightMonth:  string
  cardLabel:       'média mensal' | 'total do mês'
}

function getPreviousMonths(n: number): string[] {
  const months: string[] = []
  const now = new Date()
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  return months
}

export function useCostOfLiving(
  householdId: string,
  period: CostPeriod = '3',
  specificMonth?: string,
) {
  const [data, setData]       = useState<CostOfLivingData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const supabase    = createClient()
    const isMonthMode = !!specificMonth

    // Month mode: 12-month chart, 1-month card. Average mode: period months for both.
    const chartMonths = isMonthMode ? getPreviousMonths(12) : getPreviousMonths(parseInt(period))
    const cardMonths  = isMonthMode ? [specificMonth!] : chartMonths
    const numMonths   = cardMonths.length

    // Include specificMonth in fetch even if it falls outside the 12-month chart window
    const fetchMonths = isMonthMode && !chartMonths.includes(specificMonth!)
      ? [...chartMonths, specificMonth!]
      : chartMonths

    const { data: fixedCosts } = await supabase
      .from('fixed_costs')
      .select('*, categories(name, color)')
      .eq('household_id', householdId)
      .eq('is_active', true)

    const { data: txs } = await supabase
      .from('transactions')
      .select('amount, competence_month')
      .eq('household_id', householdId)
      .eq('transaction_type', 'EXPENSE')
      .is('deleted_at', null)
      .in('competence_month', fetchMonths)

    const { data: vaIncome } = await supabase
      .from('income_entries')
      .select('amount, competence_month')
      .eq('household_id', householdId)
      .eq('category', 'FOOD_CARD')
      .in('competence_month', fetchMonths)

    const cardByMonth: Record<string, number> = {}
    fetchMonths.forEach(m => { cardByMonth[m] = 0 })
    txs?.forEach(tx => {
      if (cardByMonth[tx.competence_month] !== undefined)
        cardByMonth[tx.competence_month] += Math.abs(Number(tx.amount))
    })

    const vaByMonth: Record<string, number> = {}
    fetchMonths.forEach(m => { vaByMonth[m] = 0 })
    vaIncome?.forEach(v => {
      if (vaByMonth[v.competence_month] !== undefined)
        vaByMonth[v.competence_month] += Number(v.amount)
    })

    const manualFixed         = (fixedCosts ?? []).filter(c => c.type === 'FIXED')
    const manualVariable      = (fixedCosts ?? []).filter(c => c.type === 'VARIABLE')
    const fixedManualTotal    = manualFixed.reduce((s, c) => s + Number(c.amount), 0)
    const variableManualTotal = manualVariable.reduce((s, c) => s + Number(c.amount), 0)

    const avgCard = cardMonths.reduce((s, m) => s + (cardByMonth[m] ?? 0), 0) / numMonths
    const avgVA   = cardMonths.reduce((s, m) => s + (vaByMonth[m]  ?? 0), 0) / numMonths

    const fixedTotal    = fixedManualTotal
    const variableTotal = variableManualTotal + avgCard + avgVA
    const totalMonthly  = fixedTotal + variableTotal

    const fixedItems = manualFixed
      .map(c => ({ name: c.name, amount: Number(c.amount), source: 'manual' }))
      .sort((a, b) => b.amount - a.amount)

    const variableItems = [
      ...manualVariable.map(c => ({ name: c.name, amount: Number(c.amount), source: 'manual' })),
      ...(avgCard > 0 ? [{ name: 'Cartão de crédito', amount: avgCard, source: 'card' }] : []),
      ...(avgVA   > 0 ? [{ name: 'Vale Alimentação',  amount: avgVA,   source: 'va'   }] : []),
    ].sort((a, b) => b.amount - a.amount)

    // Chart uses chartMonths only (not the extra specificMonth if outside range)
    const byMonth = chartMonths.map(m => {
      const cardAmt  = cardByMonth[m] ?? 0
      const vaAmt    = vaByMonth[m]   ?? 0
      const variable = variableManualTotal + cardAmt + vaAmt
      return { month: m, total: fixedManualTotal + variable, fixed: fixedManualTotal, variable }
    })

    setData({
      mode:            isMonthMode ? 'month' : 'average',
      period,
      selectedMonth:   specificMonth ?? null,
      months:          chartMonths,
      totalMonthly,
      dailyAverage:    totalMonthly / 30,
      fixedTotal,
      variableTotal,
      fixedPercent:    totalMonthly > 0 ? Math.round((fixedTotal    / totalMonthly) * 100) : 0,
      variablePercent: totalMonthly > 0 ? Math.round((variableTotal / totalMonthly) * 100) : 0,
      fixedItems,
      variableItems,
      byMonth,
      highlightMonth:  isMonthMode ? specificMonth! : chartMonths[chartMonths.length - 1],
      cardLabel:       isMonthMode ? 'total do mês' : 'média mensal',
    })
    setLoading(false)
  }, [householdId, period, specificMonth])

  useEffect(() => { fetchData() }, [fetchData])
  return { data, loading, refetch: fetchData }
}
