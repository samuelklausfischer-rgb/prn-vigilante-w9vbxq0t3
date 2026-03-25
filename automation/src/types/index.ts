/**
 * 📦 Automation Types — Re-export from Shared Package
 *
 * Este arquivo agora importa tudo do pacote compartilhado.
 * Qualquer tipo novo deve ser adicionado em packages/shared/types.ts
 */

export type {
  QueueStatus,
  InstanceStatus,
  MessageLogStatus,
  ConsentStatus,
  BlockReason,
  ConsentSource,
  PatientQueue,
  SystemConfig,
  WhatsAppInstance,
  MessageLog,
  WorkerHeartbeat,
  PatientConsent,
  MessageBlock,
  ClaimedMessage,
  SendResult,
  ExpiredLock,
  RealtimeMetrics,
  ExpiredLockView,
  WorkerStatusSummary,
  FailureInsight,
  RetryPolicy,
  AntiBanConfig,
} from '../../../packages/shared/types'
