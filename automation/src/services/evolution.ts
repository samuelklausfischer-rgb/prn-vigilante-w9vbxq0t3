import 'dotenv/config'

import type { SendResult } from '../types'
import {
  exponentialBackoffDelay,
  maskPhone,
  sanitizeBrazilianNumber,
  force9Digit,
  force8Digit,
  serializeError,
  timestamp,
} from '../utils/helpers'

import { supabase } from './supabase'

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || 'http://127.0.0.1:8080'
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || ''
const DEFAULT_TIMEOUT_MS = Number(process.env.EVOLUTION_TIMEOUT_MS || 15000)

async function callEvolution(
  path: string,
  options: RequestInit = {},
  timeoutMs = DEFAULT_TIMEOUT_MS,
) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const method = options.method || 'GET'
    const startedAt = Date.now()
    const response = await fetch(`${EVOLUTION_API_URL}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        apikey: EVOLUTION_API_KEY,
        ...(options.headers || {}),
      },
    })

    const text = await response.text()
    let body: any = null

    try {
      body = text ? JSON.parse(text) : null
    } catch {
      body = text
    }

    if (!response.ok) {
      const error = new Error(`Evolution API [${response.status}]: ${JSON.stringify(body)}`)
      ;(error as any).status = response.status
      ;(error as any).body = body
      console.error(`[${timestamp()}] ❌ Evolution respondeu com erro`, {
        method,
        path,
        status: response.status,
        durationMs: Date.now() - startedAt,
        body,
      })
      throw error
    }

    console.log(`[${timestamp()}] 🌐 Evolution OK`, {
      method,
      path,
      status: response.status,
      durationMs: Date.now() - startedAt,
    })

    return body
  } catch (error) {
    console.error(`[${timestamp()}] ❌ Falha de comunicacao com Evolution`, {
      path,
      timeoutMs,
      error: serializeError(error),
    })
    throw error
  } finally {
    clearTimeout(timeout)
  }
}

function classifyEvolutionError(error: any): SendResult['errorType'] {
  if (error?.name === 'AbortError') return 'timeout'
  if (typeof error?.status === 'number' && error.status === 429) return 'rate_limit'
  if (typeof error?.status === 'number') return 'api_error'
  if (error instanceof TypeError) return 'network'
  return 'unknown'
}

/**
 * Envia uma mensagem de texto via Evolution API usando uma instância específica.
 */
export async function sendTextMessage(
  instanceName: string,
  phoneNumber: string,
  text: string,
  retryAttempts = 3,
): Promise<SendResult> {
  const cleanNumber = sanitizeBrazilianNumber(phoneNumber)
  const maskedNumber = maskPhone(cleanNumber)
  const payload = {
    number: cleanNumber,
    text,
    delay: 1200,
    linkPreview: true,
  }

  for (let attempt = 1; attempt <= retryAttempts; attempt++) {
    try {
      console.log(`[${timestamp()}] 🚀 Iniciando envio via Evolution`, {
        instanceName,
        attempt,
        retryAttempts,
        number: maskedNumber,
        textLength: text.length,
      })

      const result = await callEvolution(`/message/sendText/${instanceName}`, {
        method: 'POST',
        body: JSON.stringify(payload),
      })

      console.log(`[${timestamp()}] ✅ Evolution confirmou envio`, {
        instanceName,
        attempt,
        number: maskedNumber,
        response: result,
      })
      return { success: true, data: result }
    } catch (error: any) {
      const errorType = classifyEvolutionError(error)
      const isRetryable = ['timeout', 'network', 'rate_limit'].includes(errorType ?? 'unknown')
      const isLastAttempt = attempt === retryAttempts

      console.error(`[${timestamp()}] ❌ Falha no envio via Evolution`, {
        instanceName,
        attempt,
        retryAttempts,
        number: maskedNumber,
        errorType,
        isRetryable,
        isLastAttempt,
        error: serializeError(error),
      })

      if (!isRetryable || isLastAttempt) {
        return {
          success: false,
          error: error?.message || 'Erro desconhecido ao enviar mensagem',
          errorType,
        }
      }

      const retryDelayMs = exponentialBackoffDelay(attempt)
      console.warn(`[${timestamp()}] 🔁 Agendando nova tentativa de envio`, {
        instanceName,
        attempt,
        nextAttempt: attempt + 1,
        retryDelayMs,
        number: maskedNumber,
      })
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs))
    }
  }

  return { success: false, error: 'Falha inesperada no envio', errorType: 'unknown' }
}

/**
 * Verifica o status de conexão de uma instância.
 */
export async function getConnectionStatus(instanceName: string): Promise<string> {
  try {
    const data = await callEvolution(`/instance/connectionState/${instanceName}`, {
      method: 'GET',
    })
    return data?.instance?.state || data?.state || 'disconnected'
  } catch (error) {
    console.error(`[${timestamp()}] ❌ Nao foi possivel consultar status da instancia`, {
      instanceName,
      error: serializeError(error),
    })
    return 'disconnected'
  }
}

/**
 * Verifica proativamente se um número possui WhatsApp.
 * Usa o endpoint /chat/whatsappNumbers da Evolution API.
 *
 * @param instanceName - Nome da instância para fazer a verificação
 * @param phoneNumber - Número bruto (será sanitizado internamente)
 * @returns true se o número tem WhatsApp, false se é fixo/inválido
 */
export async function checkWhatsAppNumber(
  instanceName: string,
  phoneNumber: string,
): Promise<boolean> {
  const cleanNumber = sanitizeBrazilianNumber(phoneNumber)

  try {
    console.log(`[${timestamp()}] 🔍 Verificando WhatsApp para ${maskPhone(cleanNumber)}`, {
      instanceName,
    })

    const result = await callEvolution(
      `/chat/whatsappNumbers/${instanceName}`,
      {
        method: 'POST',
        body: JSON.stringify({
          numbers: [cleanNumber],
        }),
      },
      10000,
    )

    // A Evolution API retorna um array com objetos { exists: boolean, jid: string }
    const numbers = Array.isArray(result) ? result : result?.data || result?.numbers || []

    if (!Array.isArray(numbers) || numbers.length === 0) {
      console.warn(`[${timestamp()}] ⚠️ Resposta inesperada do check WhatsApp`, {
        instanceName,
        phone: maskPhone(cleanNumber),
        resultType: typeof result,
      })
      // Em caso de dúvida, permitir o envio (não bloquear por erro de API)
      return true
    }

    const entry = numbers[0]
    const exists = Boolean(entry?.exists ?? entry?.numberExists ?? entry?.isWhatsapp)

    console.log(
      `[${timestamp()}] ${exists ? '✅' : '❌'} WhatsApp check: ${maskPhone(cleanNumber)} → ${exists ? 'TEM WhatsApp' : 'NÃO tem WhatsApp (fixo/inválido)'}`,
      {
        instanceName,
        exists,
        jid: entry?.jid || entry?.number || null,
      },
    )

    return exists
  } catch (error) {
    console.error(`[${timestamp()}] ❌ Falha no check de WhatsApp`, {
      instanceName,
      phone: maskPhone(cleanNumber),
      error: serializeError(error),
    })
    // Em caso de erro de comunicação, permitir envio (fail-open)
    return true
  }
}

/**
 * Valida qual formato de número possui WhatsApp (8 ou 9 dígitos).
 * Tenta ambos e retorna o correto.
 */
export async function validatePhoneForWhatsApp(
  instanceName: string,
  phoneNumber: string,
): Promise<{ valid: boolean; format: '9_digits' | '8_digits' | null; phone: string | null }> {
  // 1. Gera as duas versões para teste
  const v8 = force8Digit(phoneNumber)
  const v9 = force9Digit(phoneNumber)

  // 2. Determina qual testar primeiro (baseado na regra do sanitize)
  const ddd = parseInt(v8.substring(2, 4))
  const defaultIs8 = ddd > 28

  const first = defaultIs8 ? v8 : v9
  const second = defaultIs8 ? v9 : v8

  console.log(
    `[${timestamp()}] 🧪 Iniciando validacao dupla: ${maskPhone(v8)} vs ${maskPhone(v9)}`,
    {
      instanceName,
      ddd,
      testingFirst: maskPhone(first),
    },
  )

  // 3. Testa o formato padrão primeiro
  const existsFirst = await checkWhatsAppNumber(instanceName, first)
  if (existsFirst) {
    return {
      valid: true,
      format: first.length === 13 ? '9_digits' : '8_digits',
      phone: first,
    }
  }

  // 4. Se não existe, testa o formato alternativo
  console.log(`[${timestamp()}] 🔍 Tentando formato alternativo para ${maskPhone(second)}`, {
    instanceName,
  })

  const existsSecond = await checkWhatsAppNumber(instanceName, second)
  if (existsSecond) {
    return {
      valid: true,
      format: second.length === 13 ? '9_digits' : '8_digits',
      phone: second,
    }
  }

  // 5. Nenhum funcionou
  return { valid: false, format: null, phone: null }
}

/**
 * Health check da Evolution API.
 * Tenta múltiplos endpoints para compatibilidade com diferentes versões.
 */
export async function checkEvolutionHealth(): Promise<boolean> {
  const endpoints = ['/instance/fetchInstances', '/instance/list', '/health', '/']

  for (const endpoint of endpoints) {
    try {
      await callEvolution(endpoint, { method: 'GET' }, 5000)
      return true
    } catch (error) {
      const err = error as any
      if (err.status === 404) {
        console.log(`[${timestamp()}] ⚠️ Endpoint ${endpoint} não encontrado, tentando próximo...`)
        continue
      }
      if (err.status === 401 || err.status === 403) {
        console.log(
          `[${timestamp()}] ⚠️ Endpoint ${endpoint} requer autenticação, tentanto próximo...`,
        )
        continue
      }
      if (err.status === undefined || (err.status >= 200 && err.status < 500)) {
        return true
      }
    }
  }

  console.error(
    `[${timestamp()}] ❌ Health check da Evolution falhou - nenhum endpoint funcionou`,
    {
      attempted: endpoints,
    },
  )
  return false
}

/**
 * Busca histórico de mensagens de uma instância
 * Retorna status atual de mensagens enviadas para um número específico
 *
 * @param instanceName - Nome da instância da Evolution API
 * @param phoneNumber - Número de telefone sanitizado (com DD, já formatado)
 * @param limit - Limite de mensagens a buscar (padrão: 10)
 * @returns Array de mensagens com campos: key.id, status, timestamp
 */
export async function fetchMessageHistory(
  instanceName: string,
  phoneNumber: string,
  limit = 10,
): Promise<any[]> {
  const cleanNumber = sanitizeBrazilianNumber(phoneNumber)
  const encodedInstance = encodeURIComponent(instanceName)
  const encodedNumber = encodeURIComponent(cleanNumber)
  const remoteJid = `${cleanNumber}@s.whatsapp.net`
  const override = process.env.EVOLUTION_HISTORY_ENDPOINTS
  const endpoints = override
    ? override.split(',').map((e) => ({ path: e.trim(), method: 'GET' as const, body: undefined }))
    : [
        {
          path: `/chat/findMessages/${encodedInstance}`,
          method: 'POST' as const,
          body: {
            where: {
              key: {
                remoteJid,
              },
            },
          },
        },
        {
          path: `/message/history/${encodedInstance}`,
          method: 'GET' as const,
          body: undefined,
        },
        {
          path: `/message/findMessages/${encodedInstance}?number=${encodedNumber}&limit=${limit}`,
          method: 'GET' as const,
          body: undefined,
        },
        {
          path: `/message/findMessages/${encodedInstance}?limit=${limit}`,
          method: 'GET' as const,
          body: undefined,
        },
      ]

  const normalizeMessages = (data: any): any[] => {
    if (Array.isArray(data)) return data
    if (Array.isArray(data?.messages)) return data.messages
    if (Array.isArray(data?.data)) return data.data
    if (Array.isArray(data?.response)) return data.response
    return []
  }

  try {
    const data = await callEvolution(`/message/history/${instanceName}`, { method: 'GET' }, 5000)

    if (!Array.isArray(data)) {
      console.warn(`[${timestamp()}] ⚠️ Histórico não é array`, {
        instanceName,
        phone: maskPhone(phoneNumber),
        dataType: typeof data,
      })
      return []
    }

    const cleanNumber = sanitizeBrazilianNumber(phoneNumber)
    const messages = data
      .filter((msg: any) => {
        const remoteNumber = msg.key?.remoteJid?.split('@')[0] || ''
        return sanitizeBrazilianNumber(remoteNumber) === cleanNumber
      })
      .slice(0, limit)

    console.log(`[${timestamp()}] 📋 Histórico obtido`, {
      instanceName,
      phone: maskPhone(phoneNumber),
      totalMessages: data.length,
      filteredMessages: messages.length,
      statuses: messages.map((m) => m.status),
    })

    return messages
  } catch (error) {
    console.error(`[${timestamp()}] ❌ Falha ao buscar histórico`, {
      instanceName,
      phone: maskPhone(phoneNumber),
      error: serializeError(error),
    })
    return []
  }
}

/**
 * Sincroniza status de delivery de uma mensagem via polling
 * Consulta histórico periodicamente e atualiza timestamps no banco
 *
 * @param messageId - ID da mensagem (do Evolution API) para rastrear
 * @param patientId - ID do paciente na tabela patients_queue
 * @param phoneNumber - Número de telefone sanitizado
 * @param instanceName - Nome da instância da Evolution API
 * @returns Promise<void>
 */
export async function syncDeliveryStatus(
  messageId: string,
  patientId: string,
  phoneNumber: string,
  instanceName: string,
): Promise<void> {
  const RETRY_DELAYS_MS = [60_000, 300_000, 900_000]

  for (let attempt = 0; attempt < RETRY_DELAYS_MS.length; attempt++) {
    const delayMs = RETRY_DELAYS_MS[attempt]

    await new Promise((resolve) => setTimeout(resolve, delayMs))

    const attemptNum = attempt + 1
    const now = new Date().toISOString()

    try {
      const history = await fetchMessageHistory(instanceName, phoneNumber, 5)

      if (history.length === 0) {
        console.warn(`[${now}] ⚠️ Histórico vazio para ${maskPhone(phoneNumber)}`, {
          patientId,
          attempt: attemptNum,
        })
        continue
      }

      let foundMessage: any = null
      for (const msg of history) {
        const msgId = msg.key?.id

        if (msgId === messageId || msgId === patientId) {
          foundMessage = msg
          break
        }
      }

      if (!foundMessage) {
        console.warn(`[${now}] ⚠️ Mensagem não encontrada no histórico`, {
          patientId,
          messageId,
          phone: maskPhone(phoneNumber),
          attempt: attemptNum,
          historySize: history.length,
        })
        continue
      }

      const status = String(foundMessage?.status || '').toLowerCase()

      if (status === 'delivered' || status === 'success') {
        const deliveredAt = new Date(foundMessage?.timestamp || Date.now()).toISOString()

        await supabase
          .from('patients_queue')
          .update({
            delivered_at: deliveredAt,
            last_delivery_status: 'delivered',
          })
          .eq('id', patientId)

        console.log(`[${now}] ✅ Sync: delivered_at atualizado via polling`, {
          patientId,
          phone: maskPhone(phoneNumber),
          deliveredAt,
          attempt: attemptNum,
        })
        return
      } else if (status === 'read' || status === 'seen') {
        const readAt = new Date(foundMessage.timestamp || Date.now()).toISOString()

        await supabase
          .from('patients_queue')
          .update({
            read_at: readAt,
          })
          .eq('id', patientId)

        console.log(`[${now}] ✅ Sync: read_at atualizado via polling`, {
          patientId,
          phone: maskPhone(phoneNumber),
          readAt,
          attempt: attemptNum,
        })
        return
      } else if (status === 'pending' || status === 'sending' || status === 'sendingerror') {
        console.log(`[${now}] ⏳ Mensagem ainda em progresso`, {
          patientId,
          phone: maskPhone(phoneNumber),
          status,
          attempt: attemptNum,
          nextRetry:
            attemptNum < RETRY_DELAYS_MS.length
              ? `${RETRY_DELAYS_MS[attempt] / 60000} min`
              : 'última',
        })
        continue
      } else {
        console.warn(`[${now}] ⚠️ Status desconhecido`, {
          patientId,
          phone: maskPhone(phoneNumber),
          attempt: attemptNum,
        })
        continue
      }
    } catch (error) {
      console.error(`[${now}] ❌ Erro ao sincronizar status`, {
        patientId,
        phone: maskPhone(phoneNumber),
        attempt: attemptNum,
        error: serializeError(error),
      })

      if (attemptNum < RETRY_DELAYS_MS.length) {
        continue
      }
    }
  }

  console.warn(`[${timestamp()}] ⚠️ Timeout: não foi possível sincronizar status`, {
    patientId,
    phone: maskPhone(phoneNumber),
    attempts: RETRY_DELAYS_MS.length,
  })
}
