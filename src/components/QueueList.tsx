import { useState, useEffect, useRef } from 'react'
import { PatientQueue } from '@/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  MessageSquare,
  AlertCircle,
  Edit2,
  Ban,
  Clock,
  Phone,
  Send,
  GripVertical,
  Calendar,
  Stethoscope,
  Info,
  CheckCircle2,
} from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { updateQueueOrders } from '@/services/data'

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

const formatDOB = (dateStr?: string | null) => {
  if (!dateStr) return '--/--/----'
  const parts = dateStr.split('-')
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`
  return dateStr
}

const formatTimeStr = (timeStr?: string | null) => {
  if (!timeStr) return '--:--'
  return timeStr.substring(0, 5)
}

interface QueueListProps {
  items: PatientQueue[]
  onToggleApprove: (id: string, current: boolean) => void
  onEdit: (item: PatientQueue) => void
  onCancel: (id: string) => void
}

export function QueueList({ items, onToggleApprove, onEdit, onCancel }: QueueListProps) {
  const [localItems, setLocalItems] = useState<PatientQueue[]>([])
  const dragItem = useRef<number | null>(null)
  const dragOverItem = useRef<number | null>(null)
  const [isDragging, setIsDragging] = useState(false)

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
                : 'border-white/5 hover:border-white/15',
            )}
            style={{ animationDelay: !isDragging ? `${index * 40}ms` : '0ms' }}
          >
            {/* Drag Handle Area */}
            {isEditable && (
              <div className="hidden lg:flex w-8 items-center justify-center bg-black/20 border-r border-white/5 group-hover:bg-white/5 transition-colors">
                <GripVertical className="w-4 h-4 text-white/20 group-hover:text-white/60" />
              </div>
            )}

            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 p-5">
              {/* Profile Section */}
              <div className="lg:col-span-4 flex flex-col justify-center space-y-2.5 relative lg:pr-6 lg:border-r border-white/5 pb-4 lg:pb-0 border-b lg:border-b-0">
                {isNext && (
                  <Badge className="absolute -top-1 -right-2 bg-amber-500/20 text-amber-500 border-amber-500/30 text-[9px] px-1.5 py-0 uppercase tracking-wider animate-pulse">
                    Próximo da Fila
                  </Badge>
                )}
                <h4 className="font-heading font-semibold text-base text-foreground truncate">
                  {item.patient_name}
                </h4>
                <div className="flex items-center gap-4 text-xs text-muted-foreground font-mono">
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-blue-400/70" />
                    {item.phone_number}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-emerald-400/70" />
                    {formatDOB(item.Data_nascimento)}
                  </div>
                </div>
              </div>

              {/* Procedure Section */}
              <div className="lg:col-span-4 flex flex-col justify-center space-y-2 lg:pr-6 lg:border-r border-white/5 pb-4 lg:pb-0 border-b lg:border-b-0">
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground/70 font-semibold">
                  <Stethoscope className="w-3 h-3" /> Detalhes Médicos
                </div>
                <div className="text-sm font-medium text-slate-200 line-clamp-1">
                  {item.procedimentos || (
                    <span className="text-slate-500 italic font-normal">Não informado</span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs font-mono">
                  <Clock className="w-3.5 h-3.5 text-amber-400/70" />
                  <span className="text-muted-foreground">Agendado:</span>
                  <span className="text-amber-400/90">{formatTimeStr(item.time_proce)}</span>
                </div>
              </div>

              {/* Execution Section */}
              <div className="lg:col-span-4 flex flex-col justify-between space-y-3">
                <div className="flex items-center justify-between">
                  <div
                    className={cn(
                      'flex items-center gap-2 px-2.5 py-1 rounded-full border text-[11px] font-medium tracking-wide uppercase',
                      statusCfg.bg,
                      statusCfg.border,
                      statusCfg.color,
                    )}
                  >
                    <div className={cn('w-1.5 h-1.5 rounded-full', statusCfg.dot)} />
                    {statusCfg.label}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/70">
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
                        'h-5 w-9 data-[state=checked]:bg-emerald-500 data-[state=unchecked]:bg-slate-700',
                      )}
                    />
                  </div>
                </div>

                <div className="flex items-end justify-between">
                  <div className="space-y-1">
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
                      Disparo Programado
                    </div>
                    <div className="text-xs font-mono text-slate-300">
                      {format(new Date(item.send_after), "dd/MM '—' HH:mm", { locale: ptBR })}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 bg-black/40 p-1 rounded-xl border border-white/5">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-slate-400 hover:text-blue-400 hover:bg-blue-400/10"
                        >
                          <Info className="w-3.5 h-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent
                        side="top"
                        className="max-w-xs bg-slate-900 border-white/10 text-slate-300 p-3 space-y-2"
                      >
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase mb-1">
                            Corpo da Mensagem
                          </p>
                          <p className="text-xs italic border-l-2 border-white/10 pl-2">
                            "{item.message_body}"
                          </p>
                        </div>
                        {item.notes && (
                          <div>
                            <p className="text-[10px] text-muted-foreground uppercase mb-1">
                              Notas
                            </p>
                            <p className="text-xs text-blue-300">{item.notes}</p>
                          </div>
                        )}
                      </TooltipContent>
                    </Tooltip>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-emerald-400/70 hover:text-emerald-400 hover:bg-emerald-400/10"
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
                          className="h-7 w-7 text-slate-400 hover:text-white hover:bg-white/10"
                          onClick={() => onEdit(item)}
                          title="Editar/Intervir"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-red-400/70 hover:text-red-400 hover:bg-red-400/10"
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
