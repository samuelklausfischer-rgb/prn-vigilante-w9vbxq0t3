import { supabase } from '@/lib/supabase/client'
import { Database } from '@/lib/supabase/types'
import { MOCK_PATIENTS } from './data'

export type PatientQueue = Database['public']['Tables']['patients_queue']['Row']

export interface ArchiveFilters {
  search?: string
  dateRange?: { from?: Date; to?: Date }
  status?: string
  isApproved?: boolean | null
}

export async function fetchArchive(filters: ArchiveFilters): Promise<PatientQueue[]> {
  try {
    let query = supabase.from('patients_queue').select('*')

    if (filters.status && filters.status !== 'all') {
      query = query.eq('status', filters.status)
    }

    if (filters.isApproved !== null && filters.isApproved !== undefined) {
      query = query.eq('is_approved', filters.isApproved)
    }

    if (filters.dateRange?.from) {
      query = query.gte('send_after', filters.dateRange.from.toISOString())
    }
    if (filters.dateRange?.to) {
      const toDate = new Date(filters.dateRange.to)
      toDate.setHours(23, 59, 59, 999)
      query = query.lte('send_after', toDate.toISOString())
    }

    if (filters.search) {
      const searchLower = `%${filters.search.toLowerCase()}%`
      query = query.or(
        `patient_name.ilike.${searchLower},phone_number.ilike.${searchLower},message_body.ilike.${searchLower}`,
      )
    }

    query = query.order('send_after', { ascending: false }).limit(200)

    const { data, error } = await query

    if (error) throw error
    return data as PatientQueue[]
  } catch (e) {
    console.warn('Using mock data for archive due to error:', e)
    // Fallback logic for mock data matching filters
    let filtered = MOCK_PATIENTS
    if (filters.status && filters.status !== 'all') {
      filtered = filtered.filter((p) => p.status === filters.status)
    }
    if (filters.isApproved !== null && filters.isApproved !== undefined) {
      filtered = filtered.filter((p) => p.is_approved === filters.isApproved)
    }
    if (filters.search) {
      const s = filters.search.toLowerCase()
      filtered = filtered.filter(
        (p) =>
          p.patient_name.toLowerCase().includes(s) ||
          p.phone_number.toLowerCase().includes(s) ||
          p.message_body.toLowerCase().includes(s),
      )
    }
    return filtered
  }
}
