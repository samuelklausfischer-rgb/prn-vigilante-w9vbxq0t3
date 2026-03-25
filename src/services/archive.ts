import { supabase } from '@/lib/supabase/client'
import { PatientQueue as UiPatientQueue } from '@/types'
import { MOCK_PATIENTS } from './data'
import { format } from 'date-fns'

export interface PatientQueue {
  id: string
  patient_name: string
  phone_number: string
  Data_nascimento?: string | null
  data_exame?: string | null
  procedimentos?: string | null
  horario_inicio?: string | null
  replied_at?: string | null
  delivered_at?: string | null
  read_at?: string | null
  updated_at: string
}

export interface ArchiveFilters {
  search?: string
  dateRange?: { from?: Date; to?: Date }
}

export async function fetchArchive(filters: ArchiveFilters): Promise<PatientQueue[]> {
  try {
    let query = supabase
      .from('patients_queue')
      .select('id,patient_name,phone_number,Data_nascimento,data_exame,procedimentos,horario_inicio,replied_at,delivered_at,read_at,updated_at')
      .eq('status', 'delivered')

    if (filters.dateRange?.from) {
      const fromStr = format(filters.dateRange.from, 'yyyy-MM-dd')
      query = query.gte('data_exame', fromStr)
    }
    if (filters.dateRange?.to) {
      const toStr = format(filters.dateRange.to, 'yyyy-MM-dd')
      query = query.lte('data_exame', toStr)
    }

    if (filters.search) {
      const searchLower = `%${filters.search.toLowerCase()}%`
      query = query.or(
        `patient_name.ilike.${searchLower},phone_number.ilike.${searchLower}`,
      )
    }

    query = query.order('updated_at', { ascending: false, nullsFirst: false }).limit(200)

    const { data, error } = await query

    if (error) throw error
    return data as PatientQueue[]
  } catch (e) {
    console.warn('Using mock data for archive due to error:', e)
    // Fallback logic for mock data matching filters
    let filtered: UiPatientQueue[] = MOCK_PATIENTS
    filtered = filtered.filter((p) => Boolean((p as any).delivered_at))
    if (filters.search) {
      const s = filters.search.toLowerCase()
      filtered = filtered.filter(
        (p) =>
          p.patient_name.toLowerCase().includes(s) ||
          p.phone_number.toLowerCase().includes(s),
      )
    }

    if (filters.dateRange?.from || filters.dateRange?.to) {
      filtered = filtered.filter((p) => {
        if (!p.data_exame) return false
        if (filters.dateRange?.from && p.data_exame < format(filters.dateRange.from, 'yyyy-MM-dd')) return false
        if (filters.dateRange?.to && p.data_exame > format(filters.dateRange.to, 'yyyy-MM-dd')) return false
        return true
      })
    }

    return filtered as PatientQueue[]
  }
}
