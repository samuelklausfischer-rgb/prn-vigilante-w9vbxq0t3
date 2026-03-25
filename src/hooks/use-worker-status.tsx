import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import type { WorkerHeartbeat, MessageLog } from '@/types'

/**
 * 🔴🟢 Hook para monitorar status do Worker e feed de mensagens em tempo real.
 *
 * Retorna:
 * - workerStatus: 'active' | 'stale' | 'offline'
 * - lastHeartbeat: dados do Worker
 * - recentLogs: últimas mensagens enviadas/falhadas
 */
export function useWorkerStatus() {
  const [workerStatus, setWorkerStatus] = useState<'active' | 'stale' | 'offline'>('offline')
  const [lastHeartbeat, setLastHeartbeat] = useState<WorkerHeartbeat | null>(null)
  const [recentLogs, setRecentLogs] = useState<MessageLog[]>([])

  const fetchHeartbeat = async () => {
    const { data, error } = await supabase
      .from('worker_heartbeats')
      .select('*')
      .order('last_heartbeat', { ascending: false })
      .limit(1)
      .single()

    if (error || !data) {
      setWorkerStatus('offline')
      setLastHeartbeat(null)
      return
    }

    const hb = data as WorkerHeartbeat
    setLastHeartbeat(hb)

    const lastBeat = new Date(hb.last_heartbeat).getTime()
    const now = Date.now()
    const diffMinutes = (now - lastBeat) / 60000

    if (diffMinutes < 1) {
      setWorkerStatus('active')
    } else if (diffMinutes < 5) {
      setWorkerStatus('stale')
    } else {
      setWorkerStatus('offline')
    }
  }

  const fetchRecentLogs = async () => {
    const { data } = await supabase
      .from('message_logs')
      .select('*')
      .order('sent_at', { ascending: false })
      .limit(10)

    if (data) {
      setRecentLogs(data as MessageLog[])
    }
  }

  useEffect(() => {
    fetchHeartbeat()
    fetchRecentLogs()

    // Poll heartbeat every 15 seconds
    const heartbeatInterval = setInterval(fetchHeartbeat, 15000)

    // Realtime subscription for message logs
    const logsSub = supabase
      .channel('logs-feed')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'message_logs' },
        () => {
          fetchRecentLogs()
        },
      )
      .subscribe()

    // Realtime subscription for heartbeats
    const heartbeatSub = supabase
      .channel('heartbeat-feed')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'worker_heartbeats' },
        () => {
          fetchHeartbeat()
        },
      )
      .subscribe()

    return () => {
      clearInterval(heartbeatInterval)
      supabase.removeChannel(logsSub)
      supabase.removeChannel(heartbeatSub)
    }
  }, [])

  return { workerStatus, lastHeartbeat, recentLogs }
}
