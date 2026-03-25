import { Calendar, Clock, FileText, MessageSquare, Phone, RotateCcw, Stethoscope } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDataExameBr } from '@/lib/utils/data-exame'
import { formatPhoneBR, getPhoneType } from '@shared/utils/phone-utils'
import type { PatientQueue } from '@/types'

interface PatientCardWithActionsProps {
  patient: PatientQueue
  selected: boolean
  onToggleSelect: (checked: boolean) => void
  onReturnToQueue: () => void
  onClick?: () => void
}

function getStatusLabel(patient: PatientQueue) {
  if (patient.replied_at || patient.current_outcome) {
    return { label: 'Respondido', className: 'bg-blue-500/15 text-blue-200 border-blue-500/30' }
  }
  
  switch (patient.status) {
    case 'failed':
      return { label: 'Falha', className: 'bg-red-500/15 text-red-200 border-red-500/30' }
    case 'delivered':
      return { label: 'Entregue', className: 'bg-emerald-500/15 text-emerald-200 border-emerald-500/30' }
    default:
      return { label: patient.status, className: 'bg-white/10 text-white border-white/10' }
  }
}

function getReasonLabel(reason?: string | null) {
  switch (reason) {
    case 'landline_only': return 'Telefone Fixo'
    case 'not_received_retry_phone2': return 'Sem recebimento (P2)'
    case 'delivered_no_reply_followup': return 'Sem resposta (Follow-up)'
    case 'failed': return 'Erro de envio'
    case 'phone_ladder_exhausted': return 'Todos os telefones sem WhatsApp'
    case 'not_received_retry_phone3': return 'Sem recebimento (P3)'
    default: return reason || 'Análise manual'
  }
}

export function PatientCardWithActions({ patient, selected, onToggleSelect, onReturnToQueue, onClick }: PatientCardWithActionsProps) {
  const status = getStatusLabel(patient)
  const phoneType = getPhoneType(patient.phone_number)
  
  const handleCardClick = (e: React.MouseEvent) => {
    // Não abrir modal se clicou no checkbox
    if ((e.target as HTMLElement).closest('input[type="checkbox"]')) {
      return
    }
    onClick?.()
  }
  
  return (
    <Card 
      className={`${selected ? 'border-blue-500/60 bg-blue-500/5' : 'border-white/10 bg-card/50'} ${onClick ? 'cursor-pointer hover:border-blue-500/30 transition-colors' : ''}`} 
      onClick={handleCardClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <Checkbox checked={selected} onCheckedChange={(checked) => onToggleSelect(Boolean(checked))} className="mt-1" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-base text-white">{patient.patient_name}</CardTitle>
              <Badge variant="outline" className={status.className}>{status.label}</Badge>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              {/* Telefone atual */}
              <span className="inline-flex items-center gap-1">
                <Phone className="h-3 w-3" />
                {formatPhoneBR(patient.phone_number)}
              </span>
              <span className="rounded-full bg-white/5 px-2 py-0.5 uppercase">
                {phoneType === 'landline' ? 'Fixo' : phoneType === 'mobile' ? 'Móvel' : 'Inválido'}
              </span>
              
              {/* Telefones alternativos disponíveis */}
              {patient.phone_2 && (
                <span className="inline-flex items-center gap-1 text-orange-300">
                  <Phone className="h-3 w-3" />
                  {formatPhoneBR(patient.phone_2)}
                  <span className="opacity-70">(Tel2)</span>
                  {patient.phone_2_whatsapp_valid === false && ' ⚠️'}
                </span>
              )}
              {patient.phone_3 && (
                <span className="inline-flex items-center gap-1 text-orange-300">
                  <Phone className="h-3 w-3" />
                  {formatPhoneBR(patient.phone_3)}
                  <span className="opacity-70">(Tel3)</span>
                  {patient.phone_3_whatsapp_valid === false && ' ⚠️'}
                </span>
              )}
              
              {/* Badge de reason */}
              {patient.needs_second_call && (
                <span className="rounded-full bg-orange-500/20 text-orange-200 border border-orange-500/30 px-2 py-0.5 text-[10px]">
                  {getReasonLabel(patient.second_call_reason)}
                </span>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {patient.procedimentos && (
          <div className="flex items-start gap-2 text-muted-foreground">
            <Stethoscope className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span className="line-clamp-2">{patient.procedimentos}</span>
          </div>
        )}

        {patient.current_outcome && (
          <div className="flex items-start gap-2 rounded-lg bg-blue-500/10 p-2 border border-blue-500/20 text-blue-100">
            <MessageSquare className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <div className="flex-1">
              <div className="text-[10px] font-bold uppercase opacity-70">Resposta do Paciente:</div>
              <span className="line-clamp-3 italic">"{patient.current_outcome}"</span>
            </div>
          </div>
        )}

        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          {patient.data_exame && (
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatDataExameBr(patient.data_exame)}
            </div>
          )}
          {patient.horario_inicio && (
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {(patient.horario_inicio || '').slice(0, 5)}
            </div>
          )}
        </div>

        {patient.notes && (
          <div className="rounded bg-black/20 p-2 text-xs text-slate-300 border border-white/5">
            <strong>Obs:</strong> {patient.notes}
          </div>
        )}

        <div className="flex items-center justify-between gap-2 border-t border-white/5 pt-2">
          <Badge variant="outline" className="border-orange-500/30 bg-orange-500/10 text-orange-200">
            <RotateCcw className="mr-1 h-3 w-3" />
            Tentativas: {Number(patient.attempt_count || 0)}
          </Badge>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onReturnToQueue}>
              <RotateCcw className="mr-1 h-3.5 w-3.5" />
              Voltar
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
