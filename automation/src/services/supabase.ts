import process from 'node:process';
import { createClient } from '@supabase/supabase-js'

import 'dotenv/config'
import type {
  ClaimedMessage,
  ExpiredLock,
  SystemConfig,
  MessageLog,
  WorkerHeartbeat,
  PatientConsent,
  MessageBlock,
} from '../types'
import { isLikelyLandlineBR, sanitizeBrazilianNumber } from '../utils/helpers'
import { normalizePhone } from '../../shared/validators'
import { checkWhatsAppNumber, validatePhoneForWhatsApp } from './evolution'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    '❌ SUPABASE_URL ou SUPABASE_ANON_KEY não encontrados no .env da automação.',
  )
}

export const supabase = createClient(supabaseUrl, supabaseKey)

// ============================================
// Queue Operations
// ============================================

/**
 * Claima a próxima mensagem elegível e trava atômicamente
 * Usa a função SQL claim_next_message
 */
export async function claimNextMessage(
  workerId: string,
  maxAttempts = 3,
): Promise<ClaimedMessage | null> {
  try {
    const { data, error } = await supabase.rpc('claim_next_message', {
      p_worker_id: workerId,
      p_max_attempts: maxAttempts,
    })

    if (error) {
      console.error(`❌ Erro ao claimar mensagem:`, error)
      return null
    }

    const messages = data as ClaimedMessage[] | null
    return messages && messages.length > 0 ? messages[0] : null
  } catch (error) {
    console.error(`❌ Exceção ao claimar mensagem:`, error)
    return null
  }
}

export interface ConnectedInstance {
  id: string
  instance_name: string
}

export async function listConnectedInstances(): Promise<ConnectedInstance[]> {
  try {
    const { data, error } = await supabase
      .from('whatsapp_instances')
      .select('id, instance_name')
      .eq('status', 'connected')
      .order('rotation_index', { ascending: true, nullsFirst: true })
      .order('last_message_at', { ascending: true, nullsFirst: true })

    if (error) {
      console.error(`❌ Erro ao listar instâncias conectadas:`, error)
      return []
    }

    return (data || []) as ConnectedInstance[]
  } catch (error) {
    console.error(`❌ Exceção ao listar instâncias conectadas:`, error)
    return []
  }
}

export async function claimNextMessageForInstance(
  workerId: string,
  instanceId: string,
  instanceName: string,
  maxAttempts = 3,
): Promise<ClaimedMessage | null> {
  try {
    const { data, error } = await supabase.rpc('claim_next_message_for_instance', {
      p_worker_id: workerId,
      p_instance_id: instanceId,
      p_instance_name: instanceName,
      p_max_attempts: maxAttempts,
    })

    if (error) {
      console.error(`❌ Erro ao claimar mensagem para instância ${instanceName}:`, error)
      return null
    }

    const messages = data as ClaimedMessage[] | null
    return messages && messages.length > 0 ? messages[0] : null
  } catch (error) {
    console.error(`❌ Exceção ao claimar mensagem para instância ${instanceName}:`, error)
    return null
  }
}



/**
 * Marca mensagem como aceita pela Evolution API (envio iniciado)
 * Atualiza status para 'sending' e grava accepted_at, provider_message_id e provider_chat_id
 */
export async function markMessageAccepted(
  messageId: string,
  instanceId: string,
  providerMessageId: string,
  providerChatId: string,
  workerId?: string,
): Promise<boolean> {
  try {
    const nowIso = new Date().toISOString()

    let updateQuery = supabase
      .from('patients_queue')
      .update({
        status: 'sending',
        accepted_at: nowIso,
        provider_message_id: providerMessageId,
        provider_chat_id: providerChatId,
        updated_at: nowIso,
      })
      .eq('id', messageId)
      .eq('status', 'sending')

    if (workerId) {
      updateQuery = updateQuery.eq('locked_by', workerId)
    }

    const { data: updatedRows, error: updateError } = await updateQuery.select('id, journey_id')

    if (updateError) {
      console.error(`❌ Erro ao marcar mensagem como aceita:`, updateError)
      return false
    }

    if (!updatedRows || updatedRows.length === 0) {
      console.warn(`⚠️ Mensagem ${messageId} não pôde ser marcada como aceita porque o lock não pertence mais a este worker.`)
      return false
    }

    const queueRow = updatedRows[0]

    if (queueRow.journey_id) {
      await updateJourneyMessageAccepted(
        queueRow.journey_id,
        messageId,
        providerMessageId,
        providerChatId,
        nowIso,
      )
    }

    void supabase.from('message_events').insert({
      message_id: messageId,
      instance_id: instanceId,
      event_type: 'send_accepted',
      event_at: nowIso,
      raw_payload: { provider_message_id: providerMessageId, provider_chat_id: providerChatId },
    } as any)

    return true
  } catch (error) {
    console.error(`❌ Exceção ao marcar mensagem como aceita:`, error)
    return false
  }
}

/**
 * Marca mensagem como entregue (webhook confirma entrega real)
 * Atualiza status para 'delivered' e grava delivered_at
 */
export async function markMessageDelivered(
  messageId: string,
  instanceId: string,
  workerId?: string,
  durationMs?: number,
  phoneMasked?: string,
  patientHash?: string,
  dryRun: boolean = false,
): Promise<boolean> {
  try {
    const nowIso = new Date().toISOString()

    let updateQuery = supabase
      .from('patients_queue')
      .update({
        status: 'delivered',
        delivered_at: nowIso,
        locked_by: null,
        locked_at: null,
        updated_at: nowIso,
        last_delivery_status: 'pending',
      })
      .eq('id', messageId)
      .eq('status', 'sending')

    if (workerId) {
      updateQuery = updateQuery.eq('locked_by', workerId)
    }

    const { data: updatedRows, error: updateError } = await updateQuery.select('id, journey_id')

    if (updateError) {
      console.error(`❌ Erro ao marcar mensagem como entregue:`, updateError)
      return false
    }

    if (!updatedRows || updatedRows.length === 0) {
      console.warn(`⚠️ Mensagem ${messageId} não pôde ser finalizada como entregue porque o lock não pertence mais a este worker.`)
      return false
    }

    const queueRow = updatedRows[0]

    if (queueRow.journey_id) {
      await updateJourneyMessageDelivered(queueRow.journey_id, messageId, nowIso)
      await scheduleFollowup(messageId)
    }

    if (!dryRun) {
      const { data: instanceRow } = await supabase
        .from('whatsapp_instances')
        .select('messages_sent_count')
        .eq('id', instanceId)
        .single()

      const currentCount = Number(instanceRow?.messages_sent_count ?? 0)

      await supabase
        .from('whatsapp_instances')
        .update({
          messages_sent_count: currentCount + 1,
          last_message_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', instanceId)
    }

    const { error: logError } = await supabase.from('message_logs').insert({
      message_id: messageId,
      instance_id: instanceId,
      sent_at: nowIso,
      status: 'delivered',
      retry_count: 0,
      phone_masked: phoneMasked,
      patient_hash: patientHash,
      duration_ms: durationMs,
    })

    if (logError) {
      console.error(`❌ Erro ao registrar log de envio:`, logError)
    }

    void supabase.from('message_events').insert({
      message_id: messageId,
      instance_id: instanceId,
      event_type: 'delivered',
      event_at: nowIso,
      raw_payload: null,
    } as any)

    return true
  } catch (error) {
    console.error(`❌ Exceção ao marcar mensagem como entregue:`, error)
    return false
  }
}

/**
 * Marca mensagem como falhou
 */
export async function markMessageFailed(
  messageId: string,
  errorMessage: string,
  retryCount: number,
  workerId?: string,
  options?: {
    secondCallReason?: string | null
    needsSecondCall?: boolean
  },
): Promise<boolean> {
  try {
    const nowIso = new Date().toISOString()
    const secondCallReason = options?.secondCallReason ?? 'failed'
    const needsSecondCall = options?.needsSecondCall ?? true

    let updateQuery = supabase
      .from('patients_queue')
      .update({
        status: 'failed',
        locked_by: null,
        locked_at: null,
        updated_at: nowIso,
        last_delivery_status: 'failed',
        needs_second_call: needsSecondCall,
        second_call_reason: secondCallReason,
      })
      .eq('id', messageId)
      .eq('status', 'sending')

    if (workerId) {
      updateQuery = updateQuery.eq('locked_by', workerId)
    }

    const { data: updatedRows, error: updateError } = await updateQuery.select('id, journey_id')

    if (updateError) {
      console.error(`❌ Erro ao marcar mensagem como falha:`, updateError)
      return false
    }

    if (!updatedRows || updatedRows.length === 0) {
      console.warn(`⚠️ Mensagem ${messageId} não pôde ser finalizada como falha porque o lock não pertence mais a este worker.`)
      return false
    }

    const queueRow = updatedRows[0]

    if (queueRow.journey_id) {
      await updateJourneyMessageFailed(queueRow.journey_id, messageId, errorMessage, nowIso)
    }

    const { error: logError } = await supabase.from('message_logs').insert({
      message_id: messageId,
      sent_at: new Date().toISOString(),
      status: 'failed',
      error_message: errorMessage,
      retry_count: retryCount,
    })

    if (logError) {
      console.error(`❌ Erro ao registrar log de falha:`, logError)
    }

    void supabase.from('message_events').insert({
      message_id: messageId,
      instance_id: null,
      event_type: 'failed',
      event_at: nowIso,
      raw_payload: { errorMessage, retryCount },
    } as any)

    return true
  } catch (error) {
    console.error(`❌ Exceção ao marcar mensagem como falha:`, error)
    return false
  }
}

/**
 * Adia mensagem por falha de infraestrutura (Evolution offline/indisponível).
 * Mantém status em queued, não consome tentativa e aplica backoff.
 */
export async function deferMessageForInfra(
  messageId: string,
  workerId: string | undefined,
  reason: string,
): Promise<boolean> {
  try {
    const nowIso = new Date().toISOString()

    const { data: currentRow, error: selectError } = await supabase
      .from('patients_queue')
      .select('attempt_count, back_to_queue_count')
      .eq('id', messageId)
      .single()

    if (selectError) {
      console.error(`❌ Erro ao buscar contadores para defer infra:`, selectError)
      return false
    }

    const previousBackToQueue = Number(currentRow?.back_to_queue_count ?? 0)
    const nextBackToQueue = previousBackToQueue + 1

    let backoffMinutes = 5
    if (nextBackToQueue === 2) backoffMinutes = 15
    if (nextBackToQueue >= 3) backoffMinutes = 30

    const sendAfter = new Date(Date.now() + backoffMinutes * 60 * 1000).toISOString()
    const attemptCount = Math.max(Number(currentRow?.attempt_count ?? 0) - 1, 0)

    let updateQuery = supabase
      .from('patients_queue')
      .update({
        status: 'queued',
        locked_by: null,
        locked_at: null,
        send_after: sendAfter,
        updated_at: nowIso,
        back_to_queue_count: nextBackToQueue,
        attempt_count: attemptCount,
        last_delivery_status: 'pending',
      })
      .eq('id', messageId)
      .eq('status', 'sending')

    if (workerId) {
      updateQuery = updateQuery.eq('locked_by', workerId)
    }

    const { data: updatedRows, error: updateError } = await updateQuery.select('id')

    if (updateError) {
      console.error(`❌ Erro ao adiar mensagem por infra:`, updateError)
      return false
    }

    if (!updatedRows || updatedRows.length === 0) {
      console.warn(`⚠️ Mensagem ${messageId} não pôde ser adiada porque o lock não pertence mais a este worker.`)
      return false
    }

    void supabase.from('message_events').insert({
      message_id: messageId,
      instance_id: null,
      event_type: 'infra_deferred',
      event_at: nowIso,
      raw_payload: { reason, backoffMinutes, nextBackToQueue },
    } as any)

    console.log(`⏸️ Infra indisponível. Mensagem adiada`, {
      messageId,
      reason,
      backoffMinutes,
      nextBackToQueue,
    })

    return true
  } catch (error) {
    console.error(`❌ Exceção ao adiar mensagem por infra:`, error)
    return false
  }
}

type SecondCallAction = 'retry_phone2' | 'retry_phone3' | 'followup_confirm' | 'landline'

export async function scheduleFollowup(queueMessageId: string): Promise<boolean> {
  try {
    const followupDueAt = new Date(Date.now() + 60 * 60 * 1000).toISOString()

    const { error } = await supabase
      .from('patients_queue')
      .update({
        followup_due_at: followupDueAt,
        updated_at: new Date().toISOString(),
      })
      .eq('id', queueMessageId)

    if (error) {
      console.error(`❌ Erro ao agendar follow-up para mensagem ${queueMessageId}:`, error)
      return false
    }

    return true
  } catch (error) {
    console.error(`❌ Exceção ao agendar follow-up para mensagem ${queueMessageId}:`, error)
    return false
  }
}

// ============================================
// Phone Ladder & Instance Affinity Operations
// ============================================

export interface PhoneLadderResult {
  action: 'escalated' | 'exhausted'
  nextPhone?: string
  nextIndex?: number
}

/**
 * Aciona a escada de telefones (Phone Ladder).
 * Chamado pelo queue-manager quando o check proativo detecta fixo/sem WhatsApp.
 *
 * - Se há próximo telefone: enfileira com locked_instance_id=null (round-robin)
 * - Se esgotado: marca jornada como phone_ladder_exhausted → aba Crítico
 */
export async function handlePhoneLadderEscalation(
  message: ClaimedMessage,
  reason: string,
  noteText: string,
  sendAfterDelay?: Date,
): Promise<PhoneLadderResult> {
  // Buscar row completa para ter phone_2, phone_3 e dados do paciente
  const { data: fullRow } = await supabase
    .from('patients_queue')
    .select('*')
    .eq('id', message.id)
    .single() as any

  if (!fullRow) {
    console.error(`❌ handlePhoneLadderEscalation: Mensagem ${message.id} não encontrada`)
    return { action: 'exhausted' }
  }

  const currentIndex: number = fullRow.phone_attempt_index || 1
  const currentPhoneNorm = normalizePhone(fullRow.phone_number)
  const phone2Norm = fullRow.phone_2 ? normalizePhone(fullRow.phone_2) : null
  const phone3Norm = fullRow.phone_3 ? normalizePhone(fullRow.phone_3) : null

  // Determinar próximo telefone na escada com deduplicação
  let nextPhone: string | null = null
  let nextIndex: number | null = null

  if (currentIndex === 1) {
    // Tentar o 2 se for diferente do 1
    if (phone2Norm && phone2Norm !== currentPhoneNorm) {
      nextPhone = String(fullRow.phone_2).trim()
      nextIndex = 2
    } 
    // Se o 2 for igual ao 1 ou não existir, tentar o 3 se for diferente do 1
    else if (phone3Norm && phone3Norm !== currentPhoneNorm) {
      nextPhone = String(fullRow.phone_3).trim()
      nextIndex = 3
    }
  } else if (currentIndex === 2) {
    // Tentar o 3 se for diferente do 2 (e do 1 por segurança)
    if (phone3Norm && phone3Norm !== currentPhoneNorm && phone3Norm !== phone2Norm) {
      nextPhone = String(fullRow.phone_3).trim()
      nextIndex = 3
    }
  }

  // Atualizar jornada com notas de automação
  if (fullRow.journey_id) {
    const { data: journey } = await supabase
      .from('patient_journeys')
      .select('automation_notes')
      .eq('id', fullRow.journey_id)
      .single()

    const existingNotes = (journey as any)?.automation_notes || ''
    const newNotes = existingNotes ? `${existingNotes} | ${noteText}` : noteText

    const journeyUpdate: Record<string, unknown> = {
      automation_notes: newNotes,
      current_phone_index: nextIndex || currentIndex,
      last_event_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    if (!nextPhone) {
      journeyUpdate.phone_ladder_exhausted = true
      journeyUpdate.needs_manual_action = true
      journeyUpdate.journey_status = 'pending_manual'
    }

    await supabase
      .from('patient_journeys')
      .update(journeyUpdate)
      .eq('id', fullRow.journey_id)

    await insertJourneyEvent(
      fullRow.journey_id,
      null,
      nextPhone ? 'phone_ladder_escalated' : 'phone_ladder_exhausted',
      'worker',
      { reason, from_index: currentIndex, to_index: nextIndex, note: noteText },
    )
  }

  if (!nextPhone || !nextIndex) {
    // Escada esgotada — marcar para intervenção manual
    await supabase
      .from('patients_queue')
      .update({
        needs_second_call: true,
        second_call_reason: 'phone_ladder_exhausted',
        updated_at: new Date().toISOString(),
      })
      .eq('id', message.id)

    return { action: 'exhausted' }
  }

  // Enfileirar próximo telefone da escada
  const dedupeKind = nextIndex === 2 ? 'retry_phone2' : 'retry_phone3'
  const normalizedPhone = normalizePhone(nextPhone)

  const { data: enqueueResult, error: enqueueError } = await supabase.rpc('enqueue_patient_v2', {
    p_patient_name: fullRow.patient_name,
    p_phone_number: nextPhone,
    p_message_body: fullRow.message_body,
    p_status: 'queued',
    p_is_approved: true,
    p_send_after: sendAfterDelay ? sendAfterDelay.toISOString() : new Date().toISOString(),
    p_notes: `Escada de telefones: ${dedupeKind} (${reason})`,
    p_attempt_count: 0,
    p_dedupe_kind: dedupeKind,
    p_origin_queue_id: fullRow.origin_queue_id || message.id,
    p_canonical_phone: normalizedPhone,
    p_data_nascimento: fullRow.Data_nascimento,
    p_data_exame: fullRow.data_exame,
    p_procedimentos: fullRow.procedimentos,
    p_horario_inicio: fullRow.horario_inicio,
    p_horario_final: fullRow.horario_final,
    p_time_proce: fullRow.time_proce,
    p_phone_2: fullRow.phone_2,
    p_phone_3: fullRow.phone_3,
    p_phone_attempt_index: nextIndex,
    p_last_phone_used: nextPhone,
  })

  if (enqueueError) {
    console.error(`❌ Erro ao enfileirar ${dedupeKind} na escada:`, enqueueError)
    return { action: 'exhausted' }
  }

  const results = enqueueResult as { id: string; status: string; error_message: string }[] | null
  const result = results && results.length > 0 ? results[0] : null

  if (!result || result.status !== 'success') {
    if (result?.status === 'duplicate_recent') {
      console.log(`ℹ️ ${dedupeKind} já enfileirado para ${sanitizeBrazilianNumber(nextPhone)}`)
      return { action: 'escalated', nextPhone, nextIndex }
    } else {
      console.warn(`⚠️ ${dedupeKind} não enfileirado: ${result?.error_message || result?.status || 'sem resultado'}`)
    }
    return { action: 'exhausted' }
  }

  // Rastreamento na jornada
  if (fullRow.journey_id) {
    await supabase
      .from('journey_messages')
      .insert({
        journey_id: fullRow.journey_id,
        queue_message_id: result.id,
        direction: 'outbound',
        message_kind: dedupeKind,
        phone_number: nextPhone,
        message_body: fullRow.message_body,
        status: 'queued',
      })
  }

  console.log(`🪜 Escada: ${dedupeKind} enfileirado para ${sanitizeBrazilianNumber(nextPhone)}`)

  return {
    action: 'escalated',
    nextPhone,
    nextIndex,
  }
}

/**
 * Grava o resultado da verificação proativa de WhatsApp no banco.
 * Serve como cache de 24h para evitar re-checagens.
 */
export async function updateWhatsAppCheckResult(
  messageId: string,
  hasWhatsApp: boolean,
): Promise<boolean> {
  try {
    const nowIso = new Date().toISOString()
    const { error } = await supabase
      .from('patients_queue')
      .update({
        whatsapp_checked_at: nowIso,
        whatsapp_valid: hasWhatsApp,
        phone_1_whatsapp_valid: hasWhatsApp,
        updated_at: nowIso,
      })
      .eq('id', messageId)

    if (error) {
      console.error(`❌ Erro ao salvar verificação WhatsApp:`, error)
      return false
    }

    return true
  } catch (error) {
    console.error(`❌ Exceção ao salvar verificação WhatsApp:`, error)
    return false
  }
}

/**
 * Grava a afinidade de instância na mensagem e propaga para a jornada.
 * Chamado quando uma mensagem sem vínculo prévio recebe instância via round-robin.
 */
export async function saveLockInstanceAffinity(
  messageId: string,
  instanceId: string,
): Promise<boolean> {
  try {
    const nowIso = new Date().toISOString()

    const { data: updatedRows, error } = await supabase
      .from('patients_queue')
      .update({
        locked_instance_id: instanceId,
        updated_at: nowIso,
      })
      .eq('id', messageId)
      .select('id, journey_id')

    if (error) {
      console.error(`❌ Erro ao gravar afinidade de instância:`, error)
      return false
    }

    // Propagar afinidade para a jornada
    const queueRow = updatedRows?.[0]
    if (queueRow?.journey_id) {
      await supabase
        .from('patient_journeys')
        .update({
          current_instance_id: instanceId,
          updated_at: nowIso,
        })
        .eq('id', queueRow.journey_id)
    }

    return true
  } catch (error) {
    console.error(`❌ Exceção ao gravar afinidade de instância:`, error)
    return false
  }
}

async function getConnectedInstance(): Promise<{ id: string; instance_name: string } | null> {
  try {
    const { data } = await supabase
      .from('whatsapp_instances')
      .select('id, instance_name')
      .eq('status', 'connected')
      .order('rotation_index', { ascending: true, nullsFirst: true })
      .limit(1)
      .single()

    return data as { id: string; instance_name: string } | null
  } catch (error) {
    console.error(`❌ Erro ao obter instância conectada:`, error)
    return null
  }
}

export async function runSecondCallRecovery(): Promise<{ processed: number }> {
  const now = new Date()
  const cutoff = new Date(now.getTime() - 60 * 60 * 1000).toISOString()
  const today = now.toISOString().split('T')[0]
  const currentHour = now.getHours()

  let processed = 0

  const { data: queuedPhones } = await supabase
    .from('patients_queue')
    .select('id,phone_number,phone_2,phone_3,data_exame,horario_inicio,is_landline')
    .eq('is_landline', false)
    .eq('status', 'queued')
    .gte('data_exame', today)
    .limit(200) as any

  if (Array.isArray(queuedPhones)) {
    for (const row of queuedPhones) {
      const examDate = row.data_exame
      const examTime = row.horario_inicio
      const examHour = examTime ? parseInt(examTime.split(':')[0], 10) : 18

      if (examDate === today && examHour < currentHour) {
        continue
      }

      if (isLikelyLandlineBR(row.phone_number) && !row.phone_2 && !row.phone_3) {
        await supabase
          .from('patients_queue')
          .update({ is_landline: true, needs_second_call: true, second_call_reason: 'landline_only' })
          .eq('id', row.id)
        processed += 1
      }
    }
  }

  const { data: notReceived } = await supabase
    .from('patients_queue')
    .select('id,patient_name,phone_number,phone_2,phone_3,message_body,accepted_at,delivered_at,retry_phone2_sent_at,retry_phone3_sent_at,journey_id,locked_instance_id,phone_attempt_index,Data_nascimento,data_exame,procedimentos,horario_inicio,horario_final,time_proce')
    .is('delivered_at', null)
    .not('accepted_at', 'is', null)
    .lte('accepted_at', cutoff)
    .is('retry_phone2_sent_at', null)
    .not('phone_2', 'is', null)
    .eq('dedupe_kind', 'original')
    .gte('data_exame', today)
    .limit(50) as any

  if (Array.isArray(notReceived)) {
    const connectedInstance = await getConnectedInstance()

    for (const row of notReceived) {
      const examDate = row.data_exame
      const examTime = row.horario_inicio
      const examHour = examTime ? parseInt(examTime.split(':')[0], 10) : 18

if (examDate === today && examHour < currentHour) {
        continue
      }

      const toPhone2 = String(row.phone_2 || '').trim()
      if (!toPhone2) continue
      
      // Verificar se phone_2 tem WhatsApp ANTES de enfileirar
      if (connectedInstance) {
        const check2 = await checkWhatsAppNumber(connectedInstance.instance_name, toPhone2)
        const hasWhatsApp = check2.exists
        
        // Atualizar resultado da verificação
        await supabase.from('patients_queue').update({
          phone_2_whatsapp_valid: hasWhatsApp,
          phone_2_whatsapp_checked_at: new Date().toISOString(),
        }).eq('id', row.id)
        
        // Se não tem WhatsApp, tentar phone_3
        if (!hasWhatsApp) {
          console.log(`⚠️ Phone2 ${toPhone2} não tem WhatsApp, verificando phone_3 para paciente ${row.patient_name}`)
          
          const toPhone3 = String(row.phone_3 || '').trim()
          if (toPhone3) {
            // Verificar phone_3
            const check3 = await checkWhatsAppNumber(connectedInstance.instance_name, toPhone3)
            const hasWhatsApp3 = check3.exists
            await supabase.from('patients_queue').update({
              phone_3_whatsapp_valid: hasWhatsApp3,
              phone_3_whatsapp_checked_at: new Date().toISOString(),
              notes: 'Tel2 sem WhatsApp - tentando Tel3',
            }).eq('id', row.id)
            
            if (!hasWhatsApp3) {
              // phone_3 também não tem WhatsApp → marcar como crítico
              await supabase.from('patients_queue').update({
                needs_second_call: true,
                second_call_reason: 'phone_ladder_exhausted',
                notes: 'Tel1, Tel2 e Tel3 sem WhatsApp',
              }).eq('id', row.id)
              continue
            }
          } else {
            // Não tem phone_3 → marcar como crítico
            await supabase.from('patients_queue').update({
              needs_second_call: true,
              second_call_reason: 'phone_ladder_exhausted',
              notes: 'Tel1 e Tel2 sem WhatsApp, não há Tel3',
            }).eq('id', row.id)
            continue
          }
          
          // Se chegou aqui, phone_3 tem WhatsApp → usar phone_3
          const normalizedPhone = normalizePhone(toPhone3)
          const { data: enqueueResult, error: enqueueError } = await supabase.rpc('enqueue_patient_v2', {
            p_patient_name: row.patient_name,
            p_phone_number: toPhone3,
            p_message_body: row.message_body,
            p_status: 'queued',
            p_is_approved: true,
            p_send_after: new Date().toISOString(),
            p_notes: 'Terceira chamada: retry_phone3 (Tel2 sem WhatsApp)',
            p_attempt_count: 0,
            p_dedupe_kind: 'retry_phone3',
            p_origin_queue_id: row.id,
            p_canonical_phone: normalizedPhone,
            p_data_nascimento: row.Data_nascimento,
            p_data_exame: row.data_exame,
            p_procedimentos: row.procedimentos,
            p_horario_inicio: row.horario_inicio,
            p_horario_final: row.horario_final,
            p_time_proce: row.time_proce,
            p_phone_2: row.phone_2,
            p_phone_3: row.phone_3,
            p_phone_attempt_index: 3,
            p_last_phone_used: toPhone3,
          })
          
          if (enqueueError) {
            console.error(`❌ Erro ao enfileirar retry_phone3 para paciente ${row.patient_name}:`, enqueueError)
            continue
          }
          
          const results = enqueueResult as { id: string; status: string; error_message: string }[] | null
          const result = results && results.length > 0 ? results[0] : null

          if (result && result.status === 'success') {
            await supabase.from('patients_queue').update({
              retry_phone3_sent_at: new Date().toISOString(),
              last_contact_phone: toPhone3,
              updated_at: new Date().toISOString(),
            }).eq('id', row.id)
            
            if (row.journey_id) {
              await insertJourneyEvent(row.journey_id, null, 'retry_phone3_sent', 'worker', {
                to_phone: sanitizeBrazilianNumber(toPhone3),
              })
            }
            processed += 1
          } else {
            if (result?.status === 'duplicate_recent') {
              console.log(`ℹ️ Mensagem recente para ${toPhone3}, pulando retry_phone3 (loop)`)
            } else {
              const msg = result?.error_message || result?.status || 'erro desconhecido'
              console.warn(`⚠️ Erro ao enfileirar retry_phone3 (loop): ${msg}`)
            }
          }
          
          continue
        }
      }
      
      const normalizedPhone = normalizePhone(toPhone2)

      const { data: enqueueResult, error: enqueueError } = await supabase.rpc('enqueue_patient_v2', {
        p_patient_name: row.patient_name,
        p_phone_number: toPhone2,
        p_message_body: row.message_body,
        p_status: 'queued',
        p_is_approved: true,
        p_send_after: new Date().toISOString(),
        p_notes: 'Segunda chamada: retry_phone2 (60min timeout)',
        p_attempt_count: 0,
        p_dedupe_kind: 'retry_phone2',
        p_origin_queue_id: row.id,
        p_canonical_phone: normalizedPhone,
        p_data_nascimento: row.Data_nascimento,
        p_data_exame: row.data_exame,
        p_procedimentos: row.procedimentos,
        p_horario_inicio: row.horario_inicio,
        p_horario_final: row.horario_final,
        p_time_proce: row.time_proce,
        p_phone_2: row.phone_2,
        p_phone_3: row.phone_3,
        p_locked_instance_id: null,      // TEL2 = número DIFERENTE → round-robin (nova instância)
        p_phone_attempt_index: 2,        // Posição 2 na escada
      })

      if (enqueueError) {
        console.error(`❌ Erro ao enfileirar retry_phone2 para paciente ${row.patient_name}:`, enqueueError)
        continue
      }

      const results = enqueueResult as { id: string; status: string; error_message: string }[] | null
      const result = results && results.length > 0 ? results[0] : null
      
      if (!result) {
        console.warn(`⚠️ Nenhum resultado da RPC enqueue_patient_v2 para retry_phone2`)
        continue
      }

      if (result.status === 'duplicate_recent') {
        console.log(`ℹ️ Mensagem recente para ${normalizedPhone}, pulando retry_phone2`)
        continue
      }

      if (result.status !== 'success') {
        const msg = result.error_message || result.status || 'erro desconhecido'
        console.warn(`⚠️ Erro ao enfileirar retry_phone2: ${msg}`)
        continue
      }

      await supabase
        .from('patients_queue')
        .update({
          needs_second_call: true,
          second_call_reason: 'not_received_retry_phone2',
          retry_phone2_sent_at: new Date().toISOString(),
          last_contact_phone: toPhone2,
          updated_at: new Date().toISOString(),
          last_delivery_status: 'not_received',
        })
        .eq('id', row.id)

      if (row.journey_id) {
        await insertJourneyEvent(row.journey_id, null, 'retry_phone2_sent', 'worker', {
          to_phone: sanitizeBrazilianNumber(toPhone2),
        })

        const { data: journeyMessageData } = await supabase
          .from('journey_messages')
          .insert({
            journey_id: row.journey_id,
            queue_message_id: result.id,
            direction: 'outbound',
            message_kind: 'retry_phone2',
            phone_number: toPhone2,
            message_body: row.message_body,
            status: 'queued',
          })
          .select('id')
          .single()

        if (journeyMessageData) {
          await insertJourneyEvent(row.journey_id, journeyMessageData.id, 'message_queued', 'worker')
        }
      }

      void supabase.from('message_events').insert({
        message_id: row.id,
        instance_id: null,
        event_type: 'retry_phone2_sent',
        event_at: new Date().toISOString(),
        raw_payload: { to_phone: sanitizeBrazilianNumber(toPhone2) },
      } as any)

      processed += 1
    }
  }

  const { data: needsFollowup } = await supabase
    .from('patients_queue')
    .select('id,patient_name,phone_number,delivered_at,replied_at,followup_sent_at,journey_id,locked_instance_id,phone_attempt_index,Data_nascimento,data_exame,procedimentos,horario_inicio,horario_final,time_proce,phone_2,phone_3')
    .not('delivered_at', 'is', null)
    .is('replied_at', null)
    .lte('delivered_at', cutoff)
    .is('followup_sent_at', null)
    .eq('dedupe_kind', 'original')
    .gte('data_exame', today)
    .limit(50) as any

  if (Array.isArray(needsFollowup)) {
    for (const row of needsFollowup) {
      const examDate = row.data_exame
      const examTime = row.horario_inicio
      const examHour = examTime ? parseInt(examTime.split(':')[0], 10) : 18

      if (examDate === today && examHour < currentHour) {
        continue
      }

      const followupText = 'Podemos confirmar?'
      const normalizedPhone = normalizePhone(row.phone_number)

      const { data: enqueueResult, error: enqueueError } = await supabase.rpc('enqueue_patient_v2', {
        p_patient_name: row.patient_name,
        p_phone_number: row.phone_number,
        p_message_body: followupText,
        p_status: 'queued',
        p_is_approved: true,
        p_send_after: new Date().toISOString(),
        p_notes: 'Segunda chamada: followup_confirm',
        p_attempt_count: 0,
        p_dedupe_kind: 'followup_confirm',
        p_origin_queue_id: row.id,
        p_canonical_phone: normalizedPhone,
        p_data_nascimento: row.Data_nascimento,
        p_data_exame: row.data_exame,
        p_procedimentos: row.procedimentos,
        p_horario_inicio: row.horario_inicio,
        p_horario_final: row.horario_final,
        p_time_proce: row.time_proce,
        p_phone_2: row.phone_2,
        p_phone_3: row.phone_3,
        p_locked_instance_id: row.locked_instance_id || null,   // MESMO número → propagar instância
        p_phone_attempt_index: row.phone_attempt_index || 1,    // Manter posição na escada
      })

      if (enqueueError) {
        console.error(`❌ Erro ao enfileirar followup para paciente ${row.patient_name}:`, enqueueError)
        continue
      }

      const results = enqueueResult as { id: string; status: string; error_message: string }[] | null
      const result = results && results.length > 0 ? results[0] : null
      
      if (!result || result.status !== 'success') {
        const msg = result?.error_message || result?.status || 'erro desconhecido'
        console.warn(`⚠️ Erro ao enfileirar followup: ${msg}`)
        continue
      }

      await supabase
        .from('patients_queue')
        .update({
          needs_second_call: true,
          second_call_reason: 'delivered_no_reply_followup',
          followup_sent_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', row.id)

      if (row.journey_id) {
        await insertJourneyEvent(row.journey_id, null, 'followup_sent', 'worker')

        void supabase
          .from('patient_journeys')
          .update({
            journey_status: 'followup_sent',
            last_event_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', row.journey_id)

        const { data: journeyMessageData } = await supabase
          .from('journey_messages')
          .insert({
            journey_id: row.journey_id,
            queue_message_id: result.id,
            direction: 'outbound',
            message_kind: 'followup',
            phone_number: row.phone_number,
            message_body: followupText,
            status: 'queued',
          })
          .select('id')
          .single()

        if (journeyMessageData) {
          await insertJourneyEvent(row.journey_id, journeyMessageData.id, 'message_queued', 'worker')
        }
      }

      void supabase.from('message_events').insert({
        message_id: row.id,
        instance_id: null,
        event_type: 'followup_sent',
        event_at: new Date().toISOString(),
        raw_payload: null,
      } as any)

      processed += 1
    }
  }

  // ========================================
  // BLOCO 3: retry_phone3 (60min após retry_phone2)
  // ========================================
const { data: notReceivedPhone3 } = await supabase
    .from('patients_queue')
    .select('id,patient_name,phone_number,phone_2,phone_3,message_body,accepted_at,delivered_at,retry_phone2_sent_at,retry_phone3_sent_at,journey_id,locked_instance_id,Data_nascimento,data_exame,procedimentos,horario_inicio,horario_final,time_proce')
    .is('delivered_at', null)
    .not('retry_phone2_sent_at', 'is', null)
    .lte('retry_phone2_sent_at', cutoff)
    .is('retry_phone3_sent_at', null)
    .not('phone_3', 'is', null)
    .eq('dedupe_kind', 'original')
    .gte('data_exame', today)
    .limit(50) as any

  if (Array.isArray(notReceivedPhone3)) {
    const instanceToUse = await getConnectedInstance()

    for (const row of notReceivedPhone3) {
      const examDate = row.data_exame
      const examTime = row.horario_inicio
      const examHour = examTime ? parseInt(examTime.split(':')[0], 10) : 18

      if (examDate === today && examHour < currentHour) {
        continue
      }

      const toPhone3 = String(row.phone_3 || '').trim()
      if (!toPhone3) continue
      
      // Verificar se phone_3 tem WhatsApp ANTES de enfileirar
      if (instanceToUse) {
        const check3 = await checkWhatsAppNumber(instanceToUse.instance_name, toPhone3)
        const hasWhatsApp = check3.exists
        
        // Atualizar resultado da verificação
        await supabase.from('patients_queue').update({
          phone_3_whatsapp_valid: hasWhatsApp,
          phone_3_whatsapp_checked_at: new Date().toISOString(),
        }).eq('id', row.id)
        
        // Se não tem WhatsApp → marcar como crítico (não há mais números)
        if (!hasWhatsApp) {
          console.log(`⚠️ Phone3 ${toPhone3} não tem WhatsApp para paciente ${row.patient_name} - esgotado`)
          await supabase.from('patients_queue').update({
            needs_second_call: true,
            second_call_reason: 'phone_ladder_exhausted',
            notes: 'Tel1, Tel2 e Tel3 sem WhatsApp',
          }).eq('id', row.id)
          continue
        }
      }
      
      const normalizedPhone = normalizePhone(toPhone3)

      const { data: enqueueResult, error: enqueueError } = await supabase.rpc('enqueue_patient_v2', {
        p_patient_name: row.patient_name,
        p_phone_number: toPhone3,
        p_message_body: row.message_body,
        p_status: 'queued',
        p_is_approved: true,
        p_send_after: new Date().toISOString(),
        p_notes: 'Terceira chamada: retry_phone3 (60min após phone2)',
        p_attempt_count: 0,
        p_dedupe_kind: 'retry_phone3',
        p_origin_queue_id: row.origin_queue_id || row.id,
        p_canonical_phone: normalizedPhone,
        p_data_nascimento: row.Data_nascimento,
        p_data_exame: row.data_exame,
        p_procedimentos: row.procedimentos,
        p_horario_inicio: row.horario_inicio,
        p_horario_final: row.horario_final,
        p_time_proce: row.time_proce,
        p_phone_2: row.phone_2,
        p_phone_3: row.phone_3,
        p_phone_attempt_index: 3,
        p_last_phone_used: toPhone3,
      })

      if (enqueueError) {
        console.error(`❌ Erro ao enfileirar retry_phone3 para paciente ${row.patient_name}:`, enqueueError)
        continue
      }
      const results = enqueueResult as { id: string; status: string; error_message: string }[] | null
      const result = results && results.length > 0 ? results[0] : null
      
      if (!result || result.status !== 'success') {
        if (result?.status === 'duplicate_recent') {
          console.log(`ℹ️ Mensagem recente para ${normalizedPhone}, pulando retry_phone3`)
        } else {
          const msg = result?.error_message || result?.status || 'erro desconhecido'
          console.warn(`⚠️ Erro ao enfileirar retry_phone3 (stale): ${msg}`)
        }
        continue
      }

      await supabase
        .from('patients_queue')
        .update({
          needs_second_call: true,
          second_call_reason: 'not_received_retry_phone3',
          retry_phone3_sent_at: new Date().toISOString(),
          last_contact_phone: toPhone3,
          updated_at: new Date().toISOString(),
          last_delivery_status: 'not_received',
        })
        .eq('id', row.id)

      if (row.journey_id) {
        await insertJourneyEvent(row.journey_id, null, 'retry_phone3_sent', 'worker', {
          to_phone: sanitizeBrazilianNumber(toPhone3),
        })

        await supabase.from('journey_messages').insert({
          journey_id: row.journey_id,
          queue_message_id: result.id,
          direction: 'outbound',
          message_kind: 'retry_phone3',
          phone_number: toPhone3,
          message_body: row.message_body,
          status: 'queued',
        })
      }

      void supabase.from('message_events').insert({
        message_id: row.id,
        instance_id: null,
        event_type: 'retry_phone3_sent',
        event_at: new Date().toISOString(),
        raw_payload: { to_phone: sanitizeBrazilianNumber(toPhone3) },
      } as any)

      processed += 1
    }
  }

  // ========================================
  // BLOCO 4: Marcar esgotados como Crítico
  // ========================================
  const { data: allFailed } = await supabase
    .from('patients_queue')
    .select('id,journey_id,patient_name,phone_number,phone_2,phone_3')
    .eq('status', 'failed')
    .eq('needs_second_call', true)
    .eq('second_call_reason', 'not_received_retry_phone3')
    .is('delivered_at', null)
    .limit(50) as any

  if (Array.isArray(allFailed)) {
    for (const row of allFailed) {
      const hasPhone2 = !!row.phone_2
      const hasPhone3 = !!row.phone_3

      if (hasPhone2 && !hasPhone3) {
        // Phone2 falhou e não há phone3 → esgotado
        if (row.journey_id) {
          await supabase
            .from('patient_journeys')
            .update({
              phone_ladder_exhausted: true,
              needs_manual_action: true,
              journey_status: 'pending_manual',
              automation_notes: (row.automation_notes || '') + ' | Esgotado: Sem phone3',
              last_event_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', row.journey_id)

          await insertJourneyEvent(row.journey_id, null, 'phone_ladder_exhausted', 'worker', {
            reason: 'retry_phone3_failed_no_more_phones',
          })
        }
      } else if (hasPhone3) {
        // Phone3 falhou → definitivamente esgotado
        if (row.journey_id) {
          await supabase
            .from('patient_journeys')
            .update({
              phone_ladder_exhausted: true,
              needs_manual_action: true,
              journey_status: 'pending_manual',
              automation_notes: (row.automation_notes || '') + ' | Esgotado: Todos os telefones falharam',
              last_event_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', row.journey_id)

          await insertJourneyEvent(row.journey_id, null, 'phone_ladder_exhausted', 'worker', {
            reason: 'all_phones_failed',
          })
        }
      }

      await supabase
        .from('patients_queue')
        .update({
          needs_second_call: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', row.id)

      processed += 1
    }
  }

  return { processed }
}

export async function releaseExpiredLocks(
  lockTimeoutMinutes = 5,
): Promise<ExpiredLock[]> {
  try {
    const { data, error } = await supabase.rpc('release_expired_locks', {
      p_lock_timeout_minutes: lockTimeoutMinutes,
    })

    if (error) {
      console.error(`❌ Erro ao liberar locks expirados:`, error)
      return []
    }

    const locks = data as ExpiredLock[] | null
    return locks || []
  } catch (error) {
    console.error(`❌ Exceção ao liberar locks expirados:`, error)
    return []
  }
}

export async function acquireWorkerLease(workerId: string, leaseSeconds = 90): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('acquire_worker_lease', {
      p_worker_id: workerId,
      p_lease_seconds: leaseSeconds,
    })

    if (error) {
      console.error(`❌ Erro ao adquirir lease do worker ${workerId}:`, error)
      return false
    }

    return Boolean(data)
  } catch (error) {
    console.error(`❌ Exceção ao adquirir lease do worker ${workerId}:`, error)
    return false
  }
}

export async function releaseWorkerLease(workerId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('release_worker_lease', {
      p_worker_id: workerId,
    })

    if (error) {
      console.error(`❌ Erro ao liberar lease do worker ${workerId}:`, error)
      return false
    }

    return Boolean(data)
  } catch (error) {
    console.error(`❌ Exceção ao liberar lease do worker ${workerId}:`, error)
    return false
  }
}

export async function cleanupStaleHeartbeats(staleAfterMinutes = 10) {
  try {
    const { data, error } = await supabase.rpc('cleanup_stale_heartbeats', {
      p_stale_after_minutes: staleAfterMinutes,
    })

    if (error) {
      console.error(`❌ Erro ao limpar heartbeats obsoletos:`, error)
      return []
    }

    return data || []
  } catch (error) {
    console.error(`❌ Exceção ao limpar heartbeats obsoletos:`, error)
    return []
  }
}

export async function refreshMessageLock(messageId: string, workerId: string): Promise<boolean> {
  try {
    const { data: updatedRows, error } = await supabase
      .from('patients_queue')
      .update({
        locked_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', messageId)
      .eq('status', 'sending')
      .eq('locked_by', workerId)
      .select('id')

    if (error) {
      console.error(`❌ Erro ao renovar lock da mensagem ${messageId}:`, error)
      return false
    }

    return !!updatedRows && updatedRows.length > 0
  } catch (error) {
    console.error(`❌ Exceção ao renovar lock da mensagem ${messageId}:`, error)
    return false
  }
}

// ============================================
// Heartbeat Operations
// ============================================

export async function upsertHeartbeat(heartbeat: Partial<WorkerHeartbeat>): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('worker_heartbeats')
      .upsert({
        ...heartbeat,
        last_heartbeat: new Date().toISOString(),
      }, {
        onConflict: 'worker_id',
      })

    if (error) {
      console.error(`❌ Erro ao registrar heartbeat:`, error)
      return false
    }

    return true
  } catch (error) {
    console.error(`❌ Exceção ao registrar heartbeat:`, error)
    return false
  }
}

export async function removeHeartbeat(workerId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('worker_heartbeats')
      .delete()
      .eq('worker_id', workerId)

    if (error) {
      console.error(`❌ Erro ao remover heartbeat:`, error)
      return false
    }

    return true
  } catch (error) {
    console.error(`❌ Exceção ao remover heartbeat:`, error)
    return false
  }
}

// ============================================
// System Config Operations
// ============================================

export async function getSystemConfig(): Promise<SystemConfig | null> {
  try {
    const { data, error } = await supabase
      .from('system_config')
      .select('*')
      .eq('id', 1)
      .single()

    if (error) {
      console.error(`❌ Erro ao buscar configuração do sistema:`, error)
      return null
    }

    return data as SystemConfig
  } catch (error) {
    console.error(`❌ Exceção ao buscar configuração do sistema:`, error)
    return null
  }
}

export async function toggleSystemPause(isPaused: boolean): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('system_config')
      .update({ is_paused: isPaused, updated_at: new Date().toISOString() })
      .eq('id', 1)

    if (error) {
      console.error(`❌ Erro ao atualizar estado de pausa:`, error)
      return false
    }

    return true
  } catch (error) {
    console.error(`❌ Exceção ao atualizar estado de pausa:`, error)
    return false
  }
}

// ============================================
// LGPD Operations
// ============================================

export async function hasValidConsent(patientId?: string | null): Promise<boolean> {
  if (!patientId) return false

  try {
    const { data, error } = await supabase
      .from('patient_consent')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error) {
      console.error(`❌ Erro ao verificar consentimento:`, error)
      return false
    }

    const consent = data as PatientConsent | null
    if (!consent) return false

    return consent.consent_status === 'granted' && !consent.consent_revoked_at
  } catch (error) {
    console.error(`❌ Exceção ao verificar consentimento:`, error)
    return false
  }
}

export async function isNumberBlocked(phoneNumber: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('message_blocks')
      .select('*')
      .eq('phone_number', phoneNumber)
      .or(`permanent.eq.true,expires_at.gt.${new Date().toISOString()}`)
      .limit(1)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return false
      console.error(`❌ Erro ao verificar bloqueio:`, error)
      return false
    }

    return !!data
  } catch (error) {
    console.error(`❌ Exceção ao verificar bloqueio:`, error)
    return false
  }
}

export async function blockNumber(
  phoneNumber: string,
  patientId?: string | null,
  reason: 'opt_out' | 'failed_payment' | 'complaint' = 'opt_out',
  source?: string | null,
): Promise<boolean> {
  try {
    const { error } = await supabase.from('message_blocks').insert({
      patient_id: patientId,
      phone_number: phoneNumber,
      blocked_at: new Date().toISOString(),
      reason,
      source,
      permanent: true,
    })

    if (error) {
      console.error(`❌ Erro ao bloquear número:`, error)
      return false
    }

    return true
  } catch (error) {
    console.error(`❌ Exceção ao bloquear número:`, error)
    return false
  }
}

// ============================================
// Analytics Operations
// ============================================

export async function getRealtimeMetrics() {
  try {
    const { data, error } = await supabase
      .from('dashboard_realtime_metrics')
      .select('*')
      .single()

    if (error) {
      console.error(`❌ Erro ao buscar métricas:`, error)
      return null
    }

    return data
  } catch (error) {
    console.error(`❌ Exceção ao buscar métricas:`, error)
    return null
  }
}

export async function getExpiredLocks() {
  try {
    const { data, error } = await supabase
      .from('expired_locks')
      .select('*')
      .order('locked_at', { ascending: true })

    if (error) {
      console.error(`❌ Erro ao buscar locks expirados:`, error)
      return []
    }

    return data || []
  } catch (error) {
    console.error(`❌ Exceção ao buscar locks expirados:`, error)
    return []
  }
}

export async function getInstanceById(instanceId: string) {
  try {
    const { data, error } = await supabase
      .from('whatsapp_instances')
      .select('*')
      .eq('id', instanceId)
      .single()

    if (error) {
      console.error(`❌ Erro ao buscar instância ${instanceId}:`, error)
      return null
    }

    return data
  } catch (error) {
    console.error(`❌ Exceção ao buscar instância ${instanceId}:`, error)
    return null
  }
}

// ============================================
// Journey Operations (PR 1 - Worker Lifecycle)
// ============================================

export async function createJourneyAndMessage(
  queueMessageId: string,
  patientName: string,
  phoneNumber: string,
  messageBody: string,
  instanceId: string,
  dataExame?: string | null,
  procedimentos?: string | null,
  horarioInicio?: string | null,
  horarioFinal?: string | null,
): Promise<{ journeyId: string; messageId: string } | null> {
  try {
    const nowIso = new Date().toISOString()
    const canonicalPhone = normalizePhone(phoneNumber)

    const { data: journeyData, error: journeyError } = await supabase
      .from('patient_journeys')
      .insert({
        origin_queue_id: queueMessageId,
        patient_name: patientName,
        canonical_phone: canonicalPhone,
        primary_phone: phoneNumber,
        data_exame: dataExame,
        procedimentos: procedimentos,
        horario_inicio: horarioInicio,
        horario_final: horarioFinal,
        journey_status: 'contacting',
        needs_manual_action: false,
      })
      .select('id')
      .single()

    if (journeyError) {
      console.error(`❌ Erro ao criar journey:`, journeyError)
      return null
    }

    const journeyId = journeyData.id

    const { data: messageData, error: messageError } = await supabase
      .from('journey_messages')
      .insert({
        journey_id: journeyId,
        queue_message_id: queueMessageId,
        direction: 'outbound',
        message_kind: 'original',
        provider_name: 'evolution',
        instance_id: instanceId,
        phone_number: phoneNumber,
        message_body: messageBody,
        status: 'sending',
      })
      .select('id')
      .single()

    if (messageError) {
      console.error(`❌ Erro ao criar journey_message:`, messageError)
      return null
    }

    void supabase
      .from('patients_queue')
      .update({ journey_id: journeyId })
      .eq('id', queueMessageId)

    await insertJourneyEvent(journeyId, messageData.id, 'message_claimed', 'worker')

    return { journeyId, messageId: messageData.id }
  } catch (error) {
    console.error(`❌ Exceção ao criar journey e message:`, error)
    return null
  }
}

export async function updateJourneyMessageAccepted(
  journeyId: string,
  queueMessageId: string,
  providerMessageId: string,
  providerChatId: string,
  acceptedAt: string,
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('journey_messages')
      .update({
        status: 'accepted',
        provider_message_id: providerMessageId,
        provider_chat_id: providerChatId,
        accepted_at: acceptedAt,
        updated_at: acceptedAt,
      })
      .eq('queue_message_id', queueMessageId)
      .eq('journey_id', journeyId)
      .eq('direction', 'outbound')

    if (error) {
      console.error(`❌ Erro ao atualizar journey_message accepted:`, error)
      return false
    }

    await insertJourneyEvent(journeyId, null, 'message_accepted', 'worker', {
      provider_message_id: providerMessageId,
      provider_chat_id: providerChatId,
    })

    return true
  } catch (error) {
    console.error(`❌ Exceção ao atualizar journey_message accepted:`, error)
    return false
  }
}

export async function updateJourneyMessageDelivered(
  journeyId: string,
  queueMessageId: string,
  deliveredAt: string,
): Promise<boolean> {
  try {
    const { data: messages, error } = await supabase
      .from('journey_messages')
      .select('id')
      .eq('queue_message_id', queueMessageId)
      .eq('journey_id', journeyId)
      .eq('direction', 'outbound')

    if (error) {
      console.error(`❌ Erro ao buscar journey_message para delivered:`, error)
      return false
    }

    if (!messages || messages.length === 0) {
      console.warn(`⚠️ Nenhum journey_message encontrado para delivered`)
      return false
    }

    const messageId = messages[0].id

    const { error: updateError } = await supabase
      .from('journey_messages')
      .update({
        status: 'delivered',
        delivered_at: deliveredAt,
        updated_at: deliveredAt,
      })
      .eq('id', messageId)

    if (updateError) {
      console.error(`❌ Erro ao atualizar journey_message delivered:`, updateError)
      return false
    }

    void supabase
      .from('patient_journeys')
      .update({
        journey_status: 'delivered_waiting_reply',
        last_event_at: deliveredAt,
        updated_at: deliveredAt,
      })
      .eq('id', journeyId)

    await insertJourneyEvent(journeyId, messageId, 'message_delivered', 'webhook')

    return true
  } catch (error) {
    console.error(`❌ Exceção ao atualizar journey_message delivered:`, error)
    return false
  }
}
export async function insertJourneyEvent(
  journeyId: string,
  messageId: string | null,
  eventType: string,
  source: 'worker' | 'webhook' | 'polling' | 'ai' | 'manual',
  payload?: Record<string, unknown>,
): Promise<boolean> {
  try {
    const { error } = await supabase.from('journey_events').insert({
      journey_id: journeyId,
      message_id: messageId,
      event_type: eventType,
      event_at: new Date().toISOString(),
      source,
      payload,
    })

    if (error) {
      console.error(`❌ Erro ao inserir journey_event:`, error)
      return false
    }

    return true
  } catch (error) {
    console.error(`❌ Exceção ao inserir journey_event:`, error)
    return false
  }
}

export async function updateJourneyMessageFailed(
  journeyId: string,
  queueMessageId: string,
  errorMessage: string,
  failedAt: string,
): Promise<boolean> {
  try {
    const { data: messages, error } = await supabase
      .from('journey_messages')
      .select('id')
      .eq('queue_message_id', queueMessageId)
      .eq('journey_id', journeyId)
      .eq('direction', 'outbound')

    if (error) {
      console.error(`❌ Erro ao buscar journey_message para failed:`, error)
      return false
    }

    if (!messages || messages.length === 0) {
      return false
    }

    const messageId = messages[0].id

    const { error: updateError } = await supabase
      .from('journey_messages')
      .update({
        status: 'failed',
        failed_at: failedAt,
        updated_at: failedAt,
      })
      .eq('id', messageId)

    if (updateError) {
      console.error(`❌ Erro ao atualizar journey_message failed:`, updateError)
      return false
    }

    await insertJourneyEvent(journeyId, messageId, 'message_failed', 'worker', {
      error: errorMessage,
    })

    return true
  } catch (error) {
    console.error(`❌ Exceção ao atualizar journey_message failed:`, error)
    return false
  }
}

export async function runBatchPreValidation(workerId: string): Promise<number> {
  try {
    await supabase
      .from('system_config')
      .update({ xray_requested: false, updated_at: new Date().toISOString() })
      .eq('id', 1)

    const { data: patients, error } = await supabase
      .from('patients_queue')
      .select('id, phone_number, phone_2, phone_3')
      .in('status', ['queued', 'sending'])
      .order('created_at', { ascending: true })

    if (error) {
      console.error('❌ Erro ao buscar pacientes para Raio-X:', error.message)
      return 0
    }

    if (!patients || patients.length === 0) {
      console.log('🩻 [Raio-X] Nenhum paciente na fila para analisar.')
      return 0
    }

    let checkCount = 0

    console.log(`🩻 [Raio-X] Iniciando análise de ${patients.length} paciente(s)...`)

    for (const p of patients) {
      try {
        const updates: Record<string, any> = {
          whatsapp_checked_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }

        if (p.phone_number) {
          const v1 = await validatePhoneForWhatsApp('any', p.phone_number)
          updates.phone_1_whatsapp_valid = v1.valid
          updates.whatsapp_valid = v1.valid
        }

        if (p.phone_2) {
          const v2 = await validatePhoneForWhatsApp('any', p.phone_2)
          updates.phone_2_whatsapp_valid = v2.valid
        }

        if (p.phone_3) {
          const v3 = await validatePhoneForWhatsApp('any', p.phone_3)
          updates.phone_3_whatsapp_valid = v3.valid
        }

        const { error: upError } = await supabase
          .from('patients_queue')
          .update(updates)
          .eq('id', p.id)

        if (upError) {
          console.error(`❌ Raio-X erro ao salvar ${p.id}:`, upError.message)
        } else {
          checkCount++
        }
      } catch (err) {
        console.error(`❌ Raio-X exceção no paciente ${p.id}:`, err)
      }
    }

    console.log(`✅ [Raio-X] Concluído. ${checkCount}/${patients.length} paciente(s) validado(s).`)
    return checkCount
  } catch (err) {
    console.error('❌ Exceção no Raio-X:', err)
    return 0
  }
}

