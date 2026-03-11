import { supabase } from '@/lib/supabase/client'

export interface WhatsAppInstance {
  id?: string
  slotId: number
  instanceName: string | null
  phoneNumber: string | null
  status: 'empty' | 'disconnected' | 'connected'
}

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

  // Helper just to mock a successful QR code scan on the UI
  async simulateScan(slotId: number): Promise<boolean> {
    const { error } = await supabase
      .from('whatsapp_instances' as any)
      .update({ status: 'connected' })
      .eq('slot_id', slotId)

    return !error
  },
}
