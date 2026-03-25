import { supabase } from '@/lib/supabase/client'
import type {
  StrategicFollowupRow,
  VacancyCandidateRow,
  JourneyTimelineItem,
  JourneyStatus,
  ManualPriority,
} from '@/types'

export async function fetchStrategicFollowupOverview(): Promise<StrategicFollowupRow[]> {
  try {
    const { data, error } = await supabase.rpc('get_strategic_followup_overview')

    if (error) throw error
    return (data || []) as StrategicFollowupRow[]
  } catch (e) {
    console.error('Error fetching strategic followup overview:', e)
    return []
  }
}

export async function fetchVacancyCandidatesOverview(): Promise<VacancyCandidateRow[]> {
  try {
    const { data, error } = await supabase.rpc('get_vacancy_candidates_overview')

    if (error) throw error
    return (data || []) as VacancyCandidateRow[]
  } catch (e) {
    console.error('Error fetching vacancy candidates overview:', e)
    return []
  }
}

export async function fetchJourneyTimeline(journeyId: string): Promise<JourneyTimelineItem[]> {
  try {
    const { data, error } = await (supabase.rpc as any)('get_journey_timeline', {
      p_journey_id: journeyId,
    })

    if (error) throw error
    return (data || []) as JourneyTimelineItem[]
  } catch (e) {
    console.error('Error fetching journey timeline:', e)
    return []
  }
}

export async function updateJourneyManualPriority(
  journeyId: string,
  priority: ManualPriority,
): Promise<boolean> {
  try {
    const { error } = await (supabase.from('patient_journeys') as any).update({
      manual_priority: priority,
      updated_at: new Date().toISOString(),
    }).eq('id', journeyId)

    if (error) throw error
    return true
  } catch (e) {
    console.error('Error updating journey manual priority:', e)
    return false
  }
}

export async function updateJourneyStatus(
  journeyId: string,
  status: JourneyStatus,
  manualNote?: string,
): Promise<boolean> {
  try {
    const updates: any = {
      journey_status: status,
      updated_at: new Date().toISOString(),
    }

    if (manualNote !== undefined) {
      updates.manual_note = manualNote
    }

    const { error } = await (supabase.from('patient_journeys') as any).update(updates).eq('id', journeyId)

    if (error) throw error
    return true
  } catch (e) {
    console.error('Error updating journey status:', e)
    return false
  }
}

export async function markJourneyAsResolved(journeyId: string, resolvedAt?: string): Promise<boolean> {
  try {
    const { error } = await (supabase.from('patient_journeys') as any).update({
      resolved_at: resolvedAt || new Date().toISOString(),
      journey_status: 'confirmed',
      updated_at: new Date().toISOString(),
    }).eq('id', journeyId)

    if (error) throw error
    return true
  } catch (e) {
    console.error('Error marking journey as resolved:', e)
    return false
  }
}

export async function archiveJourney(journeyId: string): Promise<boolean> {
  try {
    const { error } = await (supabase.from('patient_journeys') as any).update({
      journey_status: 'archived',
      updated_at: new Date().toISOString(),
    }).eq('id', journeyId)

    if (error) throw error
    return true
  } catch (e) {
    console.error('Error archiving journey:', e)
    return false
  }
}

export async function returnJourneyToPending(journeyId: string): Promise<boolean> {
  try {
    const { error } = await (supabase.from('patient_journeys') as any).update({
      journey_status: 'pending_manual',
      pending_at: new Date().toISOString(),
      needs_manual_action: true,
      updated_at: new Date().toISOString(),
    }).eq('id', journeyId)

    if (error) throw error
    return true
  } catch (e) {
    console.error('Error returning journey to pending:', e)
    return false
  }
}

export async function fetchPatientListForSearch(searchQuery: string): Promise<
  Array<{
    journey_id: string
    patient_name: string
    canonical_phone: string
    data_exame: string | null
  }>
> {
  try {
    const { data, error } = await supabase
      .from('patient_journeys')
      .select('id, patient_name, canonical_phone, data_exame')
      .or(`patient_name.ilike.%${searchQuery}%,canonical_phone.ilike.%${searchQuery}%`)
      .limit(20)

    if (error) throw error

    return (
      (data || []).map((item: any) => ({
        journey_id: item.id,
        patient_name: item.patient_name,
        canonical_phone: item.canonical_phone,
        data_exame: item.data_exame,
      })) || []
    )
  } catch (e) {
    console.error('Error fetching patient list for search:', e)
    return []
  }
}
