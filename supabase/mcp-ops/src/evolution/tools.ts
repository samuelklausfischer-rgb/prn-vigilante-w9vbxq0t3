import { z } from 'zod'
import type { AppConfig } from '../config.js'
import { assertMutationsAllowed } from '../guards.js'
import type { EvolutionClient } from './client.js'

const InstanceSchema = z.object({
  instanceName: z.string().min(1),
})

function asText(payload: unknown): string {
  return JSON.stringify(payload, null, 2)
}

export function registerEvolutionTools(server: any, client: EvolutionClient, config: AppConfig): void {
  server.tool(
    'evolution_list_instances',
    'List instances from Evolution through Supabase evolution-proxy',
    z.object({}),
    async () => {
      const data = await client.listInstances()
      return { content: [{ type: 'text', text: asText(data) }] }
    },
  )

  server.tool(
    'evolution_get_instance_state',
    'Get one instance connection state',
    InstanceSchema,
    async (input: unknown) => {
      const parsed = InstanceSchema.parse(input)
      const data = await client.getConnectionState(parsed.instanceName)
      return { content: [{ type: 'text', text: asText(data) }] }
    },
  )

  server.tool(
    'evolution_get_instance_qr',
    'Get or refresh instance QR payload',
    InstanceSchema,
    async (input: unknown) => {
      const parsed = InstanceSchema.parse(input)
      const data = await client.getQr(parsed.instanceName)
      return { content: [{ type: 'text', text: asText(data) }] }
    },
  )

  server.tool(
    'evolution_fetch_chats',
    'Fetch chats for one instance',
    InstanceSchema,
    async (input: unknown) => {
      const parsed = InstanceSchema.parse(input)
      const data = await client.fetchChats(parsed.instanceName)
      return { content: [{ type: 'text', text: asText(data) }] }
    },
  )

  server.tool(
    'evolution_create_instance',
    'Create one Evolution instance (operator mode only)',
    InstanceSchema,
    async (input: unknown) => {
      assertMutationsAllowed(config, 'evolution_create_instance')
      const parsed = InstanceSchema.parse(input)
      const data = await client.createInstance(parsed.instanceName)
      return { content: [{ type: 'text', text: asText(data) }] }
    },
  )

  server.tool(
    'evolution_logout_instance',
    'Logout one Evolution instance (operator mode only)',
    InstanceSchema,
    async (input: unknown) => {
      assertMutationsAllowed(config, 'evolution_logout_instance')
      const parsed = InstanceSchema.parse(input)
      const data = await client.logoutInstance(parsed.instanceName)
      return { content: [{ type: 'text', text: asText(data) }] }
    },
  )

  server.tool(
    'evolution_delete_instance',
    'Delete one Evolution instance (operator mode only)',
    InstanceSchema,
    async (input: unknown) => {
      assertMutationsAllowed(config, 'evolution_delete_instance')
      const parsed = InstanceSchema.parse(input)
      const data = await client.deleteInstance(parsed.instanceName)
      return { content: [{ type: 'text', text: asText(data) }] }
    },
  )
}
