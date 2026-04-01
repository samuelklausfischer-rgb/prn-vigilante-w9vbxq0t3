export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue }

export type JsonObject = { [key: string]: JsonValue }

export type ServiceIdentifier = {
  serviceId?: string
  serviceName?: string
}

export type ProjectService = {
  id?: string
  name?: string
  status?: string
  raw: JsonObject
}
