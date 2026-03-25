/**
 * 🧠 Humanizer — Motor de Humanização Anti-Ban
 *
 * Este módulo é o "cérebro sênior" da automação. Ele garante que o
 * comportamento de envio seja indistinguível de um humano para os
 * algoritmos de detecção do WhatsApp.
 *
 * Estratégias implementadas:
 * 1. Delay adaptativo baseado no tamanho do texto (simula digitação).
 * 2. Jitter aleatório (±15%) para despistar padrões fixos.
 * 3. Pausa longa a cada N mensagens enviadas (simula "descanso").
 * 4. Respeito ao horário comercial (bloqueia envio fora do expediente).
 */

import { sleep, timestamp } from '../utils/helpers'

// ============================================
// Configuração
// ============================================

export interface HumanizerConfig {
  /** Caracteres digitados por segundo (humano médio: 5-8) */
  typingSpeedCps: number
  /** Delay mínimo entre mensagens (ms) */
  minInterMessageDelayMs: number
  /** Delay máximo entre mensagens (ms) */
  maxInterMessageDelayMs: number
  /** Jitter percentual (ex: 0.15 = ±15%) */
  jitterPercent: number
  /** A cada N mensagens, inserir pausa longa */
  pauseEveryN: number
  /** Duração da pausa longa (ms) */
  longPauseMs: number
  /** Hora de início do expediente (0-23) */
  workingHoursStart: number
  /** Hora de fim do expediente (0-23) */
  workingHoursEnd: number
  /** Respeitar horário comercial? */
  respectWorkingHours: boolean
}

const DEFAULT_CONFIG: HumanizerConfig = {
  typingSpeedCps: 6,
  minInterMessageDelayMs: 180_000,   // 3 minutos
  maxInterMessageDelayMs: 780_000,   // 13 minutos
  jitterPercent: 0.15,
  pauseEveryN: 5,
  longPauseMs: 60_000,             // 1 minuto
  workingHoursStart: 8,
  workingHoursEnd: 20,
  respectWorkingHours: true,
}

// ============================================
// Classe Principal
// ============================================

export class Humanizer {
  private readonly config: HumanizerConfig
  private messagesSinceLastPause = 0

  constructor(config: Partial<HumanizerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  // ──────────────────────────────────────────
  // 1. Verificação de Horário Comercial
  // ──────────────────────────────────────────

  /**
   * Verifica se o horário atual está dentro do expediente.
   * Se não estiver, retorna o número de ms até a próxima janela.
   */
  checkWorkingHours(): { allowed: boolean; waitMs?: number } {
    if (!this.config.respectWorkingHours) {
      return { allowed: true }
    }

    const now = new Date()
    const currentHour = now.getHours()

    if (currentHour >= this.config.workingHoursStart && currentHour < this.config.workingHoursEnd) {
      return { allowed: true }
    }

    // Calcular tempo até o próximo horário de início
    const tomorrow = new Date(now)
    if (currentHour >= this.config.workingHoursEnd) {
      tomorrow.setDate(tomorrow.getDate() + 1)
    }
    tomorrow.setHours(this.config.workingHoursStart, 0, 0, 0)

    const waitMs = tomorrow.getTime() - now.getTime()
    return { allowed: false, waitMs }
  }

  // ──────────────────────────────────────────
  // 2. Delay de Digitação Simulada
  // ──────────────────────────────────────────

  /**
   * Calcula o tempo necessário para "digitar" o texto.
   * Baseado no número de caracteres e velocidade configurada.
   */
  calculateTypingDelay(messageText: string): number {
    const charCount = messageText.length
    const baseTypingMs = (charCount / this.config.typingSpeedCps) * 1000
    return Math.max(800, Math.min(baseTypingMs, 8000))
  }

  // ──────────────────────────────────────────
  // 3. Delay Entre Mensagens com Jitter
  // ──────────────────────────────────────────

  /**
   * Gera um delay aleatório entre mensagens com jitter.
   * O jitter evita padrões detectáveis pelo WhatsApp.
   */
  calculateInterMessageDelay(): number {
    const { minInterMessageDelayMs, maxInterMessageDelayMs, jitterPercent } = this.config

    // Base aleatória entre min e max
    const baseDelay = Math.random() * (maxInterMessageDelayMs - minInterMessageDelayMs) + minInterMessageDelayMs

    // Jitter: variação de ±X%
    const jitterRange = baseDelay * jitterPercent
    const jitter = (Math.random() * 2 - 1) * jitterRange

    return Math.max(minInterMessageDelayMs, Math.floor(baseDelay + jitter))
  }

  // ──────────────────────────────────────────
  // 4. Pausa Longa Periódica
  // ──────────────────────────────────────────

  /**
   * Verifica se é hora de fazer uma pausa longa.
   * Reseta o contador quando a pausa é aplicada.
   */
  shouldTakeLongPause(): boolean {
    this.messagesSinceLastPause++
    if (this.messagesSinceLastPause >= this.config.pauseEveryN) {
      this.messagesSinceLastPause = 0
      return true
    }
    return false
  }

  // ──────────────────────────────────────────
  // 5. Orquestrador Principal
  // ──────────────────────────────────────────

  /**
   * Aplica toda a lógica de humanização antes de um envio.
   * Este é o método principal que o QueueManager deve chamar.
   *
   * @param messageText - O texto da mensagem a ser enviada.
   * @returns true se o envio pode prosseguir, false se deve ser adiado.
   */
  async applyPreSendDelay(messageText: string): Promise<{ canSend: boolean; reason?: string }> {
    // 1. Verificar horário comercial
    const hours = this.checkWorkingHours()
    if (!hours.allowed) {
      const waitMinutes = Math.round((hours.waitMs || 0) / 60000)
      console.log(`[${timestamp()}] 🌙 Fora do horário comercial. Próxima janela em ${waitMinutes} minutos.`)
      return { canSend: false, reason: `outside_working_hours:${waitMinutes}min` }
    }

    // 2. Verificar pausa longa
    if (this.shouldTakeLongPause()) {
      const pauseSec = Math.round(this.config.longPauseMs / 1000)
      console.log(`[${timestamp()}] ☕ Pausa de segurança: ${pauseSec}s (a cada ${this.config.pauseEveryN} mensagens)`)
      await sleep(this.config.longPauseMs)
    }

    // 3. Aplicar delay de digitação
    const typingDelay = this.calculateTypingDelay(messageText)
    console.log(`[${timestamp()}] ⌨️  Simulando digitação: ${Math.round(typingDelay / 1000)}s`)
    await sleep(typingDelay)

    // 4. Aplicar delay entre mensagens
    const interDelay = this.calculateInterMessageDelay()
    console.log(`[${timestamp()}] ⏳ Delay anti-ban: ${Math.round(interDelay / 1000)}s`)
    await sleep(interDelay)

    return { canSend: true }
  }
}
