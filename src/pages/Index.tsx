import { useState } from 'react'
import { useAppData } from '@/hooks/use-app-data'
import { StatCard } from '@/components/StatCard'
import { cn } from '@/lib/utils'
import { QueueList } from '@/components/QueueList'
import { EditModal } from '@/components/EditModal'
import { DispatchControl } from '@/components/DispatchControl'
import { AddPatientModal } from '@/components/AddPatientModal'
import { PatientQueue } from '@/types'
import { useToast } from '@/hooks/use-toast'
import { Send, Clock, Layers, Loader2, Activity, UserPlus, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
  const { items, config, loading, updateQueueItem, toggleSystemPause, refetch } = useAppData(['queued', 'sending'])
  const { toast } = useToast()

  const [editingItem, setEditingItem] = useState<PatientQueue | null>(null)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [cancelId, setCancelId] = useState<string | null>(null)

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
      {/* ── Centro de Controle (Start/Pause) ── */}
      <DispatchControl config={config} onToggle={toggleSystemPause} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
          title="Cadência do Sistema"
          value={`${config?.safe_cadence_delay || 0}s`}
          icon={<Clock className="w-6 h-6" />}
          trend="Delay de segurança"
          trendUp={true}
        />
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-2xl font-heading font-semibold tracking-tight text-slate-100">
              Supervisão de Lotes
            </h2>
            <p className="text-sm text-muted-foreground">
              Monitoramento e controle granular de procedimentos agendados.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={loading}
            className="hidden sm:flex items-center gap-2 text-[10px] font-mono text-blue-400 bg-blue-400/10 px-4 py-2 rounded-full border border-blue-400/20 uppercase tracking-widest hover:bg-blue-400/20 transition-all shadow-[0_0_15px_rgba(59,130,246,0.15)]"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
            Atualizar Agora
          </Button>
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

      <AddPatientModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={refetch}
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
      {/* ── Floater: Botão Adicionar Paciente ── */}
      <div className="fixed bottom-8 right-8 z-50">
        <Button
          onClick={() => setIsAddModalOpen(true)}
          className="h-14 w-14 rounded-full bg-blue-600 hover:bg-blue-500 shadow-[0_0_20px_rgba(37,99,235,0.4)] animate-in zoom-in slide-in-from-bottom-5 duration-500 p-0"
        >
          <UserPlus className="w-6 h-6 text-white" />
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-4 w-4 bg-blue-500" />
          </span>
        </Button>
      </div>
    </div>
  )
}
