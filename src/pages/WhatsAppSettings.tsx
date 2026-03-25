import { useState, useEffect } from 'react'
import { WhatsAppInstance } from '@/types'
import { evolutionApi } from '@/services/evolution'
import { WhatsAppModal } from '@/components/WhatsAppModal'
import { WhatsAppSlotCard } from '@/components/WhatsAppSlotCard'
import { RefreshCw, AlertCircle, Activity, Wifi, PlusCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'

export default function WhatsAppSettings() {
  const [instances, setInstances] = useState<WhatsAppInstance[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [selectedInstance, setSelectedInstance] = useState<WhatsAppInstance | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const { toast } = useToast()

  /**
   * Carrega instâncias direto da Evolution API (fonte da verdade).
   * Não depende mais de "slots fixos" no banco — carrega o que existir.
   */
  const loadData = async () => {
    try {
      setError(null)

      // Chama a Evolution API diretamente para pegar os dados reais
      const syncResult = await evolutionApi.syncWithWebhook()

      if (!syncResult.success) {
        // Se a Evolution não respondeu, tenta carregar do cache (banco)
        console.warn('Evolution sync failed, loading from cache:', syncResult.message)
      }

      // Carrega do banco (que agora está sincronizado ou é o cache)
      const data = await evolutionApi.getInstances()

      // Filtra apenas instâncias reais (que têm nome) — nada de slots vazios fantasma
      const realInstances = data.filter((i) => i.instanceName !== null)
      setInstances(realInstances)

      return realInstances
    } catch (e: any) {
      setError('Falha ao carregar as instâncias. Verifique se o Docker está ativo.')
      return null
    }
  }

  const handleSync = async (silent = false) => {
    setSyncing(true)
    try {
      const result = await evolutionApi.syncWithWebhook()
      if (result.success) {
        if (!silent) toast({ description: 'Instâncias sincronizadas com sucesso.' })
        // Recarrega os dados do banco atualizado
        const data = await evolutionApi.getInstances()
        const realInstances = data.filter((i) => i.instanceName !== null)
        setInstances(realInstances)
      } else {
        if (!silent)
          toast({
            description: result.message || 'Erro ao sincronizar.',
            variant: 'destructive',
          })
      }
    } catch (e: any) {
      if (!silent)
        toast({
          description: 'Erro de conexão com a Evolution API.',
          variant: 'destructive',
        })
    }
    setSyncing(false)
  }

  useEffect(() => {
    let mounted = true
    const init = async () => {
      setLoading(true)
      await loadData()
      if (!mounted) return
      setLoading(false)
    }

    init()

    // Escuta mudanças no banco (realtime) para atualizar a UI automaticamente
    const sub = supabase
      .channel('wa-instances')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'whatsapp_instances' },
        async () => {
          if (!mounted) return
          const data = await evolutionApi.getInstances()
          const realInstances = data.filter((i) => i.instanceName !== null)
          setInstances(realInstances)
        },
      )
      .subscribe()

    return () => {
      mounted = false
      supabase.removeChannel(sub)
    }
  }, [])

  // Atualiza o modal se o estado da instância selecionada mudar em tempo real
  useEffect(() => {
    if (selectedInstance) {
      const updated = instances.find((i) => i.slotId === selectedInstance.slotId)
      if (updated && JSON.stringify(updated) !== JSON.stringify(selectedInstance)) {
        setSelectedInstance(updated)
      }
    }
  }, [instances, selectedInstance])

  // Calcula o próximo slotId disponível para criação
  const nextSlotId =
    instances.length > 0 ? Math.max(...instances.map((i) => i.slotId)) + 1 : 1

  // Instância "fantasma" usada apenas para abrir o modal de criação
  const emptyInstance: WhatsAppInstance = {
    slotId: nextSlotId,
    instanceName: null,
    status: 'empty',
    phoneNumber: null,
  }

  // Para calcular métricas do header
  const connectedCount = instances.filter((i) => i.status === 'connected').length
  const totalCount = instances.length

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card/60 p-6 rounded-2xl border border-white/10 backdrop-blur-xl shadow-2xl relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-transparent to-transparent pointer-events-none" />
        <div className="relative z-10">
          <h2 className="text-2xl font-heading font-bold flex items-center gap-3 text-white">
            <Activity className="w-6 h-6 text-blue-400" /> Canais de Comunicação
          </h2>
          <p className="text-sm text-muted-foreground mt-1.5 flex items-center gap-2">
            <Wifi className="w-4 h-4 opacity-70" />
            {totalCount === 0
              ? 'Nenhuma instância encontrada. Sincronize ou crie uma nova.'
              : `${connectedCount} de ${totalCount} instância${totalCount > 1 ? 's' : ''} conectada${connectedCount > 1 ? 's' : ''}.`}
          </p>
        </div>
        <div className="flex gap-3 z-10">
          <Button
            onClick={() => {
              setSelectedInstance(emptyInstance)
              setShowCreateModal(true)
            }}
            className="rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.3)]"
          >
            <PlusCircle className="w-4 h-4 mr-2" />
            Novo Canal
          </Button>
          <Button
            onClick={() => handleSync(false)}
            disabled={loading || syncing}
            variant="outline"
            className="rounded-xl border-white/10 hover:bg-white/5 text-white"
          >
            <RefreshCw
              className={cn('w-4 h-4 mr-2', (loading || syncing) && 'animate-spin')}
            />
            {syncing ? 'Sincronizando...' : 'Sincronizar'}
          </Button>
        </div>
      </div>

      {/* Erro */}
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

      {/* Estado Vazio (nenhuma instância) */}
      {!error && !loading && instances.length === 0 && (
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-8 flex flex-col items-center justify-center text-center gap-4 animate-in fade-in">
          <div className="w-16 h-16 rounded-full bg-blue-500/15 flex items-center justify-center">
            <Wifi className="w-8 h-8 text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-blue-300">Nenhuma Instância Encontrada</h3>
            <p className="text-sm text-blue-400/70 mt-1 max-w-md">
              Clique em <strong>"Novo Canal"</strong> para criar sua primeira instância ou em{' '}
              <strong>"Sincronizar"</strong> para importar instâncias existentes da Evolution API.
            </p>
          </div>
        </div>
      )}

      {/* Grid de Instâncias (DINÂMICO — sem limite) */}
      {!error && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading && instances.length === 0
            ? Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="h-56 rounded-2xl bg-card/30 border border-white/5 animate-pulse"
                />
              ))
            : instances.map((instance) => (
                <WhatsAppSlotCard
                  key={`${instance.instanceName}-${instance.slotId}`}
                  instance={instance}
                  onClick={() => setSelectedInstance(instance)}
                />
              ))}
        </div>
      )}

      {/* Modal de Gerenciamento / Criação */}
      <WhatsAppModal
        instance={selectedInstance}
        open={!!selectedInstance}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedInstance(null)
            setShowCreateModal(false)
          }
        }}
        onRefresh={async () => {
          await loadData()
        }}
      />
    </div>
  )
}
