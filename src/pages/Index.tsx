import { useState } from 'react'
import { useAppData } from '@/hooks/use-app-data'
import { StatCard } from '@/components/StatCard'
import { QueueList } from '@/components/QueueList'
import { EditModal } from '@/components/EditModal'
import { PatientQueue } from '@/types'
import { useToast } from '@/hooks/use-toast'
import { Send, Clock, Layers, Loader2 } from 'lucide-react'
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

  const pendingCount = items.filter((i) => i.status === 'queued').length
  const sendingCount = items.filter((i) => i.status === 'sending').length

  const handleToggleApprove = async (id: string, current: boolean) => {
    const success = await updateQueueItem(id, { is_approved: !current })
    if (success) {
      toast({
        title: !current ? 'Envio Liberado' : 'Envio Retido',
        description: 'Status atualizado com sucesso.',
      })
    }
  }

  const handleSaveEdit = async (id: string, updates: Partial<PatientQueue>) => {
    const success = await updateQueueItem(id, updates)
    if (success) {
      toast({ title: 'Mensagem Atualizada', description: 'As modificações foram salvas na fila.' })
    }
  }

  const handleConfirmCancel = async () => {
    if (!cancelId) return
    const success = await updateQueueItem(cancelId, {
      status: 'cancelled',
      notes: 'Cancelado pelo operador via painel',
    })
    if (success) {
      toast({
        title: 'Envio Cancelado',
        description: 'A mensagem foi movida para o arquivo morto.',
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
    <div className="space-y-8 animate-fade-in-up">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="Fila de Espera"
          value={pendingCount.toString()}
          icon={<Layers className="w-6 h-6" />}
          trend={pendingCount > 10 ? 'Alto volume' : 'Normal'}
          trendUp={false}
          alert={pendingCount > 50}
        />
        <StatCard
          title="Processando Agora"
          value={sendingCount.toString()}
          icon={<Send className="w-6 h-6" />}
          className="border-blue-500/20 bg-blue-500/5"
        />
        <StatCard
          title="Cadência de Segurança"
          value={`${config?.safe_cadence_delay || 0}s`}
          icon={<Clock className="w-6 h-6" />}
          trend="Delay entre disparos"
          trendUp={true}
        />
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-heading font-semibold">Painel de Triagem</h2>
          <span className="text-xs text-muted-foreground bg-card px-3 py-1 rounded-full border border-white/5">
            Atualização em tempo real
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
        <AlertDialogContent className="bg-card rounded-2xl border-red-500/20">
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar Envio Definitivamente?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação removerá a mensagem da fila ativa e a enviará para o Arquivo Morto com
              status "Cancelado". Esta ação não pode ser desfeita automaticamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Voltar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmCancel}
              className="bg-red-600 hover:bg-red-700 rounded-xl"
            >
              Sim, Cancelar Envio
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
