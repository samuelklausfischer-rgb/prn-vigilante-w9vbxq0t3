import { supabase } from '@/lib/supabase/client'
import type { PatientQueue, SystemConfig } from '@/types'

export async function fetchQueue(statusFilter?: string[]): Promise<PatientQueue[]> {
  let query = supabase.from('patients_queue').select('*').order('created_at', { ascending: false })

  if (statusFilter && statusFilter.length > 0) {
    query = query.in('status', statusFilter)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching queue:', error)
    return []
  }
  return data || []
}

export async function fetchConfig(): Promise<SystemConfig | null> {
  const { data, error } = await supabase.from('system_config').select('*').limit(1).maybeSingle()

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching config:', error)
    return null
  }

  return data || ({ id: 1, is_paused: false } as any)
}

export async function updateQueueItem(
  id: string,
  updates: Partial<PatientQueue>,
): Promise<boolean> {
  const { error } = await supabase.from('patients_queue').update(updates).eq('id', id)

  if (error) {
    console.error('Error updating queue item:', error)
    return false
  }
  return true
}

export async function toggleSystemPause(is_paused: boolean): Promise<boolean> {
  const { error } = await supabase.from('system_config').update({ is_paused }).eq('id', 1)

  if (error) {
    console.error('Error toggling system pause:', error)
    return false
  }
  return true
}

export async function updateQueueItemsBulk(
  ids: string[],
  updates: Partial<PatientQueue>,
): Promise<boolean> {
  if (!ids || ids.length === 0) return true

  const { error } = await supabase.from('patients_queue').update(updates).in('id', ids)

  if (error) {
    console.error('Error in updateQueueItemsBulk:', error)
    return false
  }
  return true
}

export async function deleteQueueItemsBulk(ids: string[]): Promise<boolean> {
  if (!ids || ids.length === 0) return true

  const { error } = await supabase.from('patients_queue').delete().in('id', ids)

  if (error) {
    console.error('Error in deleteQueueItemsBulk:', error)
    return false
  }
  return true
}
