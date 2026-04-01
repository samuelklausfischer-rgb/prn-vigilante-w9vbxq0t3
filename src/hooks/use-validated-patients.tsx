import { useState, useEffect } from 'react'
import { PatientQueue } from '@/types'
import { fetchValidatedPatients } from '@/services/data'

export function useValidatedPatients() {
  const [items, setItems] = useState<PatientQueue[]>([])
  const [loading, setLoading] = useState(true)

  const refetch = async () => {
    setLoading(true)
    const data = await fetchValidatedPatients()
    setItems(data)
    setLoading(false)
  }

  useEffect(() => {
    refetch()
  }, [])

  return { items, loading, refetch }
}
