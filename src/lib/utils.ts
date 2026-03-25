import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Merges multiple class names into a single string
 * @param inputs - Array of class names
 * @returns Merged class names
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats a phone number to a Brazilian format
 * @param phone - Phone number to format
 * @returns Formatted phone number
 */
export function formatPhoneBR(phone: string | undefined | null): string {
  if (!phone) return ''
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length === 11) {
    return `(${cleaned.substring(0, 2)}) ${cleaned.substring(2, 7)}-${cleaned.substring(7)}`
  }
  if (cleaned.length === 10) {
    return `(${cleaned.substring(0, 2)}) ${cleaned.substring(2, 6)}-${cleaned.substring(6)}`
  }
  if (cleaned.startsWith('55') && cleaned.length === 13) {
    return `+55 (${cleaned.substring(2, 4)}) ${cleaned.substring(4, 9)}-${cleaned.substring(9)}`
  }
  if (cleaned.startsWith('55') && cleaned.length === 12) {
    return `+55 (${cleaned.substring(2, 4)}) ${cleaned.substring(4, 8)}-${cleaned.substring(8)}`
  }
  return phone
}

/**
 * Normalizes a phone number to the standard format starting with 55
 * @param phone - Phone number to normalize
 * @returns Normalized phone number
 */
export function normalizePhone(phone: string | undefined | null): string {
  if (!phone) return ''
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.startsWith('55')) return cleaned
  return `55${cleaned}`
}

/**
 * Detects the type of a Brazilian phone number
 * @param phone - Phone number to check
 * @returns 'mobile', 'landline' or 'invalid'
 */
export function getPhoneType(phone: string | undefined | null): 'mobile' | 'landline' | 'invalid' {
  if (!phone) return 'invalid'
  const cleaned = phone.replace(/\D/g, '')
  let localPart = cleaned
  if (cleaned.startsWith('55')) {
    localPart = cleaned.substring(2)
  }
  if (localPart.length === 10) return 'landline'
  if (localPart.length === 11) return 'mobile'
  return 'invalid'
}
