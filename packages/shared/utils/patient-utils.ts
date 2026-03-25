import type { PatientCategory, PatientQueue } from '../types'
import { isLandline } from './phone-utils'

export function isCompletedPatient(patient: PatientQueue): boolean {
  return String(patient.notes || '')
    .toLowerCase()
    .includes('concluido')
}

export function isCriticalPatient(patient: PatientQueue): boolean {
  return (
    Number(patient.attempt_count || 0) >= 3 ||
    patient.second_call_reason === 'not_received_retry_phone2' ||
    patient.second_call_reason === 'not_received_retry_phone3' ||
    patient.second_call_reason === 'phone_ladder_exhausted' ||
    (patient.status === 'failed' && !patient.phone_2)
  )
}

export function getPatientCategory(patient: PatientQueue): PatientCategory {
  if (isCompletedPatient(patient)) return 'concluido'

  // 1. Respondido (Prioridade: Paciente interagiu)
  if (patient.replied_at || patient.current_outcome) return 'respondido'

  // 2. Fixo (Identificado por regra de número ou flag da automação)
  if (
    patient.is_landline ||
    patient.second_call_reason === 'landline_only' ||
    isLandline(patient.phone_number)
  ) {
    return 'fixo'
  }

  // 3. Crítico (Tentativas esgotadas ou falha em múltiplos números)
  const isCritical =
    Number(patient.attempt_count || 0) >= 3 ||
    patient.second_call_reason === 'not_received_retry_phone2' ||
    (patient.status === 'failed' && !patient.phone_2)

  if (isCritical) return 'critico'

  // 4. Falha (Não recebido / Não enviado na primeira tentativa)
  if (patient.status === 'failed') return 'falha'

  // 5. Pendente (Enviado mas sem resposta ainda)
  if (patient.status === 'delivered') return 'pendente'

  // Default para histórico se for algo muito antigo ou processado
  return 'historico'
}

export function categorizePatients(
  patients: PatientQueue[],
): Record<PatientCategory, PatientQueue[]> {
  return {
    pendente: patients.filter((patient) => getPatientCategory(patient) === 'pendente'),
    falha: patients.filter((patient) => getPatientCategory(patient) === 'falha'),
    critico: patients.filter((patient) => getPatientCategory(patient) === 'critico'),
    fixo: patients.filter((patient) => getPatientCategory(patient) === 'fixo'),
    respondido: patients.filter((patient) => getPatientCategory(patient) === 'respondido'),
    concluido: patients.filter((patient) => getPatientCategory(patient) === 'concluido'),
    historico: patients.filter((patient) => getPatientCategory(patient) === 'historico'),
  }
}
