import { supabase } from '@/lib/supabase/client'

export interface ConversationMessage {
  id: string
  messageBody: string
  direction: 'inbound' | 'outbound'
  status: string
  timestamp: string
}

export interface ConversationData {
  messages: ConversationMessage[]
  patientName?: string
  dataExame?: string
  horarioInicio?: string
  procedimentos?: string
  phoneNumber?: string
  phone2?: string
  phone3?: string
}

export function formatWhatsAppTime(timestamp: string): string {
  if (!timestamp) return ''
  try {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  } catch (e) {
    return ''
  }
}

export function formatWhatsAppDate(dateStr: string): string {
  if (!dateStr) return ''
  try {
    const date = new Date(dateStr)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (date.toDateString() === today.toDateString()) {
      return 'Hoje'
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Ontem'
    }

    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  } catch (e) {
    return dateStr
  }
}

export async function getPatientConversation(patientId: string): Promise<ConversationData | null> {
  try {
    const { data: messagesData, error: messagesError } = await supabase
      .from('messages')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: true })

    if (messagesError) throw messagesError

    const { data: patientData, error: patientError } = await supabase
      .from('patients_queue')
      .select(
        'patient_name, data_exame, horario_inicio, procedimentos, phone_number, phone_2, phone_3',
      )
      .eq('id', patientId)
      .maybeSingle()

    if (patientError) {
      console.warn('Could not fetch patient info for conversation:', patientError)
    }

    const mappedMessages: ConversationMessage[] = (messagesData || []).map((msg) => ({
      id: msg.id,
      messageBody: msg.message_body || msg.body || '',
      direction: msg.direction === 'inbound' ? 'inbound' : 'outbound',
      status: msg.status || 'sent',
      timestamp: msg.created_at || new Date().toISOString(),
    }))

    return {
      messages: mappedMessages,
      patientName: patientData?.patient_name || 'Paciente',
      dataExame: patientData?.data_exame,
      horarioInicio: patientData?.horario_inicio,
      procedimentos: patientData?.procedimentos,
      phoneNumber: patientData?.phone_number,
      phone2: patientData?.phone_2,
      phone3: patientData?.phone_3,
    }
  } catch (e) {
    console.error('Error fetching patient conversation:', e)
    return null
  }
}
