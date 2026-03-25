import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

import { corsHeaders } from '../_shared/cors.ts'

type QualificationClass = 'confirmado_positivo' | 'quer_remarcar' | 'nao_pode_comparecer' | 'cancelado' | 'duvida' | 'ambigua' | 'sem_resposta_util'

type QualificationAction = 'close_as_confirmed' | 'move_to_pending' | 'flag_vacancy' | 'manual_review' | 'ignore'

type ManualPriority = 'low' | 'medium' | 'high' | 'urgent'

type JourneyStatus = 'queued' | 'contacting' | 'delivered_waiting_reply' | 'followup_due' | 'followup_sent' | 'confirmed' | 'pending_manual' | 'cancelled' | 'archived'

type LLMResponse = {
  classification: QualificationClass
  confidence: number
  summary: string
  recommended_action: QualificationAction
  vacancy_signal: boolean
  vacancy_reason?: string
  needs_manual_review: boolean
}

type ClassificationRequest = {
  message_id: string
  journey_id: string
  message_body: string
}

type ClassificationResponse = {
  success: boolean
  data?: {
    qualification_id: string
    journey_id: string
    classification: QualificationClass
    confidence: number
    summary: string
    recommended_action: QualificationAction
    vacancy_signal: boolean
    vacancy_reason?: string
    needs_manual_review: boolean
  }
  error?: string
}

const SYSTEM_MESSAGE = 'Voce e um classificador operacional de respostas de pacientes no WhatsApp sobre confirmacao de exame. Retorne apenas JSON valido. Sem markdown. Sem texto extra.'

function determineManualPriority(classification: QualificationClass): ManualPriority {
  switch (classification) {
    case 'cancelado':
      return 'urgent'
    case 'nao_pode_comparecer':
      return 'high';
    case 'quer_remarcar':
    case 'duvida':
    case 'ambigua':
      return 'medium';
    default:
      return 'low'
  }
}

function determineVacancyReason(classification: QualificationClass, message: string): string | undefined {
  switch (classification) {
    case 'quer_remarcar':
      return 'Paciente quer outro horario'
    case 'nao_pode_comparecer':
      return 'Paciente nao pode comparecer'
    case 'cancelado':
      return 'Paciente cancelou'
    default:
      return undefined
  }
}

function determineRecommendedAction(classification: QualificationClass): QualificationAction {
  switch (classification) {
    case 'confirmado_positivo':
      return 'close_as_confirmed';
    case 'quer_remarcar':
    case 'nao_pode_comparecer':
    case 'cancelado':
      return 'flag_vacancy';
    case 'duvida':
    case 'ambigua':
      return 'manual_review';
    case 'sem_resposta_util':
      return 'ignore';
    default:
      return 'manual_review'
  }
}

function getPrompt(messageBody: string): string {
  return [
    'Classifique a resposta do paciente em exatamente uma categoria:',
    '',
    '- confirmado_positivo',
    '- quer_remarcar',
    '- nao_pode_comparecer',
    '- cancelado',
    '- duvida',
    '- ambigua',
    '- sem_resposta_util',
    '',
    'Exemplos por categoria (Hospital São Benedito):',
    '',
    'confirmado_positivo:',
    '- "sim", "sim, vou", "confirmado", "estarei lá", "ok", "certo"',
    '- "pode confirmar", "confirmo", "blz", "tá certo"',
    '- "sim, às 7h", "confirmado para 14:30"',
    '',
    'quer_remarcar:',
    '- "posso remarcar", "queria outro horário", "preciso mudar"',
    '- "será que tem 8h?", "tem horário da tarde?", "posso para as 19h?"',
    '- "nao consigo às 7h", "prefereia as 13h", "outro dia"',
    '',
    'nao_pode_comparecer:',
    '- "nao vou poder", "nao consigo comparecer", "nao vai dar"',
    '- "estou doente", "estou fora da cidade", "tenho outro exame"',
    '- "trabalho nesse horário", "nao tenho como ir"',
    '',
    'cancelado:',
    '- "quero cancelar", "cancelar por favor", "nao preciso mais"',
    '- "desistir", "nao vou fazer o exame", "cancelar agendamento"',
    '- "ja fiz o exame", "ja marquei em outro lugar"',
    '',
    'duvida:',
    '- "preciso de jejum?", "posso comer?", "o que é ressonância?"',
    '- "qual endereço?", "onde é?", "tem estacionamento?"',
    '- "preciso levar algo?", "o que levar?"',
    '',
    'ambigua:',
    '- "tô pensando", "vou ver", "ainda não sei"',
    '- "quero confirmar mas... (incompleto)", "acho que vai"',
    '- "talvez", "provavelmente", "se der pra ir"',
    '',
    'sem_resposta_util:',
    '- "ok" (sem contexto), "👍", "👍🏽", "entendido"',
    '- "recebi", "mensagem recebida", "obrigado"',
    '- "👋", "😊", emojis apenas',
    '',
    'Regras:',
    '- Se houver confirmacao clara de comparecimento, use confirmado_positivo',
    '- Se houver pedido de outro horario, remarcar ou troca de horario, use quer_remarcar',
    '- Se informar que nao consegue ir, nao pode comparecer ou nao vai, use nao_pode_comparecer',
    '- Se houver desistencia/cancelamento claro, use cancelado',
    '- Se a pessoa estiver perguntando algo sem confirmar, use duvida',
    '- Se a mensagem nao permitir decisao segura, use ambigua',
    '- Mensagens sem valor operacional real usam sem_resposta_util',
    '',
    'Retorne JSON com:',
    '{',
    '  "classification": "...",',
    '  "confidence": 0.0,',
    '  "summary": "...",',
    '  "recommended_action": "...",',
    '  "vacancy_signal": true|false,',
    '  "vacancy_reason": "...",',
    '  "needs_manual_review": true|false',
    '}',
    '',
    'Mensagem do paciente:',
    messageBody,
  ].join('\n')
}

function resolveGLMBaseUrl(rawUrl: string | undefined): { baseUrl: string; model: string; provider: 'bigmodel' | 'aimlapi' } {
  const defaultBigModelUrl = 'https://open.bigmodel.cn/api/paas/v4'
  const defaultModel = 'glm-4-flash'

  if (!rawUrl) {
    return { baseUrl: defaultBigModelUrl, model: defaultModel, provider: 'bigmodel' }
  }

  const normalized = rawUrl.toLowerCase().trim()
  if (normalized.includes('aimlapi.com')) {
    return { baseUrl: 'https://api.aimlapi.com/v1', model: 'zhipu/glm-4-flash', provider: 'aimlapi' }
  }

  if (normalized.includes('bigmodel.cn') || normalized.includes('open.bigmodel')) {
    return { baseUrl: 'https://open.bigmodel.cn/api/paas/v4', model: defaultModel, provider: 'bigmodel' }
  }

  return { baseUrl: defaultBigModelUrl, model: defaultModel, provider: 'bigmodel' }
}

function resolveGLMModel(
  rawModel: string | undefined,
  context: { provider: 'bigmodel' | 'aimlapi'; baseUrl: string; defaultModel: string },
): string {
  const configured = String(rawModel || '').trim()
  if (!configured) return context.defaultModel

  if (context.provider === 'bigmodel') {
    if (/^glm-/i.test(configured)) return configured
    return context.defaultModel
  }

  if (context.provider === 'aimlapi') {
    if (/^zhipu\//i.test(configured)) return configured
    return context.defaultModel
  }

  return context.defaultModel
}

async function callOpenAI(
  prompt: string,
  opts?: { maxTokens?: number; timeoutMs?: number; temperature?: number; attemptLabel?: string },
): Promise<string> {
  const apiKey = Deno.env.get('GLM_API_KEY')
  const rawBaseUrl = Deno.env.get('GLM_BASE_URL')
  const rawModel = Deno.env.get('GLM_MODEL')
  const { baseUrl, model: resolvedModel, provider } = resolveGLMBaseUrl(rawBaseUrl)
  const model = resolveGLMModel(rawModel, { provider, baseUrl, defaultModel: resolvedModel })

  if (!apiKey) throw new Error('GLM_API_KEY nao configurada na Edge Function.')

  const controller = new AbortController()
  const timeoutMs = opts?.timeoutMs ?? 60_000
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: opts?.temperature ?? 0.1,
      top_p: 1,
      max_tokens: opts?.maxTokens ?? 1000,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_MESSAGE },
        { role: 'user', content: prompt },
      ],
    }),
    signal: controller.signal,
  })
    .catch((e) => {
      if (e?.name === 'AbortError') {
        throw new Error(`LLM timeout apos ${Math.round(timeoutMs / 1000)}s${opts?.attemptLabel ? ` (${opts.attemptLabel})` : ''}.`)
      }
      throw e
    })
    .finally(() => clearTimeout(timeout))

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`LLM HTTP ${res.status}: ${body}`)
  }

  const json = await res.json()
  const content = json?.choices?.[0]?.message?.content
  if (!content) throw new Error('LLM retornou conteudo vazio.')
  return String(content)
}

async function callLLMWithRetry(prompt: string): Promise<LLMResponse> {
  try {
    const content = await callOpenAI(prompt, {
      maxTokens: 1000,
      timeoutMs: 60_000,
      temperature: 0.1,
      attemptLabel: 'tentativa_1',
    })
    return safeJsonParse(content)
  } catch (e: any) {
    const msg = String(e?.message || '')
    const shouldRetry =
      /conteudo vazio/i.test(msg) ||
      /conteúdo vazio/i.test(msg) ||
      /nao contem json/i.test(msg) ||
      /não contém JSON/i.test(msg) ||
      /json/i.test(msg) ||
      /502|503|504|timeout/i.test(msg)
    
    if (!shouldRetry) throw e

    const shorterPrompt = [
      'RETORNE SOMENTE JSON valido conforme o schema. Nao use markdown. Nao escreva texto fora do JSON.',
      '',
      prompt,
    ].join('\n')
    
    const content = await callOpenAI(shorterPrompt, {
      maxTokens: 800,
      timeoutMs: 75_000,
      temperature: 0.05,
      attemptLabel: 'retry_2',
    })
    return safeJsonParse(content)
  }
}

function safeJsonParse(text: string): LLMResponse {
  const cleaned = String(text || '')
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```/i, '')
    .replace(/```$/i, '')
    .trim()
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('Resposta do LLM nao contem JSON.')
  }
  const slice = cleaned.slice(start, end + 1)
  try {
    const parsed = JSON.parse(slice) as LLMResponse
    
    if (!parsed.classification) throw new Error('Campo classification ausente')
    if (typeof parsed.confidence !== 'number') throw new Error('Campo confidence invalido')
    if (!parsed.summary) throw new Error('Campo summary ausente')
    if (!parsed.recommended_action) throw new Error('Campo recommended_action ausente')
    if (typeof parsed.vacancy_signal !== 'boolean') throw new Error('Campo vacancy_signal invalido')
    if (typeof parsed.needs_manual_review !== 'boolean') throw new Error('Campo needs_manual_review invalido')
    
    return parsed
  } catch (error: any) {
    throw new Error(`JSON invalido do LLM: ${error?.message || 'falha no parse'}`)
  }
}

function getSupabase() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceKey) throw new Error('Missing SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY')
  return { supabaseUrl, serviceKey }
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

function generateUUID(): string {
  return crypto.randomUUID()
}

async function updateJourneyBasedOnClassification(
  journeyId: string,
  classification: QualificationClass,
): Promise<void> {
  const now = new Date().toISOString()
  const update: Record<string, string | boolean | null> = {
    last_event_at: now,
  }

  switch (classification) {
    case 'confirmado_positivo':
      update.journey_status = 'confirmed'
      update.confirmed_at = now
      update.needs_manual_action = false
      update.manual_priority = null
      break
    case 'cancelado':
    case 'nao_pode_comparecer':
    case 'quer_remarcar':
    case 'duvida':
    case 'ambigua':
      update.journey_status = 'pending_manual'
      update.pending_at = now
      update.needs_manual_action = true
      update.manual_priority = determineManualPriority(classification)
      break
    case 'sem_resposta_util':
      update.needs_manual_action = false
      update.manual_priority = null
      break
  }

  await restPatch('patient_journeys', { id: journeyId }, update)
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

    const body = await req.json().catch(() => ({})) as ClassificationRequest
    const { message_id, journey_id, message_body } = body

    if (!message_id || !journey_id || !message_body) {
      return new Response(
        JSON.stringify({ success: false, error: 'message_id, journey_id e message_body sao obrigatorios' }),
        {
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
          status: 400,
        },
      )
    }

    console.log(`[classify-message] Processing message ${message_id} for journey ${journey_id}`)

    const prompt = getPrompt(message_body)
    const llmResult = await callLLMWithRetry(prompt)

    const recommendedAction = determineRecommendedAction(llmResult.classification)
    const manualPriority = determineManualPriority(llmResult.classification)
    const vacancyReason = determineVacancyReason(llmResult.classification, message_body)

    const qualificationId = generateUUID()
    const qualification = {
      id: qualificationId,
      journey_id,
      message_id,
      classification: llmResult.classification,
      confidence: llmResult.confidence,
      summary: llmResult.summary,
      recommended_action: recommendedAction,
      vacancy_signal: llmResult.vacancy_signal,
      vacancy_reason: vacancyReason,
      needs_manual_review: llmResult.needs_manual_review,
      model_name: 'glm-4-flash',
      raw_output: llmResult,
      created_at: new Date().toISOString(),
    }

    await restInsert('message_qualifications', qualification)

    await updateJourneyBasedOnClassification(journey_id, llmResult.classification)

    console.log(
      `[classify-message] Message ${message_id} classified as ${llmResult.classification} with confidence ${llmResult.confidence}`,
    )

    const response: ClassificationResponse = {
      success: true,
      data: {
        qualification_id: qualificationId,
        journey_id,
        classification: llmResult.classification,
        confidence: llmResult.confidence,
        summary: llmResult.summary,
        recommended_action: recommendedAction,
        vacancy_signal: llmResult.vacancy_signal,
        vacancy_reason: vacancyReason,
        needs_manual_review: llmResult.needs_manual_review,
      },
    }

    return new Response(JSON.stringify(response), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
      status: 200,
    })
  } catch (error: any) {
    const msg = String(error?.message || 'Erro interno')
    console.error(`[classify-message] Error: ${msg}`, error)

    const status =
      /timeout/i.test(msg) || /LLM HTTP|Resposta do LLM|conteudo vazio|conteúdo vazio|JSON invalido|JSON invalido|nao contem JSON|não contém JSON/i.test(msg)
        ? 502
        : 500

    return new Response(
      JSON.stringify({
        success: false,
        error: msg,
      }),
      {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
        status,
      },
    )
  }
})
