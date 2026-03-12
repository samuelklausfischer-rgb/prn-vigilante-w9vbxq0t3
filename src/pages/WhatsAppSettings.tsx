import { useState, useEffect } from 'react'
import { WhatsAppInstance } from '@/types'
import { evolutionApi } from '@/services/evolution'
import { WhatsAppModal } from '@/components/WhatsAppModal'
import { WhatsAppSlotCard } from '@/components/WhatsAppSlotCard'
import { RefreshCw, AlertCircle, Activity, Wifi } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'

const TOTAL_SLOTS = 5

export default function WhatsAppSettings() {
  const [instances, setInstances] = useState<WhatsAppInstance[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dbEmpty, setDbEmpty] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [selectedInstance, setSelectedInstance] = useState<WhatsAppInstance | null>(null)
  const { toast } = useToast()

  const loadData = async () => {
    try {
      setError(null)
      const data = await evolutionApi.getInstances()
      setDbEmpty(data.length === 0)

      const slots = Array.from({ length: TOTAL_SLOTS }, (_, i) => {
        const slotId = i + 1
        return (
          data.find((d) => d.slotId === slotId) || {
            slotId,
            instanceName: null,
            phoneNumber: null,
            status: 'empty',
          }
        )
      }) as WhatsAppInstance[]

      setInstances(slots)
      return { data, slots }
    } catch (e: any) {
      setError('Falha ao carregar as instâncias. Verifique a conexão com o banco de dados.')
      return null
    }
  }

  const handleSyncWithWebhook = async (silent = false) => {
    setSyncing(true)
    const result = await evolutionApi.syncWithWebhook()
    if (result.success) {
      if (!silent) toast({ description: 'Instâncias sincronizadas com sucesso.' })
      await loadData()
    } else {
      if (!silent)
        toast({ description: result.message || 'Erro ao sincronizar.', variant: 'destructive' })
    }
    setSyncing(false)
  }

  useEffect(() => {
    let mounted = true
    const init = async () => {
      setLoading(true)
      const result = await loadData()
      if (!mounted) return
      if (result) {
        if (result.data.length === 0 || result.data.some((i) => i.status === 'initializing')) {
          await handleSyncWithWebhook(true)
        } else {
          handleSyncWithWebhook(true)
        }
      }
      setLoading(false)
    }

    init()
    const sub = supabase
      .channel('wa-instances')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'whatsapp_instances' },
        () => mounted && loadData(),
      )
      .subscribe()

    return () => {
      mounted = false
      supabase.removeChannel(sub)
    }
  }, [])

  useEffect(() => {
    if (selectedInstance) {
      const updated = instances.find((i) => i.slotId === selectedInstance.slotId)
      if (updated && JSON.stringify(updated) !== JSON.stringify(selectedInstance)) {
        setSelectedInstance(updated)
      }
    }
  }, [instances, selectedInstance])

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card/60 p-6 rounded-2xl border border-white/10 backdrop-blur-xl shadow-2xl relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-transparent to-transparent pointer-events-none" />
        <div className="relative z-10">
          <h2 className="text-2xl font-heading font-bold flex items-center gap-3 text-white">
            <Activity className="w-6 h-6 text-blue-400" /> Canais de Comunicação
          </h2>
          <p className="text-sm text-muted-foreground mt-1.5 flex items-center gap-2">
            <Wifi className="w-4 h-4 opacity-70" /> Sincronização em tempo real via Webhook ativo.
          </p>
        </div>
        <Button
          onClick={() => handleSyncWithWebhook(false)}
          disabled={loading || syncing}
          className="rounded-xl border-white/10 bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)] z-10"
        >
          <RefreshCw className={cn('w-4 h-4 mr-2', (loading || syncing) && 'animate-spin')} />
          {syncing ? 'Sincronizando...' : 'Sincronizar Instâncias'}
        </Button>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-2xl p-6 flex flex-col items-center justify-center text-center gap-4 animate-in fade-in">
          <AlertCircle className="w-10 h-10 text-destructive" />
          <div>
            <h3 className="text-lg font-semibold text-destructive">Erro de Conexão</h3>
            <p className="text-destructive/80 mt-1">{error}</p>
          </div>
          <Button
            onClick={() => loadData()}
            variant="outline"
            className="border-destructive/30 text-destructive hover:bg-destructive/20 mt-2"
          >
            Tentar Novamente
          </Button>
        </div>
      )}

      {dbEmpty && !loading && !error && (
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex items-center gap-4 text-blue-400 animate-in fade-in">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p className="text-sm">
            Nenhuma instância encontrada no banco de dados. Configure um slot disponível abaixo ou
            sincronize com o webhook para importar dados existentes.
          </p>
        </div>
      )}

      {!error && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading && instances.length === 0
            ? Array.from({ length: TOTAL_SLOTS }).map((_, i) => (
                <div
                  key={i}
                  className="h-48 rounded-2xl bg-card/30 border border-white/5 animate-pulse"
                />
              ))
            : instances.map((instance) => (
                <WhatsAppSlotCard
                  key={instance.slotId}
                  instance={instance}
                  onClick={() => setSelectedInstance(instance)}
                />
              ))}
        </div>
      )}

      <WhatsAppModal
        instance={selectedInstance}
        open={!!selectedInstance}
        onOpenChange={(open) => !open && setSelectedInstance(null)}
        onRefresh={async () => {
          await loadData()
        }}
      />
    </div>
  )
}
