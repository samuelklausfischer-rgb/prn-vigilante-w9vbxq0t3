import { supabase } from '@/lib/supabase/client'
import { WhatsAppInstance } from '@/types'

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export const evolutionApi = {
  async getInstances(): Promise<WhatsAppInstance[]> {
    const { data, error } = await supabase
      .from('whatsapp_instances' as any)
      .select('*')
      .order('slot_id', { ascending: true })

    if (error || !data) {
      console.error('Failed to fetch instances', error)
      return []
    }

    return data.map((d: any) => ({
      id: d.id,
      slotId: d.slot_id,
      instanceName: d.instance_name,
      phoneNumber: d.phone_number,
      status: d.status,
    }))
  },

  async syncWithWebhook(): Promise<{ success: boolean; message?: string }> {
    try {
      // Sincronização com o webhook específico
      const response = await fetch('http://host.docker.internal:5678/webhook/a', {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      }).catch((e) => {
        throw new Error(`Falha de rede ao contatar webhook: ${e.message}`)
      })

      if (!response.ok) {
        throw new Error(`Webhook retornou status HTTP ${response.status}`)
      }

      const data = await response.json().catch(() => {
        throw new Error('Formato de resposta inválido (esperado JSON)')
      })

      // Mapeamento flexível da resposta do webhook
      const instances = Array.isArray(data) ? data : data.data || data.instances || [data]

      if (!instances || instances.length === 0) {
        return { success: true, message: 'Nenhuma instância recebida do webhook.' }
      }

      const toUpsert = instances
        .map((inst: any) => {
          const slot_id = inst.slot_id ?? inst.slotId ?? inst.id
          if (slot_id === undefined) return null

          return {
            slot_id: Number(slot_id),
            instance_name: inst.instance_name ?? inst.instanceName ?? inst.name ?? null,
            phone_number: inst.phone_number ?? inst.phoneNumber ?? inst.phone ?? null,
            status: inst.status ?? 'empty',
            updated_at: new Date().toISOString(),
          }
        })
        .filter(Boolean)

      if (toUpsert.length > 0) {
        const { error } = await supabase
          .from('whatsapp_instances' as any)
          .upsert(toUpsert, { onConflict: 'slot_id' })

        if (error) throw error
      }

      return { success: true }
    } catch (err: any) {
      console.warn('Webhook sync error:', err)
      return { success: false, message: err.message || 'Erro desconhecido.' }
    }
  },

  async getQrCode(slotId: number): Promise<string> {
    await delay(1500) // Simulate generating a secure QR code
    return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=evolution-auth-${slotId}-${Date.now()}`
  },

  async disconnect(slotId: number): Promise<boolean> {
    const { error } = await supabase
      .from('whatsapp_instances' as any)
      .update({ status: 'disconnected' })
      .eq('slot_id', slotId)

    return !error
  },

  async deleteInstance(slotId: number): Promise<boolean> {
    const { error } = await supabase
      .from('whatsapp_instances' as any)
      .update({ status: 'empty', instance_name: null, phone_number: null })
      .eq('slot_id', slotId)

    return !error
  },

  async create(slotId: number, name: string, phoneNumber: string): Promise<boolean> {
    const { error } = await supabase
      .from('whatsapp_instances' as any)
      .update({ status: 'disconnected', instance_name: name, phone_number: phoneNumber })
      .eq('slot_id', slotId)

    return !error
  },

  async simulateScan(slotId: number): Promise<boolean> {
    const { error } = await supabase
      .from('whatsapp_instances' as any)
      .update({ status: 'connected' })
      .eq('slot_id', slotId)

    return !error
  },
}
