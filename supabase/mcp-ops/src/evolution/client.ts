import type { AppConfig } from '../config.js'

type EvolutionAction =
  | 'fetchInstances'
  | 'fetchChats'
  | 'connectInstance'
  | 'connectionState'
  | 'createInstance'
  | 'logoutInstance'
  | 'deleteInstance'

type EvolutionProxyResponse<T = unknown> = {
  success?: boolean
  data?: T
  error?: string
}

export class EvolutionClient {
  constructor(private readonly config: AppConfig) {}

  private async call<T = unknown>(action: EvolutionAction, payload: Record<string, unknown> = {}): Promise<T> {
    const endpoint = `${this.config.supabase.functionsBaseUrl}/evolution-proxy`
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.supabase.userJwt}`,
        apikey: this.config.supabase.anonKey,
      },
      body: JSON.stringify({ action, ...payload }),
    })

    const text = await response.text()
    let parsed: EvolutionProxyResponse<T> = {}
    try {
      parsed = text ? (JSON.parse(text) as EvolutionProxyResponse<T>) : {}
    } catch {
      parsed = { success: false, error: text || 'Invalid JSON response from evolution-proxy' }
    }

    if (!response.ok) {
      const detail = parsed.error || text || response.statusText
      throw new Error(`evolution-proxy request failed [${response.status}] ${detail}`)
    }

    if (!parsed.success) {
      throw new Error(parsed.error || 'evolution-proxy returned success=false')
    }

    return parsed.data as T
  }

  listInstances<T = unknown>(): Promise<T> {
    return this.call<T>('fetchInstances')
  }

  getConnectionState<T = unknown>(instanceName: string): Promise<T> {
    return this.call<T>('connectionState', { instanceName })
  }

  getQr<T = unknown>(instanceName: string): Promise<T> {
    return this.call<T>('connectInstance', { instanceName })
  }

  fetchChats<T = unknown>(instanceName: string): Promise<T> {
    return this.call<T>('fetchChats', { instanceName })
  }

  createInstance<T = unknown>(instanceName: string): Promise<T> {
    return this.call<T>('createInstance', { instanceName })
  }

  logoutInstance<T = unknown>(instanceName: string): Promise<T> {
    return this.call<T>('logoutInstance', { instanceName })
  }

  deleteInstance<T = unknown>(instanceName: string): Promise<T> {
    return this.call<T>('deleteInstance', { instanceName })
  }
}
