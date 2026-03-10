import { useState, useEffect } from 'react'
import { PatientQueue, SystemConfig } from '@/types'
import { supabase } from '@/lib/supabase/client'
import {
  fetchQueue,
  fetchConfig,
  updateQueueItem as updateQueueItemService,
  toggleSystemPause as toggleSystemPauseService,
} from '@/services/data'
import { toast } from '@/hooks/use-toast'

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

  const updateQueueItem = async (id: string, updates: Partial<PatientQueue>) => {
    const previousItems = [...items]

    // Optimistic UI update
    setItems((currentItems) =>
      currentItems.map((item) => (item.id === id ? { ...item, ...updates } : item)),
    )

    const success = await updateQueueItemService(id, updates)

    if (!success) {
      // Revert to previous state if API call fails
      setItems(previousItems)
      toast({
        title: 'Erro de atualização',
        description: 'Não foi possível salvar a alteração. O status original foi restaurado.',
        variant: 'destructive',
      })
    }

    return success
  }

  const toggleSystemPause = async (is_paused: boolean) => {
    const previousConfig = config

    if (config) {
      setConfig({ ...config, is_paused })
    }

    const success = await toggleSystemPauseService(is_paused)

    if (!success && previousConfig) {
      setConfig(previousConfig)
      toast({
        title: 'Erro de atualização',
        description: 'Falha ao alterar o status do sistema. O estado original foi restaurado.',
        variant: 'destructive',
      })
    }

    return success
  }

  return { items, config, loading, updateQueueItem, toggleSystemPause }
}
