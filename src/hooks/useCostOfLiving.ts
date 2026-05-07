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

    const chartMonths = isMonthMode ? getPreviousMonths(12) : getPreviousMonths(parseInt(period))

    const { data: fixedCosts } = await supabase
      .from('fixed_costs')
      .select('*, categories(name, color)')
      .eq('household_id', householdId)
      .eq('is_active', true)

    const manualFixed         = (fixedCosts ?? []).filter(c => c.type === 'FIXED')
    const manualVariable      = (fixedCosts ?? []).filter(c => c.type === 'VARIABLE')
    const fixedManualTotal    = manualFixed.reduce((s, c) => s + Number(c.amount), 0)
    const variableManualTotal = manualVariable.reduce((s, c) => s + Number(c.amount), 0)

    const fixedTotal    = fixedManualTotal
    const variableTotal = variableManualTotal
    const totalMonthly  = fixedTotal + variableTotal

    const fixedItems = manualFixed
      .map(c => ({ name: c.name, amount: Number(c.amount), source: 'manual' }))
      .sort((a, b) => b.amount - a.amount)

    const variableItems = manualVariable
      .map(c => ({ name: c.name, amount: Number(c.amount), source: 'manual' }))
      .sort((a, b) => b.amount - a.amount)

    const byMonth = chartMonths.map(m => ({
      month: m, total: totalMonthly, fixed: fixedManualTotal, variable: variableManualTotal,
    }))

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
    })
    setLoading(false)
  }, [householdId, period, specificMonth])

  useEffect(() => { fetchData() }, [fetchData])
  return { data, loading, refetch: fetchData }
}
