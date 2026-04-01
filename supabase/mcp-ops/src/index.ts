import 'dotenv/config'

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { loadConfig } from './config.js'
import { registerDiagnosticsTools } from './diagnostics/tools.js'
import { EasyPanelClient } from './easypanel/client.js'
import { registerEasyPanelTools } from './easypanel/tools.js'
import { EvolutionClient } from './evolution/client.js'
import { registerEvolutionTools } from './evolution/tools.js'

async function main() {
  const config = loadConfig()

  const server = new McpServer({
    name: 'prn-mcp-ops',
    version: '0.1.0',
  })

  const easypanelClient = new EasyPanelClient(config)
  const evolutionClient = new EvolutionClient(config)

  registerEasyPanelTools(server, easypanelClient, config)
  registerEvolutionTools(server, evolutionClient, config)
  registerDiagnosticsTools(server, easypanelClient, evolutionClient, config)

  const transport = new StdioServerTransport()
  await server.connect(transport)
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error)
  process.stderr.write(`[prn-mcp-ops] fatal: ${message}\n`)
  process.exit(1)
})
