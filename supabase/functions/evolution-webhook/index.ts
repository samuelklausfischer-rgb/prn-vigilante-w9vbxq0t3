import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, x-supabase-client-platform, apikey, content-type, x-webhook-secret',
}

type EventType =
  | 'send_accepted'
  | 'delivered'
  | 'read'
  | 'replied'
  | 'failed'
  | 'not_received_timeout'
  | 'followup_sent'
  | 'retry_phone2_sent'

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  })
}

function getHeader(req: Request, name: string): string | null {
  return req.headers.get(name) || req.headers.get(name.toLowerCase())
}

function requireWebhookSecret(req: Request): string | null {
  const expected = Deno.env.get('EVOLUTION_WEBHOOK_SECRET')
  if (!expected) return null
  const url = new URL(req.url)
  const provided = getHeader(req, 'x-webhook-secret') || url.searchParams.get('secret')
  if (!provided || provided !== expected) return 'invalid_secret'
  return null
}

function normalizePhone(s: unknown): string | null {
  const raw = String(s || '').replace(/\D/g, '').trim()
  if (!raw) return null
  return sanitizeBrazilianPhone(raw)
}

/**
 * Normaliza números brasileiros para o formato sem 9º dígito (para busca no DB)
 * se o DDD for > 28.
 */
function sanitizeBrazilianPhone(phone: string): string {
  let clean = phone.replace(/\D/g, '')
  if (!clean.startsWith('55')) clean = '55' + clean

  if (clean.length === 13) {
    const ddd = parseInt(clean.substring(2, 4))
    if (ddd > 28) {
      return clean.substring(0, 4) + clean.substring(5)
    }
  }
  return clean
}

function extractMessageId(payload: any): string | null {
  return (
    payload?.message_id ||
    payload?.messageId ||
    payload?.data?.message_id ||
    payload?.data?.messageId ||
    payload?.message?.id ||
    payload?.data?.message?.id ||
    null
  )
}

function extractToPhone(payload: any): string | null {
  return normalizePhone(
    payload?.to ||
      payload?.to_phone ||
      payload?.phone ||
      payload?.phone_number ||
      payload?.data?.to ||
      payload?.data?.phone ||
      payload?.data?.phone_number ||
      payload?.data?.key?.remoteJid ||
      payload?.data?.key?.remoteJidAlt ||
      payload?.data?.key?.participant,
  )
}

function detectEventType(payload: any): EventType | null {
  const t = String(payload?.event || payload?.type || payload?.status || payload?.data?.event || '').toLowerCase()
  if (!t) return null

  if (t.includes('messages.update')) {
    const status = String(payload?.data?.status || '').toLowerCase()
    if (status.includes('delivery_ack') || status.includes('delivered')) return 'delivered'
    if (status.includes('read') || status.includes('read_ack') || status.includes('seen')) return 'read'
    if (status.includes('server_ack') || status.includes('sent')) return 'send_accepted'
  }

  if (t.includes('messages.upsert')) {
    const fromMe = payload?.data?.key?.fromMe
    if (fromMe === false || fromMe === 'false') return 'replied'
  }

  if (t.includes('send.message') || (t.includes('send') && t.includes('message'))) return 'send_accepted'
  if (t.includes('delivered')) return 'delivered'
  if (t.includes('read') || t.includes('seen')) return 'read'
  if (t.includes('received') || t.includes('incoming') || (t.includes('message') && t.includes('in'))) return 'replied'
  if (t.includes('failed') || t.includes('error')) return 'failed'
  return null
}

function extractInstanceId(payload: any): string | null {
  return payload?.instance_id || payload?.instanceId || payload?.data?.instance_id || payload?.data?.instanceId || null
}

function extractProviderMessageId(payload: any): string | null {
  return (
    payload?.key?.id ||
    payload?.data?.key?.id ||
    payload?.data?.keyId ||
    payload?.key?.remoteJid ||
    payload?.messageId ||
    payload?.message?.id ||
    payload?.data?.messageId ||
    payload?.data?.message?.id ||
    payload?.id ||
    null
  )
}

function extractProviderChatId(payload: any): string | null {
  return payload?.data?.key?.remoteJid || payload?.data?.key?.remoteJidAlt || payload?.key?.remoteJid || null
}

function extractPatientMessageBody(payload: any): string | null {
  const message = payload?.message || payload?.data?.message
  if (!message) return null
  
  const body =
    message?.body ||
    message?.text?.body ||
    message?.conversation?.message?.body ||
    message?.content?.text ||
    payload?.body ||
    payload?.text ||
    payload?.message_body ||
    null
  
  return typeof body === 'string' ? body.trim() : null
}

function getSupabase() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceKey) throw new Error('Missing SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY')
  return { supabaseUrl, serviceKey }
}

async function restInsert(table: string, row: Record<string, unknown>) {
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

async function restPatch(table: string, match: Record<string, string>, patch: Record<string, unknown>) {
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
  orderBy?: string,
): Promise<any | null> {
  const { supabaseUrl, serviceKey } = getSupabase()
  const qs = new URLSearchParams()
  qs.set('select', select)
  for (const [k, v] of filters) qs.set(k, v)
  if (orderBy) qs.set('order', orderBy)
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

async function generateDedupeHash(payload: unknown): Promise<string> {
  const payloadStr = JSON.stringify(payload)
  const encoder = new TextEncoder()
  const data = encoder.encode(payloadStr)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

async function saveWebhookRaw(
  payload: unknown,
  headers: Record<string, string>,
  dedupeHash: string,
): Promise<{ isDuplicate: boolean; rawId?: string }> {
  const existing = await restSelectOne(
    'webhook_events_raw',
    'id,processing_status',
    [['dedupe_hash', `eq.${dedupeHash}`]],
  )

  if (existing) {
    return { isDuplicate: true, rawId: existing.id }
  }

  const eventType = detectEventType(payload as any)
  const providerMessageId = extractProviderMessageId(payload as any)
  const instanceExternalId = extractInstanceId(payload as any)

  const row = {
    provider_name: 'evolution',
    provider_message_id: providerMessageId,
    event_type: eventType || 'unknown',
    instance_external_id: instanceExternalId,
    payload,
    headers,
    dedupe_hash: dedupeHash,
    processing_status: 'pending' as const,
    received_at: new Date().toISOString(),
  }

  await restInsert('webhook_events_raw', row)

  return { isDuplicate: false }
}

async function resolveJourneyMessage(
  providerMessageId: string | null,
  toPhone: string | null,
): Promise<{ messageId: string | null; journeyId: string | null }> {
  let journeyMessage: any = null

  if (providerMessageId) {
    journeyMessage = await restSelectOne(
      'journey_messages',
      'id,journey_id,queue_message_id',
      [['provider_message_id', `eq.${providerMessageId}`]],
    )
  }

  if (journeyMessage) {
    return {
      messageId: journeyMessage.queue_message_id || journeyMessage.id,
      journeyId: journeyMessage.journey_id,
    }
  }

  if (toPhone) {
    const v8 = toPhone.length === 13 ? toPhone.substring(0, 4) + toPhone.substring(5) : toPhone
    const phonesToTry = [toPhone, v8]
    
    for (const p of phonesToTry) {
        const queueMessage =
          (await restSelectOne(
            'patients_queue',
            'id,journey_id,accepted_at',
            [['phone_number', `eq.${p}`], ['accepted_at', 'not.is.null']],
            'accepted_at.desc',
          )) ||
          (await restSelectOne(
            'patients_queue',
            'id,journey_id,accepted_at',
            [['phone_2', `eq.${p}`], ['accepted_at', 'not.is.null']],
            'accepted_at.desc',
          )) ||
          (await restSelectOne(
            'patients_queue',
            'id,journey_id,accepted_at',
            [['phone_3', `eq.${p}`], ['accepted_at', 'not.is.null']],
            'accepted_at.desc',
          )) ||
          (await restSelectOne(
            'patients_queue',
            'id,journey_id,accepted_at',
            [['phone_number', `eq.${p}`], ['status', 'in.(queued,sending,delivered)']],
            'created_at.desc',
          )) ||
          (await restSelectOne(
            'patients_queue',
            'id,journey_id,accepted_at',
            [['phone_2', `eq.${p}`], ['status', 'in.(queued,sending,delivered)']],
            'created_at.desc',
          )) ||
          (await restSelectOne(
            'patients_queue',
            'id,journey_id,accepted_at',
            [['phone_3', `eq.${p}`], ['status', 'in.(queued,sending,delivered)']],
            'created_at.desc',
          ))

      if (queueMessage) {
        return {
          messageId: queueMessage.id,
          journeyId: queueMessage.journey_id,
        }
      }
    }
  }

  if (toPhone) {
    const v8 = toPhone.length === 13 ? toPhone.substring(0, 4) + toPhone.substring(5) : toPhone
    const phonesToTry = [toPhone, v8]

    for (const p of phonesToTry) {
      const journey = await restSelectOne(
        'patient_journeys',
        'id',
        [['canonical_phone', `eq.${p}`]],
        'created_at.desc',
      )

      if (journey?.id) {
        return { messageId: null, journeyId: journey.id }
      }
    }
  }

  return { messageId: null, journeyId: null }
}

async function updateMessageLifecycle(
  messageId: string,
  eventType: EventType,
  eventAt: string,
): Promise<void> {
  const update: Record<string, string> = {}
  if (eventType === 'send_accepted') update.accepted_at = eventAt
  if (eventType === 'delivered') update.delivered_at = eventAt
  if (eventType === 'read') update.read_at = eventAt
  if (eventType === 'replied') update.replied_at = eventAt
  if (eventType === 'failed') update.failed_at = eventAt

  if (eventType === 'send_accepted') {
    update.status = 'accepted'
  } else if (eventType === 'delivered') {
    update.status = 'delivered'
  } else if (eventType === 'read') {
    update.status = 'read'
  } else if (eventType === 'replied') {
    update.status = 'replied'
  } else if (eventType === 'failed') {
    update.status = 'failed'
  }

  if (Object.keys(update).length > 0) {
    await restPatch('journey_messages', { id: messageId }, update)
  }
}

async function updateJourneyStatus(
  journeyId: string,
  eventType: EventType,
  eventAt: string,
): Promise<void> {
  if (eventType === 'replied') {
    await restPatch('patient_journeys', { id: journeyId }, {
      journey_status: 'delivered_waiting_reply',
      last_event_at: eventAt,
    })
  }
}

async function resolveMessageId(messageId: string | null, toPhone: string | null): Promise<string | null> {
  if (messageId) return String(messageId)
  if (!toPhone) return null

  const v8 = toPhone.length === 13 ? toPhone.substring(0, 4) + toPhone.substring(5) : toPhone
  const phonesToTry = [toPhone, v8]

  for (const p of phonesToTry) {
    const row =
      (await restSelectOne(
        'patients_queue',
        'id,accepted_at',
        [['phone_number', `eq.${p}`], ['accepted_at', 'not.is.null']],
        'accepted_at.desc',
      )) ||
      (await restSelectOne(
        'patients_queue',
        'id,accepted_at',
        [['phone_2', `eq.${p}`], ['accepted_at', 'not.is.null']],
        'accepted_at.desc',
      )) ||
      (await restSelectOne(
        'patients_queue',
        'id,accepted_at',
        [['phone_3', `eq.${p}`], ['accepted_at', 'not.is.null']],
        'accepted_at.desc',
      )) ||
      (await restSelectOne(
        'patients_queue',
        'id,accepted_at',
        [['phone_number', `eq.${p}`], ['status', 'in.(queued,sending,delivered)']],
        'created_at.desc',
      )) ||
      (await restSelectOne(
        'patients_queue',
        'id,accepted_at',
        [['phone_2', `eq.${p}`], ['status', 'in.(queued,sending,delivered)']],
        'created_at.desc',
      )) ||
      (await restSelectOne(
        'patients_queue',
        'id,accepted_at',
        [['phone_3', `eq.${p}`], ['status', 'in.(queued,sending,delivered)']],
        'created_at.desc',
      ))

    if (row) return String(row.id)
  }

  return null
}

async function resolveMessageIdByProvider(providerMessageId: string | null): Promise<string | null> {
  if (!providerMessageId) return null
  const row = await restSelectOne(
    'patients_queue',
    'id',
    [['provider_message_id', `eq.${providerMessageId}`]],
  )
  return row?.id ? String(row.id) : null
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  if (req.method !== 'POST') return json(405, { success: false, error: 'Method not allowed' })

  const secretError = requireWebhookSecret(req)
  if (secretError) {
    return json(401, { success: false, error: secretError })
  }

  try {
    const payload = await req.json().catch(() => ({}))
    const headers: Record<string, string> = {}
    for (const [k, v] of req.headers.entries()) {
      headers[k] = v
    }

    const dedupeHash = await generateDedupeHash(payload)
    const rawResult = await saveWebhookRaw(payload, headers, dedupeHash)

    if (rawResult.isDuplicate) {
      return json(200, { success: true, ignored: true, reason: 'duplicate_event' })
    }

    const eventType = detectEventType(payload)
    if (!eventType) {
      return json(200, { success: true, ignored: true, reason: 'unknown_event_type' })
    }

    const providerMessageId = extractProviderMessageId(payload)
    const toPhone = extractToPhone(payload)
    const providerChatId = extractProviderChatId(payload)
    const instanceId = extractInstanceId(payload)
    const eventAt = new Date().toISOString()

    const { messageId: journeyMessageId, journeyId } = await resolveJourneyMessage(providerMessageId, toPhone)

    let resolvedMessageId = await resolveMessageId(extractMessageId(payload), toPhone)
    if (!resolvedMessageId) {
      resolvedMessageId = await resolveMessageIdByProvider(providerMessageId)
    }

    await restInsert('message_events', {
      message_id: resolvedMessageId || journeyMessageId,
      instance_id: instanceId,
      to_phone: toPhone,
      event_type: eventType,
      event_at: eventAt,
      raw_payload: payload,
    })

    if (journeyMessageId && journeyId) {
      await updateMessageLifecycle(journeyMessageId, eventType, eventAt)
    }

    if (journeyId) {
      await updateJourneyStatus(journeyId, eventType, eventAt)
    }

    if (eventType === 'send_accepted') {
      // Mensagem aceita pelo servidor do WhatsApp (Status 2).
      // Isso é suficiente para confirmar que o envio foi concluído pelo nosso sistema.
      // Atualiza o status imediatamente para tirar da fila de "Processando".
      if (resolvedMessageId) {
        await restPatch('patients_queue', { id: resolvedMessageId }, {
          last_delivery_status: 'sent',
          accepted_at: eventAt,
          status: 'delivered',
          locked_by: null,
          locked_at: null,
        })
        console.log(`[evolution-webhook] send_accepted: patients_queue ${resolvedMessageId} marcado como delivered.`)
      }
    } else if (eventType === 'delivered') {
      if (resolvedMessageId) {
        await restPatch('patients_queue', { id: resolvedMessageId }, {
          delivered_at: eventAt,
          last_delivery_status: 'delivered',
          status: 'delivered',
          locked_by: null,
          locked_at: null,
        })
      }
    } else if (eventType === 'read') {
      if (resolvedMessageId) {
        await restPatch('patients_queue', { id: resolvedMessageId }, { read_at: eventAt })
      }
    } else if (eventType === 'replied') {
      if (resolvedMessageId) {
        await restPatch('patients_queue', { id: resolvedMessageId }, { replied_at: eventAt })
      }

      if (journeyId) {
        try {
          const inboundMessage = extractPatientMessageBody(payload as any)
          const normalizedPhone = toPhone || normalizePhone(providerChatId)

          if (normalizedPhone && providerMessageId) {
            const existingInbound = await restSelectOne(
              'journey_messages',
              'id',
              [['provider_message_id', `eq.${providerMessageId}`]],
            )

            if (!existingInbound) {
              await restInsert('journey_messages', {
                journey_id: journeyId,
                direction: 'inbound',
                message_kind: 'patient_reply',
                provider_name: 'evolution',
                provider_message_id: providerMessageId,
                provider_chat_id: providerChatId,
                phone_number: normalizedPhone,
                message_body: inboundMessage,
                status: 'replied',
                replied_at: eventAt,
              })

              await restInsert('journey_events', {
                journey_id: journeyId,
                message_id: null,
                event_type: 'patient_reply',
                event_at: eventAt,
                source: 'webhook',
                payload: {
                  provider_message_id: providerMessageId,
                  phone_number: normalizedPhone,
                },
              })
            }
          }
        } catch (e: any) {
          console.error(`[evolution-webhook] Error saving inbound reply: ${e?.message}`, e)
        }
      }
      
      // AUTO-TRIGGER CLASSIFICATION ON REPLY
      if (journeyId && resolvedMessageId) {
        try {
          const messageBody = extractPatientMessageBody(payload as any)
          if (messageBody && messageBody.trim().length > 0) {
            console.log(`[evolution-webhook] Auto-triggering classification for message ${resolvedMessageId}, journey ${journeyId}`)
            
            const classifyUrl = `${getSupabase().supabaseUrl}/functions/v1/classify-message`
            const classifyRes = await fetch(classifyUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
              },
              body: JSON.stringify({
                message_id: resolvedMessageId,
                journey_id: journeyId,
                message_body: messageBody,
              }),
            })
            
            if (!classifyRes.ok) {
              const errorText = await classifyRes.text().catch(() => '')
              console.error(`[evolution-webhook] Classification failed: ${classifyRes.status} ${errorText}`)
            } else {
              console.log(`[evolution-webhook] Classification triggered successfully for message ${resolvedMessageId}`)
            }
          }
        } catch (e: any) {
          console.error(`[evolution-webhook] Error triggering classification: ${e?.message}`, e)
        }
      }
    } else if (eventType === 'failed') {
      if (resolvedMessageId) {
        await restPatch('patients_queue', { id: resolvedMessageId }, {
          last_delivery_status: 'failed',
          needs_second_call: true,
          second_call_reason: 'failed',
        })
      }
    }

    return json(200, {
      success: true,
      eventType,
      messageId: journeyMessageId || resolvedMessageId,
      journeyId,
      toPhone,
    })
  } catch (e: any) {
    return json(500, { success: false, error: e?.message || 'internal_error' })
  }
})
