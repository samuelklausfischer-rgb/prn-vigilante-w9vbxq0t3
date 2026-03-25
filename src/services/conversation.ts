import { supabase } from '@/lib/supabase/client'

export interface ConversationData {
  messages: any[]
}

export async function getPatientConversation(patientId: string): Promise<ConversationData | null> {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: true })

    if (error) throw error

    return { messages: data || [] }
  } catch (e) {
    console.error('Error fetching patient conversation:', e)
    return null
  }
}
