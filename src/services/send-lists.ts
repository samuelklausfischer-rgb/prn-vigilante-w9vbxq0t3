import { supabase } from '@/lib/supabase/client'
import type {
  LegacyListGroup,
  LegacyListPatient,
  PatientQueue,
  SendList,
  SendListStatus,
  SendListSummary,
} from '@/types'

type StatusCounter = Record<SendListStatus | 'unknown', number>

function buildCounters(items: PatientQueue[]): StatusCounter {
  const counters: StatusCounter = {
    draft: 0,
    queued: 0,
    in_progress: 0,
    completed: 0,
    cancelled: 0,
    unknown: 0,
  }

  for (const item of items) {
    if (item.status === 'queued') counters.queued += 1
    else if (item.status === 'sending') counters.in_progress += 1
    else if (item.status === 'delivered') counters.completed += 1
    else if (item.status === 'cancelled') counters.cancelled += 1
    else counters.unknown += 1
  }

  return counters
}

function deriveListStatus(baseStatus: SendListStatus, counters: StatusCounter): SendListStatus {
  if (baseStatus === 'cancelled') return 'cancelled'
  if (baseStatus === 'draft') return 'draft'
  if (counters.in_progress > 0) return 'in_progress'
  if (counters.queued > 0) return 'queued'
  if (counters.completed > 0 && counters.queued === 0 && counters.in_progress === 0) return 'completed'
  return baseStatus
}

function deriveLegacyStatus(group: Pick<LegacyListGroup, 'queued_count' | 'in_progress_count' | 'completed_count' | 'failed_count' | 'cancelled_count' | 'total_patients'>): SendListStatus {
  if (group.in_progress_count > 0) return 'in_progress'
  if (group.queued_count > 0 || group.failed_count > 0) return 'queued'
  if (group.total_patients > 0 && group.cancelled_count === group.total_patients) return 'cancelled'
  if (group.completed_count > 0) return 'completed'
  return 'draft'
}

export async function fetchLegacyListGroups(): Promise<LegacyListGroup[]> {
  const [{ data: patientsData, error: patientsError }, { data: instancesData, error: instancesError }] = await Promise.all([
    (supabase.from('patients_queue') as any)
      .select('id, patient_name, phone_number, data_exame, horario_inicio, horario_final, procedimentos, status, locked_instance_id, created_at')
      .is('send_list_id', null)
      .order('created_at', { ascending: false }),
    supabase
      .from('whatsapp_instances')
      .select('id, instance_name'),
  ])

  if (patientsError) throw patientsError
  if (instancesError) throw instancesError

  const instanceNameById = new Map<string, string>()
  for (const instance of (instancesData || []) as any[]) {
    instanceNameById.set(String(instance.id), String(instance.instance_name || 'Canal sem nome'))
  }

  const groups = new Map<string, LegacyListGroup>()
  for (const row of (patientsData || []) as any[]) {
    const patient: LegacyListPatient = {
      id: String(row.id),
      patient_name: String(row.patient_name || ''),
      phone_number: String(row.phone_number || ''),
      data_exame: row.data_exame || null,
      horario_inicio: row.horario_inicio || null,
      horario_final: row.horario_final || null,
      procedimentos: row.procedimentos || null,
      status: row.status,
      locked_instance_id: row.locked_instance_id || null,
      created_at: String(row.created_at),
    }

    const instanceId = patient.locked_instance_id || null
    const examDate = patient.data_exame || null
    const key = `${instanceId || 'sem-canal'}__${examDate || 'sem-data'}`

    if (!groups.has(key)) {
      const instanceName = instanceId ? instanceNameById.get(instanceId) || 'Canal desconhecido' : 'Sem canal'
      const dateLabel = examDate || 'Data nao informada'
      groups.set(key, {
        id: key,
        source: 'legacy',
        title: `${instanceName} | ${dateLabel}`,
        instance_id: instanceId,
        instance_name: instanceName,
        exam_date: examDate,
        status: 'queued',
        total_patients: 0,
        queued_count: 0,
        in_progress_count: 0,
        completed_count: 0,
        failed_count: 0,
        cancelled_count: 0,
        patients: [],
      })
    }

    const group = groups.get(key)!
    group.total_patients += 1
    group.patients.push(patient)

    if (patient.status === 'queued') group.queued_count += 1
    else if (patient.status === 'sending') group.in_progress_count += 1
    else if (patient.status === 'delivered') group.completed_count += 1
    else if (patient.status === 'failed') group.failed_count += 1
    else if (patient.status === 'cancelled') group.cancelled_count += 1
  }

  const list = Array.from(groups.values())
  for (const group of list) {
    group.status = deriveLegacyStatus(group)
    group.patients.sort((a, b) => {
      const hourA = a.horario_inicio || '99:99'
      const hourB = b.horario_inicio || '99:99'
      if (hourA !== hourB) return hourA.localeCompare(hourB)
      return a.patient_name.localeCompare(b.patient_name)
    })
  }

  list.sort((a, b) => {
    const dateA = a.exam_date || ''
    const dateB = b.exam_date || ''
    if (dateA !== dateB) return dateB.localeCompare(dateA)
    return (a.instance_name || '').localeCompare(b.instance_name || '')
  })

  return list
}

export async function convertLegacyGroupToSendList(group: LegacyListGroup): Promise<{ sendListId: string }> {
  if (!group.patients || group.patients.length === 0) {
    throw new Error('Nao ha pacientes para converter nesta lista legada.')
  }

  const defaultName = `${group.instance_name || 'Sem canal'} | ${group.exam_date || 'Data nao informada'}`
  const { data: sendList, error: createError } = await (supabase.from('send_lists') as any)
    .insert({
      name: defaultName,
      exam_date: group.exam_date || null,
      locked_instance_id: group.instance_id || null,
      status: group.status || 'queued',
      notes: 'Lista convertida automaticamente a partir de agrupamento legado.',
      updated_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (createError) throw createError

  const sendListId = String(sendList?.id || '')
  if (!sendListId) {
    throw new Error('Falha ao criar lista cadastrada para o grupo legado.')
  }

  const patientIds = group.patients.map((patient) => patient.id)
  const { error: updateError } = await (supabase.from('patients_queue') as any)
    .update({ send_list_id: sendListId, updated_at: new Date().toISOString() })
    .in('id', patientIds)
    .is('send_list_id', null)

  if (updateError) throw updateError

  return { sendListId }
}

export async function fetchSendLists(): Promise<SendListSummary[]> {
  const [{ data: listsData, error: listsError }, { data: instancesData, error: instancesError }] = await Promise.all([
    (supabase.from('send_lists') as any)
      .select('*')
      .order('created_at', { ascending: false }),
    supabase
      .from('whatsapp_instances')
      .select('id, instance_name, phone_number'),
  ])

  if (listsError) throw listsError
  if (instancesError) throw instancesError

  const lists = (listsData || []) as SendList[]
  if (lists.length === 0) return []

  const listIds = lists.map((list) => list.id)
  const { data: patientsData, error: patientsError } = await (supabase.from('patients_queue') as any)
    .select('id, status, send_list_id')
    .in('send_list_id', listIds)

  if (patientsError) throw patientsError

  const instanceById = new Map<string, { instance_name: string | null; phone_number: string | null }>()
  for (const raw of (instancesData || []) as any[]) {
    instanceById.set(String(raw.id), {
      instance_name: raw.instance_name,
      phone_number: raw.phone_number,
    })
  }

  const patientsByListId = new Map<string, PatientQueue[]>()
  for (const row of (patientsData || []) as any[]) {
    const listId = String(row.send_list_id || '')
    if (!listId) continue
    const current = patientsByListId.get(listId) || []
    current.push(row as PatientQueue)
    patientsByListId.set(listId, current)
  }

  return lists.map((list) => {
    const patients = patientsByListId.get(list.id) || []
    const counters = buildCounters(patients)
    const instanceMeta = list.locked_instance_id ? instanceById.get(String(list.locked_instance_id)) : undefined
    const status = deriveListStatus(list.status, counters)

    return {
      ...list,
      status,
      total_patients: patients.length,
      queued_count: counters.queued,
      in_progress_count: counters.in_progress,
      completed_count: counters.completed,
      cancelled_count: counters.cancelled,
      unknown_count: counters.unknown,
      locked_instance_name: instanceMeta?.instance_name || null,
      locked_instance_phone: instanceMeta?.phone_number || null,
    } as SendListSummary
  })
}

export async function fetchSendListPatients(sendListId: string): Promise<PatientQueue[]> {
  const { data, error } = await (supabase.from('patients_queue') as any)
    .select('*')
    .eq('send_list_id', sendListId)
    .order('queue_order', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true })

  if (error) throw error
  return (data || []) as PatientQueue[]
}

export async function updateSendList(sendListId: string, updates: Partial<SendList>) {
  const { error } = await (supabase.from('send_lists') as any)
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', sendListId)

  if (error) throw error
}

export async function reassignSendListInstance(sendListId: string, instanceId: string | null) {
  await updateSendList(sendListId, { locked_instance_id: instanceId })

  const eligibleStatuses = ['queued', 'failed']
  const { error } = await (supabase.from('patients_queue') as any)
    .update({ locked_instance_id: instanceId, updated_at: new Date().toISOString() })
    .eq('send_list_id', sendListId)
    .in('status', eligibleStatuses)

  if (error) throw error
}

export async function cancelSendList(sendListId: string) {
  await updateSendList(sendListId, { status: 'cancelled' })

  const { error } = await (supabase.from('patients_queue') as any)
    .update({
      status: 'cancelled',
      notes: 'Cancelado pelo operador na aba Listas.',
      updated_at: new Date().toISOString(),
    })
    .eq('send_list_id', sendListId)
    .eq('status', 'queued')

  if (error) throw error
}

export async function deleteSendList(sendListId: string) {
  const { data: rows, error: rowsError } = await (supabase.from('patients_queue') as any)
    .select('id, status')
    .eq('send_list_id', sendListId)

  if (rowsError) throw rowsError

  const hasUnsafeStatus = (rows || []).some((row: any) => !['queued', 'cancelled'].includes(String(row.status)))
  if (hasUnsafeStatus) {
    throw new Error('Nao e possivel excluir: existe paciente ja processado nesta lista.')
  }

  const ids = (rows || []).map((row: any) => row.id)
  if (ids.length > 0) {
    const { error: deleteQueueError } = await (supabase.from('patients_queue') as any)
      .delete()
      .in('id', ids)
    if (deleteQueueError) throw deleteQueueError
  }

  const { error: deleteListError } = await (supabase.from('send_lists') as any)
    .delete()
    .eq('id', sendListId)

  if (deleteListError) throw deleteListError
}
