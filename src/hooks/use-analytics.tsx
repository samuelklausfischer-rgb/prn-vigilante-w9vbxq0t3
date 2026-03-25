import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import type { AnalyticsSummary, DateRangeFilter } from '@/types'
import { fetchAnalyticsSummary } from '@/services/analytics'

function buildDefaultRange(days: number): DateRangeFilter {
  const now = new Date()
  const from = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
  const to = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
  return days > 0 ? { from, to } : { from, to }
}

export function useAnalytics(days = 30, externalRange?: DateRangeFilter) {
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const range = useMemo(() => externalRange || buildDefaultRange(days), [days, externalRange])
  const rangeKey = `${range.from?.toISOString() || ''}:${range.to?.toISOString() || ''}`

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const data = await fetchAnalyticsSummary(range)
      setAnalytics(data)
    } catch (err: any) {
      setError(err?.message || 'Falha ao carregar analytics')
    } finally {
      setLoading(false)
    }
  }, [range])

  useEffect(() => {
    refetch()

    const analyticsChannel = supabase
      .channel('analytics-daily-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'analytics_daily' }, () => {
        refetch()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(analyticsChannel)
    }
  }, [rangeKey, refetch])

  return { analytics, loading, error, refetch, range }
}
