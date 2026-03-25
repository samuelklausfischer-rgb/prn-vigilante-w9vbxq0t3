/* General utility functions (exposes cn) */
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
 * Copies text to clipboard with fallback for non-secure contexts
 * @param text - Text to copy
 * @returns Promise<boolean> - True if successful
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  // Try modern API first (requires secure context)
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch (err) {
      console.error('Modern clipboard API failed:', err)
    }
  }

  // Fallback for non-secure contexts or failed API
  try {
    const textArea = document.createElement('textarea')
    textArea.value = text
    
    // Ensure the textarea is not visible
    textArea.style.position = 'fixed'
    textArea.style.left = '-999999px'
    textArea.style.top = '-999999px'
    textArea.style.opacity = '0'
    
    document.body.appendChild(textArea)
    textArea.focus()
    textArea.select()
    
    const successful = document.execCommand('copy')
    textArea.remove()
    return successful
  } catch (err) {
    console.error('Fallback clipboard copy failed:', err)
    return false
  }
}

