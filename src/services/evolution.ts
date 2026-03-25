import { supabase } from '@/lib/supabase/client'
import { WhatsAppInstance } from '@/types'

// Lê as credenciais da Evolution API do .env (VITE_ é exposto pelo Vite ao navegador)
const EVOLUTION_API_URL = import.meta.env.VITE_EVOLUTION_API_URL || 'http://localhost:8080'
const EVOLUTION_API_KEY = import.meta.env.VITE_EVOLUTION_API_KEY || ''

/**
 * Helper para chamar a Evolution API diretamente do navegador.
 * Como o Docker roda na mesma máquina, o browser acessa localhost:8080 sem problemas.
 */
async function callEvolution(path: string, options: RequestInit = {}) {
  const url = `${EVOLUTION_API_URL}${path}`
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      apikey: EVOLUTION_API_KEY,
      ...options.headers,
    },
  })
  if (!res.ok) {
    const errorBody = await res.text().catch(() => '')
    throw new Error(`Evolution API [${res.status}]: ${errorBody}`)
  }
  return res.json()
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
   * Sincroniza as instâncias REAIS direto da Evolution API (Docker local)
   * e salva no Supabase para manter o banco como "cache" atualizado.
   * ANTES: isso passava por uma Edge Function + Cloudflare Tunnel (ponte quebrada).
   * AGORA: o navegador chama localhost:8080 diretamente. ZERO pontes.
   */
  async syncWithWebhook(): Promise<{ success: boolean; message?: string }> {
    try {
      // 1. Chama a Evolution API diretamente do navegador
      const rawData = await callEvolution('/instance/fetchInstances')

      // A Evolution pode retornar um array direto ou um objeto com .data
      let instances = Array.isArray(rawData)
        ? rawData
        : rawData?.data || rawData?.instances || [rawData]
      if (!Array.isArray(instances)) instances = []

      if (instances.length === 0) {
        return { success: true, message: 'Nenhuma instância encontrada na Evolution API.' }
      }

      // 2. Lê os slots existentes no banco
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

      // 3. Mapeia os dados e busca métricas extras para instâncias conectadas
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

          // Busca métricas se estiver conectado
          let chats_count = 0
          let messages_received = 0
          if (status === 'connected') {
            try {
              // Busca chats (conversa ativas)
              const chats = await callEvolution(`/chat/fetchChats/${instanceName}`)
              chats_count = Array.isArray(chats) ? chats.length : 0
              
              // Tenta pegar contagem do objeto da instância se a Evolution v2 expuser
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

      // 4. Hard Sync: Remove do banco instâncias que NÃO existem na Evolution
      const namesInEvolution = cleanUpsert.map(u => u.instance_name);
      
      const { error: deleteError } = await supabase
        .from('whatsapp_instances')
        .delete()
        .not('instance_name', 'in', `(${namesInEvolution.map(n => `"${n}"`).join(',')})`);

      if (deleteError) console.warn('Erro ao limpar instâncias órfãs:', deleteError);

      // 5. Upsert das instâncias atuais com métricas
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
        message: err.message || 'Erro ao sincronizar instâncias. Verifique se o Docker está ativo.',
      }
    }
  },

  /**
   * Gera QR Code real para uma instância chamando a Evolution API diretamente.
   */
  async getQrCode(slotId: number): Promise<string> {
    const { data } = (await supabase
      .from('whatsapp_instances')
      .select('instance_name')
      .eq('slot_id', slotId)
      .single()) as { data: { instance_name: string | null } | null }

    const instanceName = data?.instance_name
    if (!instanceName) {
      return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=error-no-instance-${slotId}`
    }

    try {
      const result = await callEvolution(`/instance/connect/${instanceName}`)
      if (result?.base64) return result.base64
      if (result?.code) {
        return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(result.code)}`
      }
    } catch (e) {
      console.warn('Falha ao pegar QR direto da Evolution:', e)
    }

    return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=evolution-auth-${instanceName}-${Date.now()}`
  },

  /**
   * Consulta o status real de uma instância específica na Evolution API.
   */
  async getInstanceStatus(instanceName: string): Promise<string> {
    try {
      const data = await callEvolution(`/instance/connectionState/${instanceName}`)
      return data?.instance?.state || data?.state || 'disconnected'
    } catch (e) {
      return 'disconnected'
    }
  },

  async disconnect(slotId: number): Promise<boolean> {
    // Busca o nome da instância
    const { data } = (await supabase
      .from('whatsapp_instances')
      .select('instance_name')
      .eq('slot_id', slotId)
      .single()) as { data: { instance_name: string | null } | null }

    if (data?.instance_name) {
      try {
        await callEvolution(`/instance/logout/${data.instance_name}`, { method: 'DELETE' })
      } catch (e) {
        console.warn('Falha ao desconectar na Evolution:', e)
      }
    }

    // Atualiza o banco independentemente
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
        await callEvolution(`/instance/delete/${data.instance_name}`, { method: 'DELETE' })
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
      // 1. Cria a instância na Evolution API diretamente
      const responseData = await callEvolution('/instance/create', {
        method: 'POST',
        body: JSON.stringify({
          instanceName: name,
          qrcode: true,
          integration: 'WHATSAPP-BAILEYS',
        }),
      })

      // 2. Mapeia o status
      const apiStatus = responseData?.instance?.status || responseData?.status || 'disconnected'
      let mappedStatus = 'disconnected'
      if (['open', 'connected', 'CONNECTED'].includes(apiStatus)) mappedStatus = 'connected'

      // 3. Salva no Supabase
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
