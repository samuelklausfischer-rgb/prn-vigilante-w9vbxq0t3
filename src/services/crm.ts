import { supabase } from '@/lib/supabase/client'
import type { KanbanCard, KanbanColumn } from '@/types'

export async function fetchKanbanData(): Promise<Record<KanbanColumn, KanbanCard[]>> {
  try {
    const { data, error } = await supabase.rpc('get_kanban_data')
    if (error) throw error

    const result: Record<KanbanColumn, KanbanCard[]> = {
      aguardando_envio: [],
      em_contato: [],
      respostas: [],
      critico: [],
      confirmados: [],
    }

    if (data) {
      ;(data as any[]).forEach((item: any) => {
        const status = item.journey_status
        const hasReply = item.has_reply
        const exhausted = item.phone_ladder_exhausted

        if (status === 'confirmed') {
          result.confirmados.push(item)
        } else if (exhausted || status === 'pending_manual') {
          result.critico.push(item)
        } else if (hasReply) {
          result.respostas.push(item)
        } else if (['contacting', 'delivered_waiting_reply', 'followup_sent'].includes(status)) {
          result.em_contato.push(item)
        } else {
          result.aguardando_envio.push(item)
        }
      })
    }

    return result
  } catch (e) {
    console.error('Error fetching kanban data:', e)
    return {
      mensagem_recebida: [],
      em_andamento: [],
      cancelou: [],
      concluido: [],
      reagendar: [],
    }
  }
}

export async function searchKanbanCards(search: string): Promise<KanbanCard[]> {
  try {
    const { data, error } = await supabase.rpc('search_kanban_cards', { p_search: search })
    if (error) throw error
    return (data || []) as KanbanCard[]
  } catch (e) {
    console.error('Error searching kanban cards:', e)
    return []
  }
}
