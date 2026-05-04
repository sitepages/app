import { classifyOne } from './classifier'
import type { CategoryRule } from './classifier'
import type { ItauEntry, ItauEntryType } from './itau-parser'

export interface StatementPreviewEntry {
  entry: ItauEntry
  category_id: string | null
  isIncome: boolean
  incomeCategory: 'SALARY' | 'OTHER'
  checked: boolean
  duplicate: boolean
}

const INCOME_TYPES: ItauEntryType[] = ['SALARY', 'PIX_RECEIVED', 'PIX_QR_INCOME']

export function classifyStatementEntry(
  entry: ItauEntry,
  rules: CategoryRule[],
  othersId: string | null,
): StatementPreviewEntry {
  const isIncome       = INCOME_TYPES.includes(entry.entryType)
  const incomeCategory: 'SALARY' | 'OTHER' = entry.entryType === 'SALARY' ? 'SALARY' : 'OTHER'

  let category_id: string | null = null

  if (!entry.shouldIgnore && !isIncome) {
    category_id = classifyOne(entry.cleanDescription, rules)

    if (!category_id && entry.entryType === 'BOLETO') {
      const name = entry.cleanDescription.replace(/^Boleto - /i, '')
      category_id = classifyOne(name, rules)
    }

    if (!category_id && entry.pixRecipient) {
      category_id = classifyOne(entry.pixRecipient, rules)
    }

    category_id = category_id ?? othersId
  }

  return {
    entry,
    category_id,
    isIncome,
    incomeCategory,
    checked: !entry.shouldIgnore,
    duplicate: false,
  }
}
