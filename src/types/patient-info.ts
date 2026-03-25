import type { ReactNode } from 'react'
import type { QueueStatus } from '@/types'

/** Dados normalizados usados no popup de informacoes do paciente. */
export interface PatientInfo extends Omit<Record<string, unknown>, never> {
  id: string
  patient_name: string
  phone_number: string
  Data_nascimento: string | null
  procedimentos: string | null
  time_proce: string | null
  horario_inicio: string | null
  horario_final: string | null
  message_body: string
  notes: string | null
  status: QueueStatus
  is_approved: boolean
  send_after: string
  created_at: string
  updated_at: string
  queue_order: number | null
}

/** Props do popover responsivo exibido a partir do botao de info do card. */
export interface InfoPopupProps extends Omit<Record<string, unknown>, never> {
  patient: PatientInfo
  open: boolean
  onOpenChange: (open: boolean) => void
  children: ReactNode
  title?: string
  align?: 'start' | 'center' | 'end'
  side?: 'top' | 'right' | 'bottom' | 'left'
  sideOffset?: number
  className?: string
  popoverContentProps?: Partial<Record<string, unknown>>
}
