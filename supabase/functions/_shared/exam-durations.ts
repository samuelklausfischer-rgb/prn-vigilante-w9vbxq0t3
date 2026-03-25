type ExamDurationRule = {
  key: string
  label: string
  minutes: number
  aliases: readonly string[]
}

function normalizeExamText(value: string): string {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function formatDuration(minutes: number): string {
  if (minutes === 60) return '1 hora'
  return `${minutes} min`
}

export const EXAM_DURATION_RULES: readonly ExamDurationRule[] = [
  {
    key: 'cranio perfusao espectroscopia',
    label: 'cranio perfusao/espectroscopia',
    minutes: 30,
    aliases: ['cranio perfusao', 'cranio expectroscopia', 'cranio espectroscopia', 'perfusao', 'espectroscopia'],
  },
  {
    key: 'abdome superior',
    label: 'abdome superior',
    minutes: 30,
    aliases: ['abdomen superior'],
  },
  {
    key: 'abdome inferior',
    label: 'abdome inferior',
    minutes: 30,
    aliases: ['abdomen inferior'],
  },
  {
    key: 'mamas',
    label: 'mamas',
    minutes: 45,
    aliases: ['mama'],
  },
  {
    key: 'coracao',
    label: 'coracao',
    minutes: 50,
    aliases: ['cardiaca', 'cardiaco'],
  },
  {
    key: 'cranio',
    label: 'cranio',
    minutes: 30,
    aliases: ['craneo', 'cabeca', 'encefalo', 'cerebro'],
  },
  {
    key: 'pelve',
    label: 'pelve',
    minutes: 30,
    aliases: ['bacia'],
  },
  {
    key: 'joelho',
    label: 'joelho',
    minutes: 15,
    aliases: [],
  },
  {
    key: 'ombro',
    label: 'ombro',
    minutes: 15,
    aliases: [],
  },
  {
    key: 'tornozelo',
    label: 'tornozelo',
    minutes: 15,
    aliases: [],
  },
  {
    key: 'punho',
    label: 'punho',
    minutes: 15,
    aliases: [],
  },
  {
    key: 'cotovelo',
    label: 'cotovelo',
    minutes: 15,
    aliases: [],
  },
  {
    key: 'mao',
    label: 'mao',
    minutes: 15,
    aliases: ['mao'],
  },
  {
    key: 'pe',
    label: 'pe',
    minutes: 15,
    aliases: ['pes'],
  },
  {
    key: 'quadril',
    label: 'quadril',
    minutes: 15,
    aliases: [],
  },
  {
    key: 'coluna cervical',
    label: 'coluna cervical',
    minutes: 8,
    aliases: ['cervical', 'pescoco'],
  },
  {
    key: 'coluna toracica',
    label: 'coluna toracica',
    minutes: 8,
    aliases: ['toracica'],
  },
  {
    key: 'coluna lombar',
    label: 'coluna lombar/lombo-sacra',
    minutes: 8,
    aliases: ['lombar', 'lombo sacra', 'lombo-sacra', 'lombossacra', 'coluna lombo sacra', 'coluna lombossacra'],
  },
  {
    key: 'membro superior',
    label: 'membro superior',
    minutes: 7,
    aliases: ['membros superiores'],
  },
  {
    key: 'membro inferior',
    label: 'membro inferior',
    minutes: 8,
    aliases: ['membros inferiores'],
  },
] as const

export function getExamDurationRule(procedimento: string): ExamDurationRule | null {
  const normalized = normalizeExamText(procedimento)
  if (!normalized) return null

  for (const rule of EXAM_DURATION_RULES) {
    const terms = [rule.key, ...rule.aliases]
    if (terms.some((term) => normalized.includes(normalizeExamText(term)))) {
      return rule
    }
  }

  return null
}

export function getExamDurationMinutes(procedimento: string): number | null {
  return getExamDurationRule(procedimento)?.minutes ?? null
}

export function getExamDurationsTable(): string[] {
  return EXAM_DURATION_RULES.map((rule) => `- ${rule.label}: ${formatDuration(rule.minutes)}`)
}
