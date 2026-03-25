/**
 * 🔒 PRN-Vigilante — Shared Validators
 *
 * Funções de validação usadas tanto pelo Frontend quanto pela Automação.
 * Garantem que dados inválidos nunca cheguem ao ponto de envio.
 */

/** Valida se um número de telefone tem formato aceitável para o WhatsApp */
export function isValidPhone(phone: string): boolean {
  const clean = phone.replace(/\D/g, '')
  // Mínimo 10 dígitos (DDD + número), máximo 15 (padrão E.164)
  return clean.length >= 10 && clean.length <= 15
}

/** Limpa e normaliza número de telefone */
export function normalizePhone(phone: string): string {
  const clean = phone.replace(/\D/g, '')
  // Se não começa com 55 (código do Brasil), prefixar
  if (!clean.startsWith('55') && clean.length <= 11) {
    return `55${clean}`
  }
  return clean
}

/** Valida se a mensagem tem conteúdo válido para envio */
export function isValidMessage(body: string): boolean {
  const trimmed = body.trim()
  return trimmed.length >= 5 && trimmed.length <= 4096
}

/** Mascara telefone para logs LGPD-compliant */
export function maskPhone(phone: string): string {
  const clean = phone.replace(/\D/g, '')
  if (clean.length <= 4) return clean
  const start = clean.slice(0, Math.min(4, clean.length))
  const end = clean.slice(-4)
  return `${start}${'*'.repeat(Math.max(0, clean.length - start.length - end.length))}${end}`
}

/** Hash simples SHA-256 para rastreabilidade sem expor dados pessoais */
export async function hashText(value: string): Promise<string> {
  const encoded = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest('SHA-256', encoded)
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

/** Formata timestamp legível para logs */
export function timestamp(): string {
  return new Date().toLocaleTimeString('pt-BR', { hour12: false })
}

/** Valida se todas as variáveis de ambiente necessárias estão configuradas */
export function validateEnvVars(vars: Record<string, string | undefined>): {
  valid: boolean
  missing: string[]
} {
  const missing = Object.entries(vars)
    .filter(([, value]) => !value || value.trim() === '')
    .map(([key]) => key)

  return { valid: missing.length === 0, missing }
}
