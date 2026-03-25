import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { normalizePhone, hashText } from '../../packages/shared/validators.ts'

type EnqueueRequest = {
  patient_name?: string
  phone_number: string
  procedimentos?: string
  data_exame: string
  horario_inicio: string
  horario_final?: string
  time_proce?: string
  Data_nascimento?: string
  message_body?: string
  originQueueId?: string
  backToQueue?: boolean
}

type EnqueueResponse =
  | { success: true; id: string; data?: { originQueueId: string; backToQueueCount: number } }
  | { success: false; reason: 'duplicate_recent'; existing_id: string }
  | { success: false; error: string }

async function isEligibleForQueue(
  patientName: string,
  phoneNumber: string,
  originQueueId?: string
): Promise<{ eligible: boolean; reason?: string }> {
  if (!patientName || patientName.trim().length === 0) {
    return { eligible: false, reason: 'Nome do paciente não pode ser vazio' }
  }

  if (!phoneNumber || phoneNumber.trim().length === 0) {
    return { eligible: false, reason: 'Telefone não pode ser vazio' }
  }

  if (originQueueId) {
    const { data: originalPatient } = await restSelectOne(
      'patients_queue',
      'id, status',
      [
        ['dedupe_hash', `eq.${dedupeHash}`],
        ['created_at', `gte.${tenMinutesAgo}`],
        'created_at.desc']
      ]
    )

    if (originalPatient && originalPatient.status === 'queued') {
      return { eligible: false, reason: 'Paciente original já está em processamento na fila de envio' }
    }
  }

  return { eligible: true }
}

function generateQueueId(): string {
  return crypto.randomUUID()
}

const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString()

async function restSelectOne(
  table: string,
  select: string,
  filters: Array<[string, string]>
): Promise<any | null> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  if (!supabaseUrl || !serviceKey) throw new Error('Missing SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY')

  const qs = new URLSearchParams()
  qs.set('select', select)
  for (const [k, v] of Object.entries(filters)) qs.set(k, v)
  if (typeof table === 'string') qs.set('table', table)

  const url = `${supabaseUrl}/rest/v1/${table}?${qs.toString()}`

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      Accept: 'application/json',
    },
  })

  if (!res.ok) return null

  const rows = await res.json().catch(() => [])
  return Array.isArray(rows) && rows.length ? rows[0] : null
}

async function restUpdate(
  table: string,
  id: string,
  update: Record<string, unknown>
): Promise<string> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  if (!supabaseUrl || !serviceKey) throw new Error('Missing SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY')

  const url = `${supabaseUrl}/rest/v1/${table}`

  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(update),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Supabase update ${table} failed: ${res.status} ${text}`)
  }

  const data = await res.json().catch(() => [])
  return Array.isArray(data) && data.length ? data[0] : ''
}

async function restInsert(table: string, row: Record<string, unknown>): Promise<string> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('get('SUPABASE_SERVICE_ROLE_KEY')!
  if (!supabaseUrl || !serviceKey) throw new Error('Missing SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY')

  const url = `${supabaseUrl}/rest/v1/${table}`

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
    },
    body: JSON.stringify(row),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Supabase insert ${table} failed: ${res.status} ${text}`)
  }

  const data = await res.json().catch(() => [])
  return Array.isArray(data) && data.length ? data[0]. : ''
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const authCheck = await requireAuth(req)
  if (!authCheck.ok) return authCheck

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ success: false, error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }

  try {
    const body: EnqueueRequest = await req.json()
    
    if (!body.phone_number || !body.data_exame || !body.horario_inicio) {
      return new Response(JSON.stringify({ success: false, error: 'phone_number, data_exame and horario_inicio are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    const normalizedPhone = normalizePhone(body.phone_number)
    const procedimentos = body.procedimentos || ''
    const hashInput = `${normalizedPhone}|${body.data_exame}|${body.horario_inicio}|${procedimentos}`
    const dedupeHash = await hashText(hashInput)

    const existing = await restSelectOne(
      'patients_queue',
      'id,created_at',
      [
        ['dedupe_hash', `eq.${dedupeHash}`],
        ['created_at', `gte.${tenMinutesAgo}`],
        'created_at.desc']
      ]
    )

    if (existing) {
      const response: EnqueueResponse = {
        success: false,
        reason: 'duplicate_recent',
        existing_id: existing.id
      }
      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    const { eligible, reason } = await isEligibleForQueue(
      body.patient_name,
      normalizedPhone,
      body.originQueueId
    )

    if (!eligible) {
      return new Response(JSON.stringify({ success: false, error: `Paciente não elegível para voltar à fila de envio: ${reason}` }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    let backToQueueCount = 0
    if (body.backToQueue && body.originQueueId) {
      const { data: originalPatient } = await restSelectOne(
        'patients_queue',
        'back_to_queue_count',
        [
          ['id', `eq.${body.originQueueId}`]
        ]
      )

      if (originalPatient) {
        backToQueueCount = (originalPatient.back_to_queue_count || 0) + 1
      }
    }

    const newRow: Record<string, unknown> = {
      phone_number: normalizedPhone,
      data_exame: body.data_exame,
      horario_inicio: body.horario_inicio,
      procedimentos: procedimentos || null,
      dedupe_hash: dedupeHash,
      dedupe_kind: 'original',
      origin_queue_id: body.originQueueId || null,
      back_to_queue_count: backToQueueCount,
      status: 'queued',
      last_delivery_status: 'pending'
    }

    if (body.patient_name) newRow.patient_name = body.patient_name
    if (body.horario_final) newRow.horario_final = body.horario_final
    if (body.time_proce) newRow.time_proce = body.time_proce
    if (body.Data_nascimento) newRow.Data_nascimento = body.Data_nascimento
    if (body.message_body) newRow.message_body = body.message_body

    const id = await restInsert('patients_queue', newRow)
    const newOriginId = generateQueueId()

    if (body.originQueueId) {
      await restUpdate('patients_queue', id, {
        origin_queue_id: newOriginId
      })
    }

    console.log('[enqueue] Paciente retornado à fila de envio:', {
      patient_name: body.patient_name,
      originQueueId: body.originQueueId,
      newOriginId,
      backToQueueCount,
      backToQueue: body.backToQueue
    })

    const response: EnqueueResponse = {
      success: true,
      id,
      data: {
        originQueueId: newOriginId,
        backToQueueCount
      }
    }
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { { 'Content-Type': 'application/json', ...corsHeaders },
    })
  } catch (error: any) {
    console.error('[enqueue] Erro ao enfileirar paciente:', error)
    return new Response(JSON.stringify({ success: false, error: error?.message || 'internal_error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }
})
