import type { AppConfig } from '../config.js'
import type { JsonObject, JsonValue, ProjectService, ServiceIdentifier } from '../types.js'

type AuthStrategy = 'bearer' | 'x-api-key' | 'apikey'

type RequestOptions = {
  method?: string
  body?: JsonValue
}

type EndpointResult = {
  path: string
  data: unknown
}

function asJsonObject(value: unknown): JsonObject {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {}
  }
  return value as JsonObject
}

function asJsonArray(value: unknown): JsonObject[] {
  if (!Array.isArray(value)) return []
  return value.filter((item) => item && typeof item === 'object') as JsonObject[]
}

export class EasyPanelClient {
  private authStrategy: AuthStrategy | null = null

  constructor(private readonly config: AppConfig) {}

  private authHeaders(strategy: AuthStrategy): Record<string, string> {
    const token = this.config.easypanel.apiKey
    if (strategy === 'bearer') return { Authorization: `Bearer ${token}` }
    if (strategy === 'x-api-key') return { 'X-API-Key': token }
    return { apikey: token }
  }

  private async requestWithStrategy(
    path: string,
    strategy: AuthStrategy,
    options?: RequestOptions,
  ): Promise<Response> {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...this.authHeaders(strategy),
    }

    const method = options?.method || 'GET'
    const body = options?.body
    if (body !== undefined) {
      headers['Content-Type'] = 'application/json'
    }

    const url = `${this.config.easypanel.baseUrl}${path}`
    return fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  }

  private async request(path: string, options?: RequestOptions): Promise<Response> {
    if (this.authStrategy) {
      const cached = await this.requestWithStrategy(path, this.authStrategy, options)
      if (cached.status !== 401 && cached.status !== 403) return cached
    }

    const strategies: AuthStrategy[] = ['bearer', 'x-api-key', 'apikey']
    for (const strategy of strategies) {
      const response = await this.requestWithStrategy(path, strategy, options)
      if (response.status !== 401 && response.status !== 403) {
        this.authStrategy = strategy
        return response
      }
    }

    throw new Error('EasyPanel authentication failed with all known header strategies')
  }

  private async readJson(path: string, options?: RequestOptions): Promise<unknown> {
    const response = await this.request(path, options)
    const text = await response.text()

    if (!response.ok) {
      throw new Error(`EasyPanel request failed [${response.status}] ${text}`.trim())
    }

    if (!text) return {}

    try {
      return JSON.parse(text)
    } catch {
      return { raw: text }
    }
  }

  private async tryPaths(paths: string[], options?: RequestOptions): Promise<EndpointResult> {
    const errors: string[] = []

    for (const path of paths) {
      try {
        const data = await this.readJson(path, options)
        return { path, data }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        errors.push(`${path}: ${message}`)
      }
    }

    throw new Error(`No EasyPanel endpoint matched. Attempts: ${errors.join(' | ')}`)
  }

  private normalizeService(service: JsonObject): ProjectService {
    const idCandidate = service.id ?? service.serviceId ?? service.uuid
    const nameCandidate = service.name ?? service.serviceName ?? service.slug
    const statusCandidate = service.status ?? service.state ?? service.health

    return {
      id: idCandidate ? String(idCandidate) : undefined,
      name: nameCandidate ? String(nameCandidate) : undefined,
      status: statusCandidate ? String(statusCandidate) : undefined,
      raw: service,
    }
  }

  async getProjectOverview(): Promise<{ endpoint: string; project: JsonObject }> {
    const projectId = this.config.easypanel.projectId
    const result = await this.tryPaths([
      `/api/projects/${encodeURIComponent(projectId)}`,
      `/api/v1/projects/${encodeURIComponent(projectId)}`,
      `/projects/${encodeURIComponent(projectId)}`,
    ])

    return {
      endpoint: result.path,
      project: asJsonObject(result.data),
    }
  }

  async listProjectServices(): Promise<{ endpoint: string; services: ProjectService[] }> {
    const projectId = this.config.easypanel.projectId
    const result = await this.tryPaths([
      `/api/projects/${encodeURIComponent(projectId)}/services`,
      `/api/v1/projects/${encodeURIComponent(projectId)}/services`,
      `/api/services?projectId=${encodeURIComponent(projectId)}`,
      `/projects/${encodeURIComponent(projectId)}/services`,
    ])

    const directArray = asJsonArray(result.data)
    const nestedArray = asJsonArray(asJsonObject(result.data).services)
    const candidates = directArray.length > 0 ? directArray : nestedArray

    return {
      endpoint: result.path,
      services: candidates.map((item) => this.normalizeService(item)),
    }
  }

  async resolveService(identifier: ServiceIdentifier): Promise<ProjectService> {
    const { services } = await this.listProjectServices()

    if (identifier.serviceId?.trim()) {
      const foundById = services.find((service) => service.id === identifier.serviceId)
      if (foundById) return foundById
    }

    if (identifier.serviceName?.trim()) {
      const needle = identifier.serviceName.trim().toLowerCase()
      const foundByName = services.find((service) => service.name?.toLowerCase() === needle)
      if (foundByName) return foundByName
    }

    throw new Error('Service not found in project')
  }

  async getServiceStatus(identifier: ServiceIdentifier): Promise<{ endpoint: string; service: ProjectService }> {
    const resolved = await this.resolveService(identifier)
    if (!resolved.id) {
      return { endpoint: 'project-services-cache', service: resolved }
    }

    const projectId = this.config.easypanel.projectId
    const result = await this.tryPaths([
      `/api/services/${encodeURIComponent(resolved.id)}`,
      `/api/v1/services/${encodeURIComponent(resolved.id)}`,
      `/api/projects/${encodeURIComponent(projectId)}/services/${encodeURIComponent(resolved.id)}`,
      `/projects/${encodeURIComponent(projectId)}/services/${encodeURIComponent(resolved.id)}`,
    ])

    return {
      endpoint: result.path,
      service: this.normalizeService(asJsonObject(result.data)),
    }
  }

  async getServiceLogs(identifier: ServiceIdentifier, lines: number): Promise<{ endpoint: string; logs: string }> {
    const resolved = await this.resolveService(identifier)
    if (!resolved.id) {
      throw new Error('Resolved service does not expose an ID required for logs')
    }

    const projectId = this.config.easypanel.projectId
    const safeLines = Math.max(10, Math.min(2000, Math.floor(lines)))

    const candidates = [
      `/api/services/${encodeURIComponent(resolved.id)}/logs?lines=${safeLines}`,
      `/api/services/${encodeURIComponent(resolved.id)}/logs?tail=${safeLines}`,
      `/api/projects/${encodeURIComponent(projectId)}/services/${encodeURIComponent(resolved.id)}/logs?lines=${safeLines}`,
      `/projects/${encodeURIComponent(projectId)}/services/${encodeURIComponent(resolved.id)}/logs?lines=${safeLines}`,
    ]

    const errors: string[] = []

    for (const path of candidates) {
      try {
        const response = await this.request(path)
        const text = await response.text()

        if (!response.ok) {
          errors.push(`${path}: HTTP ${response.status}`)
          continue
        }

        try {
          const parsed = JSON.parse(text)
          const obj = asJsonObject(parsed)
          const logValue = obj.logs ?? obj.log ?? obj.output
          if (typeof logValue === 'string') {
            return { endpoint: path, logs: logValue }
          }
          return { endpoint: path, logs: JSON.stringify(parsed) }
        } catch {
          return { endpoint: path, logs: text }
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        errors.push(`${path}: ${message}`)
      }
    }

    throw new Error(`Could not retrieve logs. Attempts: ${errors.join(' | ')}`)
  }

  async restartService(identifier: ServiceIdentifier): Promise<{ endpoint: string; result: JsonObject }> {
    const resolved = await this.resolveService(identifier)
    if (!resolved.id) throw new Error('Resolved service does not expose an ID required for restart')

    const projectId = this.config.easypanel.projectId
    const result = await this.tryPaths(
      [
        `/api/services/${encodeURIComponent(resolved.id)}/restart`,
        `/api/v1/services/${encodeURIComponent(resolved.id)}/restart`,
        `/api/projects/${encodeURIComponent(projectId)}/services/${encodeURIComponent(resolved.id)}/restart`,
      ],
      { method: 'POST' },
    )

    return { endpoint: result.path, result: asJsonObject(result.data) }
  }

  async redeployService(identifier: ServiceIdentifier): Promise<{ endpoint: string; result: JsonObject }> {
    const resolved = await this.resolveService(identifier)
    if (!resolved.id) throw new Error('Resolved service does not expose an ID required for redeploy')

    const projectId = this.config.easypanel.projectId
    const result = await this.tryPaths(
      [
        `/api/services/${encodeURIComponent(resolved.id)}/redeploy`,
        `/api/services/${encodeURIComponent(resolved.id)}/deploy`,
        `/api/v1/services/${encodeURIComponent(resolved.id)}/redeploy`,
        `/api/projects/${encodeURIComponent(projectId)}/services/${encodeURIComponent(resolved.id)}/deploy`,
      ],
      { method: 'POST' },
    )

    return { endpoint: result.path, result: asJsonObject(result.data) }
  }
}
