import { supabase } from '@/lib/supabase/client'
import { PatientQueue, SystemConfig } from '@/types'

// Mock Fallback Data
export const MOCK_PATIENTS: PatientQueue[] = [
  {
    id: 'm1',
    patient_name: 'João Silva (Mock)',
    phone_number: '11999999999',
    message_body: 'Olá, mock confirm!',
    status: 'queued',
    is_approved: false,
    send_after: new Date().toISOString(),
    notes: 'Mock data',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'm2',
    patient_name: 'Maria (Mock)',
    phone_number: '11988888888',
    message_body: 'Olá, mock enviado!',
    status: 'delivered',
    is_approved: true,
    send_after: new Date().toISOString(),
    notes: 'Mock data entregue',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
]

export const MOCK_CONFIG: SystemConfig = {
  id: 1,
  is_paused: false,
  safe_cadence_delay: 30,
  updated_at: new Date().toISOString(),
}

export async function fetchQueue(statusIn: string[]): Promise<PatientQueue[]> {
  try {
    const { data, error } = await supabase
      .from('patients_queue')
      .select('*')
      .in('status', statusIn)
      .order('send_after', { ascending: true })

    if (error) throw error
    return data as PatientQueue[]
  } catch (e) {
    console.warn('Using mock data due to error:', e)
    return MOCK_PATIENTS.filter((p) => statusIn.includes(p.status))
  }
}

export async function fetchConfig(): Promise<SystemConfig> {
  try {
    const { data, error } = await supabase.from('system_config').select('*').eq('id', 1).single()

    if (error) throw error
    return data as SystemConfig
  } catch (e) {
    console.warn('Using mock config due to error:', e)
    return MOCK_CONFIG
  }
}

export async function updateQueueItem(id: string, updates: Partial<PatientQueue>) {
  try {
    const { error } = await supabase.from('patients_queue').update(updates).eq('id', id)
    if (error) throw error
    return true
  } catch (e) {
    console.error('Error updating item', e)
    return false
  }
}

export async function toggleSystemPause(is_paused: boolean) {
  try {
    const { error } = await supabase.from('system_config').update({ is_paused }).eq('id', 1)
    if (error) throw error
    return true
  } catch (e) {
    console.error('Error pausing system', e)
    return false
  }
}
