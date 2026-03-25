import { useState, useEffect } from 'react'
import type { DateRangeFilter } from '@/types'

export function useAnalytics(days: number, range: DateRangeFilter) {
  const [analytics, setAnalytics] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)

    // Simulation of analytics data fetching without relying on @shared dependencies
    const timer = setTimeout(() => {
      setAnalytics({
        total_enviadas: 15832,
        change_enviadas: '+12%',
        sucesso: 14200,
        change_sucesso: '+15%',
        falha: 1632,
        change_falha: '-3%',
        taxa_sucesso: 89.7,
        change_taxa_sucesso: '+2.1%',
        daily_trend: [
          { date: '2023-10-01', value: 120 },
          { date: '2023-10-02', value: 150 },
          { date: '2023-10-03', value: 180 },
          { date: '2023-10-04', value: 165 },
          { date: '2023-10-05', value: 210 },
        ],
        success_rate: [
          { date: '2023-10-01', value: 88 },
          { date: '2023-10-02', value: 92 },
          { date: '2023-10-03', value: 89 },
          { date: '2023-10-04', value: 94 },
          { date: '2023-10-05', value: 91 },
        ],
        por_procedimento: [
          { name: 'Ressonância Magnética', total: 5000, sucesso: 4500, taxa: 90 },
          { name: 'Tomografia', total: 3000, sucesso: 2800, taxa: 93.3 },
          { name: 'Ultrassonografia', total: 4500, sucesso: 4100, taxa: 91.1 },
          { name: 'Raio-X', total: 3332, sucesso: 2800, taxa: 84 },
        ],
      })
      setLoading(false)
    }, 500)

    return () => clearTimeout(timer)
  }, [days, range])

  return { analytics, loading, error }
}
