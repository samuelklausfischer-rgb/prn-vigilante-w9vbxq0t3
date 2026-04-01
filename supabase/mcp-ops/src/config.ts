type Mode = 'readonly' | 'operator'

export type AppConfig = {
  mode: Mode
  allowMutations: boolean
  easypanel: {
    baseUrl: string
    projectId: string
    apiKey: string
    defaultLogLines: number
    allowedServiceNames: string[]
  }
  supabase: {
    url: string
    anonKey: string
    functionsBaseUrl: string
    userJwt: string
  }
}

function required(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) {
    throw new Error(`Missing required env: ${name}`)
  }
  return value
}

function normalizeUrl(input: string): string {
  return input.replace(/\/+$/, '')
}

function parseMode(input?: string): Mode {
  return input?.trim().toLowerCase() === 'operator' ? 'operator' : 'readonly'
}

function parseBool(input: string | undefined, fallback: boolean): boolean {
  if (!input) return fallback
  const normalized = input.trim().toLowerCase()
  return normalized === '1' || normalized === 'true' || normalized === 'yes'
}

function parseList(input: string | undefined, fallback: string[]): string[] {
  if (!input?.trim()) return fallback
  return input
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean)
}

function parseInteger(input: string | undefined, fallback: number): number {
  const value = Number(input)
  if (!Number.isFinite(value) || value <= 0) return fallback
  return Math.floor(value)
}

export function loadConfig(): AppConfig {
  const mode = parseMode(process.env.MCP_MODE)
  const allowMutations = parseBool(process.env.ALLOW_MUTATIONS, false)

  return {
    mode,
    allowMutations,
    easypanel: {
      baseUrl: normalizeUrl(required('EASYPANEL_BASE_URL')),
      projectId: required('EASYPANEL_PROJECT_ID'),
      apiKey: required('EASYPANEL_API_KEY'),
      defaultLogLines: parseInteger(process.env.DEFAULT_LOG_LINES, 200),
      allowedServiceNames: parseList(process.env.ALLOWED_SERVICE_NAMES, ['worker', 'evolution api']),
    },
    supabase: {
      url: normalizeUrl(required('SUPABASE_URL')),
      anonKey: required('SUPABASE_ANON_KEY'),
      functionsBaseUrl: normalizeUrl(required('SUPABASE_FUNCTIONS_BASE_URL')),
      userJwt: required('SUPABASE_USER_JWT'),
    },
  }
}
