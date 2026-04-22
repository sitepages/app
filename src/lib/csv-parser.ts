/**
 * csv-parser.ts
 * Parser modular para extratos CSV do Nubank.
 *
 * Formato esperado do Nubank:
 *   date,title,amount
 *   2024-01-15,Uber *Trip,25.90
 *   2024-01-14,Ifood*Restaurante,-1.00  (estornos são negativos no Nubank)
 */

import { sanitize } from './sanitizer'

export interface RawNubankRow {
  date:   string
  title:  string
  amount: string
}

export interface ParsedTransaction {
  date:        string   // ISO: "2024-01-15"
  raw_title:   string   // título original
  description: string   // título limpo (pós-sanitização)
  amount:      number   // negativo = gasto, positivo = crédito/estorno
}

export interface ParseResult {
  transactions: ParsedTransaction[]
  errors:       ParseError[]
  total:        number
  skipped:      number
}

export interface ParseError {
  line:    number
  raw:     string
  reason:  string
}

/**
 * Detecta automaticamente o separador do CSV (vírgula ou ponto-e-vírgula)
 */
function detectSeparator(firstLine: string): ',' | ';' {
  const commas    = (firstLine.match(/,/g) || []).length
  const semicolons = (firstLine.match(/;/g) || []).length
  return semicolons > commas ? ';' : ','
}

/**
 * Normaliza data para formato ISO (yyyy-mm-dd)
 * Suporte: "15/01/2024", "2024-01-15", "01/15/2024"
 */
function normalizeDate(raw: string): string | null {
  const cleaned = raw.trim()

  // Já está em ISO
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) return cleaned

  // Formato brasileiro: dd/mm/yyyy
  const brMatch = cleaned.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (brMatch) {
    const [, day, month, year] = brMatch
    return `${year}-${month}-${day}`
  }

  // Formato americano: mm/dd/yyyy
  const usMatch = cleaned.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (usMatch) {
    const [, month, day, year] = usMatch
    return `${year}-${month}-${day}`
  }

  return null
}

/**
 * Normaliza valor monetário para número
 * Suporte: "25.90", "25,90", "-25.90", "R$ 25,90"
 */
function normalizeAmount(raw: string): number | null {
  const cleaned = raw
    .trim()
    .replace(/R\$\s?/g, '')   // Remove "R$"
    .replace(/\./g, '')        // Remove separador de milhar (ponto)
    .replace(',', '.')         // Troca vírgula decimal por ponto

  const value = parseFloat(cleaned)
  return isNaN(value) ? null : value
}

/**
 * Faz o parse de uma string CSV completa
 */
export function parseNubankCSV(csvContent: string): ParseResult {
  const lines  = csvContent.split('\n').map(l => l.trim()).filter(Boolean)
  const errors: ParseError[] = []
  const transactions: ParsedTransaction[] = []

  if (lines.length < 2) {
    return { transactions: [], errors: [{ line: 0, raw: '', reason: 'Arquivo vazio ou sem dados.' }], total: 0, skipped: 0 }
  }

  const separator = detectSeparator(lines[0])
  const header    = lines[0].toLowerCase().split(separator).map(h => h.trim().replace(/"/g, ''))

  // Valida colunas obrigatórias
  const dateIdx   = header.findIndex(h => h === 'date')
  const titleIdx  = header.findIndex(h => h === 'title')
  const amountIdx = header.findIndex(h => h === 'amount')

  if (dateIdx === -1 || titleIdx === -1 || amountIdx === -1) {
    return {
      transactions: [],
      errors: [{
        line: 1,
        raw:  lines[0],
        reason: `Colunas esperadas: date, title, amount. Encontradas: ${header.join(', ')}`
      }],
      total:   0,
      skipped: 0,
    }
  }

  let skipped = 0

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    if (!line) continue

    // Suporte a campos com aspas: "Uber ""Trip"""
    const cols = line.match(/(".*?"|[^,;]+)(?=[,;]|$)/g)?.map(c =>
      c.trim().replace(/^"|"$/g, '').replace(/""/g, '"')
    ) ?? line.split(separator)

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

    transactions.push({
      date,
      raw_title:   rawTitle.trim(),
      description: sanitize(rawTitle.trim()),
      amount,
    })
  }

  return {
    transactions,
    errors,
    total:   transactions.length,
    skipped,
  }
}

/**
 * Lê um File do browser e retorna o ParseResult
 */
export async function parseNubankFile(file: File): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload  = e => resolve(parseNubankCSV(e.target?.result as string))
    reader.onerror = () => reject(new Error('Erro ao ler o arquivo.'))
    reader.readAsText(file, 'UTF-8')
  })
}
