/**
 * Funções utilitárias para formatação de horários e duração
 */

/**
 * Formata horário para exibição
 * @param timeStr - String no formato HH:MM:SS
 * @returns Horário formatado HH:MM
 */
export function formatTime(timeStr?: string | null): string {
  if (!timeStr) return '--:--'
  return timeStr.substring(0, 5)
}

/**
 * Formata duração do procedimento para exibição
 * @param timeStr - String no formato HH:MM:SS (ex: 00:45:00)
 * @returns Duração formatada (ex: "45 min" ou "1h 30min")
 */
export function formatDuration(timeStr?: string | null): string {
  if (!timeStr) return '-- min'
  const parts = timeStr.split(':').map(Number)
  if (parts[0] > 0) {
    return `${parts[0]}h ${parts[1]}min`
  }
  return `${parts[1]} min`
}

/**
 * Calcula horário final baseado no horário inicial + duração
 * @param startTime - Horário inicial (HH:MM:SS)
 * @param duration - Duração do procedimento (HH:MM:SS)
 * @returns Horário final formatado (HH:MM:SS) ou null
 */
export function calculateFinalTime(
  startTime: string,
  duration: string
): string | null {
  if (!startTime || !duration) return null
  const [startHours, startMinutes, startSeconds] = startTime.split(':').map(Number)
  const [durationHours, durationMinutes] = duration.split(':').map(Number)

  const totalMinutes = startHours * 60 + startMinutes + durationHours * 60 + durationMinutes

  const endHours = Math.floor(totalMinutes / 60)
  const endMinutes = totalMinutes % 60

  return `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}:00`
}
