/**
 * csv-parser.ts
 * Parser modular para extratos CSV do Nubank.
 *
 * LÓGICA DE VALORES DO NUBANK:
 *   Positivo  (+11.71)   = GASTO (compra, débito no cartão)
 *   Negativo  (-1951.98) = PAGAMENTO DA FATURA (crédito, entrada)
 *
 * No sistema interno:
 *   EXPENSE = gasto  → amount positivo
 *   INCOME  = entrada → amount positivo
 *   O sinal fica implícito no transaction_type
 */

import { sanitize } from './sanitizer'

export interface ParsedTransaction {
  date:             string
  competence_month: string
  raw_title:        string
  description:      string
  amount:           number           // sempre positivo — sinal vem do transaction_type
  transaction_type: 'EXPENSE' | 'INCOME'
}

export interface ParseResult {
  transactions: ParsedTransaction[]
  errors:       ParseError[]
  total:        number
  skipped:      number
}

export interface ParseError {
  line:   number
  raw:    string
  reason: string
}

function detectSeparator(firstLine: string): ',' | ';' {
  const commas     = (firstLine.match(/,/g)  || []).length
  const semicolons = (firstLine.match(/;/g)  || []).length
  return semicolons > commas ? ';' : ','
}

function normalizeDate(raw: string): string | null {
  const cleaned = raw.trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) return cleaned
  const brMatch = cleaned.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (brMatch) {
    const [, day, month, year] = brMatch
    return `${year}-${month}-${day}`
  }
  return null
}

function toCompetenceMonth(isoDate: string): string {
  return isoDate.slice(0, 7)
}

/**
 * Normaliza valor — CSV do Nubank usa ponto como decimal: "11.71", "-1951.98"
 * Retorna o número COM sinal original preservado.
 */
function normalizeAmount(raw: string): number | null {
  const cleaned = raw.trim().replace(/R\$\s?/g, '').replace(/\s/g, '')

  let normalized: string

  if (cleaned.includes(',') && cleaned.includes('.')) {
    // Formato BR com milhar: "1.171,00" → remove ponto, troca vírgula
    normalized = cleaned.replace(/\./g, '').replace(',', '.')
  } else if (cleaned.includes(',')) {
    // Só vírgula decimal: "11,71"
    normalized = cleaned.replace(',', '.')
  } else {
    // Padrão Nubank: "11.71" ou "-1951.98"
    normalized = cleaned
  }

  const value = parseFloat(normalized)
  return isNaN(value) ? null : value
}

export function parseNubankCSV(csvContent: string): ParseResult {
  const lines  = csvContent.split('\n').map(l => l.trim()).filter(Boolean)
  const errors: ParseError[] = []
  const transactions: ParsedTransaction[] = []

  if (lines.length < 2) {
    return {
      transactions: [],
      errors: [{ line: 0, raw: '', reason: 'Arquivo vazio ou sem dados.' }],
      total: 0, skipped: 0,
    }
  }

  const separator = detectSeparator(lines[0])
  const header    = lines[0].toLowerCase().split(separator).map(h => h.trim().replace(/"/g, ''))

  const dateIdx   = header.findIndex(h => h === 'date')
  const titleIdx  = header.findIndex(h => h === 'title')
  const amountIdx = header.findIndex(h => h === 'amount')

  if (dateIdx === -1 || titleIdx === -1 || amountIdx === -1) {
    return {
      transactions: [],
      errors: [{ line: 1, raw: lines[0], reason: `Colunas esperadas: date, title, amount. Encontradas: ${header.join(', ')}` }],
      total: 0, skipped: 0,
    }
  }

  let skipped = 0

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    if (!line) continue

    const cols = line.split(separator).map(c =>
      c.trim().replace(/^"|"$/g, '').replace(/""/g, '"')
    )

    if (cols.length < 3) {
      errors.push({ line: i + 1, raw: line, reason: 'Número de colunas insuficiente.' })
      skipped++
      continue
    }

    const rawDate   = cols[dateIdx]   ?? ''
    const rawTitle  = cols[titleIdx]  ?? ''
    const rawAmount = cols[amountIdx] ?? ''

    const date   = normalizeDate(rawDate)
    const amount = normalizeAmount(rawAmount)

    if (!date) {
      errors.push({ line: i + 1, raw: line, reason: `Data inválida: "${rawDate}"` })
      skipped++
      continue
    }

    if (amount === null) {
      errors.push({ line: i + 1, raw: line, reason: `Valor inválido: "${rawAmount}"` })
      skipped++
      continue
    }

    if (!rawTitle.trim()) {
      errors.push({ line: i + 1, raw: line, reason: 'Título vazio.' })
      skipped++
      continue
    }

    // ── LÓGICA NUBANK ──────────────────────────────────────────
    // Positivo = gasto (compra, débito)  → EXPENSE
    // Negativo = pagamento/crédito       → INCOME
    //   Ex: "Pagamento recebido" = -1951.98 → INCOME
    //   Ex: "Uber" = +11.71 → EXPENSE
    // ───────────────────────────────────────────────────────────
    const transaction_type: 'EXPENSE' | 'INCOME' = amount >= 0 ? 'EXPENSE' : 'INCOME'

    transactions.push({
      date,
      competence_month: toCompetenceMonth(date),
      raw_title:        rawTitle.trim(),
      description:      sanitize(rawTitle.trim()),
      amount:           Math.abs(amount), // sempre positivo no sistema
      transaction_type,
    })
  }

  return { transactions, errors, total: transactions.length, skipped }
}

export async function parseNubankFile(file: File): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload  = e => resolve(parseNubankCSV(e.target?.result as string))
    reader.onerror = () => reject(new Error('Erro ao ler o arquivo.'))
    reader.readAsText(file, 'UTF-8')
  })
}
