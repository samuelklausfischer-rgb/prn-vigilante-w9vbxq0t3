import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { SendListStatus, SendListSummary, WhatsAppInstance } from '@/types'

type EditSendListDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  list: SendListSummary | null
  instances: WhatsAppInstance[]
  loading?: boolean
  onSave: (payload: {
    name: string
    notes: string | null
    instanceId: string | null
    status: SendListStatus
  }) => Promise<void>
}

const statusOptions: Array<{ value: SendListStatus; label: string }> = [
  { value: 'draft', label: 'Rascunho' },
  { value: 'queued', label: 'Na fila' },
  { value: 'in_progress', label: 'Em andamento' },
  { value: 'completed', label: 'Concluida' },
  { value: 'cancelled', label: 'Cancelada' },
]

export function EditSendListDialog({
  open,
  onOpenChange,
  list,
  instances,
  loading = false,
  onSave,
}: EditSendListDialogProps) {
  const [name, setName] = useState('')
  const [notes, setNotes] = useState('')
  const [status, setStatus] = useState<SendListStatus>('queued')
  const [instanceId, setInstanceId] = useState('none')

  const connectedInstances = useMemo(
    () => instances.filter((instance) => instance.status === 'connected'),
    [instances],
  )

  useEffect(() => {
    if (!open || !list) return

    setName(list.name || '')
    setNotes(list.notes || '')
    setStatus(list.status)
    setInstanceId(list.locked_instance_id || 'none')
  }, [open, list])

  const handleClose = () => {
    if (loading) return
    onOpenChange(false)
  }

  const handleSubmit = async () => {
    if (!name.trim()) return

    await onSave({
      name: name.trim(),
      notes: notes.trim() || null,
      instanceId: instanceId === 'none' ? null : instanceId,
      status,
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg border-white/10 bg-card rounded-2xl">
        <DialogHeader>
          <DialogTitle>Editar lista</DialogTitle>
          <DialogDescription>
            Atualize o nome da lista, o canal responsavel e as observacoes operacionais.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs text-slate-300">Nome da lista</label>
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ex: Whats 47 | 03/04/2026"
              className="bg-black/30 border-white/10"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs text-slate-300">WhatsApp responsavel</label>
            <Select value={instanceId} onValueChange={setInstanceId}>
              <SelectTrigger className="bg-black/30 border-white/10 text-white">
                <SelectValue placeholder="Selecione um canal" />
              </SelectTrigger>
              <SelectContent className="bg-[#1a1b1e] border-white/10 text-white">
                <SelectItem value="none">Sem canal vinculado</SelectItem>
                {connectedInstances.map((instance) => (
                  <SelectItem key={instance.id} value={instance.id}>
                    {instance.instanceName || 'Canal sem nome'}
                    {instance.phoneNumber ? ` (${instance.phoneNumber})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-xs text-slate-300">Status da lista</label>
            <Select value={status} onValueChange={(value) => setStatus(value as SendListStatus)}>
              <SelectTrigger className="bg-black/30 border-white/10 text-white">
                <SelectValue placeholder="Selecione um status" />
              </SelectTrigger>
              <SelectContent className="bg-[#1a1b1e] border-white/10 text-white">
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-xs text-slate-300">Observacoes</label>
            <Textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Observacoes operacionais da lista"
              className="min-h-[100px] bg-black/30 border-white/10"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !name.trim()}>
            {loading ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
