/**
 * 📦 PRN-Vigilante — Shared Types (Contrato Único)
 *
 * Este arquivo é a FONTE DA VERDADE para todos os tipos do ecossistema.
 * Tanto o Frontend (Dashboard) quanto a Automação (Worker) importam daqui.
 *
 * REGRA DE OURO: Se mudar aqui, ambos os lados se atualizam automaticamente.
 */

// ============================================
// Enums / Union Types
// ============================================

export type QueueStatus = 'queued' | 'sending' | 'delivered' | 'failed' | 'cancelled'

export type PatientCategory = 'pendente' | 'falha' | 'critico' | 'fixo' | 'respondido' | 'concluido' | 'historico'

export type InstanceStatus = 'connected' | 'disconnected' | 'empty' | 'initializing' | 'connecting'

export type MessageLogStatus = 'sent' | 'delivered' | 'failed'

export type ConsentStatus = 'granted' | 'denied' | 'pending' | 'revoked' | 'expired'

export type BlockReason = 'opt_out' | 'failed_payment' | 'complaint'

export type ConsentSource = 'checkbox' | 'web' | 'app'

export type JourneyStatus = 'queued' | 'contacting' | 'delivered_waiting_reply' | 'followup_due' | 'followup_sent' | 'confirmed' | 'pending_manual' | 'cancelled' | 'archived'

export type MessageDirection = 'outbound' | 'inbound'

export type MessageKind = 'original' | 'retry_phone2' | 'retry_phone3' | 'followup_confirm' | 'patient_reply'

export type MessageLifecycleStatus = 'queued' | 'sending' | 'accepted' | 'delivered' | 'read' | 'replied' | 'failed' | 'cancelled'

export type QualificationClass = 'confirmado_positivo' | 'quer_remarcar' | 'nao_pode_comparecer' | 'cancelado' | 'duvida' | 'ambigua' | 'sem_resposta_util'

export type QualificationAction = 'close_as_confirmed' | 'move_to_pending' | 'flag_vacancy' | 'manual_review' | 'ignore'

export type ManualPriority = 'low' | 'medium' | 'high' | 'urgent'

export type JourneyEventSource = 'worker' | 'webhook' | 'polling' | 'ai' | 'manual'

export type SendListStatus = 'draft' | 'queued' | 'in_progress' | 'completed' | 'cancelled'

// ============================================
// Tabelas do Banco de Dados
// ============================================

/** Fila de pacientes para envio de mensagens */
export interface PatientQueue {
  id: string
  patient_name: string
  phone_number: string
  message_body: string
  status: QueueStatus
  is_approved: boolean
  send_after: string
  queue_order: number | null
  notes?: string | null
  created_at: string
  updated_at: string

  // Campos do paciente (opcional, vem do N8N)
  /** Data do exame (texto; preferir ISO YYYY-MM-DD) */
  data_exame?: string | null
  Data_nascimento?: string | null
  procedimentos?: string | null
  time_proce?: string | null
  horario_inicio?: string | null
  horario_final?: string | null
  phone_2?: string | null
  phone_3?: string | null
  is_landline?: boolean | null



  // Campos da automação
  locked_by?: string | null
  locked_at?: string | null
  attempt_count?: number | null
  send_accepted_at?: string | null
  delivered_at?: string | null
  read_at?: string | null
  replied_at?: string | null
  last_delivery_status?: string | null
  needs_second_call?: boolean | null
  second_call_reason?: string | null
  retry_phone2_sent_at?: string | null
  followup_sent_at?: string | null
  last_contact_phone?: string | null
  dedupe_kind?: string | null
  canonical_phone?: string | null
  origin_queue_id?: string | null
  dedupe_hash?: string | null
  send_list_id?: string | null

  // Campos do sistema de jornada (PR 1)
  journey_id?: string | null
  provider_message_id?: string | null
  provider_chat_id?: string | null
  accepted_at?: string | null
  followup_due_at?: string | null
  resolved_at?: string | null
  current_outcome?: string | null

  // Campos de afinidade de instância e escada de telefones (PR 2)
  /** Instância vinculada a este número — follow-ups DEVEM sair por ela */
  locked_instance_id?: string | null
  /** Posição na escada: 1=principal, 2=phone_2, 3=phone_3 */
  phone_attempt_index?: number | null
  /** Último telefone usado para contato */
  last_phone_used?: string | null
  /** Quando o número foi verificado no WhatsApp */
  whatsapp_checked_at?: string | null
  /** Resultado da verificação: true=WhatsApp válido, false=fixo/inválido */
  whatsapp_valid?: boolean | null
  /** Raio-X Phone 1 */
  phone_1_whatsapp_valid?: boolean | null
  /** Phone 2 foi verificado e tem WhatsApp válido */
  phone_2_whatsapp_valid?: boolean | null
  /** Phone 3 foi verificado e tem WhatsApp válido */
  phone_3_whatsapp_valid?: boolean | null
  /** Quando o phone 2 foi verificado no WhatsApp */
  phone_2_whatsapp_checked_at?: string | null
  /** Quando o phone 3 foi verificado no WhatsApp */
  phone_3_whatsapp_checked_at?: string | null
  /** Formato validado no WhatsApp: '9_digits' ou '8_digits' */
  whatsapp_validated_format?: '9_digits' | '8_digits' | null
}

export interface DateRangeFilter {
  from?: Date
  to?: Date
}

export interface SendList {
  id: string
  name: string
  exam_date?: string | null
  locked_instance_id?: string | null
  status: SendListStatus
  notes?: string | null
  created_by?: string | null
  created_at: string
  updated_at: string
}

export interface SendListSummary extends SendList {
  total_patients: number
  queued_count: number
  in_progress_count: number
  completed_count: number
  cancelled_count: number
  unknown_count: number
  locked_instance_name?: string | null
  locked_instance_phone?: string | null
}

export interface SendListPatient extends PatientQueue {
  send_list_id?: string | null
}

export interface LegacyListPatient {
  id: string
  patient_name: string
  phone_number: string
  data_exame?: string | null
  horario_inicio?: string | null
  horario_final?: string | null
  procedimentos?: string | null
  status: QueueStatus
  locked_instance_id?: string | null
  created_at: string
}

export interface LegacyListGroup {
  id: string
  source: 'legacy'
  title: string
  instance_id?: string | null
  instance_name?: string | null
  exam_date?: string | null
  status: SendListStatus
  total_patients: number
  queued_count: number
  in_progress_count: number
  completed_count: number
  failed_count: number
  cancelled_count: number
  patients: LegacyListPatient[]
}

export interface AnalyticsProcedureSummary {
  procedimento: string
  enviadas: number
  sucesso: number
  falha: number
  taxa_sucesso: string
}

export interface AnalyticsDaily {
  id: number
  data: string
  total_enviadas: number
  sucesso: number
  falha: number
  cancelada: number
  por_procedimento: Record<string, {
    enviadas: number
    sucesso: number
    falha: number
  }>
  avg_time_to_delivery_minutes?: number | null
  avg_retry_count?: number | null
  instances_used: number
  created_at: string
  updated_at: string
}

export interface AnalyticsSummary {
  total_enviadas: number
  sucesso: number
  falha: number
  cancelada: number
  taxa_sucesso: string
  change_enviadas: string
  change_sucesso: string
  change_falha: string
  change_taxa_sucesso: string
  daily_trend: Array<{
    date: string
    enviadas: number
    sucesso: number
    falha: number
  }>
  success_rate: Array<{
    date: string
    rate: string
  }>
  por_procedimento: AnalyticsProcedureSummary[]
}

export interface ArchivePreview {
  total_to_archive: number
  blocked_sending: number
  status_breakdown: Record<string, number>
  data_exame_range: {
    from: string
    to: string
  }
  message: string
}

/** Configuração global do sistema */
export interface SystemConfig {
  id: number
  is_paused: boolean
  safe_cadence_delay: number
  updated_at: string
}

/** Instância de WhatsApp registrada */
export interface WhatsAppInstance {
  id: string
  slotId: number
  instanceName?: string | null
  phoneNumber?: string | null
  status: InstanceStatus
  connectedAt?: string | null
  messagesReceived?: number | null
  chatsCount?: number | null
  profilePicUrl?: string | null
  createdAt?: string
  updatedAt?: string

  // Campos da automação
  lastMessageAt?: string | null
  messagesSentCount?: number | null
  rotationIndex?: number | null
}

/** Log de auditoria de envio */
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

/** Heartbeat do Worker (monitoramento de saúde) */
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

/** Consentimento LGPD */
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

/** Bloqueio de número (opt-out) */
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

/** Jornada do paciente (PR 1 - sistema de jornada) */
export interface PatientJourney {
  id: string
  origin_queue_id?: string | null
  patient_name: string
  canonical_phone: string
  primary_phone: string
  secondary_phone?: string | null
  tertiary_phone?: string | null
  data_exame?: string | null
  procedimentos?: string | null
  horario_inicio?: string | null
  horario_final?: string | null
  journey_status: JourneyStatus
  last_message_id?: string | null
  last_event_at?: string | null
  confirmed_at?: string | null
  pending_at?: string | null
  needs_manual_action: boolean
  manual_priority?: ManualPriority | null
  manual_note?: string | null
  created_at: string
  updated_at: string

  // Campos de afinidade e escada (PR 2)
  /** Histórico legível da escada. Ex: "Tel1: Fixo | Tel2: Timeout 60min" */
  automation_notes?: string | null
  /** true quando todos os telefones falharam */
  phone_ladder_exhausted?: boolean
  /** Instância vinculada ao telefone ativo */
  current_instance_id?: string | null
  /** Telefone ativo: 1=primary, 2=secondary, 3=tertiary */
  current_phone_index?: number
}

/** Mensagem da jornada (PR 1 - lifecycle de mensagens) */
export interface JourneyMessage {
  id: string
  journey_id: string
  parent_message_id?: string | null
  queue_message_id?: string | null
  direction: MessageDirection
  message_kind: MessageKind
  provider_name: 'evolution'
  provider_message_id?: string | null
  provider_chat_id?: string | null
  instance_id?: string | null
  phone_number: string
  message_body?: string | null
  status: MessageLifecycleStatus
  accepted_at?: string | null
  delivered_at?: string | null
  read_at?: string | null
  replied_at?: string | null
  failed_at?: string | null
  created_at: string
  updated_at: string
}

/** Evento webhook bruto (PR 1 - ingestão de eventos) */
export interface WebhookEventRaw {
  id: string
  provider_name: string
  provider_event_id?: string | null
  provider_message_id?: string | null
  event_type: string
  instance_external_id?: string | null
  payload: Record<string, unknown>
  headers?: Record<string, string> | null
  received_at: string
  processed_at?: string | null
  processing_status: 'pending' | 'processing' | 'processed' | 'failed' | 'ignored'
  processing_error?: string | null
  dedupe_hash?: string | null
}

/** Qualificação de mensagem via LLM (PR 1) */
export interface MessageQualification {
  id: string
  journey_id: string
  message_id: string
  classification: QualificationClass
  confidence: number
  summary: string
  recommended_action: QualificationAction
  vacancy_signal: boolean
  vacancy_reason?: string | null
  needs_manual_review: boolean
  model_name?: string | null
  raw_output?: Record<string, unknown> | null
  created_at: string
}

/** Evento da jornada (PR 1) */
export interface JourneyEvent {
  id: string
  journey_id: string
  message_id?: string | null
  event_type: string
  event_at: string
  source: JourneyEventSource
  payload?: Record<string, unknown> | null
}

/** Row da view strategic_followup (PR 1 + PR 2) */
export interface StrategicFollowupRow {
  journey_id: string
  patient_name: string
  canonical_phone: string
  data_exame?: string | null
  procedimentos?: string | null
  horario_inicio?: string | null
  horario_final?: string | null
  journey_status: JourneyStatus
  last_message_kind?: MessageKind | null
  last_message_status?: MessageLifecycleStatus | null
  last_event_type?: string | null
  last_event_at?: string | null
  last_inbound_at?: string | null
  last_inbound_message?: string | null
  minutes_since_last_touch?: number | null
  followup_due: boolean
  followup_sent: boolean
  has_reply: boolean
  latest_classification?: QualificationClass | null
  latest_summary?: string | null
  crm_bucket?: string | null
  needs_manual_action: boolean
  vacancy_signal: boolean
  manual_priority?: ManualPriority | null

  // Campos de afinidade e escada (PR 2)
  automation_notes?: string | null
  phone_ladder_exhausted?: boolean
  current_phone_index?: number
  current_instance_id?: string | null
  current_instance_name?: string | null
}

/** Row da view vacancy_candidates (PR 1) */
export interface VacancyCandidateRow {
  journey_id: string
  patient_name: string
  data_exame?: string | null
  horario_inicio?: string | null
  horario_final?: string | null
  procedimentos?: string | null
  vacancy_reason: string
  latest_classification?: QualificationClass | null
  latest_patient_message?: string | null
  priority_score?: number | null
  needs_manual_action: boolean
  manual_priority?: ManualPriority | null
}

/** Item da timeline da jornada (PR 1) */
export interface JourneyTimelineItem {
  journey_id: string
  event_at: string
  event_type: string
  source: JourneyEventSource
  message_kind?: MessageKind | null
  message_status?: MessageLifecycleStatus | null
  summary?: string | null
  raw_excerpt?: string | null
}

// ============================================
// Tipos da Engine (Worker Only)
// ============================================

/** Mensagem claimada pelo worker (retorno da função SQL) */
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

  // Campos de afinidade e escada (PR 2)
  /** Instância vinculada — retornada pelo claim_next_message */
  locked_instance_id?: string | null
  /** Posição na escada de telefones */
  phone_attempt_index?: number
  /** Segundo telefone do paciente */
  phone_2?: string | null
  /** Terceiro telefone do paciente */
  phone_3?: string | null
  /** Último telefone usado para contato */
  last_phone_used?: string | null
  /** Phone 1 foi verificado e tem WhatsApp válido */
  phone_1_whatsapp_valid?: boolean | null
  /** Phone 2 foi verificado e tem WhatsApp válido */
  phone_2_whatsapp_valid?: boolean | null
  /** Phone 3 foi verificado e tem WhatsApp válido */
  phone_3_whatsapp_valid?: boolean | null

  /** Resultado do último check proativo de WhatsApp */
  whatsapp_valid?: boolean | null
  /** Timestamp do último check proativo de WhatsApp */
  whatsapp_checked_at?: string | null
  /** Formato validado no WhatsApp: '9_digits' ou '8_digits' */
  whatsapp_validated_format?: '9_digits' | '8_digits' | null
}

/** Resultado do envio via Evolution API */
export interface SendResult {
  success: boolean
  data?: any
  error?: string
  errorType?: 'timeout' | 'network' | 'api_error' | 'rate_limit' | 'unknown'
}

/** Lock expirado (retorno da função SQL) */
export interface ExpiredLock {
  released_id: string
  was_failed: boolean
}

// ============================================
// Tipos para Views (Dashboard)
// ============================================

/** Métricas em tempo real (view dashboard_realtime_metrics) */
export interface RealtimeMetrics {
  queue_pending: number
  queue_sending: number
  sent_5m: number
  connected_instances: number
  active_workers: number
  blocked_numbers: number
  metrics_timestamp: string
}

/** View de locks expirados */
export interface ExpiredLockView {
  id: string
  patient_name: string
  locked_by: string
  locked_at: string
  lock_age_minutes: number
}

/** Resumo do status do Worker (para Dashboard) */
export interface WorkerStatusSummary {
  worker_id: string
  worker_name: string
  started_at: string
  last_heartbeat: string
  minutes_since_heartbeat: number
  current_job_id?: string | null
  current_job_started_at?: string | null
  messages_processed: number
  messages_failed: number
  status: 'active' | 'lagging' | 'stale'
}

/** Insights de falhas */
export interface FailureInsight {
  total_failures: number
  error_message: string
  affected_instances: number
  last_failure_at: string
}

// ============================================
// Tipos de Configuração
// ============================================

/** Política de retry */
export interface RetryPolicy {
  maxAttempts: number
  baseDelayMs: number
  maxDelayMs: number
  backoffMultiplier: number
  retryableErrors: string[]
}

/** Configuração anti-ban */
export interface AntiBanConfig {
  minDelayMinutes: number
  maxDelayMinutes: number
  respectLastMessageAt: boolean
  safeCadenceDelayMinutes: number
}

// ============================================
// Tipos do CRM Kanban (PR 2)
// ============================================

/** Coluna do Kanban */
export type KanbanColumn =
  | 'mensagem_recebida'
  | 'em_andamento'
  | 'cancelou'
  | 'concluido'
  | 'reagendar'

/** Card do Kanban — representa um paciente no board */
export interface KanbanCard {
  journey_id: string
  patient_name: string
  canonical_phone: string
  phone_attempt_index: number
  automation_notes?: string | null
  journey_status: JourneyStatus
  latest_classification?: QualificationClass | null
  latest_summary?: string | null
  last_inbound_message?: string | null
  last_inbound_at?: string | null
  crm_bucket?: string | null
  last_message_kind?: MessageKind | null
  last_message_status?: MessageLifecycleStatus | null
  last_event_type?: string | null
  last_event_at?: string | null
  vacancy_signal: boolean
  phone_ladder_exhausted: boolean
  minutes_since_last_touch: number | null
  data_exame?: string | null
  horario_inicio?: string | null
  horario_final?: string | null
  procedimentos?: string | null
  instance_name?: string | null
  current_instance_id?: string | null
  current_instance_name?: string | null
  manual_priority?: ManualPriority | null
  has_reply: boolean
  followup_due?: boolean
  followup_sent?: boolean
  needs_manual_action?: boolean
}

/** Dados completos do board Kanban */
export interface KanbanBoardData {
  mensagem_recebida: KanbanCard[]
  em_andamento: KanbanCard[]
  cancelou: KanbanCard[]
  concluido: KanbanCard[]
  reagendar: KanbanCard[]
}
