import { useState, useEffect } from 'react'
import { WhatsAppInstance } from '@/types'
import { evolutionApi } from '@/services/evolution'
import { WhatsAppModal } from '@/components/WhatsAppModal'
import { Smartphone, RefreshCw, PlusCircle, CheckCircle2, AlertCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export default function WhatsAppSettings() {
  const [instances, setInstances] = useState<WhatsAppInstance[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedInstance, setSelectedInstance] = useState<WhatsAppInstance | null>(null)

  const loadData = async () => {
    setLoading(true)
    try {
      const data = await evolutionApi.getInstances()
      setInstances(data)
    } catch (e) {
      console.error('Failed to load instances', e)
    }
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  // Auto update selected instance reference if it changes in the background
  useEffect(() => {
    if (selectedInstance) {
      const updated = instances.find((i) => i.slotId === selectedInstance.slotId)
      if (updated && updated.status !== selectedInstance.status) {
        setSelectedInstance(updated)
      }
    }
  }, [instances, selectedInstance])

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'connected':
        return {
          label: 'Conectado',
          badge: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
          icon: <CheckCircle2 className="w-5 h-5 text-emerald-500" />,
          border: 'border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.05)]',
        }
      case 'disconnected':
        return {
          label: 'Aguardando QR',
          badge: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
          icon: <AlertCircle className="w-5 h-5 text-amber-500" />,
          border: 'border-amber-500/20',
        }
      default:
        return {
          label: 'Disponível',
          badge: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
          icon: <PlusCircle className="w-5 h-5 text-slate-500" />,
          border: 'border-dashed border-white/10 hover:border-white/20',
        }
    }
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card/50 p-6 rounded-2xl border border-white/5 backdrop-blur-md">
        <div>
          <h2 className="text-xl font-heading font-semibold flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-blue-400" />
            Canais de Comunicação
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie até 3 instâncias de WhatsApp simultâneas através da Evolution API.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={loadData}
          disabled={loading}
          className="rounded-xl border-white/10 hover:bg-white/5"
        >
          <RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} />
          Sincronizar
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {instances.length === 0 && loading
          ? Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-40 rounded-2xl bg-card/30 border border-white/5 animate-pulse"
              />
            ))
          : instances.map((instance) => {
              const display = getStatusDisplay(instance.status)
              return (
                <div
                  key={instance.slotId}
                  onClick={() => setSelectedInstance(instance)}
                  className={cn(
                    'group relative p-6 rounded-2xl bg-card/50 backdrop-blur-sm cursor-pointer transition-all duration-300 hover:bg-card/80 hover:-translate-y-1',
                    'border',
                    display.border,
                  )}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 rounded-xl bg-background/50 border border-white/5 group-hover:scale-110 transition-transform">
                      {display.icon}
                    </div>
                    <Badge variant="outline" className={display.badge}>
                      {display.label}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">
                      Slot {instance.slotId}
                    </p>
                    <h3
                      className={cn(
                        'text-lg font-semibold truncate',
                        instance.status === 'empty'
                          ? 'text-muted-foreground/50'
                          : 'text-foreground',
                      )}
                    >
                      {instance.instanceName || 'Vazio'}
                    </h3>
                  </div>

                  {instance.status === 'disconnected' && (
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-background/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-6">
                      <span className="text-sm font-medium text-amber-400 drop-shadow-md">
                        Clique para ler o QR Code
                      </span>
                    </div>
                  )}
                  {instance.status === 'empty' && (
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-background/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-6">
                      <span className="text-sm font-medium text-blue-400 drop-shadow-md">
                        Configurar Instância
                      </span>
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
