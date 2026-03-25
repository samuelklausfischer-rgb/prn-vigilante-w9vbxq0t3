import { Archive, ArrowUpCircle, CheckCircle2, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface BulkActionsBarProps {
  selectedCount: number
  onReturnToQueue: () => void
  onMarkCompleted: () => void
  onArchive: () => void
  onDelete: () => void
  onClearSelection: () => void
}

export function BulkActionsBar({
  selectedCount,
  onReturnToQueue,
  onMarkCompleted,
  onArchive,
  onDelete,
  onClearSelection,
}: BulkActionsBarProps) {
  return (
    <div className="sticky bottom-4 z-30 rounded-2xl border border-blue-500/30 bg-slate-950/90 p-4 shadow-2xl backdrop-blur-xl">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="text-sm font-medium text-white">
          {selectedCount} paciente(s) selecionado(s)
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={onReturnToQueue}>
            <ArrowUpCircle className="mr-2 h-4 w-4" />
            Voltar para fila
          </Button>
          <Button variant="outline" size="sm" onClick={onMarkCompleted}>
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Concluir
          </Button>
          <Button variant="outline" size="sm" onClick={onArchive}>
            <Archive className="mr-2 h-4 w-4" />
            Arquivar
          </Button>
          <Button variant="destructive" size="sm" onClick={onDelete}>
            <Trash2 className="mr-2 h-4 w-4" />
            Excluir
          </Button>
          <Button variant="ghost" size="sm" onClick={onClearSelection}>
            <X className="mr-2 h-4 w-4" />
            Limpar
          </Button>
        </div>
      </div>
    </div>
  )
}
