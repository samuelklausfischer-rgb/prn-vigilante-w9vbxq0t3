import { z } from 'zod'
import type { AppConfig } from '../config.js'
import type { EasyPanelClient } from '../easypanel/client.js'
import type { EvolutionClient } from '../evolution/client.js'

function asText(payload: unknown): string {
  return JSON.stringify(payload, null, 2)
}

async function safeCall<T>(label: string, fn: () => Promise<T>): Promise<{ ok: true; value: T } | { ok: false; error: string; label: string }> {
  try {
    const value = await fn()
    return { ok: true, value }
  } catch (error) {
    return {
      ok: false,
      label,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

export function registerDiagnosticsTools(
  server: any,
  easypanel: EasyPanelClient,
  evolution: EvolutionClient,
  config: AppConfig,
): void {
  server.tool(
    'ops_full_diagnosis',
    'Run combined diagnosis for worker and evolution services',
    z
      .object({
        workerServiceName: z.string().default('worker'),
        evolutionServiceName: z.string().default('evolution api'),
        logLines: z.number().int().positive().max(1000).optional(),
      })
      .default({ workerServiceName: 'worker', evolutionServiceName: 'evolution api' }),
    async (input: unknown) => {
      const parsed = z
        .object({
          workerServiceName: z.string().default('worker'),
          evolutionServiceName: z.string().default('evolution api'),
          logLines: z.number().int().positive().max(1000).optional(),
        })
        .parse(input)

      const lines = parsed.logLines ?? Math.min(config.easypanel.defaultLogLines, 300)

      const [services, workerStatus, evolutionStatus, workerLogs, evolutionLogs, instances] = await Promise.all([
        safeCall('services', () => easypanel.listProjectServices()),
        safeCall('worker_status', () => easypanel.getServiceStatus({ serviceName: parsed.workerServiceName })),
        safeCall('evolution_status', () => easypanel.getServiceStatus({ serviceName: parsed.evolutionServiceName })),
        safeCall('worker_logs', () => easypanel.getServiceLogs({ serviceName: parsed.workerServiceName }, lines)),
        safeCall('evolution_logs', () => easypanel.getServiceLogs({ serviceName: parsed.evolutionServiceName }, lines)),
        safeCall('instances', () => evolution.listInstances()),
      ])

      const report = {
        timestamp: new Date().toISOString(),
        mode: config.mode,
        services,
        workerStatus,
        evolutionStatus,
        workerLogs,
        evolutionLogs,
        evolutionInstances: instances,
      }

      return { content: [{ type: 'text', text: asText(report) }] }
    },
  )
}
