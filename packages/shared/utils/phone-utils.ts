function cleanPhone(phone: string): string {
  return String(phone || '').replace(/\D/g, '')
}

export function formatPhoneBR(phone: string): string {
  const cleaned = cleanPhone(phone)

  if (cleaned.length === 11) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`
  }

  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`
  }

  return phone
}

export function isValidPhoneBR(phone: string): boolean {
  const cleaned = cleanPhone(phone)
  return cleaned.length === 10 || cleaned.length === 11
}

export function isLandline(phone: string): boolean {
  const cleaned = cleanPhone(phone)

  if (cleaned.length !== 10) return false

  const firstDigitAfterAreaCode = cleaned.slice(2, 3)
  return /^[2-5]$/.test(firstDigitAfterAreaCode)
}

export function getPhoneType(phone: string): 'mobile' | 'landline' | 'invalid' {
  if (!isValidPhoneBR(phone)) return 'invalid'
  return isLandline(phone) ? 'landline' : 'mobile'
}
