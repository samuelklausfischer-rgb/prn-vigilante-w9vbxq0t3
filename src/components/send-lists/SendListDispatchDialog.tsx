import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import type { CampaignKind, PatientQueue, SendListSummary } from '@/types'
import { getCampaignDefaultMessage } from '@shared/templates/operational-messages'

type DispatchMode = 'confirmation' | 'post_attendance'

type SendListDispatchDialogProps = {
  mode: DispatchMode
  open: boolean
  onOpenChange: (open: boolean) => void
  list: SendListSummary | null
  patients: PatientQueue[]
  loading?: boolean
  onConfirm: (message: string) => Promise<void>
}

const modeConfig: Record<DispatchMode, { title: string; description: string; badge: string; badgeClass: string }> = {
  confirmation: {
    title: 'Confirmacao de agendamento',
    description: 'Envie mensagem de confirmacao para todos os pacientes elegiveis desta lista.',
    badge: 'Confirmacao',
    badgeClass: 'border-blue-500/40 text-blue-300',
  },
  post_attendance: {
    title: 'Pos-atendimento',
    description: 'Envie mensagem de pos-atendimento para pacientes com exame realizado ou vencido.',
    badge: 'Pos-atendimento',
    badgeClass: 'border-emerald-500/40 text-emerald-300',
  },
}

function countEligible(patients: PatientQueue[], mode: DispatchMode): number {
  return patients.filter((p) => {
    if (p.status === 'cancelled') return false
    if (!p.phone_number) return false
    if (mode === 'post_attendance' && p.data_exame) {
      const today = new Date().toISOString().slice(0, 10)
      if (p.data_exame > today) return false
    }
    return true
  }).length
}

export function SendListDispatchDialog({
  mode,
  open,
  onOpenChange,
  list,
  patients,
  loading = false,
  onConfirm,
}: SendListDispatchDialogProps) {
  const [message, setMessage] = useState('')

  const config = modeConfig[mode]
  const eligibleCount = list && patients.length > 0 ? countEligible(patients, mode) : 0

  useEffect(() => {
    if (!open) return
    setMessage(getCampaignDefaultMessage(mode as CampaignKind))
  }, [open, mode])

  const handleClose = () => {
    if (loading) return
    onOpenChange(false)
  }

  const handleSubmit = async () => {
    if (!message.trim()) return
    await onConfirm(message.trim())
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg border-white/10 bg-card rounded-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle>{config.title}</DialogTitle>
            <Badge variant="outline" className={config.badgeClass}>{config.badge}</Badge>
          </div>
          <DialogDescription>
            {config.description}
          </DialogDescription>
        </DialogHeader>

        {list && (
          <div className="rounded-lg border border-white/10 bg-black/20 p-3 text-xs text-slate-300 flex flex-wrap gap-x-4 gap-y-1">
            <span><strong className="text-white">Lista:</strong> {list.name}</span>
            <span><strong className="text-white">Canal:</strong> {list.locked_instance_name || 'Nao definido'}</span>
            <span><strong className="text-white">Pacientes:</strong> {eligibleCount} elegivel(is) de {patients.length} total</span>
          </div>
        )}

        <div className="space-y-2">
          <label className="text-xs text-slate-300">Mensagem (editavel)</label>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Digite a mensagem..."
            className="min-h-[140px] bg-black/30 border-white/10"
            disabled={loading}
          />
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || !message.trim() || eligibleCount === 0}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {loading ? 'Enviando...' : `Enviar lista (${eligibleCount})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
