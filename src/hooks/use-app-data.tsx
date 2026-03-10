import { useState, useEffect } from 'react'
import { PatientQueue, SystemConfig } from '@/types'
import { supabase } from '@/lib/supabase/client'
import { fetchQueue, fetchConfig, updateQueueItem, toggleSystemPause } from '@/services/data'

export function useAppData(statusFilter: string[]) {
  const [items, setItems] = useState<PatientQueue[]>([])
  const [config, setConfig] = useState<SystemConfig | null>(null)
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    setLoading(true)
    const [queueData, configData] = await Promise.all([fetchQueue(statusFilter), fetchConfig()])
    setItems(queueData)
    setConfig(configData)
    setLoading(false)
  }

  useEffect(() => {
    loadData()

    // Setup Realtime subscriptions
    const queueSub = supabase
      .channel('queue-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'patients_queue' },
        (payload) => {
          // Simple reload strategy on change for consistency, though could patch state manually
          loadData()
        },
      )
      .subscribe()

    const configSub = supabase
      .channel('config-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'system_config' }, () => {
        loadData()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(queueSub)
      supabase.removeChannel(configSub)
    }
  }, [statusFilter.join(',')])

  return { items, config, loading, updateQueueItem, toggleSystemPause }
}
