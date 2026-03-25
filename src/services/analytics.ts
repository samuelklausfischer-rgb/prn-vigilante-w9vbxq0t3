import { supabase } from '@/lib/supabase/client'
import type { AnalyticsDaily, AnalyticsSummary, ArchivePreview, DateRangeFilter } from '@/types'

function sumField(data: AnalyticsDaily[], field: keyof Pick<AnalyticsDaily, 'total_enviadas' | 'sucesso' | 'falha' | 'cancelada'>) {
  return data.reduce((total, item) => total + Number(item[field] || 0), 0)
}

function calculateChange(current: number, previous: number) {
  if (previous <= 0) return current > 0 ? '+100%' : '0%'
  const change = ((current - previous) / previous) * 100
  return `${change > 0 ? '+' : ''}${change.toFixed(1)}%`
}

function aggregateProcedures(dailyData: AnalyticsDaily[]) {
  const map = new Map<string, { enviadas: number; sucesso: number; falha: number }>()

  for (const day of dailyData) {
    const procedures = day.por_procedimento || {}
    for (const [procedimento, counters] of Object.entries(procedures)) {
      const current = map.get(procedimento) || { enviadas: 0, sucesso: 0, falha: 0 }
      current.enviadas += Number(counters.enviadas || 0)
      current.sucesso += Number(counters.sucesso || 0)
      current.falha += Number(counters.falha || 0)
      map.set(procedimento, current)
    }
  }

  return Array.from(map.entries())
    .map(([procedimento, counters]) => ({
      procedimento,
      ...counters,
      taxa_sucesso: counters.enviadas > 0 ? ((counters.sucesso / counters.enviadas) * 100).toFixed(1) : '0.0',
    }))
    .sort((left, right) => right.enviadas - left.enviadas)
}

export async function fetchAnalyticsDaily(dateRange: DateRangeFilter): Promise<AnalyticsDaily[]> {
  let query = supabase.from('analytics_daily').select('*').order('data', { ascending: true })

  if (dateRange.from) {
    query = query.gte('data', dateRange.from.toISOString().slice(0, 10))
  }

  if (dateRange.to) {
    query = query.lte('data', dateRange.to.toISOString().slice(0, 10))
  }

  const { data, error } = await query
  if (error) throw error
  return (data || []) as AnalyticsDaily[]
}

export async function fetchAnalyticsSummary(dateRange: DateRangeFilter): Promise<AnalyticsSummary> {
  const dailyData = await fetchAnalyticsDaily(dateRange)
  const total_enviadas = sumField(dailyData, 'total_enviadas')
  const sucesso = sumField(dailyData, 'sucesso')
  const falha = sumField(dailyData, 'falha')
  const cancelada = sumField(dailyData, 'cancelada')
  const taxa_sucesso = total_enviadas > 0 ? ((sucesso / total_enviadas) * 100).toFixed(1) : '0.0'

  const currentWindow = dailyData.slice(-7)
  const previousWindow = dailyData.slice(-14, -7)
  const currentSuccessRate = sumField(currentWindow, 'total_enviadas') > 0
    ? (sumField(currentWindow, 'sucesso') / sumField(currentWindow, 'total_enviadas')) * 100
    : 0
  const previousSuccessRate = sumField(previousWindow, 'total_enviadas') > 0
    ? (sumField(previousWindow, 'sucesso') / sumField(previousWindow, 'total_enviadas')) * 100
    : 0

  return {
    total_enviadas,
    sucesso,
    falha,
    cancelada,
    taxa_sucesso,
    change_enviadas: calculateChange(sumField(currentWindow, 'total_enviadas'), sumField(previousWindow, 'total_enviadas')),
    change_sucesso: calculateChange(sumField(currentWindow, 'sucesso'), sumField(previousWindow, 'sucesso')),
    change_falha: calculateChange(sumField(currentWindow, 'falha'), sumField(previousWindow, 'falha')),
    change_taxa_sucesso: `${(currentSuccessRate - previousSuccessRate).toFixed(1)}%`,
    daily_trend: dailyData.map((item) => ({
      date: item.data,
      enviadas: item.total_enviadas,
      sucesso: item.sucesso,
      falha: item.falha,
    })),
    success_rate: dailyData.map((item) => ({
      date: item.data,
      rate: item.total_enviadas > 0 ? ((item.sucesso / item.total_enviadas) * 100).toFixed(1) : '0.0',
    })),
    por_procedimento: aggregateProcedures(dailyData),
  }
}

export async function previewArchiveByDate(dataInicio: string, dataFim: string): Promise<ArchivePreview> {
  const { data, error } = await (supabase.rpc as any)('preview_archive_by_data_exame', {
    data_inicio: dataInicio,
    data_fim: dataFim,
  })

  if (error) throw error

  const row = Array.isArray(data) ? data[0] : data
  return {
    total_to_archive: Number(row?.total_to_archive || 0),
    blocked_sending: Number(row?.blocked_sending || 0),
    status_breakdown: row?.status_breakdown || {},
    data_exame_range: row?.data_exame_range || { from: dataInicio, to: dataFim },
    message: row?.message || 'Preview carregado',
  }
}

export async function archiveByDate(dataInicio: string, dataFim: string) {
  const { data, error } = await (supabase.rpc as any)('archive_by_data_exame', {
    data_inicio: dataInicio,
    data_fim: dataFim,
    archive_reason: 'manual_range',
    archived_by: 'dashboard',
  })

  if (error) throw error
  const row = Array.isArray(data) ? data[0] : data

  return {
    archived_count: Number(row?.archived_count || 0),
    blocked_count: Number(row?.blocked_count || 0),
    success: Boolean(row?.success),
    message: String(row?.message || ''),
  }
}

export async function archiveSelectedPatients(ids: string[]) {
  const { data, error } = await (supabase.rpc as any)('archive_selected_patients', {
    patient_ids: ids,
    archive_reason: 'manual_selection',
    archived_by: 'dashboard',
  })

  if (error) throw error
  const row = Array.isArray(data) ? data[0] : data

  return {
    archived_count: Number(row?.archived_count || 0),
    blocked_count: Number(row?.blocked_count || 0),
    success: Boolean(row?.success),
    message: String(row?.message || ''),
  }
}
