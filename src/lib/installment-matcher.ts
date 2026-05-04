/**
 * installment-matcher.ts
 * Serviço que roda após a importação do CSV para:
 * 1. Detectar transações parceladas
 * 2. Fazer matching com planos existentes
 * 3. Criar novo plano, avançar parcela ou marcar para revisão
 */

import { createClient } from '@/services/supabase/client'
import { detectInstallment } from './installment-detector'

export interface MatchResult {
  transactionId:  string
  description:    string
  action:         'created' | 'advanced' | 'needs_review' | 'skipped'
  planId?:        string
  reason?:        string
}

/**
 * Gera a chave única de matching para um plano
 * Formato: "DescricaoLimpa|TotalParcelas|ValorParcela"
 * Ex: "Mercadolivre|10|56.63"
 */
function buildMatchKey(cleanDescription: string, total: number, amount: number): string {
  const desc = cleanDescription.toLowerCase().trim()
  const amt  = Math.round(amount * 100) / 100  // 2 casas decimais
  return `${desc}|${total}|${amt}`
}

/**
 * Processa todas as transações parceladas de uma importação
 * e faz o matching com planos existentes
 */
export async function processInstallments(
  householdId:  string,
  transactions: { id: string; description: string; raw_title: string; amount: number; date: string; competence_month: string }[]
): Promise<MatchResult[]> {
  const supabase = createClient()
  const results: MatchResult[] = []

  // Filtra apenas transações com padrão de parcela
  const installmentTxs = transactions.filter(tx => {
    const info = detectInstallment(tx.description)
    return info.isInstallment
  })

  if (installmentTxs.length === 0) return results

  // Busca todos os planos ativos do household
  const { data: existingPlans } = await supabase
    .from('installment_plans')
    .select('id, match_key, current_installment, total_installments, needs_review')
    .eq('household_id', householdId)
    .eq('is_active', true)

  const plansMap: Record<string, typeof existingPlans> = {}
  existingPlans?.forEach(plan => {
    if (plan.match_key) {
      if (!plansMap[plan.match_key]) plansMap[plan.match_key] = []
      plansMap[plan.match_key]!.push(plan)
    }
  })

  for (const tx of installmentTxs) {
    const info = detectInstallment(tx.description)
    if (!info.isInstallment) continue

    const matchKey     = buildMatchKey(info.cleanDescription, info.total, tx.amount)
    const candidates   = plansMap[matchKey] ?? []

    // ── Cenário 1: Nenhum plano existente → CRIAR ──────────────
    if (candidates.length === 0) {
      const { data: newPlan } = await supabase
        .from('installment_plans')
        .insert({
          household_id:        householdId,
          transaction_id:      tx.id,
          description:         info.cleanDescription,
          total_amount:        info.total * tx.amount,
          installment_amount:  tx.amount,
          total_installments:  info.total,
          current_installment: info.current,
          start_date:          tx.date,
          match_key:           matchKey,
          is_active:           true,
          needs_review:        false,
        })
        .select('id')
        .single()

      if (newPlan) {
        // Registra o pagamento no histórico
        await supabase.from('installment_payments').insert({
          plan_id:            newPlan.id,
          household_id:       householdId,
          transaction_id:     tx.id,
          installment_number: info.current,
          amount:             tx.amount,
          payment_date:       tx.date,
          competence_month:   tx.competence_month,
        })

        results.push({
          transactionId: tx.id,
          description:   info.cleanDescription,
          action:        'created',
          planId:        newPlan.id,
        })

        // Adiciona ao mapa para evitar duplicatas na mesma importação
        plansMap[matchKey] = [{ id: newPlan.id, match_key: matchKey,
          current_installment: info.current, total_installments: info.total, needs_review: false }]
      }
      continue
    }

    // ── Cenário 2: Exatamente 1 plano → AVANÇAR ───────────────
    if (candidates.length === 1) {
      const plan = candidates[0]!

      // Verifica se essa parcela já foi registrada
      const { data: existingPayment } = await supabase
        .from('installment_payments')
        .select('id')
        .eq('plan_id', plan.id)
        .eq('installment_number', info.current)
        .single()

      if (existingPayment) {
        results.push({
          transactionId: tx.id,
          description:   info.cleanDescription,
          action:        'skipped',
          planId:        plan.id,
          reason:        `Parcela ${info.current} já registrada`,
        })
        continue
      }

      // Avança a parcela
      const newCurrent   = Math.max(plan.current_installment, info.current)
      const isCompleted  = newCurrent >= plan.total_installments

      await supabase
        .from('installment_plans')
        .update({
          current_installment: newCurrent,
          is_active:           !isCompleted,
          updated_at:          new Date().toISOString(),
        })
        .eq('id', plan.id)

      // Registra no histórico
      await supabase.from('installment_payments').insert({
        plan_id:            plan.id,
        household_id:       householdId,
        transaction_id:     tx.id,
        installment_number: info.current,
        amount:             tx.amount,
        payment_date:       tx.date,
        competence_month:   tx.competence_month,
      })

      results.push({
        transactionId: tx.id,
        description:   info.cleanDescription,
        action:        'advanced',
        planId:        plan.id,
        reason:        isCompleted ? 'Parcela concluída!' : `Avançou para parcela ${newCurrent}/${plan.total_installments}`,
      })
      continue
    }

    // ── Cenário 3: Múltiplos candidatos → REVISAR ─────────────
    // Marca todos os candidatos para revisão
    for (const plan of candidates) {
      await supabase
        .from('installment_plans')
        .update({
          needs_review:  true,
          review_reason: `Importação de "${info.cleanDescription}" parcela ${info.current}/${info.total} encontrou ${candidates.length} planos compatíveis. Vincule manualmente.`,
          updated_at:    new Date().toISOString(),
        })
        .eq('id', plan.id)
    }

    results.push({
      transactionId: tx.id,
      description:   info.cleanDescription,
      action:        'needs_review',
      reason:        `${candidates.length} planos compatíveis encontrados — revisão manual necessária`,
    })
  }

  return results
}
