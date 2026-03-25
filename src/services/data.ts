import { supabase } from '@/lib/supabase/client'
import type { PatientQueue, SystemConfig } from '@/types'

export async function fetchQueue(statusFilter: string[]): Promise<PatientQueue[]> {
  try {
    let query = supabase.from('patients_queue').select('*')
    if (statusFilter && statusFilter.length > 0) {
      query = query.in('status', statusFilter)
    }
    const { data, error } = await query.order('created_at', { ascending: false })
    if (error) throw error
    return (data || []) as PatientQueue[]
  } catch (e) {
    console.error('Error fetching queue:', e)
    return []
  }
}

export async function fetchConfig(): Promise<SystemConfig | null> {
  try {
    const { data, error } = await supabase.from('system_config').select('*').limit(1).single()
    if (error) throw error
    return data as SystemConfig
  } catch (e) {
    console.error('Error fetching config:', e)
    return null
  }
}

export async function updateQueueItem(
  id: string,
  updates: Partial<PatientQueue>,
): Promise<boolean> {
  try {
    const { error } = await supabase.from('patients_queue').update(updates).eq('id', id)
    if (error) throw error
    return true
  } catch (e) {
    console.error('Error updating queue item:', e)
    return false
  }
}

export async function toggleSystemPause(is_paused: boolean): Promise<boolean> {
  try {
    const { error } = await supabase.from('system_config').update({ is_paused }).eq('id', 1)
    if (error) {
      const { error: err2 } = await supabase
        .from('system_config')
        .update({ is_paused })
        .neq('id', 0)
      if (err2) throw err2
    }
    return true
  } catch (e) {
    console.error('Error toggling system pause:', e)
    return false
  }
}

export async function updateQueueItemsBulk(
  ids: string[],
  updates: Partial<PatientQueue>,
): Promise<boolean> {
  try {
    const { error } = await supabase.from('patients_queue').update(updates).in('id', ids)
    if (error) throw error
    return true
  } catch (e) {
    console.error('Error updating bulk queue items:', e)
    return false
  }
}

export async function deleteQueueItemsBulk(ids: string[]): Promise<boolean> {
  try {
    const { error } = await supabase.from('patients_queue').delete().in('id', ids)
    if (error) throw error
    return true
  } catch (e) {
    console.error('Error deleting bulk queue items:', e)
    return false
  }
}
