import { useState, useEffect, useRef } from 'react'
import { PatientQueue } from '@/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import {
  MessageSquare,
  AlertCircle,
  Edit2,
  Ban,
  Clock,
  Phone,
  Send,
  GripVertical,
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
    // Only update from props when not dragging to prevent jank from Realtime events
    if (!isDragging) {
      setLocalItems(items)
    }
  }, [items, isDragging])

  const handleDragStart = (e: React.DragEvent, position: number) => {
    dragItem.current = position
    setIsDragging(true)
    e.dataTransfer.effectAllowed = 'move'

    // Delay class addition slightly so the drag image looks normal
    setTimeout(() => {
      const el = document.getElementById(`queue-item-${localItems[position].id}`)
      if (el) el.classList.add('opacity-50', 'scale-[0.98]')
    }, 0)
  }

  const handleDragEnter = (e: React.DragEvent, position: number) => {
    e.preventDefault()
    dragOverItem.current = position

    if (dragItem.current !== null && dragItem.current !== position) {
      const newList = [...localItems]
      const draggedItem = newList[dragItem.current]
      const targetItem = newList[position]

      // Allow dragging and reordering only between queued items
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
      if (el) el.classList.remove('opacity-50', 'scale-[0.98]')
    }

    dragItem.current = null
    dragOverItem.current = null
    setIsDragging(false)

    // Save strictly the explicit new order for the queued items back to the database
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
        return { icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500/10', label: 'Na Fila' }
      case 'sending':
        return { icon: Send, color: 'text-blue-500', bg: 'bg-blue-500/10', label: 'Enviando...' }
      case 'delivered':
        return {
          icon: MessageSquare,
          color: 'text-emerald-500',
          bg: 'bg-emerald-500/10',
          label: 'Entregue',
        }
      case 'failed':
        return { icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-500/10', label: 'Falhou' }
      case 'cancelled':
        return { icon: Ban, color: 'text-slate-500', bg: 'bg-slate-500/10', label: 'Cancelado' }
      default:
        return { icon: Clock, color: 'text-slate-500', bg: 'bg-slate-500/10', label: status }
    }
  }

  const getWhatsAppLink = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, '')
    return `https://wa.me/55${cleanPhone}`
  }

  const firstQueuedIndex = localItems.findIndex((i) => i.status === 'queued' && i.is_approved)

  if (localItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground border border-dashed border-white/10 rounded-2xl">
        <MessageSquare className="w-12 h-12 mb-4 opacity-20" />
        <p className="font-heading text-lg">Nenhuma mensagem nesta fila.</p>
        <p className="text-sm">Aproveite, a operação está em dia.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {localItems.map((item, index) => {
        const isNext = index === firstQueuedIndex
        const config = getStatusConfig(item.status)
        const Icon = config.icon
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
              'group flex flex-col md:flex-row items-start md:items-center gap-4 p-4 rounded-2xl transition-all duration-300',
              !isDragging && 'animate-fade-in-up',
              'bg-card/50 border backdrop-blur-sm',
              isEditable ? 'cursor-grab active:cursor-grabbing hover:bg-card/80' : '',
              isNext
                ? 'border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.1)]'
                : 'border-white/5 hover:border-white/10',
            )}
            style={{ animationDelay: !isDragging ? `${index * 50}ms` : '0ms' }}
          >
            {isEditable && (
              <div
                className="flex items-center justify-center cursor-grab active:cursor-grabbing text-muted-foreground/30 hover:text-foreground/80 transition-colors shrink-0 py-2 -ml-2 pl-2 md:pl-0 md:mr-2"
                title="Arraste para reordenar"
              >
                <GripVertical className="w-5 h-5" />
              </div>
            )}
            {/* Status & Patient Info */}
            <div className="flex-1 min-w-0 flex items-start gap-4 w-full">
              <div className={cn('p-2.5 rounded-xl shrink-0', config.bg, config.color)}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium text-foreground truncate">{item.patient_name}</h4>
                  {isNext && (
                    <Badge
                      variant="outline"
                      className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-[10px] px-1.5 animate-pulse-soft"
                    >
                      🔜 Próximo
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Phone className="w-3 h-3" /> {item.phone_number}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />{' '}
                    {format(new Date(item.send_after), "dd/MM 'às' HH:mm", { locale: ptBR })}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-1 italic mt-1.5 opacity-80 border-l-2 border-white/10 pl-2">
                  "{item.message_body}"
                </p>
                {item.notes && (
                  <p className="text-xs text-blue-400/80 line-clamp-1 mt-1">Nota: {item.notes}</p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 w-full md:w-auto mt-4 md:mt-0 pt-4 md:pt-0 border-t md:border-t-0 border-white/5 shrink-0 justify-between md:justify-end">
              <div className="flex items-center gap-2 mr-auto md:mr-4">
                <Switch
                  checked={item.is_approved}
                  onCheckedChange={(checked) => {
                    // Optimistic update for immediate visual feedback
                    setLocalItems((prev) =>
                      prev.map((i) => (i.id === item.id ? { ...i, is_approved: checked } : i)),
                    )
                    onToggleApprove(item.id, item.is_approved)
                  }}
                  disabled={!isEditable}
                  className={cn('data-[state=checked]:bg-emerald-500')}
                />
                <span className="text-xs font-medium w-16">
                  {item.is_approved ? (
                    <span className="text-emerald-500">Liberado</span>
                  ) : (
                    <span className="text-amber-500">Retido</span>
                  )}
                </span>
              </div>

              <div className="flex gap-1 bg-black/20 p-1 rounded-xl border border-white/5 shadow-inner">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                  asChild
                >
                  <a
                    href={getWhatsAppLink(item.phone_number)}
                    target="_blank"
                    rel="noreferrer"
                    title="Abrir WhatsApp"
                  >
                    <IconBrandWhatsapp className="w-4 h-4" />
                  </a>
                </Button>

                {isEditable && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 hover:bg-white/10"
                      onClick={() => onEdit(item)}
                      title="Editar"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      onClick={() => onCancel(item.id)}
                      title="Cancelar Envio"
                    >
                      <Ban className="w-4 h-4" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
