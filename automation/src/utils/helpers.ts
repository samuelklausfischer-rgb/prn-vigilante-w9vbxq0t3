/**
 * Utilitários comuns da automação.
 */

/** Pausa a execução por X milissegundos */
export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/** Gera um delay aleatório entre min e max segundos (anti-ban) */
export function randomDelay(minSeconds: number, maxSeconds: number): number {
  return Math.floor(Math.random() * (maxSeconds - minSeconds + 1) + minSeconds) * 1000
}

/** Formata um timestamp legível para os logs */
export function timestamp(): string {
  return new Date().toLocaleTimeString('pt-BR', { hour12: false })
}

/** Serializa erros para logs estruturados */
export function serializeError(error: unknown) {
  if (error instanceof Error) {
    const extra = error as Error & { status?: number; body?: unknown; cause?: unknown }
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      status: extra.status,
      body: extra.body,
      cause: extra.cause,
    }
  }

  return {
    value: error,
  }
}

/** Mascara telefone para logs LGPD */
export function maskPhone(phone: string): string {
  const clean = phone.replace(/\D/g, '')
  if (clean.length <= 4) return clean
  const start = clean.slice(0, Math.min(4, clean.length))
  const end = clean.slice(-4)
  return `${start}${'*'.repeat(Math.max(0, clean.length - start.length - end.length))}${end}`
}

/** Hash simples para rastreabilidade sem expor nome */
export async function hashText(value: string): Promise<string> {
  const encoded = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest('SHA-256', encoded)
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

/** Calcula delay com jitter exponencial */
export function exponentialBackoffDelay(attempt: number, baseMs = 1000, maxMs = 30000): number {
  const raw = Math.min(baseMs * 2 ** Math.max(0, attempt - 1), maxMs)
  const jitter = Math.floor(Math.random() * 250)
  return raw + jitter
}

/** Gera id estável de worker */
export function createWorkerId(workerName: string): string {
  return `${workerName}-${process.pid}`
}

/**
 * Força o formato de 9 dígitos para um número brasileiro.
 * Ex: 556581112233 -> 5565981112233
 */
export function force9Digit(phone: string): string {
  let clean = phone.replace(/\D/g, '')
  if (!clean.startsWith('55')) clean = '55' + clean
  
  if (clean.length === 12) {
    // 55 (2) + DDD (2) + 8 dígitos = 12
    return clean.substring(0, 4) + '9' + clean.substring(4)
  }
  
  return clean
}

/**
 * Força o formato de 8 dígitos para um número brasileiro (remove o 9).
 * Ex: 5565981112233 -> 556581112233
 */
export function force8Digit(phone: string): string {
  let clean = phone.replace(/\D/g, '')
  if (!clean.startsWith('55')) clean = '55' + clean
  
  if (clean.length === 13) {
    // 55 (2) + DDD (2) + 9 (1) + 8 dígitos = 13
    return clean.substring(0, 4) + clean.substring(5)
  }
  
  return clean
}

/**
 * 🇧🇷 Sanetizador de Números Brasileiros (Anti-Ban e JID Fix)
 * 
 * Regra:
 * - DDD 11 a 28: Mantém o nono dígito (9).
 * - DDD 29 a 99: Remove o nono dígito (9) para envio via API Baileys/Evolution.
 */
export function sanitizeBrazilianNumber(phone: string): string {
  let clean = phone.replace(/\D/g, '')
  
  // Se não tem DDI 55, adiciona (assumindo Brasil)
  if (!clean.startsWith('55') && (clean.length === 10 || clean.length === 11)) {
    clean = '55' + clean
  }

  // Se é Brasil e tem tamanho de celular com 9 dígitos (55 + DDD + 9 + 8 digitos = 13)
  if (clean.startsWith('55') && clean.length === 13) {
    const ddd = parseInt(clean.substring(2, 4))
    
    // Se o DDD for maior que 28, remove o 9 (o quinto caractere)
    if (ddd > 28) {
      clean = clean.substring(0, 4) + clean.substring(5)
    }
  }

  return clean
}

/**
 * Heurística simples para telefone fixo BR.
 * - Considera fixo quando (após remover DDI 55) o número tem 10 dígitos (DDD+8) e o primeiro dígito do assinante é 2-5.
 * - Celular geralmente tem 11 dígitos (DDD+9) ou começa com 9.
 */
export function isLikelyLandlineBR(phone: string): boolean {
  const clean = String(phone || '').replace(/\D/g, '')
  if (!clean) return false
  const national = clean.startsWith('55') ? clean.slice(2) : clean
  if (national.length !== 10) return false
  const subscriberFirst = national.slice(2, 3)
  return ['2', '3', '4', '5'].includes(subscriberFirst)
}
