import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

import { corsHeaders } from '../_shared/cors.ts'

type QualificationClass = 'confirmado_positivo' | 'quer_remarcar' | 'nao_pode_comparecer' | 'cancelado' | 'duvida' | 'ambigua' | 'sem_resposta_util'

type JourneyStatus = 'queued' | 'contacting' | 'delivered_waiting_reply' | 'followup_due' | 'followup_sent' | 'confirmed' | 'pending_manual' | 'cancelled' | 'archived'

type ProcessClassificationRequest = {
  classification_id: string
}

type ProcessClassificationResponse = {
  success: boolean
  data?: {
    classification_id: string
    journey_id: string
    action_taken: 'auto_confirmed' | 'no_action_needed' | 'skipped_low_confidence' | 'skipped_already_processed'
    reason: string
  }
  error?: string
}

function getSupabase() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceKey) throw new Error('Missing SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY')
  return { supabaseUrl, serviceKey }
}

async function restSelectOne(
  table: string,
  select: string,
  filters: Array<[string, string]>,
): Promise<any | null> {
  const { supabaseUrl, serviceKey } = getSupabase()
  const qs = new URLSearchParams()
  qs.set('select', select)
  for (const [k, v] of filters) qs.set(k, v)
  qs.set('limit', '1')
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

async function restPatch(table: string, match: Record<string, string>, patch: Record<string, unknown>): Promise<void> {
  const { supabaseUrl, serviceKey } = getSupabase()
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries(match)) qs.set(k, `eq.${v}`)
  const url = `${supabaseUrl}/rest/v1/${table}?${qs.toString()}`

  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(patch),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Supabase patch ${table} failed: ${res.status} ${text}`)
  }
}

async function restInsert(table: string, row: Record<string, unknown>): Promise<void> {
  const { supabaseUrl, serviceKey } = getSupabase()
  const res = await fetch(`${supabaseUrl}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(row),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Supabase insert ${table} failed: ${res.status} ${text}`)
  }
}

function shouldAutoConfirm(
  classification: QualificationClass,
  confidence: number,
  journeyStatus: JourneyStatus,
): boolean {
  return (
    classification === 'confirmado_positivo' &&
    confidence >= 0.90 &&
    journeyStatus !== 'confirmed' &&
    journeyStatus !== 'archived'
  )
}

async function executeAutoConfirmation(
  journeyId: string,
  classificationId: string,
  confidence: number,
): Promise<void> {
  const now = new Date().toISOString()

  const journeyUpdate: Record<string, string | boolean | null> = {
    journey_status: 'confirmed',
    confirmed_at: now,
    needs_manual_action: false,
    manual_priority: null,
    last_event_at: now,
  }

  await restPatch('patient_journeys', { id: journeyId }, journeyUpdate)

  const queueUpdate: Record<string, string | null> = {
    status: 'delivered',
    resolved_at: now,
    current_outcome: 'confirmed',
  }

  await restPatch('patients_queue', { journey_id: journeyId }, queueUpdate)

  await restInsert('journey_events', {
    journey_id: journeyId,
    event_type: 'auto_confirmed_by_ai',
    event_at: now,
    source: 'ai',
    payload: {
      classification_id: classificationId,
      confidence: confidence,
      reason: 'Confirmacao positiva com confianca >= 90%',
    },
  })
}

async function markAsProcessed(classificationId: string): Promise<void> {
  await restPatch('message_qualifications', { id: classificationId }, { processed: true })
}

function getBearerToken(req: Request): string | null {
  const auth = req.headers.get('authorization') || req.headers.get('Authorization')
  if (!auth) return null
  const m = auth.match(/^Bearer\s+(.+)$/i)
  return m?.[1]?.trim() || null
}

async function requireAuth(req: Request): Promise<{ ok: true; user: unknown } | { ok: false; res: Response }> {
  const token = getBearerToken(req)
  if (!token) {
    return {
      ok: false,
      res: new Response(JSON.stringify({ success: false, error: 'Missing Authorization Bearer token' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }),
    }
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || ''
  if (!supabaseUrl || !supabaseAnonKey) {
    return {
      ok: false,
      res: new Response(JSON.stringify({ success: false, error: 'Missing SUPABASE_URL/SUPABASE_ANON_KEY' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }),
    }
  }

  const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
    method: 'GET',
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${token}`,
    },
  }).catch(() => null)

  if (!res || !res.ok) {
    return {
      ok: false,
      res: new Response(JSON.stringify({ success: false, error: 'Invalid JWT' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }),
    }
  }

  const user = await res.json().catch(() => ({}))
  return { ok: true, user }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ success: false, error: 'Method not allowed' }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
      status: 405,
    })
  }

  try {
    const auth = await requireAuth(req)
    if (!auth.ok) return auth.res

    const body = await req.json().catch(() => ({})) as ProcessClassificationRequest
    const { classification_id } = body

    if (!classification_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'classification_id e obrigatorio' }),
        {
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
          status: 400,
        },
      )
    }

    console.log(`[process-classification] Processing classification ${classification_id}`)

    const qualification = await restSelectOne(
      'message_qualifications',
      '*',
      [['id', `eq.${classification_id}`]],
    )

    if (!qualification) {
      return new Response(
        JSON.stringify({ success: false, error: 'Classificacao nao encontrada' }),
        {
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
          status: 404,
        },
      )
    }

    if (qualification.processed) {
      console.log(`[process-classification] Classification ${classification_id} already processed`)

      return new Response(
        JSON.stringify({
          success: true,
          data: {
            classification_id,
            journey_id: qualification.journey_id,
            action_taken: 'skipped_already_processed',
            reason: 'Classificacao ja processada anteriormente',
          },
        }),
        {
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
          status: 200,
        },
      )
    }

    const journey = await restSelectOne(
      'patient_journeys',
      '*',
      [['id', `eq.${qualification.journey_id}`]],
    )

    if (!journey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Jornada nao encontrada' }),
        {
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
          status: 404,
        },
      )
    }

    const classification = qualification.classification as QualificationClass
    const confidence = Number(qualification.confidence) || 0
    const journeyStatus = journey.journey_status as JourneyStatus

    if (journeyStatus === 'archived') {
      console.log(`[process-classification] Journey ${journey.id} is archived, skipping`)

      await markAsProcessed(classification_id)

      return new Response(
        JSON.stringify({
          success: true,
          data: {
            classification_id,
            journey_id: journey.id,
            action_taken: 'no_action_needed',
            reason: 'Jornada arquivada, sem acoes automaticas',
          },
        }),
        {
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
          status: 200,
        },
      )
    }

    if (classification === 'confirmado_positivo' && confidence >= 0.90 && journeyStatus !== 'confirmed') {
      console.log(`[process-classification] Auto-confirming journey ${journey.id} with confidence ${confidence}`)

      await executeAutoConfirmation(journey.id, classification_id, confidence)
      await markAsProcessed(classification_id)

      return new Response(
        JSON.stringify({
          success: true,
          data: {
            classification_id,
            journey_id: journey.id,
            action_taken: 'auto_confirmed',
            reason: `Confirmacao positiva com confianca ${Math.round(confidence * 100)}%`,
          },
        }),
        {
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
          status: 200,
        },
      )
    }

    if (classification === 'confirmado_positivo' && confidence < 0.90) {
      console.log(`[process-classification] Low confidence (${confidence}) for confirmado_positivo, marking for manual review`)

      const updateJourney: Record<string, string | boolean | null> = {
        needs_manual_action: true,
        last_event_at: new Date().toISOString(),
      }

      if (journeyStatus === 'delivered_waiting_reply' || journeyStatus === 'followup_due' || journeyStatus === 'followup_sent') {
        updateJourney.journey_status = 'pending_manual'
        updateJourney.pending_at = new Date().toISOString()
      }

      await restPatch('patient_journeys', { id: journey.id }, updateJourney)
      await markAsProcessed(classification_id)

      return new Response(
        JSON.stringify({
          success: true,
          data: {
            classification_id,
            journey_id: journey.id,
            action_taken: 'skipped_low_confidence',
            reason: `Confirmacao positiva com confianca baixa (${Math.round(confidence * 100)}%), enviado para revisao manual`,
          },
        }),
        {
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
          status: 200,
        },
      )
    }

    console.log(`[process-classification] Classification ${classification} does not require auto-action`)

    await markAsProcessed(classification_id)

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          classification_id,
          journey_id: journey.id,
          action_taken: 'no_action_needed',
          reason: `Classificacao ${classification} nao requer acao automatica, ja configurada para acao manual`,
        },
      }),
      {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
        status: 200,
      },
    )
  } catch (error: any) {
    const msg = String(error?.message || 'Erro interno')
    console.error(`[process-classification] Error: ${msg}`, error)

    return new Response(
      JSON.stringify({
        success: false,
        error: msg,
      }),
      {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
        status: 500,
      },
    )
  }
})