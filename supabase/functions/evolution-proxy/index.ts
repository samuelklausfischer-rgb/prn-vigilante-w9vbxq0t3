import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

import { corsHeaders } from '../_shared/cors.ts'
import { callEvolution } from '../_shared/evolution-api.ts'

type JsonRecord = Record<string, unknown>

type EvolutionAction =
  | 'fetchInstances'
  | 'fetchChats'
  | 'connectInstance'
  | 'connectionState'
  | 'createInstance'
  | 'logoutInstance'
  | 'deleteInstance'

type EvolutionProxyBody = {
  action?: EvolutionAction
  instanceName?: string
}

function json(status: number, payload: JsonRecord) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  })
}

function requireInstanceName(value?: string): string {
  const instanceName = String(value || '').trim()
  if (!instanceName) throw new Error('instanceName is required for this action')
  return instanceName
}

function getBearerToken(req: Request): string | null {
  const auth = req.headers.get('authorization') || req.headers.get('Authorization')
  if (!auth) return null
  const match = auth.match(/^Bearer\s+(.+)$/i)
  return match?.[1]?.trim() || null
}

function getHeader(req: Request, name: string): string | null {
  return req.headers.get(name) || req.headers.get(name.toLowerCase())
}

async function requireAuth(req: Request): Promise<Response | null> {
  const token = getBearerToken(req)
  if (!token) {
    return json(401, { success: false, error: 'Missing Authorization Bearer token' })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
  const requestApiKey = getHeader(req, 'apikey')
  const supabaseAnonKey = requestApiKey || Deno.env.get('SUPABASE_ANON_KEY') || ''
  if (!supabaseUrl || !supabaseAnonKey) {
    return json(500, { success: false, error: 'Missing SUPABASE_URL/apikey for auth validation' })
  }

  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    method: 'GET',
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${token}`,
    },
  }).catch(() => null)

  if (!response || !response.ok) {
    return json(401, { success: false, error: 'Invalid JWT' })
  }

  return null
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return json(405, { success: false, error: 'Method not allowed' })
  }

  const authError = await requireAuth(req)
  if (authError) return authError

  try {
    const body = (await req.json().catch(() => ({}))) as EvolutionProxyBody
    const action = body.action

    if (!action) {
      return json(400, { success: false, error: 'action is required' })
    }

    let data: unknown

    switch (action) {
      case 'fetchInstances': {
        data = await callEvolution('/instance/fetchInstances')
        break
      }

      case 'fetchChats': {
        const instanceName = requireInstanceName(body.instanceName)
        data = await callEvolution(`/chat/fetchChats/${encodeURIComponent(instanceName)}`)
        break
      }

      case 'connectInstance': {
        const instanceName = requireInstanceName(body.instanceName)
        data = await callEvolution(`/instance/connect/${encodeURIComponent(instanceName)}`)
        break
      }

      case 'connectionState': {
        const instanceName = requireInstanceName(body.instanceName)
        data = await callEvolution(`/instance/connectionState/${encodeURIComponent(instanceName)}`)
        break
      }

      case 'createInstance': {
        const instanceName = requireInstanceName(body.instanceName)
        data = await callEvolution('/instance/create', {
          method: 'POST',
          body: JSON.stringify({
            instanceName,
            qrcode: true,
            integration: 'WHATSAPP-BAILEYS',
          }),
        })
        break
      }

      case 'logoutInstance': {
        const instanceName = requireInstanceName(body.instanceName)
        data = await callEvolution(`/instance/logout/${encodeURIComponent(instanceName)}`, {
          method: 'DELETE',
        })
        break
      }

      case 'deleteInstance': {
        const instanceName = requireInstanceName(body.instanceName)
        data = await callEvolution(`/instance/delete/${encodeURIComponent(instanceName)}`, {
          method: 'DELETE',
        })
        break
      }

      default:
        return json(400, { success: false, error: `Unsupported action: ${String(action)}` })
    }

    return json(200, { success: true, data })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error'
    return json(500, { success: false, error: message })
  }
})
