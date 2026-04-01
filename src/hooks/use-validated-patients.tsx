import { useState, useEffect } from 'react'
import { PatientQueue } from '@/types'
import { fetchValidatedPatients, ActiveSendList } from '@/services/data'

export function useValidatedPatients() {
  const [items, setItems] = useState<PatientQueue[]>([])
  const [activeLists, setActiveLists] = useState<ActiveSendList[]>([])
  const [hasActiveList, setHasActiveList] = useState(false)
  const [loading, setLoading] = useState(true)

  const refetch = async () => {
    setLoading(true)
    const result = await fetchValidatedPatients()
    setItems(result.patients)
    setActiveLists(result.activeLists)
    setHasActiveList(result.hasActiveList)
    setLoading(false)
  }

  useEffect(() => {
    refetch()
  }, [])

  const listNameById = (sendListId: string | null | undefined) => {
    if (!sendListId) return ''
    const found = activeLists.find((l) => l.id === sendListId)
    return found?.name || sendListId.split('-')[0] + '...'
  }

  return { items, activeLists, hasActiveList, loading, refetch, listNameById }
}
