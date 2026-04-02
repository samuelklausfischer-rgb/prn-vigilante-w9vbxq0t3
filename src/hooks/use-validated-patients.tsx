import { useState, useEffect, useRef } from 'react'
import { PatientQueue } from '@/types'
import { fetchValidatedPatients, requestXray, fetchXrayStatus } from '@/services/data'

export function useValidatedPatients() {
  const [items, setItems] = useState<PatientQueue[]>([])
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const refetch = async () => {
    setLoading(true)
    const data = await fetchValidatedPatients()
    setItems(data)
    setLoading(false)
  }

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }

  const startPolling = () => {
    stopPolling()
    pollRef.current = setInterval(async () => {
      const isRequested = await fetchXrayStatus()
      if (!isRequested) {
        stopPolling()
        setAnalyzing(false)
        await refetch()
      }
    }, 3000)
  }

  const requestAnalysis = async () => {
    const ok = await requestXray()
    if (ok) {
      setAnalyzing(true)
      startPolling()
    }
  }

  useEffect(() => {
    refetch()
    fetchXrayStatus().then((status) => setAnalyzing(status))
    return () => stopPolling()
  }, [])

  return { items, loading, analyzing, refetch, requestAnalysis }
}
