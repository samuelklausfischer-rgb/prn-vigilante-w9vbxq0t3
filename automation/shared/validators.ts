/**
 * Validators shared only inside automation worker.
 */

export function isValidPhone(phone: string): boolean {
  const clean = phone.replace(/\D/g, '')
  return clean.length >= 10 && clean.length <= 15
}

export function normalizePhone(phone: string): string {
  const clean = phone.replace(/\D/g, '')
  if (!clean.startsWith('55') && clean.length <= 11) {
    return `55${clean}`
  }
  return clean
}

export function isValidMessage(body: string): boolean {
  const trimmed = body.trim()
  return trimmed.length >= 5 && trimmed.length <= 4096
}

export function maskPhone(phone: string): string {
  const clean = phone.replace(/\D/g, '')
  if (clean.length <= 4) return clean
  const start = clean.slice(0, Math.min(4, clean.length))
  const end = clean.slice(-4)
  return `${start}${'*'.repeat(Math.max(0, clean.length - start.length - end.length))}${end}`
}

export async function hashText(value: string): Promise<string> {
  const encoded = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest('SHA-256', encoded)
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

export function timestamp(): string {
  return new Date().toLocaleTimeString('pt-BR', { hour12: false })
}

export function validateEnvVars(vars: Record<string, string | undefined>): {
  valid: boolean
  missing: string[]
} {
  const missing = Object.entries(vars)
    .filter(([, value]) => !value || value.trim() === '')
    .map(([key]) => key)

  return { valid: missing.length === 0, missing }
}
