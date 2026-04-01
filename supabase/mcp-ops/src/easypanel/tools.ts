import { z } from 'zod'
import type { AppConfig } from '../config.js'
import { assertMutationsAllowed, assertServiceAllowed } from '../guards.js'
import type { EasyPanelClient } from './client.js'

const ServiceBaseSchema = z.object({
  serviceId: z.string().optional(),
  serviceName: z.string().optional(),
})

const ServiceSchema = ServiceBaseSchema.refine((value) => Boolean(value.serviceId || value.serviceName), {
    message: 'Provide serviceId or serviceName',
  })

const ServiceLogsSchema = ServiceBaseSchema.extend({
  lines: z.number().int().positive().max(2000).optional(),
}).refine((value) => Boolean(value.serviceId || value.serviceName), {
  message: 'Provide serviceId or serviceName',
})

function asText(payload: unknown): string {
  return JSON.stringify(payload, null, 2)
}

export function registerEasyPanelTools(server: any, client: EasyPanelClient, config: AppConfig): void {
  server.tool(
    'easypanel_get_project_overview',
    'Get project metadata from EasyPanel API',
    z.object({}),
    async () => {
      const data = await client.getProjectOverview()
      return { content: [{ type: 'text', text: asText(data) }] }
    },
  )

  server.tool(
    'easypanel_list_project_services',
    'List services in EasyPanel project',
    z.object({}),
    async () => {
      const data = await client.listProjectServices()
      return { content: [{ type: 'text', text: asText(data) }] }
    },
  )

  server.tool(
    'easypanel_get_service_status',
    'Get status of one EasyPanel service',
    ServiceSchema,
    async (input: unknown) => {
      const parsed = ServiceSchema.parse(input)
      assertServiceAllowed(config, parsed.serviceName)
      const data = await client.getServiceStatus(parsed)
      return { content: [{ type: 'text', text: asText(data) }] }
    },
  )

  server.tool(
    'easypanel_get_service_logs',
    'Get service logs from EasyPanel',
    ServiceLogsSchema,
    async (input: unknown) => {
      const parsed = ServiceLogsSchema.parse(input)

      assertServiceAllowed(config, parsed.serviceName)
      const data = await client.getServiceLogs(parsed, parsed.lines ?? config.easypanel.defaultLogLines)
      return { content: [{ type: 'text', text: asText(data) }] }
    },
  )

  server.tool(
    'easypanel_restart_service',
    'Restart one EasyPanel service (operator mode only)',
    ServiceSchema,
    async (input: unknown) => {
      const parsed = ServiceSchema.parse(input)
      assertMutationsAllowed(config, 'easypanel_restart_service')
      assertServiceAllowed(config, parsed.serviceName)
      const data = await client.restartService(parsed)
      return { content: [{ type: 'text', text: asText(data) }] }
    },
  )

  server.tool(
    'easypanel_redeploy_service',
    'Trigger one EasyPanel service deployment (operator mode only)',
    ServiceSchema,
    async (input: unknown) => {
      const parsed = ServiceSchema.parse(input)
      assertMutationsAllowed(config, 'easypanel_redeploy_service')
      assertServiceAllowed(config, parsed.serviceName)
      const data = await client.redeployService(parsed)
      return { content: [{ type: 'text', text: asText(data) }] }
    },
  )
}
