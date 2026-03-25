import { useState, useEffect } from 'react'
import { useAppData } from '@/hooks/use-app-data'
import { StatCard } from '@/components/StatCard'
import { QueueList } from '@/components/QueueList'
import { EditModal } from '@/components/EditModal'
import { PatientQueue } from '@/types'
import { useToast } from '@/hooks/use-toast'
import { Clock, Layers, Loader2, Activity, Smartphone } from 'lucide-react'
import { evolutionApi } from '@/services/evolution'
import { supabase } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

export default function Index() {
  const { items, config, loading, updateQueueItem } = useAppData(['queued', 'sending'])
  const { toast } = useToast()

  const [editingItem, setEditingItem] = useState<PatientQueue | null>(null)
  const [cancelId, setCancelId] = useState<string | null>(null)
  const [connectedInstances, setConnectedInstances] = useState(0)

  useEffect(() => {
    let mounted = true
    const fetchInstances = async () => {
      try {
        const data = await evolutionApi.getInstances()
        if (mounted) {
          setConnectedInstances(data.filter((i) => i.status === 'connected').length)
        }
      } catch (e) {
        console.error('Falha ao carregar instâncias', e)
      }
    }

    fetchInstances()

    const sub = supabase
      .channel('index-instances')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'whatsapp_instances' }, () => {
        if (mounted) fetchInstances()
      })
      .subscribe()

    return () => {
      mounted = false
      supabase.removeChannel(sub)
    }
  }, [])

  const pendingCount = items.filter((i) => i.status === 'queued').length
  const sendingCount = items.filter((i) => i.status === 'sending').length

  const handleToggleApprove = async (id: string, current: boolean) => {
    const success = await updateQueueItem(id, { is_approved: !current })
    if (success) {
      toast({
        title: !current ? 'Envio Liberado' : 'Envio Retido',
        description: 'Status atualizado no sistema central.',
      })
    }
  }

  const handleSaveEdit = async (id: string, updates: Partial<PatientQueue>) => {
    const success = await updateQueueItem(id, updates)
    if (success) {
      toast({
        title: 'Parâmetros Atualizados',
        description: 'As modificações foram aplicadas ao lote do paciente.',
      })
    }
    return success
  }

  const handleConfirmCancel = async () => {
    if (!cancelId) return
    const success = await updateQueueItem(cancelId, {
      status: 'cancelled',
      notes: 'Cancelado pelo operador via painel de controle.',
    })
    if (success) {
      toast({
        title: 'Operação Abortada',
        description: 'O envio foi permanentemente suspenso e arquivado.',
      })
    }
    setCancelId(null)
  }

  if (loading && items.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-fade-in-up pb-12">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Volume em Espera"
          value={pendingCount.toString()}
          icon={<Layers className="w-6 h-6" />}
          trend={pendingCount > 10 ? 'Alto tráfego' : 'Estável'}
          trendUp={false}
          alert={pendingCount > 50}
        />
        <StatCard
          title="Execução Ativa"
          value={sendingCount.toString()}
          icon={<Activity className="w-6 h-6" />}
          className="border-blue-500/20 bg-blue-500/5 shadow-[0_0_30px_rgba(59,130,246,0.1)]"
        />
        <StatCard
          title="Instâncias Ativas"
          value={`${connectedInstances}/5`}
          icon={<Smartphone className="w-6 h-6" />}
          trend={connectedInstances === 0 ? 'Nenhuma conexão' : 'Operacional'}
          alert={connectedInstances === 0}
          className={cn(
            connectedInstances > 0
              ? 'border-emerald-500/20 bg-emerald-500/5 shadow-[0_0_30px_rgba(16,185,129,0.1)]'
              : '',
          )}
        />
        <StatCard
          title="Cadência do Sistema"
          value={`${config?.safe_cadence_delay || 0}s`}
          icon={<Clock className="w-6 h-6" />}
          trend="Delay de segurança"
          trendUp={true}
        />
      </div>

      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-2xl font-heading font-semibold tracking-tight text-slate-100">
              Supervisão de Lotes
            </h2>
            <p className="text-sm text-muted-foreground">
              Monitoramento e controle granular de procedimentos agendados.
            </p>
          </div>
          <span className="inline-flex items-center gap-2 text-[10px] font-mono text-emerald-400 bg-emerald-400/10 px-3 py-1.5 rounded-full border border-emerald-400/20 uppercase tracking-widest shadow-[0_0_15px_rgba(16,185,129,0.15)] self-start sm:self-auto">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            Sync Ativo
          </span>
        </div>

        <QueueList
          items={items}
          onToggleApprove={handleToggleApprove}
          onEdit={setEditingItem}
          onCancel={setCancelId}
        />
      </div>

      <EditModal
        item={editingItem}
        open={!!editingItem}
        onOpenChange={(o) => !o && setEditingItem(null)}
        onSave={handleSaveEdit}
      />

      <AlertDialog open={!!cancelId} onOpenChange={(o) => !o && setCancelId(null)}>
        <AlertDialogContent className="bg-[#0f1115] rounded-2xl border-red-500/30 shadow-[0_0_40px_rgba(239,68,68,0.15)]">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-heading text-xl">
              Abortar Envio Definitivamente?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Esta ação removerá a mensagem da fila ativa e a enviará para o histórico com status
              "Cancelado". Os dados não serão transmitidos ao paciente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel className="rounded-xl border-white/10 hover:bg-white/5">
              Manter na Fila
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmCancel}
              className="bg-red-500/20 text-red-500 hover:bg-red-500/30 border border-red-500/50 rounded-xl"
            >
              Sim, Abortar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
