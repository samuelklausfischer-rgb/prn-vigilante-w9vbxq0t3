import 'dotenv/config'

import { QueueManager } from './queue-manager'
import {
  acquireWorkerLease,
  cleanupStaleHeartbeats,
  getSystemConfig,
  releaseExpiredLocks,
  removeHeartbeat,
  releaseWorkerLease,
  runSecondCallRecovery,
  upsertHeartbeat,
} from '../services/supabase'
import { checkEvolutionHealth } from '../services/evolution'
import { createWorkerId, serializeError, sleep, timestamp } from '../utils/helpers'
import { Humanizer } from './humanizer'

export class WorkerEngine {
  private readonly queueManager: QueueManager
  private readonly humanizer: Humanizer
  private readonly workerName = process.env.WORKER_NAME || 'automation-worker'
  private readonly workerId = createWorkerId(this.workerName)
  private readonly startedAt = new Date().toISOString()
  private readonly maxAttempts = Number(process.env.WORKER_MAX_ATTEMPTS || 3)
  private readonly dryRun = process.env.DRY_RUN === 'true'
  private readonly pollIntervalMs = Number(process.env.WORKER_POLL_INTERVAL_MS || 5000)
  private readonly heartbeatIntervalMs = Number(process.env.WORKER_HEARTBEAT_INTERVAL_MS || 30000)
  private readonly lockTimeoutMinutes = Number(process.env.WORKER_LOCK_TIMEOUT_MINUTES || 5)
  private readonly leaseSeconds = Number(process.env.WORKER_LEASE_SECONDS || 90)
  private readonly staleHeartbeatMinutes = Number(process.env.WORKER_STALE_HEARTBEAT_MINUTES || 10)

  private running = false
  private heartbeatTimer?: ReturnType<typeof setInterval>
  private followupTimer?: ReturnType<typeof setInterval>
  private processed = 0
  private failed = 0
  private skipped = 0
  private currentJobId: string | null = null
  private currentJobStartedAt: string | null = null
  private readonly followupIntervalMs = Number(process.env.WORKER_FOLLOWUP_INTERVAL_MS || 60000)

  constructor() {
    this.humanizer = new Humanizer()
    this.queueManager = new QueueManager(undefined, this.humanizer)
  }

  async start() {
    if (this.running) return

    this.running = true
    console.log(`[${timestamp()}] 🤖 Worker iniciado: ${this.workerName} (${this.workerId})`)
    if (this.dryRun) {
      console.log(
        `[${timestamp()}] 🔍 MODO DRY RUN ATIVADO — Mensagens NÃO serão enviadas de verdade`,
      )
    }

    await this.cleanupOperationalState()
    await this.registerHeartbeat()
    this.startHeartbeatLoop()
    this.startFollowupScheduler()
    this.registerSignalHandlers()

    while (this.running) {
      try {
        const hasLease = await this.ensureWorkerLease()
        if (!hasLease) {
          console.warn(
            `[${timestamp()}] ⛔ Outro worker possui o lease ativo. Aguardando proximo ciclo.`,
            {
              workerId: this.workerId,
              leaseSeconds: this.leaseSeconds,
            },
          )
          this.currentJobId = null
          this.currentJobStartedAt = null
          await this.registerHeartbeat()
          await sleep(this.pollIntervalMs)
          continue
        }

        console.log(`[${timestamp()}] 🔄 Novo ciclo do worker`, {
          workerId: this.workerId,
          processed: this.processed,
          failed: this.failed,
          skipped: this.skipped,
          currentJobId: this.currentJobId,
        })

        // ── 1. Verificar config do sistema ──
        const systemConfig = await getSystemConfig()

        if (!systemConfig) {
          console.log(`[${timestamp()}] ⚠️ system_config indisponível. Retentando...`)
          await sleep(this.pollIntervalMs)
          continue
        }

        if (systemConfig.is_paused) {
          console.log(`[${timestamp()}] ⏸️ Sistema PAUSADO. Aguardando...`)
          await sleep(this.pollIntervalMs)
          continue
        }

        // ── 2. Verificar horário comercial ──
        const hoursCheck = this.humanizer.checkWorkingHours()
        if (!hoursCheck.allowed) {
          const waitMin = Math.round((hoursCheck.waitMs || 0) / 60000)
          console.log(`[${timestamp()}] 🌙 Fora do expediente. Dormindo por ${waitMin} minutos...`)
          // Dormir no máximo 15 minutos de cada vez para manter heartbeat
          const sleepTime = Math.min(hoursCheck.waitMs || 0, 15 * 60000)
          await sleep(sleepTime)
          continue
        }

        // ── 3. Verificar Evolution API ──
        const evolutionHealthy = await checkEvolutionHealth()
        if (!evolutionHealthy) {
          console.log(`[${timestamp()}] ⚠️ Evolution API indisponível. Retry no próximo ciclo.`)
          await sleep(this.pollIntervalMs)
          continue
        }

        // ── 4. Liberar locks expirados ──
        const releasedLocks = await releaseExpiredLocks(this.lockTimeoutMinutes)
        if (releasedLocks.length > 0) {
          console.log(
            `[${timestamp()}] 🔓 ${releasedLocks.length} lock(s) expirado(s) liberado(s).`,
          )
        }

        // ── 5. Claimar próxima mensagem ──
        const claimed = await this.queueManager.claim(this.workerId, this.maxAttempts)
        if (!claimed) {
          console.log(`[${timestamp()}] 📭 Nenhuma mensagem elegivel encontrada`, {
            workerId: this.workerId,
            pollIntervalMs: this.pollIntervalMs,
          })
          await sleep(this.pollIntervalMs)
          continue
        }

        this.currentJobId = claimed.id
        this.currentJobStartedAt = new Date().toISOString()
        await this.registerHeartbeat()

        console.log(
          `[${timestamp()}] 📩 Mensagem claimada: ${claimed.id} → ${claimed.instance_name}`,
        )

        // ── 6. Processar mensagem ──
        const result = await this.queueManager.processClaimedMessage(
          claimed,
          this.workerId,
          this.dryRun,
        )

        if (result.status === 'delivered') {
          this.processed += 1
          console.log(`[${timestamp()}] ✅ Entregue: ${claimed.id} (total: ${this.processed})`)
        } else if (result.status === 'failed') {
          this.failed += 1
          console.log(
            `[${timestamp()}] ❌ Falhou: ${claimed.id} (${result.reason || 'sem motivo'})`,
          )
        } else if (result.status === 'skipped') {
          this.skipped += 1
          console.log(
            `[${timestamp()}] ⏭️ Ignorada: ${claimed.id} (${result.reason || 'sem motivo'})`,
          )
        }

        this.currentJobId = null
        this.currentJobStartedAt = null
        await this.registerHeartbeat()
      } catch (error) {
        this.failed += 1
        console.error(`[${timestamp()}] ❌ Erro no loop principal`, {
          workerId: this.workerId,
          currentJobId: this.currentJobId,
          error: serializeError(error),
        })
        this.currentJobId = null
        this.currentJobStartedAt = null
        await this.registerHeartbeat()
        await sleep(this.pollIntervalMs)
      }
    }
  }

  async stop() {
    if (!this.running) return

    console.log(`[${timestamp()}] 🛑 Desligando worker graciosamente...`)
    this.running = false
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer)
    if (this.followupTimer) clearInterval(this.followupTimer)

    await removeHeartbeat(this.workerId)
    await releaseWorkerLease(this.workerId)
    console.log(`[${timestamp()}] 🛑 Worker finalizado: ${this.workerId}`)
    console.log(
      `[${timestamp()}] 📊 Resumo: ${this.processed} entregues | ${this.failed} falhas | ${this.skipped} ignoradas`,
    )
  }

  private startHeartbeatLoop() {
    this.heartbeatTimer = setInterval(async () => {
      try {
        const hasLease = await this.ensureWorkerLease()
        if (!hasLease) {
          console.error(`[${timestamp()}] ❌ Falha ao renovar lease no heartbeat`, {
            workerId: this.workerId,
            currentJobId: this.currentJobId,
          })
        }
        await this.registerHeartbeat()
      } catch (error) {
        console.error(`[${timestamp()}] ❌ Falha no heartbeat automatico`, {
          workerId: this.workerId,
          error: serializeError(error),
        })
      }
    }, this.heartbeatIntervalMs)
  }

  private startFollowupScheduler() {
    this.followupTimer = setInterval(async () => {
      try {
        const hasLease = await this.ensureWorkerLease()
        if (!hasLease) {
          return
        }

        const rec = await runSecondCallRecovery().catch((e) => {
          console.error(`[${timestamp()}] ❌ Falha no scheduler de follow-up`, {
            workerId: this.workerId,
            error: serializeError(e),
          })
          return { processed: 0 }
        })

        if (rec.processed > 0) {
          console.log(
            `[${timestamp()}] 🔁 Follow-up scheduler: ${rec.processed} ação(ões) enfileirada(s).`,
          )
        }
      } catch (error) {
        console.error(`[${timestamp()}] ❌ Erro no scheduler de follow-up`, {
          workerId: this.workerId,
          error: serializeError(error),
        })
      }
    }, this.followupIntervalMs)
  }

  private async registerHeartbeat() {
    const payload = {
      worker_id: this.workerId,
      worker_name: this.workerName,
      started_at: this.startedAt,
      current_job_id: this.currentJobId,
      current_job_started_at: this.currentJobId ? this.currentJobStartedAt : null,
      messages_processed: this.processed,
      messages_failed: this.failed,
      memory_usage_mb: Math.round(process.memoryUsage().rss / 1024 / 1024),
    }

    const success = await upsertHeartbeat(payload)
    if (!success) {
      console.error(`[${timestamp()}] ❌ Nao foi possivel registrar heartbeat`, payload)
    }
  }

  private async ensureWorkerLease() {
    return acquireWorkerLease(this.workerId, this.leaseSeconds)
  }

  private async cleanupOperationalState() {
    const staleHeartbeats = await cleanupStaleHeartbeats(this.staleHeartbeatMinutes)
    if (staleHeartbeats.length > 0) {
      console.warn(`[${timestamp()}] 🧹 Heartbeats obsoletos removidos`, {
        count: staleHeartbeats.length,
        staleHeartbeats,
      })
    }
  }

  private registerSignalHandlers() {
    const stop = async () => {
      await this.stop()
      process.exit(0)
    }

    process.once('SIGINT', stop)
    process.once('SIGTERM', stop)
  }
}
