import * as React from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calendar, Clock, Phone, MessageSquare, CheckCircle2, FileText, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PatientInfo, InfoPopupProps } from '@/types/patient-info'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

function SectionBlock({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground/70">
        <span className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-slate-300">
          {icon}
        </span>
        <span>{title}</span>
      </div>
      {children}
    </section>
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

const getStatusConfig = (status: string) => {
  switch (status) {
    case 'queued':
      return { color: 'text-amber-400', bg: 'bg-amber-400/10', label: 'Aguardando' }
    case 'sending':
      return { color: 'text-blue-400', bg: 'bg-blue-400/10', label: 'Processando' }
    case 'delivered':
      return { color: 'text-emerald-400', bg: 'bg-emerald-400/10', label: 'Entregue' }
    case 'failed':
      return { color: 'text-red-400', bg: 'bg-red-400/10', label: 'Falha' }
    case 'cancelled':
      return { color: 'text-slate-400', bg: 'bg-slate-400/10', label: 'Cancelado' }
    default:
      return { color: 'text-slate-400', bg: 'bg-slate-400/10', label: status }
  }
}

export const InfoPopup = React.memo(function InfoPopup({
  patient,
  open,
  onOpenChange,
  children,
  title = 'Informações do Paciente',
  align = 'center',
  side = 'right',
  sideOffset = 8,
  className,
  popoverContentProps,
}: InfoPopupProps) {
  const [isMobile, setIsMobile] = React.useState(false)

  React.useEffect(() => {
    const media = window.matchMedia('(max-width: 639px)')
    const update = () => setIsMobile(media.matches)

    update()
    media.addEventListener('change', update)

    return () => media.removeEventListener('change', update)
  }, [])

  const statusCfg = getStatusConfig(patient.status)
  const getWhatsAppLink = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, '')
    return `https://wa.me/55${cleanPhone}`
  }

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        align={isMobile ? 'center' : align}
        side={isMobile ? 'bottom' : side}
        sideOffset={sideOffset}
        collisionPadding={isMobile ? 12 : 20}
        className={cn(
          'z-50 w-[calc(100vw-1.5rem)] sm:w-[min(70vw,38rem)] max-w-2xl overflow-hidden rounded-[1.35rem] p-0',
          'border border-white/10 bg-[#0b0e13]/98 shadow-[0_24px_80px_rgba(0,0,0,0.5)] backdrop-blur-2xl',
          'origin-[--radix-popover-content-transform-origin]',
          className,
        )}
        {...popoverContentProps}
      >
        <div className="sticky top-0 z-10 border-b border-white/10 bg-[#0b0e13]/95 backdrop-blur-xl">
          <div className="h-1 w-full bg-gradient-to-r from-blue-400/70 via-cyan-300/60 to-emerald-400/70" />
          <div className="flex min-w-0 items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2.5 px-4 py-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-blue-400/20 bg-gradient-to-br from-blue-400/15 to-cyan-300/10 shadow-[0_0_20px_rgba(59,130,246,0.15)]">
                <FileText className="h-4 w-4 text-blue-400" />
              </div>
              <div className="min-w-0">
                <h3 className="truncate font-heading text-base font-semibold text-white sm:text-lg">
                  {title}
                </h3>
                <p className="truncate text-[11px] uppercase tracking-[0.22em] text-muted-foreground/60">
                  Detalhes complementares do paciente
                </p>
              </div>
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="mr-4 h-10 w-10 shrink-0 rounded-full border border-white/10 text-slate-300 hover:border-white/20 hover:bg-white/10 hover:text-white"
              onClick={() => onOpenChange(false)}
              aria-label="Fechar popup de informações do paciente"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="max-h-[75vh] space-y-5 overflow-y-auto bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.08),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.06),transparent_28%)] p-4 sm:p-5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.02] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <div className="flex flex-col gap-4 p-4 sm:p-5">
              <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 space-y-2">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <h4 className="truncate font-heading text-lg font-semibold text-white sm:text-xl">
                      {patient.patient_name}
                    </h4>
                    <Badge
                      className={cn(
                        statusCfg.bg,
                        statusCfg.color,
                        'shrink-0 border-white/10 text-[10px]',
                      )}
                    >
                      {statusCfg.label}
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-400">
                    Painel detalhado de atendimento e comunicacao do paciente.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-xl border border-white/8 bg-black/20 px-3 py-2">
                    <div className="mb-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground/60">
                      Aprovacao
                    </div>
                    <div
                      className={cn(
                        'font-medium',
                        patient.is_approved ? 'text-emerald-400' : 'text-amber-400',
                      )}
                    >
                      {patient.is_approved ? 'Liberado' : 'Retido'}
                    </div>
                  </div>
                  <div className="rounded-xl border border-white/8 bg-black/20 px-3 py-2">
                    <div className="mb-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground/60">
                      Fila
                    </div>
                    <div className="font-medium text-slate-200">{patient.queue_order || '--'}</div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-white/8 bg-black/20 px-3.5 py-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-400/10 text-blue-300">
                    <Phone className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/60">
                      Telefone
                    </div>
                    <div className="truncate font-mono text-sm text-slate-200">
                      {patient.phone_number}
                    </div>
                  </div>
                </div>

                <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-white/8 bg-black/20 px-3.5 py-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-300">
                    <Calendar className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/60">
                      Nascimento
                    </div>
                    <div className="truncate font-mono text-sm text-slate-200">
                      {formatDOB(patient.Data_nascimento)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <SectionBlock icon={<MessageSquare className="h-3.5 w-3.5" />} title="Procedimentos">
            <div className="rounded-2xl border border-white/8 bg-black/20 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
              <p className="line-clamp-4 overflow-hidden break-words text-sm leading-relaxed text-slate-300">
                {patient.procedimentos || (
                  <span className="text-slate-500 italic">Não informado</span>
                )}
              </p>
            </div>
          </SectionBlock>

          <SectionBlock icon={<Clock className="h-3.5 w-3.5" />} title="Horarios da Sessao">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className="min-w-0 overflow-hidden rounded-2xl border border-white/8 bg-black/20 p-4 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                <div className="mb-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground/60">
                  Inicio
                </div>
                <div className="truncate text-lg font-mono font-semibold text-emerald-400">
                  {formatTimeStr(patient.horario_inicio)}
                </div>
              </div>
              <div className="min-w-0 overflow-hidden rounded-2xl border border-white/8 bg-black/20 p-4 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                <div className="mb-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground/60">
                  Fim
                </div>
                <div className="truncate text-lg font-mono font-semibold text-blue-400">
                  {formatTimeStr(patient.horario_final)}
                </div>
              </div>
              <div className="min-w-0 overflow-hidden rounded-2xl border border-white/8 bg-black/20 p-4 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] sm:col-span-2 lg:col-span-1">
                <div className="mb-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground/60">
                  Duracao
                </div>
                <div className="truncate text-lg font-mono font-semibold text-amber-400">
                  {formatDuration(patient.time_proce)}
                </div>
              </div>
            </div>
          </SectionBlock>

          <SectionBlock icon={<MessageSquare className="h-3.5 w-3.5" />} title="Mensagem WhatsApp">
            <div className="overflow-hidden rounded-2xl border border-blue-500/15 bg-blue-500/5 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
              <p className="max-h-40 overflow-y-auto break-words text-sm leading-relaxed text-slate-300 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                {patient.message_body || (
                  <span className="text-slate-500 italic">Mensagem padrão</span>
                )}
              </p>
            </div>
          </SectionBlock>

          {patient.notes && (
            <SectionBlock icon={<FileText className="h-3.5 w-3.5" />} title="Notas Internas">
              <div className="overflow-hidden rounded-2xl border border-amber-500/15 bg-amber-500/5 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                <p className="max-h-32 overflow-y-auto break-words text-sm leading-relaxed text-slate-300 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                  {patient.notes}
                </p>
              </div>
            </SectionBlock>
          )}

          <SectionBlock icon={<CheckCircle2 className="h-3.5 w-3.5" />} title="Status e Controle">
            <div className="grid grid-cols-1 gap-2 text-xs font-mono sm:grid-cols-2 sm:gap-3">
              <div className="flex min-w-0 items-center justify-between gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-3.5 py-3">
                <span className="shrink-0 text-muted-foreground">Aprovação</span>
                <span
                  className={cn(
                    'truncate',
                    patient.is_approved ? 'text-emerald-400' : 'text-amber-400',
                  )}
                >
                  {patient.is_approved ? 'Liberado' : 'Retido'}
                </span>
              </div>
              <div className="flex min-w-0 items-center justify-between gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-3.5 py-3">
                <span className="shrink-0 text-muted-foreground">Disparo</span>
                <span className="truncate text-slate-300">
                  {format(new Date(patient.send_after), 'dd/MM/yyyy', { locale: ptBR })}
                </span>
              </div>
              <div className="flex min-w-0 items-center justify-between gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-3.5 py-3">
                <span className="shrink-0 text-muted-foreground">Posição</span>
                <span className="truncate text-slate-300">{patient.queue_order || '--'}</span>
              </div>
              <div className="flex min-w-0 items-center justify-between gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-3.5 py-3">
                <span className="shrink-0 text-muted-foreground">Atualizado</span>
                <span className="truncate text-slate-300">
                  {format(new Date(patient.updated_at), 'dd/MM HH:mm', { locale: ptBR })}
                </span>
              </div>
            </div>
          </SectionBlock>

          <div className="sticky bottom-0 -mx-4 mt-1 border-t border-white/10 bg-[#0b0e13]/95 px-4 pt-3 backdrop-blur-xl sm:-mx-5 sm:px-5">
            <div className="mb-2 text-center text-[10px] uppercase tracking-[0.2em] text-muted-foreground/55">
              Ações rápidas
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 border-emerald-400/30 text-emerald-400 hover:bg-emerald-400/10"
                asChild
              >
                <a href={getWhatsAppLink(patient.phone_number)} target="_blank" rel="noreferrer">
                  <Phone className="w-4 h-4 mr-2" />
                  WhatsApp
                </a>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 border-white/10 bg-white/[0.03] hover:bg-white/[0.08]"
                onClick={() => onOpenChange(false)}
              >
                Fechar
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
})

export default InfoPopup
