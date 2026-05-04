export type ItauEntryType =
  | 'PIX_SENT' | 'PIX_RECEIVED'
  | 'PIX_QR_EXPENSE' | 'PIX_QR_INCOME'
  | 'BOLETO' | 'CARD_PAYMENT'
  | 'SALARY' | 'DIRECT_DEBIT'
  | 'DEBIT_PURCHASE' | 'INTERNAL_TRANSFER'
  | 'UNKNOWN'

export interface ItauEntry {
  date: string
  rawDescription: string
  cleanDescription: string
  entryType: ItauEntryType
  amount: number       // positivo = crédito, negativo = débito
  pixRecipient: string | null
  shouldIgnore: boolean
  ignoreReason: string | null
}

export interface ItauStatement {
  accountHolder: string
  agency: string
  account: string
  periodStart: string
  periodEnd: string
  entries: ItauEntry[]
}

function parseAmount(raw: string): number {
  return parseFloat(raw.replace(/\./g, '').replace(',', '.'))
}

function toISODate(day: string, month: string, year: string): string {
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
}

function extractPixRecipient(rawAfterPrefix: string): string | null {
  // Remove date suffix like "13/04" or "1304" at end of string
  const withoutDate = rawAfterPrefix.replace(/\d{2}\/?\d{2}$/, '').trim()
  if (!withoutDate) return null
  // All digits = CPF/CNPJ, not a name
  if (/^\d+$/.test(withoutDate)) return null
  return withoutDate
}

function classifyEntry(rawDesc: string, amount: number): Pick<ItauEntry, 'entryType' | 'cleanDescription' | 'pixRecipient' | 'shouldIgnore' | 'ignoreReason'> {
  const upper = rawDesc.toUpperCase()

  if (upper.includes('SALDO DO DIA')) {
    return { entryType: 'UNKNOWN', cleanDescription: rawDesc, pixRecipient: null, shouldIgnore: true, ignoreReason: 'Saldo do dia' }
  }

  if (/^TBI\b/.test(upper)) {
    return { entryType: 'INTERNAL_TRANSFER', cleanDescription: 'Transferência interna', pixRecipient: null, shouldIgnore: true, ignoreReason: 'Transferência interna' }
  }

  if (/^PAG BOLETO NU PAGAMENTOS/.test(upper)) {
    return { entryType: 'CARD_PAYMENT', cleanDescription: 'Pagamento fatura cartão', pixRecipient: null, shouldIgnore: true, ignoreReason: 'Pagamento de fatura do cartão' }
  }

  if (/^PIX TRANSF\b/i.test(rawDesc)) {
    const after = rawDesc.substring('PIX TRANSF '.length)
    const recipient = extractPixRecipient(after)
    const label = recipient ?? after.replace(/\d{2}\/?\d{2}$/, '').trim()
    if (amount < 0) {
      return { entryType: 'PIX_SENT', cleanDescription: `Pix - ${label}`, pixRecipient: recipient, shouldIgnore: false, ignoreReason: null }
    }
    return { entryType: 'PIX_RECEIVED', cleanDescription: `Pix recebido - ${label}`, pixRecipient: recipient, shouldIgnore: false, ignoreReason: null }
  }

  if (/^PIX QRS\b/i.test(rawDesc)) {
    const after = rawDesc.substring('PIX QRS '.length)
    const recipient = extractPixRecipient(after)
    const label = recipient ?? after.replace(/\d{2}\/?\d{2}$/, '').trim()
    if (amount < 0) {
      return { entryType: 'PIX_QR_EXPENSE', cleanDescription: `Pix QR - ${label}`, pixRecipient: recipient, shouldIgnore: false, ignoreReason: null }
    }
    return { entryType: 'PIX_QR_INCOME', cleanDescription: `Pix QR recebido - ${label}`, pixRecipient: recipient, shouldIgnore: false, ignoreReason: null }
  }

  if (/^PAG BOLETO\b/i.test(rawDesc)) {
    const after = rawDesc.substring('PAG BOLETO '.length).trim()
    return { entryType: 'BOLETO', cleanDescription: `Boleto - ${after}`, pixRecipient: null, shouldIgnore: false, ignoreReason: null }
  }

  if (/^PAGTO SAL[AÁ]RIO\b/i.test(rawDesc)) {
    return { entryType: 'SALARY', cleanDescription: 'Salário', pixRecipient: null, shouldIgnore: false, ignoreReason: null }
  }

  if (/^PAGTO FER/i.test(rawDesc)) {
    return { entryType: 'SALARY', cleanDescription: 'Férias', pixRecipient: null, shouldIgnore: false, ignoreReason: null }
  }

  if (/^SISDEB\b/i.test(rawDesc)) {
    const after = rawDesc.substring('SISDEB '.length).trim()
    return { entryType: 'DIRECT_DEBIT', cleanDescription: `Débito direto - ${after}`, pixRecipient: null, shouldIgnore: false, ignoreReason: null }
  }

  if (/^RSCSS\b/i.test(rawDesc) || /^RSCCS\b/i.test(rawDesc)) {
    const after = rawDesc.replace(/^RSC[CS]S\s+/i, '').trim()
    return { entryType: 'DEBIT_PURCHASE', cleanDescription: `Compra débito - ${after}`, pixRecipient: null, shouldIgnore: false, ignoreReason: null }
  }

  return { entryType: 'UNKNOWN', cleanDescription: rawDesc, pixRecipient: null, shouldIgnore: false, ignoreReason: null }
}

function parseHeaderInfo(text: string): Pick<ItauStatement, 'accountHolder' | 'agency' | 'account' | 'periodStart' | 'periodEnd'> {
  let accountHolder = ''
  let agency = ''
  let account = ''
  let periodStart = ''
  let periodEnd = ''

  const holderMatch = text.match(/(?:NOME|TITULAR|CORRENTISTA)[:\s]+([A-Z][A-Z\s]{3,}?)(?:\n|AG|AGÊNCIA|AGENCIA|\d)/i)
  if (holderMatch) accountHolder = holderMatch[1].trim()

  const agencyMatch = text.match(/(?:AG\.?|AGÊNCIA|AGENCIA)[:\s]*(\d{4,6})/i)
  if (agencyMatch) agency = agencyMatch[1]

  const accountMatch = text.match(/(?:CC|C\/C|CONTA|CTA)[:\s]+(\d{5,7}-[\dX])/i)
  if (accountMatch) account = accountMatch[1]

  const periodMatch = text.match(/(\d{2})\/(\d{2})\/(\d{4})\s+(?:a|à)\s+(\d{2})\/(\d{2})\/(\d{4})/i)
  if (periodMatch) {
    const [, d1, m1, y1, d2, m2, y2] = periodMatch
    periodStart = `${y1}-${m1}-${d1}`
    periodEnd   = `${y2}-${m2}-${d2}`
  }

  return { accountHolder, agency, account, periodStart, periodEnd }
}

const AMOUNT_RE = /-?\d{1,3}(?:\.\d{3})*,\d{2}/g

export function parseItauPDF(pdfText: string): ItauStatement {
  const header  = parseHeaderInfo(pdfText)
  const entries: ItauEntry[] = []

  for (const line of pdfText.split('\n')) {
    const trimmed = line.trim()

    const dateMatch = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(.+)$/)
    if (!dateMatch) continue

    const [, day, month, year, rest] = dateMatch
    const date = toISODate(day, month, year)

    const amounts = [...rest.matchAll(AMOUNT_RE)]
    if (amounts.length === 0) continue

    // Use the last amount on the line
    const lastMatch = amounts[amounts.length - 1]
    const amount    = parseAmount(lastMatch[0])
    const rawDesc   = rest.substring(0, lastMatch.index).trim()

    if (!rawDesc) continue

    entries.push({
      date,
      rawDescription: rawDesc,
      amount,
      ...classifyEntry(rawDesc, amount),
    })
  }

  // Basic validation: if no entries found with Itaú-like descriptions, the file might not be Itaú
  const hasKnownTypes = entries.some(e =>
    ['PIX_SENT', 'PIX_RECEIVED', 'PIX_QR_EXPENSE', 'PIX_QR_INCOME', 'BOLETO', 'CARD_PAYMENT', 'SALARY', 'DIRECT_DEBIT', 'DEBIT_PURCHASE', 'INTERNAL_TRANSFER']
      .includes(e.entryType)
  )

  if (entries.length > 0 && !hasKnownTypes) {
    // All entries are UNKNOWN — likely not an Itaú statement
    throw new Error('Formato não reconhecido. Suportado: Itaú')
  }

  return { ...header, entries }
}
