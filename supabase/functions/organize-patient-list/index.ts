import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

import { corsHeaders } from '../_shared/cors.ts'
import { getExamDurationMinutes, getExamDurationsTable } from '../_shared/exam-durations.ts'

type AgendaStatus = 'agendado_dentro_janela' | 'fora_da_janela'

type PatientAgendaItem = {
  patient_name: string
  Data_nascimento?: string | null
  phone_number: string
  phone_2?: string | null
  phone_3?: string | null
  procedimentos: string
  time_proce: string
  tempo_total: string
  horario_inicio: string
  horario_final: string
  data_exame: string
  status_agenda: AgendaStatus
  message_body: string
}

type ParsedReportPatient = {
  patient_name: string
  Data_nascimento?: string | null
  phones: string[]
  procedimentos: string[]
  data_exame: string
  slot_base: string
  source_order: number
}

type ParsedSimplePatient = {
  patient_name: string
  Data_nascimento?: string | null
  phones: string[]
  procedimentos: string[]
  horario?: string | null
  source_order: number
}

const SYSTEM_MESSAGE =
  'Voce e um assistente de normalizacao de dados. Retorne apenas JSON valido. Sem markdown. Sem texto extra.'

const KNOWN_LABELS = [
  'CNS:',
  'Paciente:',
  'Nascimento:',
  'Horário:',
  'Horario:',
  'Idade:',
  'Origem:',
  'Telefone(s):',
  'Unidade Solicitante:',
  'Vaga Solicitada:',
  'Vaga Consumida:',
  'CID-10:',
  'Data/Hora:',
  'Chave:',
  'Procedimento(s):',
] as const

function timestamp() {
  return new Date().toISOString()
}

function logStep(step: string, details: Record<string, unknown> = {}) {
  console.log(`[organize-patient-list] ${timestamp()} ${step}`, details)
}

function normalizeAscii(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

function formatBrFromIso(iso: string): string {
  const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return iso
  const [, y, mm, dd] = m
  return `${dd}/${mm}/${y}`
}

function parseBrDateToIso(value: string): string | null {
  const m = String(value || '')
    .trim()
    .match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (!m) return null
  const [, dd, mm, yyyy] = m
  return `${yyyy}-${mm}-${dd}`
}

function buildMessageBody(params: {
  data_exame_iso: string
  horario: string
  nome?: string
  procedimentos?: string
}): string {
  const dataBr = formatBrFromIso(params.data_exame_iso)
  const nome = params.nome?.trim() || 'NAO INFORMADO'
  const procedimentos = params.procedimentos?.trim() || 'NAO INFORMADO'

  return `SEU EXAME JA ESTA MARCADO E FOI DESIGNADO UM *NOVO HORARIO PARA MELHOR ORGANIZACAO DO ATENDIMENTO*. AO LER ESTE TEXTO ABAIXO ENCONTRARA O HORARIO E TODAS AS INFORMACOES NECESSARIAS. *NAO E PERMITIDO ESCOLHER O HORARIO OU PERIODO.*

Ola! Aqui e Sara, representante do Hospital Sao Benedito
📍 Av. Sao Sebastiao, 3300 - Quilombo, Cuiaba - MT

👤 *PACIENTE:* ${nome}
🏥 *EXAME DE RESSONANCIA MAGNETICA DA(O):* ${procedimentos}
🕐 *HORARIO DO EXAME:* ${params.horario}
🕐 *DIA DO EXAME:* ${dataBr}

O HORARIO INFORMADO NO PEDIDO MEDICO NAO SE APLICA. DEFINIMOS UM *HORARIO INDIVIDUAL PARA EVITAR SUPERLOTACAO* E REDUZIR TEMPO DE ESPERA. Quando o pedido e realizado na unidade de saude, o sistema agenda automaticamente (07h, 13h ou 19h por ordem de chegada). Porem, para melhor organizacao, foi definido um horario individual para cada paciente, que deve ser respeitado.

📄 *DOCUMENTOS NECESSARIOS:*
• Cartao do SUS
• Pedido medico
• Documento de regulacao
• Laudos de exames anteriores (se por um acaso tiver exames anteriores *OBRIGATORIO TRAZE-LOS* para retirada do exame)

ABAIXO *INFORMACOES DE JEJUM* SE POR ACASO EM SEU PEDIDO ESTIVER ESCRITO NA FRENTE DO RESPECTIVO EXAME A PALAVRA: *C/C = COM CONTRASTE* OU *COM SEDACAO* PRECISARA DE JEJUM, CASO CONTRARIO NAO PRECISA DE JEJUM

✔ Exames com contraste -> 2 horas de jejum
✔ Exames com sedacao -> 8 horas de jejum
✔ Chegar com 15 minutos de antecedencia

📲 POSSO CONFIRMAR O SEU AGENDAMENTO?

*✔ Casos especificos:*
• Ressonancia de *pelve e vias biliares* -> 6 horas de jejum
• Ressonancia de *coracao e mama* -> 2 horas de jejum
• Ressonancia *com contraste* -> 2 horas de jejum
• Ressonancia *com sedacao* -> 8 horas de jejum`
}

function getBearerToken(req: Request): string | null {
  const auth = req.headers.get('authorization') || req.headers.get('Authorization')
  if (!auth) return null
  const m = auth.match(/^Bearer\s+(.+)$/i)
  return m?.[1]?.trim() || null
}

async function requireAuth(
  req: Request,
): Promise<{ ok: true; user: unknown } | { ok: false; res: Response }> {
  const token = getBearerToken(req)
  if (!token) {
    return {
      ok: false,
      res: new Response(
        JSON.stringify({ code: 401, message: 'Missing Authorization Bearer token' }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        },
      ),
    }
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || ''
  if (!supabaseUrl || !supabaseAnonKey) {
    return {
      ok: false,
      res: new Response(
        JSON.stringify({ code: 500, message: 'Missing SUPABASE_URL/SUPABASE_ANON_KEY' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        },
      ),
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
      res: new Response(JSON.stringify({ code: 401, message: 'Invalid JWT' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }),
    }
  }

  const user = await res.json().catch(() => ({}))
  return { ok: true, user }
}

function getPrompt(rawText: string) {
  return [
    'Organize os dados dos pacientes de forma clara, padronizada, estruturada e sem erros, com base nas informacoes presentes no texto enviado.',
    '',
    'Objetivo:',
    '- Extrair as informacoes principais de cada paciente (incluindo a data do agendamento).',
    '- Identificar procedimento(s), associar tempo padrao por exame.',
    '- Preservar exatamente o horario informado no texto quando existir o campo Horario/Horário.',
    '- Agrupar pacientes repetidos (mesmo nome).',
    '- Nao reorganizar a agenda quando o horario ja vier definido na lista.',
    '',
    'Regras obrigatorias:',
    '- Nao invente, nao complete e nao altere dados.',
    '- Se existir Horario/Horário para o paciente, use esse valor como horario_inicio exatamente como veio.',
    '- Nao recalcule, nao compacte e nao remaneje horarios que ja vierem definidos.',
    '- Ignore linhas operacionais como BLOQUEIO, SEDACAO e observacoes; elas nao sao pacientes.',
    '- Se houver multiplos procedimentos no mesmo paciente, some os tempos das duracoes mapeadas.',
    '- Contraste ja esta embutido nos tempos da tabela operacional quando aplicavel.',
    '- Se procedimento nao estiver mapeado: time_proce = "Tempo de exame nao definido".',
    '- Se ultrapassar 23:00: status_agenda = "fora_da_janela".',
    '- Ordem segue a ordem de aparicao (apos agrupamento).',
    '',
    'Tabela de tempos (keywords):',
    ...getExamDurationsTable(),
    '',
    'Formato de saida: RETORNE APENAS JSON valido, sem markdown, sem texto extra.',
    'JSON schema:',
    '{',
    '  "agenda_date": "YYYY-MM-DD",',
    '  "patients": [',
    '    {',
    '      "patient_name": "...",',
    '      "Data_nascimento": "DD/MM/AAAA" | null,',
    '      "phone_number": "...",',
    '      "phone_2": "..." | null,',
    '      "phone_3": "..." | null,',
    '      "procedimentos": "...",',
    '      "time_proce": "HH:MM:SS" | "Tempo de exame nao definido",',
    '      "tempo_total": "X min" | "1 hora" | "Tempo de exame nao definido",',
    '      "horario_inicio": "HH:MM",',
    '      "horario_final": "HH:MM",',
    '      "data_exame": "YYYY-MM-DD",',
    '      "status_agenda": "agendado_dentro_janela" | "fora_da_janela"',
    '    }',
    '  ]',
    '}',
    '',
    'Texto de entrada:',
    rawText,
  ].join('\n')
}

function resolveGLMBaseUrl(rawUrl: string | undefined): {
  baseUrl: string
  model: string
  provider: 'bigmodel' | 'aimlapi'
} {
  const defaultBigModelUrl = 'https://open.bigmodel.cn/api/paas/v4'
  const defaultModel = 'glm-4-flash'

  if (!rawUrl) {
    return { baseUrl: defaultBigModelUrl, model: defaultModel, provider: 'bigmodel' }
  }

  const normalized = rawUrl.toLowerCase().trim()
  if (normalized.includes('aimlapi.com')) {
    return {
      baseUrl: 'https://api.aimlapi.com/v1',
      model: 'zhipu/glm-4-flash',
      provider: 'aimlapi',
    }
  }

  if (normalized.includes('bigmodel.cn') || normalized.includes('open.bigmodel')) {
    return {
      baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
      model: defaultModel,
      provider: 'bigmodel',
    }
  }

  if (normalized.includes('z-ai.com')) {
    logStep('llm_base_url_fallback', {
      configuredBaseUrl: rawUrl,
      fallbackBaseUrl: defaultBigModelUrl,
      reason: 'unsupported_z_ai_endpoint',
    })
    return { baseUrl: defaultBigModelUrl, model: defaultModel, provider: 'bigmodel' }
  }

  logStep('llm_base_url_fallback', {
    configuredBaseUrl: rawUrl,
    fallbackBaseUrl: defaultBigModelUrl,
    reason: 'unknown_endpoint',
  })
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
    logStep('llm_model_fallback', {
      configuredModel: configured,
      fallbackModel: context.defaultModel,
      provider: context.provider,
      baseUrl: context.baseUrl,
      reason: 'invalid_model_for_bigmodel',
    })
    return context.defaultModel
  }

  if (context.provider === 'aimlapi') {
    if (/^zhipu\//i.test(configured)) return configured
    logStep('llm_model_fallback', {
      configuredModel: configured,
      fallbackModel: context.defaultModel,
      provider: context.provider,
      baseUrl: context.baseUrl,
      reason: 'invalid_model_for_aimlapi',
    })
    return context.defaultModel
  }

  return context.defaultModel
}

async function callOpenAI(
  prompt: string,
  opts?: { maxTokens?: number; timeoutMs?: number; temperature?: number; attemptLabel?: string },
) {
  const apiKey = Deno.env.get('GLM_API_KEY')
  const rawBaseUrl = Deno.env.get('GLM_BASE_URL')
  const rawModel = Deno.env.get('GLM_MODEL')
  const { baseUrl, model: resolvedModel, provider } = resolveGLMBaseUrl(rawBaseUrl)
  const model = resolveGLMModel(rawModel, { provider, baseUrl, defaultModel: resolvedModel })

  if (!apiKey) throw new Error('GLM_API_KEY nao configurada na Edge Function.')

  const controller = new AbortController()
  const timeoutMs = opts?.timeoutMs ?? 60_000
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  logStep('llm_request_started', {
    attempt: opts?.attemptLabel || 'tentativa_1',
    model,
    baseUrl,
    promptLength: prompt.length,
  })

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
      max_tokens: opts?.maxTokens ?? 2200,
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
        throw new Error(
          `LLM timeout apos ${Math.round(timeoutMs / 1000)}s${opts?.attemptLabel ? ` (${opts.attemptLabel})` : ''}.`,
        )
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
  logStep('llm_response_received', {
    attempt: opts?.attemptLabel || 'tentativa_1',
    contentLength: String(content).length,
  })
  return String(content)
}

async function callLLMWithRetry(prompt: string) {
  try {
    return await callOpenAI(prompt, {
      maxTokens: 2200,
      timeoutMs: 60_000,
      temperature: 0.1,
      attemptLabel: 'tentativa_1',
    })
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
    return await callOpenAI(shorterPrompt, {
      maxTokens: 1800,
      timeoutMs: 75_000,
      temperature: 0.05,
      attemptLabel: 'retry_2',
    })
  }
}

function safeJsonParse(text: string): any {
  const cleaned = String(text || '')
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```/i, '')
    .replace(/```$/i, '')
    .trim()
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start)
    throw new Error('Resposta do LLM nao contem JSON.')
  const slice = cleaned.slice(start, end + 1)
  try {
    return JSON.parse(slice)
  } catch (error: any) {
    throw new Error(`JSON invalido do LLM: ${error?.message || 'falha no parse'}`)
  }
}

function durationToClock(minutes: number | null): string {
  if (minutes == null) return 'Tempo de exame nao definido'
  const hrs = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:00`
}

function durationToLabel(minutes: number | null): string {
  if (minutes == null) return 'Tempo de exame nao definido'
  if (minutes === 60) return '1 hora'
  return `${minutes} min`
}

function parseTempoToMinutes(input: string | null | undefined): number | null {
  const s = String(input || '')
    .trim()
    .toLowerCase()
  if (!s || /tempo de exame nao definido|tempo de exame não definido/i.test(s)) return null
  const hhmmss = s.match(/^(\d{2}):(\d{2})(?::\d{2})?$/)
  if (hhmmss) return Number.parseInt(hhmmss[1], 10) * 60 + Number.parseInt(hhmmss[2], 10)
  const min = s.match(/(\d+)\s*min/)
  if (min) return Number.parseInt(min[1], 10)
  const hr = s.match(/(\d+)\s*hora/)
  if (hr) return Number.parseInt(hr[1], 10) * 60
  return null
}

function addMinutesToHHMM(hhmm: string, minutesToAdd: number): string {
  const m = String(hhmm).match(/^(\d{2}):(\d{2})$/)
  if (!m) return hhmm
  const total = Number.parseInt(m[1], 10) * 60 + Number.parseInt(m[2], 10) + minutesToAdd
  const outH = Math.floor(total / 60)
  const outM = total % 60
  return `${String(outH).padStart(2, '0')}:${String(outM).padStart(2, '0')}`
}

function isWithinWindow(endHHMM: string): boolean {
  const m = String(endHHMM).match(/^(\d{2}):(\d{2})$/)
  if (!m) return false
  const total = Number.parseInt(m[1], 10) * 60 + Number.parseInt(m[2], 10)
  return total <= 23 * 60
}

function chunkBlocksBySize(blocks: string[], maxBlocks: number, maxChars: number): string[][] {
  const chunks: string[][] = []
  let current: string[] = []
  let currentChars = 0

  for (const block of blocks) {
    const nextChars = currentChars + block.length
    const hitBlockLimit = current.length >= maxBlocks
    const hitCharLimit = current.length > 0 && nextChars > maxChars
    if (hitBlockLimit || hitCharLimit) {
      chunks.push(current)
      current = []
      currentChars = 0
    }
    current.push(block)
    currentChars += block.length
  }

  if (current.length > 0) chunks.push(current)
  return chunks
}

function normalizeBlockForLabels(block: string): string[] {
  const labelsPattern = KNOWN_LABELS.map((label) =>
    label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
  ).join('|')
  const normalized = block
    .replace(/\r\n/g, '\n')
    .replace(/\t+/g, '\n')
    .replace(new RegExp(`\\s+(${labelsPattern})`, 'g'), '\n$1')
    .replace(/\n{2,}/g, '\n')

  return normalized
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

function parseBlockFields(block: string): Partial<Record<(typeof KNOWN_LABELS)[number], string[]>> {
  const lines = normalizeBlockForLabels(block)
  const fields: Partial<Record<(typeof KNOWN_LABELS)[number], string[]>> = {}
  let currentLabel: (typeof KNOWN_LABELS)[number] | null = null

  for (const line of lines) {
    const labelMatch = KNOWN_LABELS.find((label) => line === label || line.startsWith(label))
    if (labelMatch) {
      currentLabel = labelMatch
      fields[currentLabel] = fields[currentLabel] || []
      const inlineValue = line.slice(labelMatch.length).trim()
      if (inlineValue) fields[currentLabel]!.push(inlineValue)
      continue
    }

    if (currentLabel) {
      fields[currentLabel] = fields[currentLabel] || []
      fields[currentLabel]!.push(line)
    }
  }

  return fields
}

function normalizeProcedureText(input: string): string {
  return input
    .replace(/^\d+\s*-\s*/g, '')
    .replace(/\(\d{10}\)\s*$/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function hasContaminatedName(value: string): boolean {
  const normalized = normalizeAscii(value)
  return [
    'telefone',
    'procedimento',
    'cid',
    'data hora',
    'unidade solicitante',
    'vaga solicitada',
    'origem',
  ].some((token) => normalized.includes(token))
}

function uniqueStrings(values: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const value of values) {
    const normalized = value.trim()
    if (!normalized) continue
    if (seen.has(normalized)) continue
    seen.add(normalized)
    out.push(normalized)
  }
  return out
}

function extractPhones(section: string): string[] {
  const matches = section.match(/\(\d{2}\)\s*\d{4,5}-\d{4}/g) || []
  return uniqueStrings(matches)
}

function extractProcedureList(section: string): string[] {
  const lines = section
    .split('\n')
    .map((line) => normalizeProcedureText(line))
    .filter((line) => {
      if (!line) return false
      const normalized = normalizeAscii(line)
      if (!normalized.includes('ressonancia magnetica')) return false
      return ![
        'cid 10',
        'data hora',
        'unidade solicitante',
        'vaga solicitada',
        'vaga consumida',
        'chave',
      ].some((token) => normalized.includes(token))
    })
  return uniqueStrings(lines)
}

function extractExplicitTime(value: string): string | null {
  const match = String(value || '').match(/(\d{2}:\d{2})/)
  return match?.[1] || null
}

function getProcedureMinutes(procedure: string): number | null {
  return getExamDurationMinutes(procedure)
}

function getTotalProcedureMinutes(procedures: string[]): number | null {
  let total = 0
  for (const procedure of procedures) {
    const minutes = getProcedureMinutes(procedure)
    if (minutes == null) return null
    total += minutes
  }
  return total
}

function parseDataHora(section: string): { data_exame: string; slot_base: string } | null {
  const match = section.match(/(\d{2}\/\d{2}\/\d{4}).*?(\d{2}:\d{2})/)
  if (!match) return null
  const data_exame = parseBrDateToIso(match[1])
  if (!data_exame) return null
  return { data_exame, slot_base: match[2] }
}

function splitSisregBlocks(rawText: string): { header: string; blocks: string[] } {
  const lines = String(rawText || '')
    .replace(/\r\n/g, '\n')
    .split('\n')
  const startIndexes: number[] = []

  for (let i = 0; i < lines.length; i += 1) {
    const trimmed = lines[i].trim()
    if (!/^\d{6,9}$/.test(trimmed)) continue
    let nextIndex = i + 1
    while (nextIndex < lines.length && !lines[nextIndex].trim()) nextIndex += 1
    if (nextIndex < lines.length && /^CNS:/i.test(lines[nextIndex].trim())) {
      startIndexes.push(i)
    }
  }

  if (startIndexes.length === 0) {
    return { header: '', blocks: [] }
  }

  const blocks: string[] = []
  const header = lines.slice(0, startIndexes[0]).join('\n').trim()
  for (let i = 0; i < startIndexes.length; i += 1) {
    const start = startIndexes[i]
    const end = i + 1 < startIndexes.length ? startIndexes[i + 1] : lines.length
    const block = lines.slice(start, end).join('\n').trim()
    if (block) blocks.push(block)
  }
  return { header, blocks }
}

function splitIntoPatientBlocks(rawText: string): { header: string; blocks: string[] } {
  const sisreg = splitSisregBlocks(rawText)
  if (sisreg.blocks.length > 0) return sisreg

  const text = String(rawText || '').replace(/\r\n/g, '\n')
  const idxs: number[] = []
  const re = /^\s*paciente\s*:/gim
  for (;;) {
    const m = re.exec(text)
    if (!m) break
    idxs.push(m.index)
  }

  if (idxs.length === 0) {
    return { header: '', blocks: [text.trim()].filter(Boolean) }
  }

  const header = text.slice(0, idxs[0]).trim()
  const blocks: string[] = []
  for (let i = 0; i < idxs.length; i += 1) {
    const start = idxs[i]
    const end = i + 1 < idxs.length ? idxs[i + 1] : text.length
    const block = text.slice(start, end).trim()
    if (block) blocks.push(block)
  }
  return { header, blocks }
}

function parseStructuredReportPatients(rawText: string): ParsedReportPatient[] {
  const { blocks } = splitSisregBlocks(rawText)
  if (blocks.length === 0) return []

  const parsed: ParsedReportPatient[] = []
  blocks.forEach((block, index) => {
    const fields = parseBlockFields(block)
    const patientName = (fields['Paciente:'] || []).join(' ').replace(/\s+/g, ' ').trim()
    const birth = ((fields['Nascimento:'] || [])[0] || '').replace(/\s+/g, ' ').trim() || null
    const phones = extractPhones((fields['Telefone(s):'] || []).join('\n'))
    const procedimentos = extractProcedureList((fields['Procedimento(s):'] || []).join('\n'))
    const dataHora = parseDataHora((fields['Data/Hora:'] || []).join(' '))

    if (!patientName || hasContaminatedName(patientName) || !dataHora || procedimentos.length === 0)
      return

    parsed.push({
      patient_name: patientName,
      Data_nascimento: birth,
      phones,
      procedimentos,
      data_exame: dataHora.data_exame,
      slot_base: dataHora.slot_base,
      source_order: index,
    })
  })

  return parsed
}

function parseSimplePatientBlocks(rawText: string): ParsedSimplePatient[] {
  const { blocks } = splitIntoPatientBlocks(rawText)
  if (blocks.length === 0) return []

  const parsed: ParsedSimplePatient[] = []

  blocks.forEach((block, index) => {
    const fields = parseBlockFields(block)
    const patientName = (fields['Paciente:'] || []).join(' ').replace(/\s+/g, ' ').trim()
    const birth = ((fields['Nascimento:'] || [])[0] || '').replace(/\s+/g, ' ').trim() || null
    const phones = extractPhones((fields['Telefone(s):'] || []).join('\n'))
    const procedimentos = extractProcedureList((fields['Procedimento(s):'] || []).join('\n'))
    const horario = extractExplicitTime(
      [...(fields['Horário:'] || []), ...(fields['Horario:'] || [])].join(' '),
    )

    if (
      !patientName ||
      hasContaminatedName(patientName) ||
      phones.length === 0 ||
      procedimentos.length === 0
    )
      return

    parsed.push({
      patient_name: patientName,
      Data_nascimento: birth,
      phones,
      procedimentos,
      horario,
      source_order: index,
    })
  })

  return parsed
}

function consolidateSimplePatients(rows: ParsedSimplePatient[]): ParsedSimplePatient[] {
  const merged = new Map<string, ParsedSimplePatient>()

  for (const row of rows) {
    const key = [normalizeAscii(row.patient_name), row.Data_nascimento || ''].join('|')
    const existing = merged.get(key)
    if (!existing) {
      merged.set(key, {
        ...row,
        phones: [...row.phones],
        procedimentos: [...row.procedimentos],
      })
      continue
    }

    existing.phones = uniqueStrings([...existing.phones, ...row.phones])
    existing.procedimentos = uniqueStrings([...existing.procedimentos, ...row.procedimentos])
    existing.source_order = Math.min(existing.source_order, row.source_order)
  }

  return [...merged.values()].sort((a, b) => a.source_order - b.source_order)
}

function scheduleSimplePatients(
  rows: ParsedSimplePatient[],
  data_exame: string,
  startAt = '07:00',
): { agenda_date: string; patients: PatientAgendaItem[] } {
  const patients: PatientAgendaItem[] = []
  let cursor = startAt

  for (const row of rows) {
    const totalMinutes = getTotalProcedureMinutes(row.procedimentos)
    const horario_inicio = row.horario || cursor
    const horario_final = totalMinutes == null ? '' : addMinutesToHHMM(horario_inicio, totalMinutes)
    const status_agenda: AgendaStatus =
      totalMinutes == null || !horario_final
        ? 'fora_da_janela'
        : isWithinWindow(horario_final)
          ? 'agendado_dentro_janela'
          : 'fora_da_janela'

    const phones = uniqueStrings(row.phones)
    const procedimentos = row.procedimentos.join('\n')

    patients.push({
      patient_name: row.patient_name,
      Data_nascimento: row.Data_nascimento || null,
      phone_number: phones[0] || '',
      phone_2: phones[1] || null,
      phone_3: phones[2] || null,
      procedimentos,
      time_proce: durationToClock(totalMinutes),
      tempo_total: durationToLabel(totalMinutes),
      horario_inicio,
      horario_final,
      data_exame,
      status_agenda,
      message_body: buildMessageBody({
        data_exame_iso: data_exame,
        horario: horario_inicio,
        nome: row.patient_name,
        procedimentos,
      }),
    })

    if (!row.horario && totalMinutes != null && horario_final) cursor = horario_final
  }

  return { agenda_date: data_exame, patients }
}

function consolidateParsedPatients(rows: ParsedReportPatient[]): ParsedReportPatient[] {
  const merged = new Map<string, ParsedReportPatient>()

  for (const row of rows) {
    const key = [normalizeAscii(row.patient_name), row.Data_nascimento || '', row.data_exame].join(
      '|',
    )
    const existing = merged.get(key)
    if (!existing) {
      merged.set(key, {
        ...row,
        phones: [...row.phones],
        procedimentos: [...row.procedimentos],
      })
      continue
    }

    existing.phones = uniqueStrings([...existing.phones, ...row.phones])
    existing.procedimentos = uniqueStrings([...existing.procedimentos, ...row.procedimentos])
    existing.source_order = Math.min(existing.source_order, row.source_order)
    if (existing.slot_base !== row.slot_base) {
      existing.slot_base =
        existing.source_order === row.source_order ? row.slot_base : existing.slot_base
    }
  }

  return [...merged.values()].sort((a, b) => a.source_order - b.source_order)
}

function scheduleParsedPatients(rows: ParsedReportPatient[]): {
  agenda_date: string
  patients: PatientAgendaItem[]
} {
  const slotOrder = ['07:00', '13:00', '19:00']
  const grouped = new Map<string, ParsedReportPatient[]>()
  for (const row of rows) {
    const key = `${row.data_exame}|${row.slot_base}`
    const current = grouped.get(key) || []
    current.push(row)
    grouped.set(key, current)
  }

  const sortedKeys = [...grouped.keys()].sort((a, b) => {
    const [dateA, slotA] = a.split('|')
    const [dateB, slotB] = b.split('|')
    if (dateA !== dateB) return dateA.localeCompare(dateB)
    return slotOrder.indexOf(slotA) - slotOrder.indexOf(slotB)
  })

  const patients: PatientAgendaItem[] = []
  let agenda_date = ''

  for (const key of sortedKeys) {
    const [data_exame, slot_base] = key.split('|')
    if (!agenda_date) agenda_date = data_exame
    let cursor = slot_base
    const rowsInSlot = (grouped.get(key) || []).sort((a, b) => a.source_order - b.source_order)

    for (const row of rowsInSlot) {
      const totalMinutes = getTotalProcedureMinutes(row.procedimentos)
      const horario_inicio = cursor
      const horario_final = totalMinutes == null ? '' : addMinutesToHHMM(cursor, totalMinutes)
      const status_agenda: AgendaStatus =
        totalMinutes == null || !horario_final
          ? 'fora_da_janela'
          : isWithinWindow(horario_final)
            ? 'agendado_dentro_janela'
            : 'fora_da_janela'

      const phones = uniqueStrings(row.phones)
      const procedimentos = row.procedimentos.join('\n')
      const horarioMensagem = horario_inicio

      patients.push({
        patient_name: row.patient_name,
        Data_nascimento: row.Data_nascimento || null,
        phone_number: phones[0] || '',
        phone_2: phones[1] || null,
        phone_3: phones[2] || null,
        procedimentos,
        time_proce: durationToClock(totalMinutes),
        tempo_total: durationToLabel(totalMinutes),
        horario_inicio,
        horario_final,
        data_exame,
        status_agenda,
        message_body: buildMessageBody({
          data_exame_iso: data_exame,
          horario: horarioMensagem,
          nome: row.patient_name,
          procedimentos,
        }),
      })

      if (totalMinutes != null && horario_final) cursor = horario_final
    }
  }

  return { agenda_date, patients }
}

function normalizePatientsAndSchedule(
  agenda_date: string,
  patientsRaw: any[],
  startAt: string,
): PatientAgendaItem[] {
  let cursor = startAt
  const patients: PatientAgendaItem[] = []

  for (const p of patientsRaw) {
    const dataIso = String(p?.data_exame || agenda_date || '').trim()
    const tempo = String(p?.tempo_total || p?.time_proce || 'Tempo de exame nao definido')
    const minutes = parseTempoToMinutes(tempo)
    const horario_inicio = String(p?.horario_inicio || cursor).trim()
    const horario_final = minutes == null ? '' : addMinutesToHHMM(horario_inicio, minutes)
    const status_agenda: AgendaStatus =
      minutes == null || !horario_final
        ? 'fora_da_janela'
        : isWithinWindow(horario_final)
          ? 'agendado_dentro_janela'
          : 'fora_da_janela'
    const msgHorario = String(p?.horario_inicio || horario_inicio).trim()

    patients.push({
      patient_name: String(p?.patient_name || '').trim(),
      Data_nascimento: p?.Data_nascimento ?? null,
      phone_number: String(p?.phone_number || '').trim(),
      phone_2: p?.phone_2 ?? null,
      phone_3: p?.phone_3 ?? null,
      procedimentos: String(p?.procedimentos || '').trim(),
      time_proce: String(p?.time_proce || durationToClock(minutes)),
      tempo_total: String(p?.tempo_total || durationToLabel(minutes)),
      horario_inicio,
      horario_final,
      data_exame: dataIso,
      status_agenda,
      message_body: buildMessageBody({
        data_exame_iso: dataIso,
        horario: msgHorario,
        nome: String(p?.patient_name || '').trim(),
        procedimentos: String(p?.procedimentos || '').trim(),
      }),
    })

    if (!p?.horario_inicio && minutes != null && horario_final) cursor = horario_final
  }

  return patients
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ success: false, error: 'Method not allowed' }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
        status: 405,
      })
    }

    const auth = await requireAuth(req)
    if (!auth.ok) return auth.res

    const body = await req.json().catch(() => ({}))
    const rawText = String(body?.rawText || '').trim()
    const manualExamDate =
      parseBrDateToIso(String(body?.manualExamDate || '').trim()) ||
      String(body?.manualExamDate || '').trim() ||
      ''
    if (!rawText) {
      return new Response(JSON.stringify({ success: false, error: 'rawText e obrigatorio.' }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
        status: 400,
      })
    }

    logStep('request_received', { rawTextLength: rawText.length })

    const parsedReport = consolidateParsedPatients(parseStructuredReportPatients(rawText))
    if (parsedReport.length > 0) {
      logStep('report_parser_success', { patientsDetected: parsedReport.length })
      const scheduled = scheduleParsedPatients(parsedReport)
      return new Response(JSON.stringify({ success: true, data: scheduled }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
        status: 200,
      })
    }

    const parsedSimple = consolidateSimplePatients(parseSimplePatientBlocks(rawText))
    if (parsedSimple.length > 0) {
      if (!manualExamDate) {
        return new Response(
          JSON.stringify({
            success: false,
            error:
              'Lista reconhecida, mas sem data do exame. Informe a data manualmente no campo da tela.',
          }),
          {
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
            status: 400,
          },
        )
      }

      logStep('simple_parser_success', { patientsDetected: parsedSimple.length, manualExamDate })
      const scheduled = scheduleSimplePatients(parsedSimple, manualExamDate)
      return new Response(JSON.stringify({ success: true, data: scheduled }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
        status: 200,
      })
    }

    const { header, blocks } = splitIntoPatientBlocks(rawText)
    logStep('fallback_llm_path', { blockCount: blocks.length })
    const chunks = chunkBlocksBySize(blocks, 8, 12000)
    logStep('chunks_prepared', { chunkCount: chunks.length })

    let agenda_date = ''
    let startAt = '07:00'
    const allPatients: PatientAgendaItem[] = []

    for (let index = 0; index < chunks.length; index += 1) {
      const chunk = chunks[index]
      const chunkText = [header, ...chunk].filter(Boolean).join('\n\n').trim()
      const prompt = getPrompt(chunkText)
      logStep('processing_chunk', {
        chunkIndex: index + 1,
        chunkCount: chunks.length,
        chunkLength: chunkText.length,
      })
      const llmText = await callLLMWithRetry(prompt)
      const parsed = safeJsonParse(llmText)

      const chunkAgendaDate = String(parsed?.agenda_date || '').trim()
      if (!agenda_date && chunkAgendaDate) agenda_date = chunkAgendaDate

      const patientsRaw = Array.isArray(parsed?.patients) ? parsed.patients : []
      const normalized = normalizePatientsAndSchedule(agenda_date, patientsRaw, startAt)
      allPatients.push(...normalized)

      const last = normalized.at(-1)
      if (last?.horario_final) startAt = last.horario_final
    }

    return new Response(
      JSON.stringify({ success: true, data: { agenda_date, patients: allPatients } }),
      {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
        status: 200,
      },
    )
  } catch (error: any) {
    const msg = String(error?.message || 'Erro interno')
    logStep('request_failed', { error: msg })
    const status = /timeout/i.test(msg)
      ? 504
      : /LLM HTTP|Resposta do LLM|conteudo vazio|conteúdo vazio|JSON invalido|JSON invalido|nao contem JSON|não contém JSON/i.test(
            msg,
          )
        ? 502
        : 500

    return new Response(JSON.stringify({ success: false, error: msg }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
      status,
    })
  }
})
