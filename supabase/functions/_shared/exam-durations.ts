export const examDurations: Record<string, number> = {
  MAMOGRAFIA: 20,
  RESSONANCIA: 30,
  TOMOGRAFIA: 20,
  ULTRASSONOGRAFIA: 15,
  RX: 10,
  DENSITOMETRIA: 15,
}

export const getExamDuration = (examName: string): number => {
  if (!examName) return 15
  const normalized = examName.toUpperCase()
  for (const [key, duration] of Object.entries(examDurations)) {
    if (normalized.includes(key)) {
      return duration
    }
  }
  return 15
}
