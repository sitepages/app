/**
 * classifier.ts
 * Classifica transações automaticamente cruzando descrições
 * com a tabela category_rules do Supabase.
 */

import { createClient } from '@/services/supabase/client'
import type { ParsedTransaction } from './csv-parser'

export interface CategoryRule {
  id:          string
  keyword:     string
  category_id: string
}

export interface ClassifiedTransaction extends ParsedTransaction {
  category_id: string | null   // null = não classificado (vai para "Outros")
  status:      'PAID' | 'PENDING' | 'PLANNED'
}

/**
 * Busca todas as regras de classificação do banco.
 * Faz isso uma única vez e reutiliza no batch.
 */
export async function fetchCategoryRules(): Promise<CategoryRule[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('category_rules')
    .select('id, keyword, category_id')
    .order('keyword')

  if (error) {
    console.error('[classifier] Erro ao buscar regras:', error.message)
    return []
  }

  return data ?? []
}

/**
 * Classifica uma única descrição contra a lista de regras.
 * Retorna o category_id da primeira regra que der match (case-insensitive).
 */
export function classifyOne(
  description: string,
  rules: CategoryRule[]
): string | null {
  const normalized = description.toLowerCase().trim()

  for (const rule of rules) {
    if (normalized.includes(rule.keyword.toLowerCase())) {
      return rule.category_id
    }
  }

  return null
}

/**
 * Classifica um batch de transações usando as regras do banco.
 * Busca as regras uma vez e aplica em todas.
 */
export async function classifyTransactions(
  transactions: ParsedTransaction[],
  othersId?: string   // ID da categoria "Outros" para fallback
): Promise<ClassifiedTransaction[]> {
  const rules = await fetchCategoryRules()

  return transactions.map(tx => {
    const category_id = classifyOne(tx.description, rules) ?? othersId ?? null

    // Transações com valor positivo = crédito/estorno → status diferente
    const status: 'PAID' | 'PENDING' | 'PLANNED' =
      tx.amount > 0 ? 'PAID' : 'PAID'

    return {
      ...tx,
      category_id,
      status,
    }
  })
}

/**
 * Busca o ID da categoria "Outros" para usar como fallback.
 */
export async function fetchOthersCategoryId(): Promise<string | null> {
  const supabase = createClient()
  const { data } = await supabase
    .from('categories')
    .select('id')
    .eq('name', 'Outros')
    .single()

  return data?.id ?? null
}
