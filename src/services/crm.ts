import { supabase } from '@/lib/supabase/client'
import type { KanbanCard, KanbanColumn, KanbanBoardData } from '@/types'

export async function fetchKanbanData(): Promise<KanbanBoardData> {
  try {
    const { data, error } = await supabase.rpc('get_strategic_followup_overview')

    if (error) throw error

    const rows = (data || []) as any[]

    return categorizeRowsToKanban(rows)
  } catch (e) {
    console.error('Error fetching kanban data:', e)
    return {
      aguardando_envio: [],
      em_contato: [],
      respostas: [],
      critico: [],
      confirmados: [],
    }
  }
}

function categorizeRowsToKanban(rows: any[]): KanbanBoardData {
  const result: KanbanBoardData = {
    aguardando_envio: [],
    em_contato: [],
    respostas: [],
    critico: [],
    confirmados: [],
  }

  for (const row of rows) {
    const card = rowToKanbanCard(row)

    // REGRAS DE ATRIBUIÇÃO DE COLUNA
    if (row.journey_status === 'queued') {
      result.aguardando_envio.push(card)
    } else if (row.journey_status === 'contacting' || row.journey_status === 'followup_sent') {
      result.em_contato.push(card)
    } else if (row.has_reply === true && row.journey_status !== 'confirmed') {
      result.respostas.push(card)
    } else if (row.phone_ladder_exhausted === true || row.journey_status === 'pending_manual') {
      result.critico.push(card)
    } else if (row.journey_status === 'confirmed') {
      result.confirmados.push(card)
    } else if (row.journey_status === 'delivered_waiting_reply') {
      // Enviado mas sem resposta ainda - coloca em "Em Contato"
      result.em_contato.push(card)
    } else {
      // Fallback - vai para "Em Contato" por padrão
      result.em_contato.push(card)
    }
  }

  return result
}

function rowToKanbanCard(row: any): KanbanCard {
  return {
    journey_id: row.journey_id,
    patient_name: row.patient_name,
    canonical_phone: row.canonical_phone,
    data_exame: row.data_exame,
    procedimentos: row.procedimentos,
    horario_inicio: row.horario_inicio,
    horario_final: row.horario_final,
    journey_status: row.journey_status,
    last_message_kind: row.last_message_kind,
    last_message_status: row.last_message_status,
    last_event_type: row.last_event_type,
    last_event_at: row.last_event_at,
    minutes_since_last_touch: row.minutes_since_last_touch,
    followup_due: row.followup_due,
    followup_sent: row.followup_sent,
    has_reply: row.has_reply,
    latest_classification: row.latest_classification,
    latest_summary: row.latest_summary,
    needs_manual_action: row.needs_manual_action,
    vacancy_signal: row.vacancy_signal,
    manual_priority: row.manual_priority,
    automation_notes: row.automation_notes,
    phone_ladder_exhausted: row.phone_ladder_exhausted,
    current_phone_index: row.current_phone_index,
    current_instance_id: row.current_instance_id,
    current_instance_name: row.current_instance_name,
  }
}

export async function searchKanbanCards(search: string): Promise<KanbanCard[]> {
  try {
    if (!search.trim()) return []

    const query = search.trim().toLowerCase()
    const { data, error } = await supabase
      .from('strategic_followup_overview')
      .select('*')
      .or(
        `patient_name.ilike.%${query}%,canonical_phone.ilike.%${query}%,procedimentos.ilike.%${query}%`,
      )
      .limit(50)

    if (error) throw error

    return (data || []).map(rowToKanbanCard)
  } catch (e) {
    console.error('Error searching kanban cards:', e)
    return []
  }
}
