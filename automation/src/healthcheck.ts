import 'dotenv/config'

const REQUIRED_ENV = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'EVOLUTION_API_URL', 'EVOLUTION_API_KEY']

const missing = REQUIRED_ENV.filter((key) => {
  const value = process.env[key]
  return !value || value.trim() === ''
})

if (missing.length > 0) {
  console.error(`Missing required env vars: ${missing.join(', ')}`)
  process.exit(1)
}

function withTimeout(ms: number): AbortSignal {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), ms)
  timeoutId.unref?.()
  return controller.signal
}

async function checkUrlReachable(url: string, headers?: Record<string, string>): Promise<void> {
  let response: Response

  try {
    response = await fetch(url, {
      method: 'GET',
      headers,
      signal: withTimeout(5000),
    })
  } catch (error) {
    throw new Error(`Cannot reach ${url}: ${String(error)}`)
  }

  if (response.status >= 500) {
    throw new Error(`Service returned status ${response.status} for ${url}`)
  }
}

async function run(): Promise<void> {
  const supabaseUrl = process.env.SUPABASE_URL as string
  const evolutionUrl = process.env.EVOLUTION_API_URL as string
  const evolutionApiKey = process.env.EVOLUTION_API_KEY as string

  await checkUrlReachable(`${supabaseUrl}/rest/v1/`)
  await checkUrlReachable(evolutionUrl, { apikey: evolutionApiKey })

  process.stdout.write('ok\n')
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
