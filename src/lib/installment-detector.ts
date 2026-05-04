/**
 * installment-detector.ts
 * Detecta automaticamente transações parceladas no CSV do Nubank.
 *
 * Padrões reconhecidos:
 *   "Mercadolivre - Parcela 3/10"
 *   "Amazon - Parcela 4/4"
 *   "Clinica - Parcela 3/6"
 *   "Shopee *Produto - Parcela 2/2"
 */

export interface InstallmentInfo {
  isInstallment:      boolean
  current:            number
  total:              number
  cleanDescription:   string  // sem o sufixo "- Parcela X/Y"
}

/**
 * Detecta se uma descrição contém informação de parcela
 */
export function detectInstallment(description: string): InstallmentInfo {
  // Padrão: "- Parcela X/Y" ou "- Parcela X Y" (com ou sem barra)
  const pattern = /[-–]\s*parcela\s+(\d+)[\/\s](\d+)\s*$/i
  const match   = description.match(pattern)

  if (!match) {
    return { isInstallment: false, current: 0, total: 0, cleanDescription: description }
  }

  const current = parseInt(match[1])
  const total   = parseInt(match[2])

  // Remove o sufixo de parcela da descrição
  const cleanDescription = description.replace(pattern, '').trim()

  return {
    isInstallment: true,
    current,
    total,
    cleanDescription,
  }
}

/**
 * Calcula parcelas restantes e valor comprometido
 */
export function calcRemainingInstallments(current: number, total: number, amount: number) {
  const remaining      = total - current
  const committedValue = remaining * amount
  return { remaining, committedValue }
}
