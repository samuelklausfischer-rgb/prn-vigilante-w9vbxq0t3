// Centralized delays and constants
// DEV SENIOR RULE: Never hardcode numbers > 2 digits

export const MILLISECONDS = {
  SECOND: 1000,
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000,
}

export const WORKER = {
  POLL_INTERVAL_MS: 5000,
  HEARTBEAT_INTERVAL_MS: 30000,
  LEASE_SECONDS: 90,
  LOCK_TIMEOUT_MINUTES: 5,
  FOLLOWUP_INTERVAL_MS: 60 * 1000,
  MAX_ATTEMPTS: 3,
}

export const EVOLUTION = {
  TIMEOUT_MS: 15000,
  BATCH_SIZE: 10,
  HISTORY_FETCH_LIMIT: 10,
}

export const HUMANIZER = {
  TYPING_SPEED_CPS: 6,
  MIN_DELAY_MS: 3 * 60 * 1000, // 3 min
  MAX_DELAY_MS: 13 * 60 * 1000, // 13 min
  JITTER_PERCENT: 0.15,
  PAUSE_EVERY_N: 5,
  LONG_PAUSE_MS: 60 * 1000,
  WORKING_HOURS: { start: 8, end: 20 },
}

export const DATABASE = {
  CLAIM_LOCK_TIMEOUT_MS: 60 * 1000,
  BATCH_CHUNK_SIZE: 100,
  MAX_POOL_SIZE: 10,
}

export const RETRY = {
  ATTEMPTS: 3,
  INITIAL_DELAY_MS: 1000,
  MAX_DELAY_MS: 30000,
  EXPONENTIAL_BASE: 2,
}

// Magic Numbers centralizados DO warehouse
export const EXAMS = {
  CRANIO: 20,
  COLUNA: 8,
  PELVE: 40,
  MEMBRO: 15,
}

export const PHONE_BR = {
  DDD_MIN: 11,
  DDD_MAX: 99,
  DDI: '55',
  REMOVE_NINE_FOR_DDD_GREATER_THAN: 28,
}
