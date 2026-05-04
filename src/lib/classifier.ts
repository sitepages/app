/**
 * classifier.ts
 * Classifica transações e detecta parcelas automaticamente.
 */

import { createClient }           from '@/services/supabase/client'
import type { ParsedTransaction } from './csv-parser'
import { detectInstallment }      from './installment-detector'

export interface CategoryRule {
  id:          string
  keyword:     string
  category_id: string
}

export interface ClassifiedTransaction extends ParsedTransaction {
  category_id:         string | null
  is_fixed:            boolean
  status:              'PAID' | 'PENDING' | 'PLANNED'
  // info de parcela (se detectada)
  installment?: {
    current:          number
    total:            number
    cleanDescription: string
  }
}

const FIXED_KEYWORDS = [
  'aluguel', 'condominio', 'condomínio', 'seguro', 'tokio', 'porto seguro',
  'internet', 'claro', 'vivo', 'tim', 'net ', 'enel', 'cpfl', 'sabesp',
  'comgas', 'comgás', 'academia', 'smartfit', 'netflix', 'spotify',
  'amazon prime', 'disney', 'globoplay', 'previdencia', 'previdência',
  'mensalidade', 'financiamento',
]

function checkIsFixed(description: string): boolean {
  const n = description.toLowerCase()
  return FIXED_KEYWORDS.some(kw => n.includes(kw))
}

export async function fetchCategoryRules(): Promise<CategoryRule[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('category_rules')
    .select('id, keyword, category_id')
  return data ?? []
}

export function classifyOne(description: string, rules: CategoryRule[]): string | null {
  const n = description.toLowerCase().trim()
  for (const rule of rules) {
    if (n.includes(rule.keyword.toLowerCase())) return rule.category_id
  }
  return null
}

export async function classifyTransactions(
  transactions: ParsedTransaction[],
  othersId?: string
): Promise<ClassifiedTransaction[]> {
  const rules = await fetchCategoryRules()

  return transactions.map(tx => {
    // Detecta parcela na descrição
    const installmentInfo = detectInstallment(tx.description)

    // Usa descrição limpa para classificação se for parcela
    const descForClassify = installmentInfo.isInstallment
      ? installmentInfo.cleanDescription
      : tx.description

    const category_id = classifyOne(descForClassify, rules) ?? othersId ?? null
    const is_fixed    = installmentInfo.isInstallment
      ? false   // parcelas são variáveis por natureza
      : checkIsFixed(tx.description)

    return {
      ...tx,
      category_id,
      is_fixed,
      status: 'PAID' as const,
      ...(installmentInfo.isInstallment ? {
        installment: {
          current:          installmentInfo.current,
          total:            installmentInfo.total,
          cleanDescription: installmentInfo.cleanDescription,
        }
      } : {}),
    }
  })
}

export async function fetchOthersCategoryId(): Promise<string | null> {
  const supabase = createClient()
  const { data } = await supabase
    .from('categories').select('id').eq('name', 'Outros').single()
  return data?.id ?? null
}
