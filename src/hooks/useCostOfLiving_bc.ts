'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/services/supabase/client'

export type CostPeriod = '1' | '3' | '6' | '12'

export interface CostOfLivingData {
  period:          CostPeriod
  months:          string[]          // meses do período ex: ["2026-01","2026-02","2026-03"]
  totalMonthly:    number            // média mensal total
  dailyAverage:    number            // custo diário médio
  fixedTotal:      number            // média fixo/mês
  variableTotal:   number            // média variável/mês
  fixedPercent:    number
  variablePercent: number

  // por categoria
  byCategory: {
    name:    string
    color:   string
    total:   number                  // média mensal
    percent: number
    isFixed: boolean
  }[]

  // por pessoa
  byMember: {
    name:   string
    userId: string
    total:  number
    percent: number
  }[]

  // por mês (para o gráfico de tendência)
  byMonth: {
    month:    string
    total:    number
    fixed:    number
    variable: number
  }[]

  // composição detalhada
  fixedItems:    CostItem[]
  variableItems: CostItem[]
}

export interface CostItem {
  name:   string
  amount: number
  source: 'card' | 'installment' | 'debt' | 'va'
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

export function useCostOfLiving(householdId: string, period: CostPeriod = '3') {
  const [data, setData]       = useState<CostOfLivingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    const supabase  = createClient()
    const months    = getPreviousMonths(parseInt(period))
    const numMonths = months.length

    // 1. Membros
    const { data: members } = await supabase
      .from('household_members')
      .select('user_id, display_name')
      .eq('household_id', householdId)
    const memberMap: Record<string, string> = {}
    members?.forEach(m => { memberMap[m.user_id] = m.display_name })

    // 2. Transações do período
    const { data: txs } = await supabase
      .from('transactions')
      .select('amount, transaction_type, is_fixed, imported_by, competence_month, category_id, categories(name, color)')
      .eq('household_id', householdId)
      .eq('transaction_type', 'EXPENSE')
      .is('deleted_at', null)
      .in('competence_month', months)

    // 3. Parcelas ativas (comprometido/mês)
    const { data: installments } = await supabase
      .from('installment_plans')
      .select('installment_amount, description, category_id')
      .eq('household_id', householdId)
      .eq('is_active', true)

    // 4. Dívidas ativas (parcela/mês)
    const { data: debts } = await supabase
      .from('debts')
      .select('payment_amount, description, creditor_name')
      .eq('household_id', householdId)
      .eq('status', 'ACTIVE')
      .not('payment_amount', 'is', null)

    // 5. VA recebido no período (como custo)
    const { data: vaIncome } = await supabase
      .from('income_entries')
      .select('amount, competence_month')
      .eq('household_id', householdId)
      .eq('category', 'FOOD_CARD')
      .in('competence_month', months)

    // ── Cálculos ──────────────────────────────────────────────────

    // Gastos do cartão agrupados por mês
    const byMonthMap: Record<string, { total: number; fixed: number; variable: number }> = {}
    months.forEach(m => { byMonthMap[m] = { total: 0, fixed: 0, variable: 0 } })

    const catMap: Record<string, { name: string; color: string; total: number; fixed: boolean }> = {}
    const memberTotals: Record<string, number> = {}

    let cardFixed    = 0
    let cardVariable = 0

    txs?.forEach(tx => {
      const amt  = Math.abs(Number(tx.amount))
      const month = tx.competence_month
      if (byMonthMap[month]) {
        byMonthMap[month].total += amt
        if (tx.is_fixed) byMonthMap[month].fixed    += amt
        else             byMonthMap[month].variable += amt
      }
      if (tx.is_fixed) cardFixed    += amt
      else             cardVariable += amt

      // Por categoria
      const cat   = (tx.categories as any)
      const cname = cat?.name  ?? 'Sem categoria'
      const color = cat?.color ?? '#6B7280'
      if (!catMap[cname]) catMap[cname] = { name: cname, color, total: 0, fixed: !!tx.is_fixed }
      catMap[cname].total += amt

      // Por membro
      const uid = tx.imported_by ?? 'unknown'
      memberTotals[uid] = (memberTotals[uid] ?? 0) + amt
    })

    // Médias mensais do cartão
    const avgCardFixed    = cardFixed    / numMonths
    const avgCardVariable = cardVariable / numMonths

    // Parcelas: fixo por definição
    const avgInstallments = (installments ?? [])
      .reduce((s, i) => s + Number(i.installment_amount), 0)

    // Dívidas: fixo por definição
    const avgDebts = (debts ?? [])
      .reduce((s, d) => s + Number(d.payment_amount), 0)

    // VA: variável (alimentação)
    const avgVA = (vaIncome ?? [])
      .reduce((s, v) => s + Number(v.amount), 0) / numMonths

    const fixedTotal    = avgCardFixed + avgInstallments + avgDebts
    const variableTotal = avgCardVariable + avgVA
    const totalMonthly  = fixedTotal + variableTotal

    // Composição detalhada
    const fixedItems: CostItem[] = []
    const variableItems: CostItem[] = []

    // Categorias fixas do cartão
    Object.values(catMap).forEach(cat => {
      const avgAmt = cat.total / numMonths
      if (cat.fixed) fixedItems.push({ name: cat.name, amount: avgAmt, source: 'card' })
      else           variableItems.push({ name: cat.name, amount: avgAmt, source: 'card' })
    })

    // Parcelas
    installments?.forEach(i => {
      fixedItems.push({ name: i.description, amount: Number(i.installment_amount), source: 'installment' })
    })

    // Dívidas
    debts?.forEach(d => {
      fixedItems.push({ name: `${d.description} (${d.creditor_name})`, amount: Number(d.payment_amount), source: 'debt' })
    })

    // VA
    if (avgVA > 0) {
      variableItems.push({ name: 'Vale Alimentação', amount: avgVA, source: 'va' })
    }

    // Ordenar por valor decrescente
    fixedItems.sort((a, b) => b.amount - a.amount)
    variableItems.sort((a, b) => b.amount - a.amount)

    // Por categoria (média mensal)
    const byCategory = Object.values(catMap)
      .map(cat => ({
        name:    cat.name,
        color:   cat.color,
        total:   cat.total / numMonths,
        percent: totalMonthly > 0 ? Math.round((cat.total / numMonths / totalMonthly) * 100) : 0,
        isFixed: cat.fixed,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8)

    // Por membro (média mensal)
    const byMember = Object.entries(memberTotals).map(([userId, total]) => ({
      userId,
      name:    memberMap[userId] ?? '—',
      total:   total / numMonths,
      percent: totalMonthly > 0 ? Math.round((total / numMonths / totalMonthly) * 100) : 0,
    }))

    // Por mês
    const byMonth = months.map(m => ({
      month:    m,
      total:    byMonthMap[m].total,
      fixed:    byMonthMap[m].fixed,
      variable: byMonthMap[m].variable,
    }))

    setData({
      period, months,
      totalMonthly,
      dailyAverage: totalMonthly / 30,
      fixedTotal, variableTotal,
      fixedPercent:    totalMonthly > 0 ? Math.round((fixedTotal    / totalMonthly) * 100) : 0,
      variablePercent: totalMonthly > 0 ? Math.round((variableTotal / totalMonthly) * 100) : 0,
      byCategory, byMember, byMonth,
      fixedItems, variableItems,
    })
    setLoading(false)
  }, [householdId, period])

  useEffect(() => { fetch() }, [fetch])

  return { data, loading, error, refetch: fetch }
}
