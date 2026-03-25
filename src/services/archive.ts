import { supabase } from '@/lib/supabase/client'
import { DateRange } from 'react-day-picker'

export interface PatientQueue {
  id: string
  patient_name: string
  phone_number: string
  message_body: string
  status: string
  is_approved: boolean
  send_after: string
  updated_at: string
  notes?: string
}

export interface ArchiveFilters {
  search?: string
  dateRange?: DateRange
  status?: string
  isApproved?: boolean | null
}

export const fetchArchive = async (filters: ArchiveFilters): Promise<PatientQueue[]> => {
  try {
    // Assuming 'messages' or 'patient_queue' is the table name.
    // Modify as per actual Supabase schema. We'll use 'messages' as default.
    let query = supabase.from('messages').select('*').order('updated_at', { ascending: false })

    if (filters.status && filters.status !== 'all') {
      query = query.eq('status', filters.status)
    }

    if (filters.isApproved !== undefined && filters.isApproved !== null) {
      query = query.eq('is_approved', filters.isApproved)
    }

    if (filters.search) {
      query = query.or(
        `patient_name.ilike.%${filters.search}%,phone_number.ilike.%${filters.search}%,message_body.ilike.%${filters.search}%`,
      )
    }

    if (filters.dateRange?.from) {
      query = query.gte('updated_at', filters.dateRange.from.toISOString())
    }

    if (filters.dateRange?.to) {
      query = query.lte('updated_at', filters.dateRange.to.toISOString())
    }

    const { data, error } = await query

    if (error) {
      console.error('Supabase query error:', error)
      return []
    }

    return (data as PatientQueue[]) || []
  } catch (error) {
    console.error('Error in fetchArchive:', error)
    return []
  }
}
