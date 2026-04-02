import process from 'node:process';
import 'dotenv/config'


import { QueueManager } from './queue-manager'
import {
  acquireWorkerLease,
  cleanupStaleHeartbeats,
  getSystemConfig,
  listConnectedInstances,
  releaseExpiredLocks,
  removeHeartbeat,
  releaseWorkerLease,
  runBatchPreValidation,
  upsertHeartbeat,
} from '../services/supabase'
import { checkEvolutionHealth } from '../services/evolution'
import { createWorkerId, serializeError, sleep, timestamp } from '../utils/helpers'
import { Humanizer, loadHumanizerConfig } from './humanizer'

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

  private processed = 0
  private accepted = 0
  private delivered = 0
  private finalized = 0
  private failed = 0
  private skipped = 0
  private currentJobId: string | null = null
  private currentJobStartedAt: string | null = null

  private readonly maxParallelLanes = Number(process.env.WORKER_MAX_PARALLEL_LANES || 12)

  constructor() {
    this.humanizer = new Humanizer(loadHumanizerConfig())
    this.queueManager = new QueueManager(undefined, this.humanizer)
  }

  async start() {
    if (this.running) return

    this.running = true
    console.log(`[${timestamp()}] 🤖 Worker iniciado: ${this.workerName} (${this.workerId})`)
    if (this.dryRun) {
      console.log(`[${timestamp()}] 🔍 MODO DRY RUN ATIVADO — Mensagens NÃO serão enviadas de verdade`)
    }

    await this.cleanupOperationalState()
    await this.registerHeartbeat()
    this.startHeartbeatLoop()

    this.registerSignalHandlers()

    while (this.running) {
      try {
        const hasLease = await this.ensureWorkerLease()
        if (!hasLease) {
          console.warn(`[${timestamp()}] ⛔ Outro worker possui o lease ativo. Aguardando proximo ciclo.`, {
            workerId: this.workerId,
            leaseSeconds: this.leaseSeconds,
          })
          this.currentJobId = null
          this.currentJobStartedAt = null
          await this.registerHeartbeat()
          await sleep(this.pollIntervalMs)
          continue
        }

        console.log(`[${timestamp()}] 🔄 Novo ciclo do worker`, {
          workerId: this.workerId,
          accepted: this.accepted,
          delivered: this.delivered,
          finalized: this.finalized,
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

        // ── 1.5. Raio-X de WhatsApp (sob demanda via dashboard) ──
        if (systemConfig.xray_requested) {
          console.log(`[${timestamp()}] 🔍 Raio-X solicitado via dashboard. Iniciando...`)
          const xrayCount = await runBatchPreValidation(this.workerId)
          console.log(`[${timestamp()}] 🔍 Raio-X concluído. ${xrayCount} paciente(s) validado(s).`)
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
          console.log(`[${timestamp()}] 🔓 ${releasedLocks.length} lock(s) expirado(s) liberado(s).`)
        }

        // ── 5. Processar lanes por instância (paralelo) ──
        const connectedInstances = await listConnectedInstances()
        if (connectedInstances.length === 0) {
          console.log(`[${timestamp()}] 📵 Nenhuma instância conectada para processamento`)
          await sleep(this.pollIntervalMs)
          continue
        }

        const lanes = connectedInstances.slice(0, this.maxParallelLanes)
        const laneResults = await Promise.allSettled(
          lanes.map((instance) => this.processInstanceLane(instance.id, instance.instance_name)),
        )

        const claimedCount = laneResults.filter(
          (result) => result.status === 'fulfilled' && result.value,
        ).length

        const rejectedLanes = laneResults.filter((result) => result.status === 'rejected')
        if (rejectedLanes.length > 0) {
          this.failed += rejectedLanes.length
          console.error(`[${timestamp()}] ❌ Falha em lane(s) de instância`, {
            workerId: this.workerId,
            failedLanes: rejectedLanes.length,
            errors: rejectedLanes.map((result) => serializeError((result as PromiseRejectedResult).reason)),
          })
        }

        if (claimedCount === 0) {
          await sleep(this.pollIntervalMs)
          continue
        }

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

    await removeHeartbeat(this.workerId)
    await releaseWorkerLease(this.workerId)
    console.log(`[${timestamp()}] 🛑 Worker finalizado: ${this.workerId}`)
    console.log(`[${timestamp()}] 📊 Resumo: aceites=${this.accepted} entregues=${this.delivered} finalizados=${this.finalized} falhas=${this.failed} ignoradas=${this.skipped}`)
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

  // NOTE: startFollowupScheduler() removed — runSecondCallRecovery disabled to avoid
  // conflict with pickBestPhone() which now handles phone selection via Raio-X results.
  // Function definition preserved in supabase.ts for potential future re-enablement.

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

  private async processInstanceLane(instanceId: string, instanceName: string): Promise<boolean> {
    const claimed = await this.queueManager.claimForInstance(
      this.workerId,
      instanceId,
      instanceName,
      this.maxAttempts,
    )

    if (!claimed) {
      return false
    }

    this.processed += 1

    console.log(`[${timestamp()}] 📩 [${instanceName}] Mensagem claimada: ${claimed.id}`)

    const result = await this.queueManager.processClaimedMessage(claimed, this.workerId, this.dryRun)

    if (result.status === 'delivered') {
      this.delivered += 1
      this.finalized += 1
      console.log(`[${timestamp()}] ✅ [${instanceName}] Entregue: ${claimed.id} (entregues: ${this.delivered}, finalizados: ${this.finalized})`)
    } else if (result.status === 'failed') {
      this.finalized += 1
      this.failed += 1
      console.log(`[${timestamp()}] ❌ [${instanceName}] Falhou: ${claimed.id} (${result.reason || 'sem motivo'}) (finalizados: ${this.finalized})`)
    } else if (result.status === 'deferred') {
      console.log(`[${timestamp()}] ⏸️ [${instanceName}] Adiada por infra: ${claimed.id} (${result.reason || 'infra'})`)
    } else if (result.status === 'skipped') {
      this.finalized += 1
      this.skipped += 1
      console.log(`[${timestamp()}] ⏭️ [${instanceName}] Ignorada: ${claimed.id} (${result.reason || 'sem motivo'}) (finalizados: ${this.finalized})`)
    }

    return true
  }
}
