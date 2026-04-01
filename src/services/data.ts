import { supabase } from '@/lib/supabase/client'
import { PatientQueue, QueueStatus, SystemConfig } from '@/types'

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
    notes: 'Aguardando confirmação manual.',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    queue_order: 1,
    Data_nascimento: '1985-10-20',
    procedimentos: 'Ressonância Magnética com Contraste',
    time_proce: '14:30:00',
  },
  {
    id: 'm2',
    patient_name: 'Maria Santos (Mock)',
    phone_number: '11988888888',
    message_body: 'Olá, mock enviado!',
    status: 'delivered',
    is_approved: true,
    send_after: new Date(Date.now() - 3600000).toISOString(),
    notes: 'Entregue com sucesso.',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    queue_order: 2,
    Data_nascimento: '1992-05-12',
    procedimentos: 'Ultrassom Abdominal',
    time_proce: '09:00:00',
  },
  {
    id: 'm3',
    patient_name: 'Carlos Oliveira (Mock)',
    phone_number: '11977777777',
    message_body: 'Olá, preparando envio.',
    status: 'sending',
    is_approved: true,
    send_after: new Date().toISOString(),
    notes: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    queue_order: 3,
    Data_nascimento: '1978-03-30',
    procedimentos: 'Tomografia Computadorizada',
    time_proce: '16:00:00',
  },
]

export const MOCK_CONFIG: SystemConfig = {
  id: 1,
  is_paused: false,
  safe_cadence_delay: 30,
  updated_at: new Date().toISOString(),
}

export async function fetchQueue(statusIn: QueueStatus[]): Promise<PatientQueue[]> {
  try {
    const { data, error } = await supabase
      .from('patients_queue')
      .select('*')
      .in('status', statusIn)
      .order('queue_order', { ascending: true, nullsFirst: false })
      .order('send_after', { ascending: true })

    if (error) throw error
    return data as PatientQueue[]
  } catch (e) {
    console.warn('Using mock data due to error:', e)
    return MOCK_PATIENTS.filter((p) => statusIn.includes(p.status)).sort((a, b) => {
      if (a.queue_order !== null && b.queue_order !== null) return a.queue_order - b.queue_order
      if (a.queue_order !== null) return -1
      if (b.queue_order !== null) return 1
      return new Date(a.send_after).getTime() - new Date(b.send_after).getTime()
    })
  }
}

export async function fetchNextDispatchTime(): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('patients_queue')
      .select('send_after')
      .eq('status', 'queued')
      .order('send_after', { ascending: true })
      .limit(1)

    if (error || !data?.length) return null
    const row = data[0] as { send_after: string }
    return row.send_after
  } catch (e) {
    console.error('Error fetching next dispatch time', e)
    return null
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
    const { error } = await (supabase.from('patients_queue') as any).update(updates).eq('id', id)
    if (error) throw error
    return true
  } catch (e) {
    console.error('Error updating item', e)
    return false
  }
}

export async function updateQueueItemsBulk(ids: string[], updates: Partial<PatientQueue>) {
  try {
    if (ids.length === 0) return true
    const { error } = await (supabase.from('patients_queue') as any).update(updates).in('id', ids)
    if (error) throw error
    return true
  } catch (e) {
    console.error('Error bulk updating items', e)
    return false
  }
}

export async function deleteQueueItemsBulk(ids: string[]) {
  try {
    if (ids.length === 0) return true
    const { error } = await (supabase.from('patients_queue') as any).delete().in('id', ids)
    if (error) throw error
    return true
  } catch (e) {
    console.error('Error bulk deleting items', e)
    return false
  }
}

export async function updateQueueOrders(updates: { id: string; queue_order: number }[]) {
  try {
    await Promise.all(
      updates.map(
        (u) => (supabase.from('patients_queue') as any).update({ queue_order: u.queue_order }).eq('id', u.id),
      ),
    )
    return true
  } catch (e) {
    console.error('Error updating queue orders', e)
    return false
  }
}

export async function toggleSystemPause(is_paused: boolean) {
  try {
    const { error } = await (supabase.from('system_config') as any).update({ is_paused }).eq('id', 1)
    if (error) throw error
    return true
  } catch (e) {
    console.error('Error pausing system', e)
    return false
  }
}

export async function fetchValidatedPatients(): Promise<PatientQueue[]> {
  try {
    const { data, error } = await supabase
      .from('patients_queue')
      .select('id, patient_name, phone_number, phone_2, phone_3, phone_1_whatsapp_valid, phone_2_whatsapp_valid, phone_3_whatsapp_valid, whatsapp_checked_at, whatsapp_valid, whatsapp_validated_format, status, updated_at')
      .or('whatsapp_checked_at.not.is.null,phone_1_whatsapp_valid.not.is.null,phone_2_whatsapp_valid.not.is.null,phone_3_whatsapp_valid.not.is.null,whatsapp_valid.not.is.null')
      .order('updated_at', { ascending: false })
      .limit(200)

    if (error) throw error
    return data as PatientQueue[]
  } catch (e) {
    console.error('Error fetching validated patients', e)
    return []
  }
}
