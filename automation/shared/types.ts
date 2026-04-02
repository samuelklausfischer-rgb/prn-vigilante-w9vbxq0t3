export type MessageLogStatus = 'sent' | 'delivered' | 'failed'

export type ConsentStatus = 'granted' | 'denied' | 'pending' | 'revoked' | 'expired'

export type BlockReason = 'opt_out' | 'failed_payment' | 'complaint'

export type ConsentSource = 'checkbox' | 'web' | 'app'

export interface SystemConfig {
  id: number
  is_paused: boolean
  safe_cadence_delay: number
  xray_requested: boolean
  updated_at: string
}

export interface MessageLog {
  id: string
  message_id: string
  instance_id?: string | null
  sent_at: string
  status: MessageLogStatus
  error_message?: string | null
  retry_count: number
  phone_masked?: string | null
  patient_hash?: string | null
  duration_ms?: number | null
}

export interface WorkerHeartbeat {
  worker_id: string
  worker_name: string
  started_at: string
  last_heartbeat: string
  current_job_id?: string | null
  current_job_started_at?: string | null
  messages_processed: number
  messages_failed: number
  memory_usage_mb?: number | null
  cpu_usage_percent?: number | null
  ip_address?: string | null
}

export interface PatientConsent {
  id: string
  patient_id?: string | null
  consent_status: ConsentStatus
  consent_granted_at?: string | null
  consent_revoked_at?: string | null
  consent_source: ConsentSource
  consent_version: string
  privacy_policy_version: string
  created_at: string
}

export interface MessageBlock {
  id: string
  patient_id?: string | null
  phone_number: string
  blocked_at: string
  reason: BlockReason
  source?: string | null
  permanent: boolean
  expires_at?: string | null
  blocked_by?: string | null
}

export interface ClaimedMessage {
  id: string
  patient_name: string
  phone_number: string
  message_body: string
  instance_id: string
  instance_name: string
  attempt_count: number
  journey_id?: string | null
  provider_message_id?: string | null
  provider_chat_id?: string | null
  locked_instance_id?: string | null
  phone_attempt_index?: number
  phone_2?: string | null
  phone_3?: string | null
  last_phone_used?: string | null
  phone_1_whatsapp_valid?: boolean | null
  phone_2_whatsapp_valid?: boolean | null
  phone_3_whatsapp_valid?: boolean | null
  whatsapp_valid?: boolean | null
  whatsapp_checked_at?: string | null
  whatsapp_validated_format?: '9_digits' | '8_digits' | null
}

export interface SendResult {
  success: boolean
  data?: any
  error?: string
  errorType?: 'timeout' | 'network' | 'api_error' | 'rate_limit' | 'unknown'
}

export interface ExpiredLock {
  released_id: string
  was_failed: boolean
}
