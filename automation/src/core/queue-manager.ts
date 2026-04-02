import {
  claimNextMessage,
  claimNextMessageForInstance,
  isNumberBlocked,
  markMessageAccepted,
  markMessageDelivered,
  markMessageFailed,
  deferMessageForInfra,
  refreshMessageLock,
  saveLockInstanceAffinity,
  supabase,
} from '../services/supabase'
import {
  sendTextMessage,
  syncDeliveryStatus,
  validatePhoneForWhatsApp,
} from '../services/evolution'
import type { ClaimedMessage, SendResult } from '../types'
import { force8Digit, force9Digit, hashText, maskPhone, timestamp } from '../utils/helpers'
import { InstanceSelector } from './instance-selector'
import { Humanizer } from './humanizer'

export interface ProcessResult {
  processed: boolean
  messageId?: string
  status?: 'delivered' | 'failed' | 'skipped' | 'deferred'
  reason?: string
}

interface BestPhoneResult {
  phone: string
  index: number
  changed: boolean
}

export class QueueManager {
  private readonly bypassHumanizerPhone = String(process.env.BYPASS_HUMANIZER_TEST_PHONE || '').replace(/\D/g, '')
  private readonly bypassHumanizerTag = String(process.env.BYPASS_HUMANIZER_TEST_TAG || '').trim().toLowerCase()

  constructor(
    private readonly instanceSelector = new InstanceSelector(),
    private readonly humanizer = new Humanizer(),
  ) {}

  private shouldBypassHumanizer(message: ClaimedMessage): boolean {
    const cleanPhone = String(message.phone_number || '').replace(/\D/g, '')
    const tag = this.bypassHumanizerTag
    const matchesPhone = !!this.bypassHumanizerPhone && cleanPhone === this.bypassHumanizerPhone
    const haystack = `${message.patient_name || ''} ${message.message_body || ''}`.toLowerCase()
    const matchesTag = !!tag && haystack.includes(tag)

    return matchesPhone && matchesTag
  }

  async claim(workerId: string, maxAttempts = 3): Promise<ClaimedMessage | null> {
    return claimNextMessage(workerId, maxAttempts)
  }

  async claimForInstance(
    workerId: string,
    instanceId: string,
    instanceName: string,
    maxAttempts = 3,
  ): Promise<ClaimedMessage | null> {
    return claimNextMessageForInstance(workerId, instanceId, instanceName, maxAttempts)
  }

  async processClaimedMessage(
    message: ClaimedMessage,
    workerId: string,
    dryRun: boolean = false,
  ): Promise<ProcessResult> {
    const lockRefreshIntervalMs = 60_000
    let lockRefreshTimer: ReturnType<typeof setInterval> | undefined

    console.log(`[${timestamp()}] 🧾 Processando: ${message.patient_name} (${maskPhone(message.phone_number)}) [At: ${message.phone_attempt_index || 1}]`)

    const startLockRefresh = () => {
      lockRefreshTimer = setInterval(async () => {
        const refreshed = await refreshMessageLock(message.id, workerId)
        if (!refreshed) {
          console.warn(`[${timestamp()}] ⚠️ Falha ao renovar lock da mensagem ${message.id}.`)
        } else {
          // Lock renovado silenciosamente
        }
      }, lockRefreshIntervalMs)
    }

    const stopLockRefresh = () => {
      if (lockRefreshTimer) {
        clearInterval(lockRefreshTimer)
        lockRefreshTimer = undefined
      }
    }

    startLockRefresh()

    try {
      // ──────────────────────────────────────
      // 1. Validação de Instância (AFINIDADE ESTRITA)
      // ──────────────────────────────────────
      const resolution = await this.instanceSelector.resolveFromClaim(message)
      const selectedInstance = resolution.selected

      if (!selectedInstance) {
        console.warn(`[${timestamp()}] ⚠️ Mensagem sem instancia valida (afinidade bloqueada ou offline)`, {
          messageId: message.id,
          workerId,
          claimedInstance: message.instance_name,
          lockedInstanceId: message.locked_instance_id,
          reason: resolution.reason || 'unknown',
        })

        const deferReason = resolution.reason || (message.locked_instance_id ? 'affinity_instance_offline' : 'instance_unavailable')
        await deferMessageForInfra(
          message.id,
          workerId,
          deferReason,
        )

        return {
          processed: true,
          messageId: message.id,
          status: 'deferred',
          reason: deferReason,
        }
      }

      // Se é um novo vínculo (sem afinidade prévia), gravar no banco
      if (!selectedInstance.isAffinityMatch) {
        await saveLockInstanceAffinity(message.id, selectedInstance.id)
        console.log(`[${timestamp()}] 🔗 Afinidade gravada: ${selectedInstance.instanceName} → ${maskPhone(message.phone_number)}`, {
          messageId: message.id,
        })
      }

      // ──────────────────────────────────────
      // 2. Seleção do Melhor Telefone (Raio-X)
      // ──────────────────────────────────────
      if (!dryRun) {
        const bestPhone = this.pickBestPhone(message)

        if (!bestPhone) {
          console.warn(`[${timestamp()}] 📵 Nenhum telefone com WhatsApp (Raio-X). Movendo para Crítico.`, {
            messageId: message.id,
            patientName: message.patient_name,
          })

          await markMessageFailed(
            message.id,
            'Todos os telefones sem WhatsApp (Raio-X)',
            0,
            workerId,
            {
              secondCallReason: 'all_phones_invalid',
              needsSecondCall: true,
            },
          )

          return {
            processed: true,
            messageId: message.id,
            status: 'skipped',
            reason: 'all_phones_invalid',
          }
        }

        if (bestPhone.changed) {
          console.log(`[${timestamp()}] 🔄 Raio-X: trocando Tel1 → Tel${bestPhone.index}`, {
            messageId: message.id,
            newPhone: maskPhone(bestPhone.phone),
          })

          await supabase
            .from('patients_queue')
            .update({
              phone_number: bestPhone.phone,
              phone_attempt_index: bestPhone.index,
              last_phone_used: bestPhone.phone,
              updated_at: new Date().toISOString(),
            })
            .eq('id', message.id)

          message.phone_number = bestPhone.phone
        } else {
          console.log(`[${timestamp()}] ✅ Telefone selecionado: Tel${bestPhone.index} (${maskPhone(bestPhone.phone)})`, {
            messageId: message.id,
          })
        }
      }

      // ──────────────────────────────────────
      // 3. Compliance: Opt-out / Bloqueio
      // ──────────────────────────────────────
      const blocked = await isNumberBlocked(message.phone_number)
      if (blocked) {
        console.warn(`[${timestamp()}] ⛔ Numero bloqueado por compliance`, {
          messageId: message.id,
          phone: maskPhone(message.phone_number),
        })
        await markMessageFailed(
          message.id,
          'Número bloqueado por opt-out/compliance',
          message.attempt_count,
          workerId,
          {
            secondCallReason: 'number_blocked',
            needsSecondCall: false,
          },
        )
        return {
          processed: true,
          messageId: message.id,
          status: 'skipped',
          reason: 'number_blocked',
        }
      }

      // ──────────────────────────────────────
      // 4. Humanização Anti-Ban
      // ──────────────────────────────────────
      if (this.shouldBypassHumanizer(message)) {
        console.warn(`[${timestamp()}] 🧪 Bypass de humanizacao aplicado ao teste`, {
          messageId: message.id,
          phone: maskPhone(message.phone_number),
          patientName: message.patient_name,
        })
      } else {
        const humanResult = await this.humanizer.applyPreSendDelay(message.message_body)
        if (!humanResult.canSend) {
          console.warn(`[${timestamp()}] ⏸️ Envio adiado pela humanizacao`, {
            messageId: message.id,
            reason: humanResult.reason,
          })
          await deferMessageForInfra(message.id, workerId, `Adiado: ${humanResult.reason}`)
          return {
            processed: true,
            messageId: message.id,
            status: 'deferred',
            reason: humanResult.reason,
          }
        }
      }

      // ========== MODO DRY RUN ==========
      if (dryRun) {
        console.log(`[${timestamp()}] 🔍 [DRY RUN] Simulando envio para ${maskPhone(message.phone_number)}`)
        console.log(`[${timestamp()}] 🔍 [DRY RUN] Instância: ${selectedInstance.instanceName}`)
        console.log(`[${timestamp()}] 🔍 [DRY RUN] Mensagem: ${message.message_body.substring(0, 50)}...`)

        await new Promise(resolve => setTimeout(resolve, Math.random() * 500 + 200))

        const durationMs = Math.floor(Math.random() * 300 + 100)
        await markMessageDelivered(
          message.id,
          selectedInstance.id,
          workerId,
          durationMs,
          maskPhone(message.phone_number),
          await hashText(message.patient_name),
          dryRun,
        )

        return {
          processed: true,
          messageId: message.id,
          status: 'delivered',
        }
      }
      // ========== FIM DRY RUN ==========

      // ──────────────────────────────────────
      // 5. Validação de Formato WhatsApp (8 vs 9 dígitos)
      // ──────────────────────────────────────
      let finalPhoneNumber = message.phone_number
      
      // Se não validado ou sem formato definido, valida agora
      if (!message.whatsapp_valid || !message.whatsapp_validated_format) {
        const validation = await validatePhoneForWhatsApp(
          selectedInstance.instanceName,
          message.phone_number,
        )

        if (validation.valid && validation.phone) {
          finalPhoneNumber = validation.phone
          console.log(`[${timestamp()}] 🎯 Formato validado: ${validation.format} (${maskPhone(finalPhoneNumber)})`, {
            messageId: message.id,
          })

          // Atualiza no banco para uso futuro (follow-ups, etc)
          await supabase
            .from('patients_queue')
            .update({
              whatsapp_valid: true,
              phone_1_whatsapp_valid: true,
              whatsapp_checked_at: new Date().toISOString(),
              whatsapp_validated_format: validation.format,
            })
            .eq('id', message.id)
        } else {
          console.warn(`[${timestamp()}] ❌ Nenhum formato de WhatsApp encontrado para ${maskPhone(message.phone_number)}`, {
            messageId: message.id,
          })
          
          // Marca como inválido para evitar checks repetidos
          await supabase
            .from('patients_queue')
            .update({
              whatsapp_valid: false,
              phone_1_whatsapp_valid: false,
              whatsapp_checked_at: new Date().toISOString(),
            })
            .eq('id', message.id)
            
          // Por segurança (fail-open), vamos continuar com o número original se o check falhar totalmente.
          finalPhoneNumber = message.phone_number
        }
      } else {
        // Já validado anteriormente, garante o formato correto
        finalPhoneNumber = message.whatsapp_validated_format === '9_digits' 
          ? force9Digit(message.phone_number)
          : force8Digit(message.phone_number)
          
        console.log(`[${timestamp()}] ♻️ Usando formato validado em cache: ${message.whatsapp_validated_format} (${maskPhone(finalPhoneNumber)})`)
      }

      // ──────────────────────────────────────
      // 6. Envio Real via Evolution API
      // ──────────────────────────────────────
      const startedAt = Date.now()
      console.log(`[${timestamp()}] 📤 Enviando mensagem`, {
        messageId: message.id,
        workerId,
        instanceName: selectedInstance.instanceName,
        phone: maskPhone(finalPhoneNumber),
        affinityMatch: selectedInstance.isAffinityMatch,
      })
      const sendResult: SendResult = await sendTextMessage(
        selectedInstance.instanceName,
        finalPhoneNumber,
        message.message_body,
      )

      if (!sendResult.success) {
        console.error(`[${timestamp()}] ❌ Resultado de envio com falha`, {
          messageId: message.id,
          workerId,
          instanceName: selectedInstance.instanceName,
          errorType: sendResult.errorType,
          error: sendResult.error,
        })

        await markMessageFailed(
          message.id,
          sendResult.error || 'Falha técnica no envio',
          message.attempt_count,
          workerId,
          {
            secondCallReason: 'provider_error',
            needsSecondCall: false,
          },
        )

        return {
          processed: true,
          messageId: message.id,
          status: 'failed',
          reason: sendResult.errorType,
        }
      }


      // ──────────────────────────────────────
      // 6. Sucesso — Registrar Aceitação e Iniciar Polling
      // ──────────────────────────────────────
      const durationMs = Date.now() - startedAt
      console.log(`[${timestamp()}] ✅ Envio concluido`, {
        messageId: message.id,
        workerId,
        instanceName: selectedInstance.instanceName,
        durationMs,
        affinityInstance: selectedInstance.id,
      })

      const providerMessageId = sendResult.data?.key?.id || null
      const providerChatId = sendResult.data?.key?.remoteJid || null

      const accepted = await markMessageAccepted(
        message.id,
        selectedInstance.id,
        providerMessageId,
        providerChatId,
        workerId,
      )

      if (!accepted) {
        console.error(`[${timestamp()}] ⚠️ Evolution aceitou, mas não foi possível marcar mensagem como aceita no banco`, {
          messageId: message.id,
          workerId,
          instanceName: selectedInstance.instanceName,
        })
        return {
          processed: true,
          messageId: message.id,
          status: 'failed',
          reason: 'mark_accepted_failed',
        }
      }

      const cleanNumber = message.phone_number.replace(/\D/g, '')
      const trackingMessageId = providerMessageId || message.id
      const instanceName = selectedInstance.instanceName

      syncDeliveryStatus(trackingMessageId, message.id, cleanNumber, instanceName).catch((error) => {
        console.error(`[${timestamp()}] ❌ Erro na sincronização de status`, {
          messageId: message.id,
          patientName: message.patient_name,
          error: error instanceof Error ? error.message : String(error),
        })
      })

      return {
        processed: true,
        messageId: message.id,
        status: 'delivered',
      }
    } finally {
      console.log(`[${timestamp()}] 🧹 Finalizando processamento da mensagem`, {
        messageId: message.id,
        workerId,
      })
      stopLockRefresh()
    }
  }

  private pickBestPhone(message: ClaimedMessage): BestPhoneResult | null {
    const phones = [
      { phone: message.phone_number, valid: message.phone_1_whatsapp_valid, index: 1 },
      { phone: message.phone_2, valid: message.phone_2_whatsapp_valid, index: 2 },
      { phone: message.phone_3, valid: message.phone_3_whatsapp_valid, index: 3 },
    ]

    const validated = phones.filter(p => p.phone && p.valid === true)

    if (validated.length > 0) {
      const best = validated[0]
      return {
        phone: best.phone!,
        index: best.index,
        changed: best.index !== 1,
      }
    }

    const allChecked = phones.every(p => p.valid === false || (!p.phone && p.index > 1))
    if (allChecked) return null

    return { phone: message.phone_number, index: 1, changed: false }
  }
}
