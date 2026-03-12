import { useState, useEffect } from 'react'
import { WhatsAppInstance } from '@/types'
import { evolutionApi } from '@/services/evolution'
import { WhatsAppModal } from '@/components/WhatsAppModal'
import {
  Smartphone,
  RefreshCw,
  PlusCircle,
  CheckCircle2,
  AlertCircle,
  Activity,
  Wifi,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'

export default function WhatsAppSettings() {
  const [instances, setInstances] = useState<WhatsAppInstance[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [selectedInstance, setSelectedInstance] = useState<WhatsAppInstance | null>(null)
  const { toast } = useToast()

  const loadData = async () => {
    try {
      const data = await evolutionApi.getInstances()
      setInstances(data)
      return data
    } catch (e) {
      console.error('Failed to load instances', e)
      return []
    }
  }

  const handleSyncWithWebhook = async (silent = false) => {
    setSyncing(true)
    const result = await evolutionApi.syncWithWebhook()

    if (result.success) {
      if (!silent) {
        toast({
          title: 'Sincronização Concluída',
          description: 'Instâncias sincronizadas com sucesso!',
        })
      }
      await loadData()
    } else {
      if (!silent) {
        toast({
          title: 'Erro na Sincronização',
          description:
            result.message ||
            'Falha ao sincronizar instâncias. Verifique a conexão com o servidor.',
          variant: 'destructive',
        })
      }
    }
    setSyncing(false)
  }

  useEffect(() => {
    const init = async () => {
      setLoading(true)
      const data = await loadData()

      // Auto-sync se estiver vazio ou como rotina de entrada
      if (data.length === 0 || data.some((i) => i.status === 'initializing')) {
        await handleSyncWithWebhook(true)
      } else {
        // Background sync silencioso para garantir frescor dos dados
        handleSyncWithWebhook(true)
      }
      setLoading(false)
    }

    init()

    const sub = supabase
      .channel('whatsapp-instances-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'whatsapp_instances' }, () => {
        loadData()
      })
      .subscribe()

    return () => {
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

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'connected':
        return {
          label: 'Conectado',
          badge: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50',
          icon: <CheckCircle2 className="w-5 h-5 text-emerald-400" />,
          border: 'border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.15)] bg-emerald-500/5',
          pulse: 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]',
        }
      case 'disconnected':
        return {
          label: 'Desconectado',
          badge: 'bg-amber-500/20 text-amber-400 border-amber-500/50',
          icon: <AlertCircle className="w-5 h-5 text-amber-400" />,
          border: 'border-amber-500/40 shadow-[0_0_20px_rgba(245,158,11,0.15)] bg-amber-500/5',
          pulse: 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.8)]',
        }
      case 'initializing':
        return {
          label: 'Inicializando',
          badge: 'bg-blue-500/20 text-blue-400 border-blue-500/50',
          icon: <RefreshCw className="w-5 h-5 text-blue-400 animate-spin" />,
          border: 'border-blue-500/40 shadow-[0_0_20px_rgba(59,130,246,0.15)] bg-blue-500/5',
          pulse: 'bg-blue-400 animate-pulse shadow-[0_0_10px_rgba(59,130,246,0.8)]',
        }
      default:
        return {
          label: 'Slot Vazio',
          badge: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
          icon: <PlusCircle className="w-5 h-5 text-slate-500" />,
          border: 'border-white/10 hover:border-white/20 bg-card/40',
          pulse: 'bg-slate-600',
        }
    }
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card/60 p-6 rounded-2xl border border-white/10 backdrop-blur-xl shadow-2xl relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-transparent to-transparent pointer-events-none" />
        <div className="relative z-10">
          <h2 className="text-2xl font-heading font-bold flex items-center gap-3 text-white">
            <Activity className="w-6 h-6 text-blue-400" />
            Canais de Comunicação
          </h2>
          <p className="text-sm text-muted-foreground mt-1.5 flex items-center gap-2">
            <Wifi className="w-4 h-4 opacity-70" />
            Sincronização em tempo real via Webhook ativo.
          </p>
        </div>
        <Button
          onClick={() => handleSyncWithWebhook(false)}
          disabled={loading || syncing}
          className="rounded-xl border-white/10 bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)] transition-all active:scale-95 z-10"
        >
          <RefreshCw className={cn('w-4 h-4 mr-2', (loading || syncing) && 'animate-spin')} />
          {syncing ? 'Sincronizando...' : 'Sincronizar Instâncias'}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {instances.length === 0 && loading
          ? Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-48 rounded-2xl bg-card/30 border border-white/5 animate-pulse"
              />
            ))
          : instances.map((instance) => {
              const display = getStatusDisplay(instance.status)
              return (
                <div
                  key={instance.slotId}
                  onClick={() => setSelectedInstance(instance)}
                  className={cn(
                    'group relative p-6 rounded-2xl backdrop-blur-md cursor-pointer transition-all duration-500 hover:-translate-y-2 border overflow-hidden',
                    display.border,
                  )}
                >
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Smartphone className="w-24 h-24 rotate-12" />
                  </div>

                  <div className="flex justify-between items-start mb-6 relative z-10">
                    <div className="p-3 rounded-xl bg-background/80 backdrop-blur-sm border border-white/10 group-hover:scale-110 transition-transform shadow-lg">
                      {display.icon}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="flex h-3 w-3 relative">
                        {instance.status !== 'empty' && (
                          <span
                            className={cn(
                              'animate-ping absolute inline-flex h-full w-full rounded-full opacity-75',
                              display.pulse,
                            )}
                          />
                        )}
                        <span
                          className={cn('relative inline-flex rounded-full h-3 w-3', display.pulse)}
                        />
                      </span>
                      <Badge
                        variant="outline"
                        className={cn(
                          'uppercase tracking-wider text-[10px] font-bold',
                          display.badge,
                        )}
                      >
                        {display.label}
                      </Badge>
                    </div>
                  </div>

                  <div className="relative z-10 space-y-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-mono bg-white/10 px-2 py-0.5 rounded text-white/70">
                        SLOT 0{instance.slotId}
                      </span>
                    </div>
                    <h3
                      className={cn(
                        'text-xl font-heading font-bold truncate tracking-tight',
                        instance.status === 'empty' ? 'text-muted-foreground/50' : 'text-white',
                      )}
                    >
                      {instance.instanceName || 'Slot Disponível'}
                    </h3>

                    <div className="h-6 mt-1">
                      {instance.phoneNumber && instance.status !== 'empty' ? (
                        <p className="text-sm text-muted-foreground/90 font-mono truncate flex items-center gap-1.5">
                          <Smartphone className="w-3.5 h-3.5 opacity-50" />
                          {instance.phoneNumber}
                        </p>
                      ) : (
                        <p className="text-sm text-muted-foreground/50 italic">
                          Nenhum número vinculado
                        </p>
                      )}
                    </div>
                  </div>

                  <div
                    className={cn(
                      'absolute inset-x-0 bottom-0 h-1 transition-all duration-500',
                      instance.status === 'connected'
                        ? 'bg-gradient-to-r from-emerald-500 to-transparent'
                        : instance.status === 'disconnected'
                          ? 'bg-gradient-to-r from-amber-500 to-transparent'
                          : instance.status === 'initializing'
                            ? 'bg-gradient-to-r from-blue-500 to-transparent'
                            : 'bg-transparent',
                    )}
                  />

                  {instance.status === 'disconnected' && (
                    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-20">
                      <Button
                        variant="outline"
                        className="border-amber-500/50 text-amber-400 hover:bg-amber-500/20"
                      >
                        Escanear QR Code
                      </Button>
                    </div>
                  )}
                  {instance.status === 'empty' && (
                    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-20">
                      <Button
                        variant="outline"
                        className="border-blue-500/50 text-blue-400 hover:bg-blue-500/20"
                      >
                        Configurar Instância
                      </Button>
                    </div>
                  )}
                </div>
              )
            })}
      </div>
      <WhatsAppModal
        instance={selectedInstance}
        open={!!selectedInstance}
        onOpenChange={(open) => !open && setSelectedInstance(null)}
        onRefresh={loadData}
      />
    </div>
  )
}
