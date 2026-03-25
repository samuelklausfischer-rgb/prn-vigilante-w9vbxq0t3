import { supabase } from '@/lib/supabase/client'

export type GapClassification = 'encaixe' | 'significativo' | 'critico'

export interface ScheduleItem {
  item_type: 'patient' | 'gap'
  journey_id: string | null
  patient_name: string | null
  phone: string | null
  data_exame: string | null
  horario_inicio: string
  horario_final: string
  time_proce: string | null
  procedimentos: string | null
  journey_status: string | null
  latest_classification: string | null
  vacancy_signal: boolean | null
  phone_ladder_exhausted: boolean | null
  gap_duration_minutes: number | null
  gap_classification: GapClassification | null
}

export interface DayScheduleSummary {
  total_pacientes: number
  encaixe_count: number
  significativo_count: number
  critico_count: number
  total_minutos_livres: number
}

export interface AvailableDate {
  date: string
  total_count: number
  paciente_count: number
}

export async function fetchDaySchedule(date: string): Promise<ScheduleItem[]> {
  try {
    const { data, error } = await supabase.rpc('get_day_schedule', { p_date: date })

    if (error) throw error

    const items = (data || []) as ScheduleItem[]
    return items
  } catch (e) {
    console.error('Error fetching day schedule:', e)
    return []
  }
}

export async function fetchDayScheduleSummary(date: string): Promise<DayScheduleSummary | null> {
  try {
    const { data, error } = await supabase.rpc('get_day_schedule_summary', { p_date: date })

    if (error) throw error

    if (data && data.length > 0) {
      return data[0] as DayScheduleSummary
    }
    return null
  } catch (e) {
    console.error('Error fetching day schedule summary:', e)
    return null
  }
}

export async function fetchAvailableDates(): Promise<AvailableDate[]> {
  try {
    const { data, error } = await supabase.rpc('get_available_dates')

    if (error) throw error

    const dates = (data || []).map((d: any) => ({
      date: d.data_exame,
      total_count: Number(d.total_count),
      paciente_count: Number(d.paciente_count),
    })) as AvailableDate[]

    return dates
  } catch (e) {
    console.error('Error fetching available dates:', e)
    return []
  }
}

export async function enqueuePatient(patientData: {
  patient_name: string
  phone_number: string
  phone_2?: string
  phone_3?: string
  data_exame: string
  procedimentos: string
  horario_inicio: string
  time_proce?: string
  message_body: string
}): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const data_exame_iso = patientData.data_exame.split('/').reverse().join('-')
    const normalizedPhone = patientData.phone_number.replace(/\D/g, '')
    const time_proce = patientData.time_proce || '00:30:00'

    const { data, error } = await supabase.rpc('enqueue_patient', {
      p_patient_name: patientData.patient_name,
      p_phone_number: patientData.phone_number,
      p_message_body: patientData.message_body,
      p_status: 'queued',
      p_is_approved: true,
      p_send_after: new Date().toISOString(),
      p_notes: 'Cadastrado via Agenda',
      p_attempt_count: 0,
      p_dedupe_kind: 'original',
      p_origin_queue_id: null,
      p_canonical_phone: normalizedPhone,
      p_data_nascimento: null,
      p_data_exame: data_exame_iso,
      p_procedimentos: patientData.procedimentos,
      p_horario_inicio: patientData.horario_inicio,
      p_horario_final: null,
      p_time_proce: time_proce,
      p_phone_2: patientData.phone_2 || null,
      p_phone_3: patientData.phone_3 || null,
      p_locked_instance_id: null,
      p_phone_attempt_index: 1,
    })

    if (error) throw error

    const result = data as { id: string; status: string; error_message: string } | null
    if (!result) {
      return { success: false, error: 'No response from server' }
    }

    if (result.status === 'success') {
      return { success: true, id: result.id }
    } else if (result.status === 'duplicate_recent') {
      return { success: false, error: 'Paciente já enfileirado recentemente' }
    } else {
      return { success: false, error: result.error_message }
    }
  } catch (e: any) {
    console.error('Error enqueueing patient:', e)
    return { success: false, error: e?.message || 'Erro ao cadastrar paciente' }
  }
}

export function getGapClassificationInfo(classification: GapClassification | null) {
  if (!classification) return null

  switch (classification) {
    case 'encaixe':
      return {
        label: 'Encaixe disponível',
        color: 'bg-yellow-500/20 border-yellow-500/50 text-yellow-300',
        icon: '🟡',
        description: 'Tempo disponível para procedimento rápido',
      }
    case 'significativo':
      return {
        label: 'Gap significativo',
        color: 'bg-orange-500/20 border-orange-500/50 text-orange-300',
        icon: '🟠',
        description: 'Tempo considerável não utilizado',
      }
    case 'critico':
      return {
        label: 'CRÍTICO',
        color: 'bg-red-500/20 border-red-500/50 text-red-300',
        icon: '🔴',
        description: 'Tempo enorme perdido - ação urgente',
      }
    default:
      return null
  }
}
