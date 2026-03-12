import { supabase } from '@/lib/supabase/client'
import { WhatsAppInstance } from '@/types'

export const evolutionApi = {
  async getInstances(): Promise<WhatsAppInstance[]> {
    const { data, error } = await supabase
      .from('whatsapp_instances')
      .select('*')
      .order('slot_id', { ascending: true })

    if (error) {
      console.error('Failed to fetch instances', error)
      throw error
    }

    return (data || []).map((d: any) => ({
      slotId: d.slot_id,
      instanceName: d.instance_name,
      phoneNumber: d.phone_number,
      status: d.status,
    }))
  },

  async syncWithWebhook(): Promise<{ success: boolean; message?: string }> {
    try {
      const { data: responseData, error: invokeError } =
        await supabase.functions.invoke('sync-webhook')

      if (invokeError) {
        throw new Error(`Erro na chamada da Edge Function: ${invokeError.message}`)
      }

      if (!responseData?.success) {
        throw new Error(
          responseData?.error ||
            'Falha ao sincronizar instâncias. Verifique a conexão com o servidor.',
        )
      }

      const data = responseData.data

      let instances = Array.isArray(data) ? data : data?.data || data?.instances || [data]
      if (!Array.isArray(instances)) instances = []

      if (!instances || instances.length === 0) {
        return { success: true, message: 'Nenhuma instância recebida do webhook.' }
      }

      const { data: existingSlots } = await supabase
        .from('whatsapp_instances')
        .select('slot_id, instance_name')
        .order('slot_id', { ascending: true })

      const existingSlotMap = new Map(
        (existingSlots || []).map((s: any) => [s.instance_name, s.slot_id]),
      )
      const occupiedSlots = new Set((existingSlots || []).map((s: any) => s.slot_id))

      let nextAvailableSlot = 1
      const getNextSlot = () => {
        while (occupiedSlots.has(nextAvailableSlot)) {
          nextAvailableSlot++
        }
        occupiedSlots.add(nextAvailableSlot)
        return nextAvailableSlot
      }

      const toUpsert = instances
        .map((rawInst: any) => {
          const inst = rawInst.instance || rawInst

          const instanceName =
            inst.instanceName ?? inst.instance_name ?? inst.name ?? inst.id ?? null
          if (!instanceName) return null

          let status = 'empty'
          const state = inst.status || inst.state || inst.connectionStatus
          if (state === 'open' || state === 'connected' || state === 'CONNECTED') {
            status = 'connected'
          } else if (state === 'connecting' || state === 'CONNECTING') {
            status = 'initializing'
          } else if (
            state === 'close' ||
            state === 'disconnected' ||
            state === 'DISCONNECTED' ||
            state === 'DISCONNECTING'
          ) {
            status = 'disconnected'
          }

          const phoneNumber =
            inst.owner ?? inst.phone_number ?? inst.phoneNumber ?? inst.phone ?? inst.number ?? null

          let slot_id = inst.slotId ?? inst.slot_id
          if (slot_id === undefined || slot_id === null) {
            slot_id = existingSlotMap.get(instanceName)
            if (slot_id === undefined) {
              slot_id = getNextSlot()
            }
          }

          return {
            slot_id: Number(slot_id),
            instance_name: instanceName,
            phone_number: phoneNumber
              ? String(phoneNumber).replace(/@s\.whatsapp\.net/g, '')
              : null,
            status,
            updated_at: new Date().toISOString(),
          }
        })
        .filter(Boolean)

      if (toUpsert.length > 0) {
        const { error } = await supabase
          .from('whatsapp_instances')
          .upsert(toUpsert, { onConflict: 'slot_id' })

        if (error) throw error
      }

      return { success: true }
    } catch (err: any) {
      console.warn('Webhook sync error:', err)
      return {
        success: false,
        message: err.message || 'Erro ao sincronizar instâncias. Verifique a conexão.',
      }
    }
  },

  async getQrCode(slotId: number): Promise<string> {
    await new Promise((resolve) => setTimeout(resolve, 1500))
    return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=evolution-auth-${slotId}-${Date.now()}`
  },

  async disconnect(slotId: number): Promise<boolean> {
    const { error } = await supabase
      .from('whatsapp_instances')
      .update({ status: 'disconnected' })
      .eq('slot_id', slotId)

    return !error
  },

  async deleteInstance(slotId: number): Promise<boolean> {
    const { error } = await supabase.from('whatsapp_instances').delete().eq('slot_id', slotId)

    return !error
  },

  async create(
    slotId: number,
    name: string,
    phoneNumber: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: responseData, error: invokeError } = await supabase.functions.invoke(
        'create-instance',
        {
          body: { instanceName: name, phoneNumber, slotId },
        },
      )

      if (invokeError) {
        return { success: false, error: `Erro de comunicação: ${invokeError.message}` }
      }

      // If webhook returned error, application MUST NOT save or update data
      if (!responseData?.success) {
        return {
          success: false,
          error: responseData?.error || 'Falha ao criar instância na API da Evolution.',
        }
      }

      // Map API status to database status, defaulting to connecting as per AC
      const apiStatus =
        responseData.data?.status || responseData.data?.instance?.status || 'connecting'

      let mappedStatus = 'connecting'
      if (['open', 'connected', 'CONNECTED'].includes(apiStatus)) mappedStatus = 'connected'
      else if (['close', 'disconnected', 'DISCONNECTED'].includes(apiStatus))
        mappedStatus = 'disconnected'

      // Save to Supabase only on success to persist the data immediately
      const { error: dbError } = await supabase.from('whatsapp_instances').upsert(
        {
          slot_id: slotId,
          status: mappedStatus,
          instance_name: name,
          phone_number: phoneNumber,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'slot_id' },
      )

      if (dbError) {
        return {
          success: false,
          error: `Instância criada na API, mas erro ao salvar no banco: ${dbError.message}`,
        }
      }

      return { success: true }
    } catch (err: any) {
      console.error('Create error:', err)
      return { success: false, error: err.message || 'Erro interno ao tentar criar a instância.' }
    }
  },

  async simulateScan(slotId: number): Promise<boolean> {
    const { error } = await supabase
      .from('whatsapp_instances')
      .update({ status: 'connected' })
      .eq('slot_id', slotId)

    return !error
  },
}
