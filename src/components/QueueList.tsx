import { useState, useEffect, useRef } from 'react'
import { PatientQueue } from '@/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { InfoButton } from '@/components/InfoButton'
import { InfoPopup } from '@/components/InfoPopup'
import type { PatientInfo } from '@/types/patient-info'
import {
  MessageSquare,
  Edit2,
  Ban,
  Clock,
  Phone,
  GripVertical,
  Calendar,
  Stethoscope,
  FileText,
} from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { updateQueueOrders } from '@/services/data'
import { formatDataExameBr } from '@/lib/utils/data-exame'

function IconBrandWhatsapp({ className, ...props }: React.ComponentProps<'svg'>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <path d="M3 21l1.65 -3.8a9 9 0 1 1 3.4 2.9l-5.05 .9" />
      <path d="M9 10a.5 .5 0 0 0 1 0v-1a.5 .5 0 0 0 -1 0v1a5 5 0 0 0 5 5h1a.5 .5 0 0 0 0 -1h-1a.5 .5 0 0 0 0 1" />
    </svg>
  )
}

const formatTimeStr = (timeStr?: string | null) => {
  if (!timeStr) return '--:--'
  return timeStr.substring(0, 5)
}

const formatDuration = (timeStr?: string | null) => {
  if (!timeStr) return '-- min'

  if (!timeStr.includes(':')) {
    const minutesOnly = Number.parseInt(timeStr.replace(/\D/g, ''), 10)
    return Number.isNaN(minutesOnly) ? '-- min' : `${minutesOnly} min`
  }

  const parts = timeStr.split(':').map((part) => Number.parseInt(part, 10))
  const [hours = 0, minutes = 0] = parts

  if (Number.isNaN(hours) && Number.isNaN(minutes)) {
    return '-- min'
  }

  if (hours > 0) {
    return `${hours}h ${minutes}min`
  }

  return `${minutes} min`
}

interface QueueListProps {
  items: PatientQueue[]
  onToggleApprove: (id: string, current: boolean) => void
  onEdit: (item: PatientQueue) => void
  onCancel: (id: string) => void
}

const toPatientInfo = (item: PatientQueue): PatientInfo => ({
  id: item.id,
  patient_name: item.patient_name,
  phone_number: item.phone_number,
  Data_nascimento: item.Data_nascimento ?? null,
  procedimentos: item.procedimentos ?? null,
  time_proce: item.time_proce ?? null,
  horario_inicio: item.horario_inicio ?? null,
  horario_final: item.horario_final ?? null,
  message_body: item.message_body,
  notes: item.notes,
  status: item.status,
  is_approved: item.is_approved,
  send_after: item.send_after,
  created_at: item.created_at,
  updated_at: item.updated_at,
  queue_order: item.queue_order,
})

export function QueueList({ items, onToggleApprove, onEdit, onCancel }: QueueListProps) {
  const [localItems, setLocalItems] = useState<PatientQueue[]>([])
  const dragItem = useRef<number | null>(null)
  const dragOverItem = useRef<number | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [infoPatient, setInfoPatient] = useState<PatientInfo | null>(null)

  useEffect(() => {
    if (!isDragging) {
      setLocalItems(items)
    }
  }, [items, isDragging])

  const handleDragStart = (e: React.DragEvent, position: number) => {
    dragItem.current = position
    setIsDragging(true)
    e.dataTransfer.effectAllowed = 'move'

    setTimeout(() => {
      const el = document.getElementById(`queue-item-${localItems[position].id}`)
      if (el) el.classList.add('opacity-40', 'scale-[0.98]')
    }, 0)
  }

  const handleDragEnter = (e: React.DragEvent, position: number) => {
    e.preventDefault()
    dragOverItem.current = position

    if (dragItem.current !== null && dragItem.current !== position) {
      const newList = [...localItems]
      const draggedItem = newList[dragItem.current]
      const targetItem = newList[position]

      if (draggedItem.status === 'queued' && targetItem.status === 'queued') {
        newList.splice(dragItem.current, 1)
        newList.splice(position, 0, draggedItem)
        dragItem.current = position
        setLocalItems(newList)
      }
    }
  }

  const handleDragEnd = async () => {
    if (dragItem.current !== null) {
      const el = document.getElementById(`queue-item-${localItems[dragItem.current].id}`)
      if (el) el.classList.remove('opacity-40', 'scale-[0.98]')
    }

    dragItem.current = null
    dragOverItem.current = null
    setIsDragging(false)

    const queuedItems = localItems.filter((i) => i.status === 'queued')
    const updates = queuedItems.map((item, index) => ({
      id: item.id,
      queue_order: index + 1,
    }))

    if (updates.length > 0) {
      await updateQueueOrders(updates)
    }
  }

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'queued':
        return {
          color: 'text-amber-400',
          bg: 'bg-amber-400/10',
          border: 'border-amber-400/20',
          dot: 'bg-amber-400',
          label: 'Aguardando',
        }
      case 'sending':
        return {
          color: 'text-blue-400',
          bg: 'bg-blue-400/10',
          border: 'border-blue-400/20',
          dot: 'bg-blue-400 animate-pulse',
          label: 'Processando',
        }
      case 'delivered':
        return {
          color: 'text-emerald-400',
          bg: 'bg-emerald-400/10',
          border: 'border-emerald-400/20',
          dot: 'bg-emerald-400',
          label: 'Entregue',
        }
      case 'failed':
        return {
          color: 'text-red-400',
          bg: 'bg-red-400/10',
          border: 'border-red-400/20',
          dot: 'bg-red-400',
          label: 'Falha',
        }
      case 'cancelled':
        return {
          color: 'text-slate-400',
          bg: 'bg-slate-400/10',
          border: 'border-slate-400/20',
          dot: 'bg-slate-400',
          label: 'Cancelado',
        }
      default:
        return {
          color: 'text-slate-400',
          bg: 'bg-slate-400/10',
          border: 'border-slate-400/20',
          dot: 'bg-slate-400',
          label: status,
        }
    }
  }

  const getWhatsAppLink = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, '')
    return `https://wa.me/55${cleanPhone}`
  }

  const firstQueuedIndex = localItems.findIndex((i) => i.status === 'queued' && i.is_approved)

  if (localItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground border border-dashed border-white/10 rounded-3xl bg-card/20 backdrop-blur-sm">
        <MessageSquare className="w-12 h-12 mb-4 opacity-20" />
        <p className="font-heading text-lg">Central de Envios Vazia</p>
        <p className="text-sm">Nenhum paciente aguardando processamento no momento.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {localItems.map((item, index) => {
        const isNext = index === firstQueuedIndex
        const statusCfg = getStatusConfig(item.status)
        const isEditable = item.status === 'queued'

        return (
          <div
            id={`queue-item-${item.id}`}
            key={item.id}
            draggable={isEditable}
            onDragStart={(e) => isEditable && handleDragStart(e, index)}
            onDragEnter={(e) => isEditable && handleDragEnter(e, index)}
            onDragEnd={handleDragEnd}
            onDragOver={(e) => e.preventDefault()}
            className={cn(
              'group relative flex flex-col lg:flex-row items-stretch gap-0 rounded-2xl transition-all duration-300',
              !isDragging && 'animate-fade-in-up',
              'bg-[#0f1115]/80 backdrop-blur-xl border overflow-hidden',
              isEditable ? 'cursor-grab active:cursor-grabbing hover:bg-[#15181e]/90' : '',
              isNext
                ? 'border-amber-500/40 shadow-[0_0_20px_rgba(245,158,11,0.15)] z-10'
                : 'border-white/5 hover:border-white/20',
            )}
            style={{ animationDelay: !isDragging ? `${index * 40}ms` : '0ms' }}
          >
            {/* Drag Handle Area */}
            {isEditable && (
              <div className="hidden lg:flex w-8 items-center justify-center bg-black/20 border-r border-white/5 group-hover:bg-white/5 transition-colors">
                <GripVertical className="w-4 h-4 text-white/20 group-hover:text-white/60" />
              </div>
            )}

            <div className="flex-1 p-4 sm:p-5 min-w-0">
              <div className="flex flex-col gap-4 min-w-0">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between min-w-0">
                  <div className="min-w-0 flex-1 space-y-2 overflow-hidden">
                    <div className="flex flex-wrap items-center gap-2 min-w-0">
                      <h4 className="min-w-0 max-w-full truncate font-heading text-base font-semibold text-foreground sm:text-lg">
                        {item.patient_name}
                      </h4>
                      {isNext && (
                        <Badge className="max-w-full shrink-0 border-amber-500/30 bg-amber-500/10 text-[9px] uppercase tracking-wider text-amber-400 px-1.5 py-0">
                          Próximo da Fila
                        </Badge>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 min-w-0">
                      <div
                        className={cn(
                          'flex min-w-0 items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide',
                          statusCfg.bg,
                          statusCfg.border,
                          statusCfg.color,
                        )}
                      >
                        <div className={cn('h-1.5 w-1.5 shrink-0 rounded-full', statusCfg.dot)} />
                        <span className="truncate">{statusCfg.label}</span>
                      </div>

                      <div className="flex min-w-0 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11px] text-slate-300">
                        <Phone className="h-3.5 w-3.5 shrink-0 text-blue-400/80" />
                        <span className="truncate">{item.phone_number}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 min-w-0 self-start sm:pl-3">
                    <span className="truncate text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                      {item.is_approved ? 'Liberado' : 'Retido'}
                    </span>
                    <Switch
                      checked={item.is_approved}
                      onCheckedChange={(checked) => {
                        setLocalItems((prev) =>
                          prev.map((i) => (i.id === item.id ? { ...i, is_approved: checked } : i)),
                        )
                        onToggleApprove(item.id, item.is_approved)
                      }}
                      disabled={!isEditable}
                      className={cn(
                        'h-5 w-9 shrink-0 data-[state=checked]:bg-emerald-500 data-[state=unchecked]:bg-slate-700',
                      )}
                    />
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/20 px-3.5 py-3 min-w-0">
                  <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground/60">
                    <Stethoscope className="h-3.5 w-3.5 shrink-0" />
                    Resumo do Atendimento
                  </div>

                  <p className="min-w-0 overflow-hidden text-sm font-medium leading-relaxed text-slate-100 line-clamp-2 break-words">
                    {item.procedimentos || (
                      <span className="font-normal italic text-slate-500">Não informado</span>
                    )}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2 min-w-0">
                    <div className="flex min-w-0 items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-mono text-emerald-300">
                      <Clock className="h-3.5 w-3.5 shrink-0 text-emerald-400/80" />
                      <span className="text-muted-foreground">Inicio</span>
                      <span className="truncate">{formatTimeStr(item.horario_inicio)}</span>
                    </div>

                    <div className="flex min-w-0 items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-xs font-mono text-amber-300">
                      <Clock className="h-3.5 w-3.5 shrink-0 text-amber-400/80" />
                      <span className="text-muted-foreground">Duracao</span>
                      <span className="truncate">{formatDuration(item.time_proce)}</span>
                    </div>

                    <div className="flex min-w-0 items-center gap-1.5 rounded-full border border-sky-500/20 bg-sky-500/10 px-2.5 py-1 text-xs font-mono text-sky-200">
                      <Calendar className="h-3.5 w-3.5 shrink-0 text-sky-400/80" />
                      <span className="text-muted-foreground">Disparo</span>
                      <span className="truncate">{format(new Date(item.send_after), 'dd/MM/yyyy', { locale: ptBR })}</span>
                    </div>

                    {item.data_exame && (
                      <div className="flex min-w-0 items-center gap-1.5 rounded-full border border-fuchsia-500/20 bg-fuchsia-500/10 px-2.5 py-1 text-xs font-mono text-fuchsia-200">
                        <Calendar className="h-3.5 w-3.5 shrink-0 text-fuchsia-400/80" />
                        <span className="text-muted-foreground">Exame</span>
                        <span className="truncate">{formatDataExameBr(item.data_exame)}</span>
                      </div>
                    )}

                    <div
                      className={cn(
                        'flex min-w-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs',
                        item.message_body
                          ? 'border-blue-500/20 bg-blue-500/10 text-blue-200'
                          : 'border-white/10 bg-white/[0.04] text-slate-400',
                      )}
                    >
                      <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{item.message_body ? 'Mensagem personalizada' : 'Mensagem padrao'}</span>
                    </div>
                  </div>
                </div>

                <div className="flex min-w-0 flex-col gap-3 border-t border-white/10 pt-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 space-y-1">
                    <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground/60">
                      Disparo Programado
                    </div>
                    <div className="truncate text-xs font-mono text-slate-300">
                      {format(new Date(item.send_after), 'dd/MM/yyyy', { locale: ptBR })}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-white/6 bg-black/40 p-1 min-w-0 sm:justify-end">
                    <InfoPopup
                      patient={toPatientInfo(item)}
                      open={infoPatient?.id === item.id}
                      onOpenChange={(open) => setInfoPatient(open ? toPatientInfo(item) : null)}
                    >
                      <InfoButton
                        className="h-8 w-8 shrink-0"
                        title="Ver detalhes completos"
                        icon={<FileText className="w-3.5 h-3.5" />}
                      />
                    </InfoPopup>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 text-emerald-400/70 hover:text-emerald-400 hover:bg-emerald-400/10"
                      asChild
                    >
                      <a
                        href={getWhatsAppLink(item.phone_number)}
                        target="_blank"
                        rel="noreferrer"
                        title="Abrir no WhatsApp"
                      >
                        <IconBrandWhatsapp className="w-3.5 h-3.5" />
                      </a>
                    </Button>

                    {isEditable && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0 text-slate-400 hover:text-white hover:bg-white/10"
                          onClick={() => onEdit(item)}
                          title="Editar/Intervir"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0 text-red-400/70 hover:text-red-400 hover:bg-red-400/10"
                          onClick={() => onCancel(item.id)}
                          title="Cancelar Envio Definitivamente"
                        >
                          <Ban className="w-3.5 h-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
         )
       })}
      </div>
    )
}
