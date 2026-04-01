import type { AppConfig } from './config.js'

export function assertMutationsAllowed(config: AppConfig, toolName: string): void {
  if (!config.allowMutations || config.mode !== 'operator') {
    throw new Error(`Tool '${toolName}' is disabled: MCP is in readonly mode`)
  }
}

export function assertServiceAllowed(config: AppConfig, serviceName?: string): void {
  if (!serviceName?.trim()) return
  const normalized = serviceName.trim().toLowerCase()
  if (!config.easypanel.allowedServiceNames.includes(normalized)) {
    throw new Error(`Service '${serviceName}' is not allowed by ALLOWED_SERVICE_NAMES`)
  }
}

export function maskSecret(secret: string, visibleChars = 4): string {
  if (!secret) return ''
  if (secret.length <= visibleChars) return '*'.repeat(secret.length)
  const suffix = secret.slice(-visibleChars)
  return `${'*'.repeat(Math.max(secret.length - visibleChars, 4))}${suffix}`
}
