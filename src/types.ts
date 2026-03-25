export type PatientCategory =
  | 'respondido'
  | 'pendente'
  | 'falha'
  | 'critico'
  | 'fixo'
  | 'concluido'
  | 'historico'

export interface PatientQueue {
  id: string
  patient_name: string
  phone_number: string
  procedimentos?: string | null
  data_exame?: string | null
  notes?: string | null
  status: string
  has_reply: boolean
  phone_ladder_exhausted?: boolean
  current_outcome?: string | null
  locked_by?: string | null
  locked_at?: string | null
  needs_second_call?: boolean
  second_call_reason?: string | null
  attempt_count?: number
  updated_at?: string
  created_at?: string
}

export interface SystemConfig {
  is_paused: boolean
}

export interface WhatsAppInstance {
  id: string
  instanceName: string
  status: string
  phoneNumber?: string
}

export type KanbanColumn =
  | 'aguardando_envio'
  | 'em_contato'
  | 'respostas'
  | 'critico'
  | 'confirmados'

export interface KanbanCard {
  journey_id: string
  patient_name: string
  canonical_phone?: string | null
  journey_status: string
  data_exame?: string | null
  horario_inicio?: string | null
  horario_final?: string | null
  procedimentos?: string | null
  phone_ladder_exhausted?: boolean
  has_reply?: boolean
  latest_classification?: string | null
  current_instance_name?: string | null
  automation_notes?: string | null
}

export interface ArchivePreview {
  message: string
  total_to_archive: number
  blocked_sending: number
  status_breakdown: Record<string, number>
}

export interface DateRangeFilter {
  start: Date
  end: Date
}
