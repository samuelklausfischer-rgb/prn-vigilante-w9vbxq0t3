import type { WhatsAppInstance } from '@/types'

// Replaced direct dotenv import with Vite's import.meta.env
const EVOLUTION_API_URL = import.meta.env.VITE_EVOLUTION_API_URL || ''
const EVOLUTION_API_KEY = import.meta.env.VITE_EVOLUTION_API_KEY || ''

export const evolutionApi = {
  getInstances: async (): Promise<WhatsAppInstance[]> => {
    if (!EVOLUTION_API_URL) return []
    try {
      const res = await fetch(`${EVOLUTION_API_URL}/instance/fetchInstances`, {
        headers: {
          apikey: EVOLUTION_API_KEY,
        },
      })

      if (!res.ok) return []

      const data = await res.json()
      return data.map((inst: any) => ({
        id: inst.instance?.instanceName || inst.instanceName,
        instanceName: inst.instance?.instanceName || inst.instanceName,
        status: inst.instance?.status || inst.status || 'disconnected',
        phoneNumber: inst.instance?.owner?.replace('@s.whatsapp.net', '') || '',
      }))
    } catch (e) {
      console.error('Failed to fetch evolution instances:', e)
      return []
    }
  },
}
