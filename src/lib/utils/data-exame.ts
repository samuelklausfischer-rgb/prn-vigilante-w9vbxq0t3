export function normalizeDataExame(input: string | null | undefined): string | null {
  if (!input) return null
  const s = String(input).trim()
  if (!s) return null

  // Already ISO date (YYYY-MM-DD)
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s

  // BR date (DD/MM/YYYY)
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (m) {
    const [, dd, mm, yyyy] = m
    return `${yyyy}-${mm}-${dd}`
  }

  return null
}

export function isValidDataExame(input: string | null | undefined): boolean {
  const iso = normalizeDataExame(input)
  if (!iso) return false

  // Validate actual date exists (e.g. 2026-02-31 invalid)
  const [y, m, d] = iso.split('-').map((p) => Number.parseInt(p, 10))
  if (!y || !m || !d) return false
  const dt = new Date(Date.UTC(y, m - 1, d))
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
  )
}

export function formatDataExameBr(input: string | null | undefined): string {
  const iso = normalizeDataExame(input)
  if (!iso) return ''
  const [yyyy, mm, dd] = iso.split('-')
  return `${dd}/${mm}/${yyyy}`
}

