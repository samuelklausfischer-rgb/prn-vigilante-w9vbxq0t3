import { PatientQueue } from '@/types'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Clock, Calendar, User, Phone, MessageSquare, FileText } from 'lucide-react'

interface PatientDetailsModalProps {
  patient: PatientQueue
  open: boolean
  onClose: () => void
}

export function PatientDetailsModal({ patient, open, onClose }: PatientDetailsModalProps) {
  const formatTime = (time?: string | null) => {
    if (!time) return '--:--'
    return time.substring(0, 5)
  }

  const formatDuration = (time?: string | null) => {
    if (!time) return '-- min'

    if (!time.includes(':')) {
      const minutesOnly = Number.parseInt(time.replace(/\D/g, ''), 10)
      return Number.isNaN(minutesOnly) ? '-- min' : `${minutesOnly} min`
    }

    const parts = time.split(':').map((part) => Number.parseInt(part, 10))
    const [hours = 0, minutes = 0] = parts

    if (Number.isNaN(hours) && Number.isNaN(minutes)) {
      return '-- min'
    }

    if (hours > 0) {
      return `${hours}h ${minutes}min`
    }

    return `${minutes} min`
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-[#0f1115]/95 backdrop-blur-xl border-white/10 text-white max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">Detalhes do Paciente</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Cabeçalho - Nome e contato */}
          <div className="text-center space-y-3">
            <div className="flex items-center justify-center gap-2.5">
              <User className="w-5 h-5 text-blue-400" />
              <h2 className="text-2xl font-bold text-white">{patient.patient_name}</h2>
            </div>
            <div className="flex items-center justify-center gap-4 text-sm text-slate-300">
              <div className="flex items-center gap-1.5">
                <Phone className="w-4 h-4 text-emerald-400" />
                <span className="font-mono">{patient.phone_number}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-blue-400" />
                <span className="font-mono">{patient.Data_nascimento || 'Não informado'}</span>
              </div>
            </div>
          </div>

          {/* Detalhes do Procedimento */}
          <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-lg p-5 space-y-4">
            <h3 className="text-sm font-bold text-blue-400 uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Detalhes do Procedimento
            </h3>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-slate-400 block text-xs">Procedimento:</span>
                <span className="text-slate-200 font-medium">
                  {patient.procedimentos || 'Não informado'}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block text-xs">Horário Início:</span>
                <span className="text-emerald-400 font-mono font-bold">
                  {formatTime(patient.horario_inicio)}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block text-xs">Horário Final:</span>
                <span className="text-red-400 font-mono font-bold">
                  {formatTime(patient.horario_final)}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block text-xs">Duração:</span>
                <span className="text-amber-400 font-mono font-bold">
                  {formatDuration(patient.time_proce)}
                </span>
              </div>
            </div>
          </div>

          {/* Mensagem WhatsApp */}
          <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-lg p-5 space-y-4">
            <h3 className="text-sm font-bold text-green-400 uppercase tracking-wider flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Mensagem WhatsApp
            </h3>

            <div className="text-sm text-slate-200 bg-black/40 rounded-lg p-4 font-mono border border-white/10">
              {patient.message_body || 'Mensagem não definida'}
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="flex justify-end pt-2">
            <Button
              variant="outline"
              onClick={onClose}
              className="border-slate-700 text-slate-300 hover:bg-slate-800"
            >
              Fechar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
