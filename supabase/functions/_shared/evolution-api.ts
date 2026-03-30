export function getEvolutionEnv() {
  const baseUrl = Deno.env.get('EVOLUTION_API_URL')?.trim()
  const apiKey = Deno.env.get('EVOLUTION_API_KEY')?.trim()

  if (!baseUrl) throw new Error('Missing required env: EVOLUTION_API_URL')
  if (!apiKey) throw new Error('Missing required env: EVOLUTION_API_KEY')

  return { baseUrl, apiKey }
}

export function buildEvolutionUrl(baseUrl: string, path: string): string {
  const normalizedBase = baseUrl.replace(/\/+$/, '')
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${normalizedBase}${normalizedPath}`
}

export async function callEvolution(path: string, init: RequestInit = {}) {
  const { baseUrl, apiKey } = getEvolutionEnv()
  const url = buildEvolutionUrl(baseUrl, path)
  const method = init.method || 'GET'

  const headers = new Headers(init.headers || {})
  if (!headers.has('Content-Type') && method !== 'GET') {
    headers.set('Content-Type', 'application/json')
  }
  headers.set('apikey', apiKey)

  const response = await fetch(url, {
    ...init,
    method,
    headers,
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`Evolution API [${response.status}] ${text}`.trim())
  }

  const contentType = response.headers.get('content-type') || ''
  if (!contentType.includes('application/json')) {
    return { raw: await response.text().catch(() => '') }
  }

  return response.json()
}
