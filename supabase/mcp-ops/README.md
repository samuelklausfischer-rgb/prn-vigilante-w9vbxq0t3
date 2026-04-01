# PRN MCP Ops

Local MCP server for operational visibility across EasyPanel (infra) and Evolution (application).

## What this includes

- EasyPanel tools (read-only by default):
  - list project services
  - service status
  - service logs
- Evolution tools via Supabase `evolution-proxy`:
  - list instances
  - instance connection state
  - QR retrieval
  - chats retrieval
- unified diagnosis tool to correlate infra and app signals.

## Setup

1. Copy `.env.example` to `.env`.
2. Fill credentials and URLs.
3. Install dependencies:

```bash
npm install
```

4. Run in dev mode:

```bash
npm run dev
```

5. Build:

```bash
npm run build
```

## Safety defaults

- `MCP_MODE=readonly`
- `ALLOW_MUTATIONS=false`

Mutating tools (restart/redeploy or instance create/logout/delete) are blocked unless `ALLOW_MUTATIONS=true`.

## EasyPanel auth discovery

This server attempts EasyPanel authentication headers in this order:

1. `Authorization: Bearer <token>`
2. `X-API-Key: <token>`
3. `apikey: <token>`

The first successful strategy is cached for next requests.

## Example MCP client config

Use your MCP client format and point command to Node with this project path. Example shape:

```json
{
  "mcpServers": {
    "prn-ops": {
      "command": "node",
      "args": ["dist/index.js"],
      "cwd": "supabase/mcp-ops",
      "env": {
        "MCP_MODE": "readonly"
      }
    }
  }
}
```

Build first or switch to `tsx src/index.ts` in development environments.
