import { supabase } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export interface ConversationMessage {
  id: string
  direction: 'outbound' | 'inbound'
  messageKind: string
  phoneNumber: string
  messageBody: string
  timestamp: string
  status: 'queued' | 'sending' | 'accepted' | 'delivered' | 'read' | 'replied' | 'failed'
  phoneIndex?: number
}

export interface ConversationData {
  patientName: string
  patientId: string
  journeyId: string | null
  phoneNumber: string
  phone2?: string | null
  phone3?: string | null
  dataExame?: string | null
  horarioInicio?: string | null
  procedimentos?: string | null
  messages: ConversationMessage[]
}

export async function getPatientConversation(patientId: string): Promise<ConversationData | null> {
  try {
    // Buscar dados do paciente principal
    const { data: patient, error: patientError } = (await supabase
      .from('patients_queue')
      .select(
        'id,patient_name,journey_id,phone_number,phone_2,phone_3,data_exame,horario_inicio,procedimentos,message_body,status,created_at,delivered_at,read_at,replied_at,current_outcome,origin_queue_id,dedupe_kind',
      )
      .eq('id', patientId)
      .single()) as any

    if (patientError) {
      console.error('Erro ao buscar paciente:', patientError)
      return null
    }

    if (!patient) {
      return null
    }

    const patientData = patient as any

    // Array para coletar todas as mensagens
    const allMessages: ConversationMessage[] = []

    // 1. Adicionar mensagem principal do paciente (outbound)
    if (patientData.message_body) {
      let status: ConversationMessage['status'] = 'queued'
      if (patientData.replied_at) {
        status = 'replied'
      } else if (patientData.read_at) {
        status = 'read'
      } else if (patientData.delivered_at) {
        status = 'delivered'
      } else if (patientData.status === 'delivered') {
        status = 'delivered'
      } else if (patientData.status === 'failed') {
        status = 'failed'
      }

      allMessages.push({
        id: patientData.id,
        direction: 'outbound',
        messageKind: patientData.dedupe_kind || 'original',
        phoneNumber: patientData.phone_number,
        messageBody: patientData.message_body,
        timestamp: patientData.created_at,
        status,
        phoneIndex: 1,
      })
    }

    // 2. Adicionar resposta do paciente se existir (inbound)
    if (patientData.current_outcome) {
      allMessages.push({
        id: `${patientData.id}-reply`,
        direction: 'inbound',
        messageKind: 'patient_reply',
        phoneNumber: patientData.phone_number,
        messageBody: patientData.current_outcome,
        timestamp: patientData.replied_at || patientData.updated_at || new Date().toISOString(),
        status: 'replied',
        phoneIndex: 1,
      })
    }

    // 3. Buscar mensagens relacionadas (originadas do mesmo paciente)
    // Isso inclui retry_phone2, retry_phone3, followup, etc.
    const { data: relatedMessages, error: relatedError } = await supabase
      .from('patients_queue')
      .select(
        'id,patient_name,phone_number,message_body,status,created_at,delivered_at,read_at,replied_at,current_outcome,origin_queue_id,dedupe_kind',
      )
      .or(
        `origin_queue_id.eq.${patientId},origin_queue_id.eq.${patientData.origin_queue_id || 'null'}`,
      )
      .order('created_at', { ascending: true })
      .limit(50)

    if (!relatedError && relatedMessages) {
      for (const msg of relatedMessages) {
        const msgData = msg as any

        // Ignorar se for o próprio paciente (já adicionado)
        if (msgData.id === patientId) continue

        // Adicionar mensagem de retry/envio
        if (msgData.message_body) {
          let status: ConversationMessage['status'] = 'queued'
          if (msgData.replied_at) {
            status = 'replied'
          } else if (msgData.read_at) {
            status = 'read'
          } else if (msgData.delivered_at) {
            status = 'delivered'
          } else if (msgData.status === 'delivered') {
            status = 'delivered'
          } else if (msgData.status === 'failed') {
            status = 'failed'
          }

          // Determinar phoneIndex
          let phoneIndex = 1
          if (msgData.phone_number === patientData.phone_2) {
            phoneIndex = 2
          } else if (msgData.phone_number === patientData.phone_3) {
            phoneIndex = 3
          }

          allMessages.push({
            id: msgData.id,
            direction: 'outbound',
            messageKind: msgData.dedupe_kind || 'retry',
            phoneNumber: msgData.phone_number,
            messageBody: msgData.message_body,
            timestamp: msgData.created_at,
            status,
            phoneIndex,
          })
        }

        // Adicionar resposta do paciente para essa mensagem
        if (msgData.current_outcome) {
          let phoneIndex = 1
          if (msgData.phone_number === patientData.phone_2) {
            phoneIndex = 2
          } else if (msgData.phone_number === patientData.phone_3) {
            phoneIndex = 3
          }

          allMessages.push({
            id: `${msgData.id}-reply`,
            direction: 'inbound',
            messageKind: 'patient_reply',
            phoneNumber: msgData.phone_number,
            messageBody: msgData.current_outcome,
            timestamp: msgData.replied_at || msgData.updated_at || new Date().toISOString(),
            status: 'replied',
            phoneIndex,
          })
        }
      }
    }

    // Ordenar todas as mensagens por timestamp
    allMessages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

    return {
      patientName: patientData.patient_name,
      patientId,
      journeyId: patientData.journey_id || null,
      phoneNumber: patientData.phone_number,
      phone2: patientData.phone_2,
      phone3: patientData.phone_3,
      dataExame: patientData.data_exame,
      horarioInicio: patientData.horario_inicio,
      procedimentos: patientData.procedimentos,
      messages: allMessages.slice(0, 50), // Limitar a 50 mensagens
    }
  } catch (error) {
    console.error('Erro ao buscar conversa:', error)
    return null
  }
}

export function formatWhatsAppTime(isoDate: string): string {
  return format(new Date(isoDate), 'HH:mm', { locale: ptBR })
}

export function formatWhatsAppDate(isoDate: string): string {
  const date = new Date(isoDate)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  if (date.toDateString() === today.toDateString()) {
    return 'HOJE'
  }

  if (date.toDateString() === yesterday.toDateString()) {
    return 'ONTEM'
  }

  return format(date, 'dd/MM/yyyy', { locale: ptBR })
}

export function getMessageStatusText(status: ConversationMessage['status']): string {
  switch (status) {
    case 'queued':
      return 'Aguardando'
    case 'sending':
      return 'Enviando'
    case 'accepted':
      return 'Enviada'
    case 'delivered':
      return 'Entregue'
    case 'read':
      return 'Lida'
    case 'replied':
      return 'Respondida'
    case 'failed':
      return 'Falhou'
    default:
      return 'Desconhecido'
  }
}
