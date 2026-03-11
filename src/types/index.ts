export type QueueStatus = 'queued' | 'sending' | 'delivered' | 'failed' | 'cancelled'

export interface PatientQueue {
  id: string
  patient_name: string
  phone_number: string
  message_body: string
  status: QueueStatus
  is_approved: boolean
  send_after: string
  notes: string | null
  created_at: string
  updated_at: string
  queue_order: number | null
  Data_nascimento?: string | null
  procedimentos?: string | null
  time_proce?: string | null
}

export interface SystemConfig {
  id: number
  is_paused: boolean
  safe_cadence_delay: number
  updated_at: string
}

export type InstanceStatus = 'connected' | 'disconnected' | 'empty' | 'initializing'

export interface WhatsAppInstance {
  slotId: number
  instanceName: string | null
  status: InstanceStatus
  phoneNumber?: string | null
}
