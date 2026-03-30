import { supabase } from '@/lib/supabase/client'
import { WhatsAppInstance } from '@/types'

type EvolutionProxyAction =
  | 'fetchInstances'
  | 'fetchChats'
  | 'connectInstance'
  | 'connectionState'
  | 'createInstance'
  | 'logoutInstance'
  | 'deleteInstance'

type EvolutionProxyResponse<T = unknown> = {
  success: boolean
  data?: T
  error?: string
}

async function callEvolutionProxy<T = unknown>(action: EvolutionProxyAction, payload: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await supabase.functions.invoke<EvolutionProxyResponse<T>>('evolution-proxy', {
    body: { action, ...payload },
  })

  if (error) {
    const message = String(error.message || 'Falha ao chamar Edge Function evolution-proxy')
    throw new Error(message)
  }

  if (!data?.success) {
    throw new Error(data?.error || 'Falha ao executar operação na Evolution API')
  }

  return data.data as T
}

export const evolutionApi = {
  /**
   * Busca as instâncias do banco de dados (cache local).
   */
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
      id: d.id,
      slotId: d.slot_id,
      instanceName: d.instance_name,
      phoneNumber: d.phone_number,
      status: d.status,
      connectedAt: d.connected_at ?? null,
      messagesReceived: d.messages_received ?? 0,
      chatsCount: d.chats_count ?? 0,
      profilePicUrl: d.profile_pic_url ?? null,
    } as any))
  },

  /**
   * Sincroniza as instâncias reais usando a Edge Function evolution-proxy
   * e mantém o Supabase como cache local para o dashboard/worker.
   */
  async syncWithWebhook(): Promise<{ success: boolean; message?: string }> {
    try {
      const rawData = await callEvolutionProxy<any>('fetchInstances')

      let instances = Array.isArray(rawData)
        ? rawData
        : rawData?.data || rawData?.instances || [rawData]
      if (!Array.isArray(instances)) instances = []

      if (instances.length === 0) {
        return { success: true, message: 'Nenhuma instância encontrada na Evolution API.' }
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

      const toUpsert = await Promise.all(
        instances.map(async (rawInst: any) => {
          const inst = rawInst.instance || rawInst

          const instanceName =
            inst.instanceName ?? inst.instance_name ?? inst.name ?? inst.id ?? null
          if (!instanceName) return null

          let status = 'empty'
          let connected_at: string | null = null
          const state =
            inst.status || inst.state || inst.connectionStatus || rawInst.connectionStatus
          if (state === 'open' || state === 'connected' || state === 'CONNECTED') {
            status = 'connected'
            connected_at = new Date().toISOString()
          } else if (
            state === 'close' ||
            state === 'disconnected' ||
            state === 'DISCONNECTED' ||
            state === 'DISCONNECTING' ||
            state === 'connecting' ||
            state === 'CONNECTING'
          ) {
            status = 'disconnected'
          }

          const phoneNumber =
            inst.owner ??
            inst.phone_number ??
            inst.phoneNumber ??
            inst.phone ??
            inst.number ??
            null

          let slot_id = inst.slotId ?? inst.slot_id
          if (slot_id === undefined || slot_id === null) {
            slot_id = existingSlotMap.get(instanceName)
            if (slot_id === undefined) {
              slot_id = getNextSlot()
            }
          }

          let chats_count = 0
          let messages_received = 0
          if (status === 'connected') {
            try {
              const chats = await callEvolutionProxy<any[]>('fetchChats', { instanceName })
              chats_count = Array.isArray(chats) ? chats.length : 0

              messages_received = inst._count?.messages ?? inst.count?.messages ?? 0
            } catch (e) {
              console.warn(`Erro ao buscar métricas para ${instanceName}:`, e)
            }
          }

          return {
            slot_id: Number(slot_id),
            instance_name: instanceName,
            phone_number: phoneNumber
              ? String(phoneNumber).replace(/@s\.whatsapp\.net/g, '')
              : null,
            status,
            chats_count,
            messages_received,
            updated_at: new Date().toISOString(),
            ...(connected_at ? { connected_at } : {}),
          }
        }),
      )

      const cleanUpsert = toUpsert.filter(Boolean) as any[]

      const namesInEvolution = cleanUpsert.map((u) => u.instance_name)

      if (namesInEvolution.length > 0) {
        const { error: deleteError } = await supabase
          .from('whatsapp_instances')
          .delete()
          .not('instance_name', 'in', `(${namesInEvolution.map((n) => `"${n}"`).join(',')})`)

        if (deleteError) console.warn('Erro ao limpar instâncias órfãs:', deleteError)
      }

      if (cleanUpsert.length > 0) {
        const { error } = await (supabase
          .from('whatsapp_instances') as any)
          .upsert(cleanUpsert as any, { onConflict: 'slot_id' })

        if (error) throw error
      }

      return { success: true }
    } catch (err: any) {
      console.warn('Sync error:', err)
      return {
        success: false,
        message: err.message || 'Erro ao sincronizar instâncias com a Evolution.',
      }
    }
  },

  async getQrCode(slotId: number): Promise<string> {
    const { data } = (await supabase
      .from('whatsapp_instances')
      .select('instance_name')
      .eq('slot_id', slotId)
      .single()) as { data: { instance_name: string | null } | null }

    const instanceName = data?.instance_name
    if (!instanceName) {
      throw new Error(`Instância não encontrada para o slot ${slotId}`)
    }

    const result = await callEvolutionProxy<any>('connectInstance', { instanceName })
    if (result?.base64) return result.base64
    if (result?.code) {
      return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(result.code)}`
    }

    throw new Error('QR Code não disponível para esta instância')
  },

  async getInstanceStatus(instanceName: string): Promise<string> {
    try {
      const data = await callEvolutionProxy<any>('connectionState', { instanceName })
      return data?.instance?.state || data?.state || 'disconnected'
    } catch (_error) {
      return 'disconnected'
    }
  },

  async disconnect(slotId: number): Promise<boolean> {
    const { data } = (await supabase
      .from('whatsapp_instances')
      .select('instance_name')
      .eq('slot_id', slotId)
      .single()) as { data: { instance_name: string | null } | null }

    if (data?.instance_name) {
      try {
        await callEvolutionProxy('logoutInstance', { instanceName: data.instance_name })
      } catch (e) {
        console.warn('Falha ao desconectar na Evolution:', e)
      }
    }

    const { error } = await (supabase
      .from('whatsapp_instances') as any)
      .update({ status: 'disconnected', connected_at: null } as any)
      .eq('slot_id', slotId)

    return !error
  },

  async deleteInstance(slotId: number): Promise<boolean> {
    const { data } = (await supabase
      .from('whatsapp_instances')
      .select('instance_name')
      .eq('slot_id', slotId)
      .single()) as { data: { instance_name: string | null } | null }

    if (data?.instance_name) {
      try {
        await callEvolutionProxy('deleteInstance', { instanceName: data.instance_name })
      } catch (e) {
        console.warn('Falha ao deletar na Evolution:', e)
      }
    }

    const { error } = await supabase.from('whatsapp_instances').delete().eq('slot_id', slotId)
    return !error
  },

  async create(
    slotId: number,
    name: string,
    phoneNumber: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const responseData = await callEvolutionProxy<any>('createInstance', { instanceName: name })

      const apiStatus = responseData?.instance?.status || responseData?.status || 'disconnected'
      let mappedStatus = 'disconnected'
      if (['open', 'connected', 'CONNECTED'].includes(apiStatus)) mappedStatus = 'connected'

      const { error: dbError } = await (supabase.from('whatsapp_instances') as any).upsert(
        {
          slot_id: slotId,
          status: mappedStatus,
          instance_name: name,
          phone_number: phoneNumber,
          updated_at: new Date().toISOString(),
        } as any,
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
    const { error } = await (supabase
      .from('whatsapp_instances') as any)
      .update({ status: 'connected', connected_at: new Date().toISOString() } as any)
      .eq('slot_id', slotId)

    return !error
  },
}
