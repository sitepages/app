/**
 * sanitizer.ts
 * Motor de limpeza de títulos brutos do extrato bancário.
 * Cada etapa é isolada e testável individualmente.
 */

// Palavras genéricas de sufixo que aparecem nos extratos
const NOISE_WORDS = [
  'trip', 'help', 'pay', 'payments', 'store', 'honest',
  'tecnologia', 'servicos', 'serviços', 'ltda', 'eireli',
  'me', 's.a', 'sa', 'epp', 'comercio', 'comércio',
]

/**
 * Etapa 1: Remove códigos alfanuméricos de rastreamento bancário
 * Ex: "Tokio Marine*Auto09d12" → "Tokio Marine*Auto"
 * Ex: "IFood*12AB3456" → "IFood*"
 */
function removeTrackingCodes(raw: string): string {
  return raw
    .replace(/\b[A-Z0-9]{2,}\d{3,}[A-Z0-9]*\b/gi, '')  // Códigos mistos terminando em números
    .replace(/\b\d{4,}[a-z0-9]*\b/gi, '')                // Só números + letras finais
    .trim()
}

/**
 * Etapa 2: Substitui asteriscos por espaço e normaliza
 * Ex: "Tokio Marine*Auto" → "Tokio Marine Auto"
 */
function replaceAsterisks(raw: string): string {
  return raw.replace(/\*/g, ' ')
}

/**
 * Etapa 3: Remove palavras de ruído (sufixos genéricos bancários)
 * Ex: "Uber Trip Help" → "Uber"
 */
function removeNoiseWords(raw: string): string {
  const pattern = new RegExp(
    `\\b(${NOISE_WORDS.join('|')})\\b.*$`,
    'gi'
  )
  return raw.replace(pattern, '').trim()
}

/**
 * Etapa 4: Remove nomes duplicados consecutivos
 * Ex: "Uber Uber" → "Uber"
 */
function removeDuplicateWords(raw: string): string {
  const words = raw.split(/\s+/)
  const deduped: string[] = []
  for (let i = 0; i < words.length; i++) {
    if (i === 0 || words[i].toLowerCase() !== words[i - 1].toLowerCase()) {
      deduped.push(words[i])
    }
  }
  return deduped.join(' ')
}

/**
 * Etapa 5: Capitaliza cada palavra (Title Case)
 * Ex: "tokio marine auto" → "Tokio Marine Auto"
 */
function toTitleCase(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/\b\w/g, char => char.toUpperCase())
}

/**
 * Etapa 6: Normaliza espaços múltiplos e remove caracteres especiais residuais
 */
function normalizeSpaces(raw: string): string {
  return raw
    .replace(/[^a-zA-ZÀ-ÿ0-9\s\-&]/g, ' ')  // Remove caracteres especiais exceto - e &
    .replace(/\s{2,}/g, ' ')                   // Múltiplos espaços → um espaço
    .trim()
}

/**
 * Função principal: aplica todas as etapas em sequência
 *
 * Exemplos:
 *   sanitize("Uber Uber *Trip Help.U")     → "Uber"
 *   sanitize("Tokio Marine*Auto09d12")     → "Tokio Marine Auto"
 *   sanitize("Condo Store Honest")         → "Condo"
 *   sanitize("Ifood*Restaurante 12345abc") → "Ifood Restaurante"
 */
export function sanitize(rawTitle: string): string {
  let result = rawTitle

  result = removeTrackingCodes(result)
  result = replaceAsterisks(result)
  result = removeNoiseWords(result)
  result = removeDuplicateWords(result)
  result = normalizeSpaces(result)
  result = toTitleCase(result)

  // Fallback: se ficou vazio, retorna título original capitalizado
  if (!result.trim()) {
    return toTitleCase(rawTitle.replace(/\*/g, ' ').trim())
  }

  return result
}

// Exporta etapas individuais para testes unitários
export const _steps = {
  removeTrackingCodes,
  replaceAsterisks,
  removeNoiseWords,
  removeDuplicateWords,
  toTitleCase,
  normalizeSpaces,
}
