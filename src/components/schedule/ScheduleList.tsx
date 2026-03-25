import {
  Clock,
  Phone,
  User,
  Calendar,
  AlertTriangle,
  Plus,
  CheckCircle2,
  XCircle,
  MessageCircle,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScheduleItem, getGapClassificationInfo, type GapClassification } from '@/services/schedule'
import { formatPhoneBR } from '@shared/utils/phone-utils'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface ScheduleListProps {
  schedule: ScheduleItem[]
  onPatientClick?: (item: ScheduleItem) => void
  onGapClick?: (item: ScheduleItem) => void
}

function formatTime(timeStr: string | null): string {
  if (!timeStr) return '--:--'
  const time = timeStr.replace(':', 'h')
  return time
}

function formatDuration(minutes: number | null): string {
  if (!minutes) return ''
  if (minutes < 60) return `${minutes}min`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`
}

function getJourneyStatusStyle(status: string | null) {
  switch (status) {
    case 'confirmed':
      return {
        label: 'Confirmado',
        className: 'bg-green-500/15 text-green-300 border-green-500/30',
      }
    case 'contacting':
      return {
        label: 'Enviando',
        className: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
      }
    case 'delivered_waiting_reply':
      return {
        label: 'Aguardando resposta',
        className: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
      }
    case 'followup_sent':
      return {
        label: 'Follow-up',
        className: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
      }
    case 'pending_manual':
      return { label: 'Pendente', className: 'bg-red-500/15 text-red-300 border-red-500/30' }
    case 'cancelled':
      return { label: 'Cancelado', className: 'bg-gray-500/15 text-gray-300 border-gray-500/30' }
    default:
      return {
        label: status || 'Desconhecido',
        className: 'bg-white/10 text-white border-white/10',
      }
  }
}

function getClassificationStyle(classification: string | null) {
  switch (classification) {
    case 'confirmado_positivo':
      return { label: 'Confirmado', className: 'bg-green-500/20 text-green-300' }
    case 'quer_remarcar':
      return { label: 'Quer remarcar', className: 'bg-orange-500/20 text-orange-300' }
    case 'nao_pode_comparecer':
      return { label: 'Não pode', className: 'bg-red-500/20 text-red-300' }
    case 'cancelado':
      return { label: 'Cancelado', className: 'bg-gray-500/20 text-gray-300' }
    case 'duvida':
      return { label: 'Dúvida', className: 'bg-yellow-500/20 text-yellow-300' }
    case 'ambigua':
      return { label: 'Ambíguo', className: 'bg-purple-500/20 text-purple-300' }
    default:
      return null
  }
}

function PatientCard({ item, onClick }: { item: ScheduleItem; onClick?: () => void }) {
  const status = getJourneyStatusStyle(item.journey_status)
  const classification = getClassificationStyle(item.latest_classification)

  return (
    <Card
      className="border-white/10 bg-slate-800/50 hover:bg-slate-800/80 transition-colors cursor-pointer"
      onClick={onClick}
    >
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <User className="w-4 h-4 text-slate-400" />
              <span className="font-medium text-sm text-white truncate">{item.patient_name}</span>
            </div>
            {item.phone && (
              <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                <Phone className="w-3 h-3" />
                <span className="font-mono">{formatPhoneBR(item.phone)}</span>
              </div>
            )}
            {item.procedimentos && (
              <div className="text-xs text-slate-300 line-clamp-1">📋 {item.procedimentos}</div>
            )}
          </div>
          <Badge variant="outline" className={status.className}>
            {status.label}
          </Badge>
        </div>

        <div className="flex items-center gap-2 mt-2 text-xs text-slate-400">
          <Clock className="w-3 h-3" />
          <span>
            {formatTime(item.horario_inicio)} - {formatTime(item.horario_final)}
          </span>
          {item.time_proce && (
            <span className="text-slate-500">({item.time_proce.replace(':', 'h')})</span>
          )}
        </div>

        <div className="flex flex-wrap gap-1 mt-2">
          {item.vacancy_signal && (
            <Badge variant="outline" className="text-xs border-orange-500/50 text-orange-300">
              <AlertTriangle className="w-3 h-3 mr-1" />
              Vaga potencial
            </Badge>
          )}
          {classification && (
            <Badge className={`text-xs ${classification.className}`}>{classification.label}</Badge>
          )}
          {item.phone_ladder_exhausted && (
            <Badge variant="outline" className="text-xs border-red-500/50 text-red-300">
              Telefones esgotados
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function GapCard({ item, onClick }: { item: ScheduleItem; onClick?: () => void }) {
  const classification = getGapClassificationInfo(item.gap_classification as GapClassification)
  if (!classification) return null

  return (
    <Card
      className={`border-2 ${classification.color.replace('text-', 'border-')} cursor-pointer hover:opacity-90 transition-opacity`}
      onClick={onClick}
    >
      <CardContent className="p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{classification.icon}</span>
            <div>
              <div className="font-semibold text-white flex items-center gap-2">
                {classification.label}
                <Badge variant="outline" className="text-xs border-white/20 text-white">
                  {formatDuration(item.gap_duration_minutes)}
                </Badge>
              </div>
              <div className="text-xs text-slate-300">
                {formatTime(item.horario_inicio)} - {formatTime(item.horario_final)} disponível
              </div>
              <div className="text-xs text-slate-400 mt-1">{classification.description}</div>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="border-white/20 text-white hover:bg-white/10"
          >
            <Plus className="w-4 h-4 mr-1" />
            Preencher
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export function ScheduleList({ schedule, onPatientClick, onGapClick }: ScheduleListProps) {
  if (schedule.length === 0) {
    return (
      <div className="text-center py-12">
        <Calendar className="w-12 h-12 text-slate-500 mx-auto mb-4" />
        <p className="text-slate-400">Nenhum paciente agendado para esta data</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {schedule.map((item, index) => {
        const key =
          item.item_type === 'patient'
            ? `patient-${item.journey_id}`
            : `gap-${item.horario_inicio}-${index}`

        if (item.item_type === 'gap') {
          return <GapCard key={key} item={item} onClick={() => onGapClick?.(item)} />
        }

        return <PatientCard key={key} item={item} onClick={() => onPatientClick?.(item)} />
      })}
    </div>
  )
}
