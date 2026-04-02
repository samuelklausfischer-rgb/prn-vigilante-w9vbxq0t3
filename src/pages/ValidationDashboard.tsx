import { useValidatedPatients } from '@/hooks/use-validated-patients'
import { CheckCircle2, XCircle, HelpCircle, Loader2, Search, Smartphone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export default function ValidationDashboard() {
  const { items, loading, analyzing, refetch, requestAnalysis } = useValidatedPatients()

  const renderPhoneStatus = (phone: string | null | undefined, isValid: boolean | null | undefined) => {
    if (!phone) {
      return <span className="text-slate-600">-</span>
    }

    return (
      <div className="flex flex-col items-center justify-center gap-2">
        <span className="font-mono text-xs tracking-wider text-slate-300">
          {phone}
        </span>
        {isValid === true ? (
          <>
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            <span className="text-emerald-400 text-xs">Tem</span>
          </>
        ) : isValid === false ? (
          <>
            <XCircle className="w-5 h-5 text-red-500" />
            <span className="text-red-400 text-xs">Nao tem</span>
          </>
        ) : (
          <>
            <HelpCircle className="w-5 h-5 text-slate-500" />
            <span className="text-slate-400 text-xs">Aguardando</span>
          </>
        )}
      </div>
    )
  }

  const buttonDisabled = loading || analyzing || items.length === 0
  const buttonText = loading
    ? 'Carregando...'
    : analyzing
      ? 'Analisando...'
      : items.length === 0
        ? 'Nenhum paciente na fila'
        : 'ANALISAR TODOS OS NUMEROS'

  return (
    <div className="space-y-8 animate-fade-in-up pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-heading font-semibold tracking-tight text-slate-100 flex items-center gap-2">
            <Smartphone className="w-6 h-6 text-blue-400" />
            Raio-X de WhatsApp
          </h2>
          <p className="text-sm text-muted-foreground">
            Validacao de telefones da fila de envios.
          </p>
        </div>
        <div className="px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-xl">
          <span className="text-sm font-medium text-blue-400">
            Pacientes na fila:{' '}
            <strong className="text-white">{items.length}</strong>
          </span>
        </div>
      </div>

      <Button
        variant="outline"
        disabled={buttonDisabled}
        onClick={requestAnalysis}
        className={cn(
          'flex items-center gap-2 text-sm font-semibold px-6 py-3 rounded-xl uppercase tracking-widest transition-all shadow-[0_0_15px_rgba(59,130,246,0.15)]',
          !buttonDisabled &&
            'text-blue-400 bg-blue-400/10 border-blue-400/20 hover:bg-blue-400/20',
        )}
      >
        {analyzing && <Loader2 className="w-4 h-4 animate-spin" />}
        {!analyzing && !loading && items.length > 0 && <Search className="w-4 h-4" />}
        {buttonText}
      </Button>

      <div className="rounded-2xl border border-white/5 bg-card/50 overflow-hidden shadow-2xl backdrop-blur-xl">
        <div className="p-4 border-b border-white/5 bg-white/[0.02]">
          <h3 className="font-heading font-medium text-lg text-slate-200">
            Pacientes na Fila de Envios
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-white/5 text-xs uppercase text-slate-400 border-b border-white/10">
              <tr>
                <th className="px-5 py-4 font-medium tracking-wider">Paciente</th>
                <th className="px-5 py-4 font-medium tracking-wider text-center">Tel Principal</th>
                <th className="px-5 py-4 font-medium tracking-wider text-center">Telefone 2</th>
                <th className="px-5 py-4 font-medium tracking-wider text-center">Telefone 3</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">
                    Nenhum paciente na fila de envios.
                  </td>
                </tr>
              ) : (
                items.map((patient) => (
                  <tr
                    key={patient.id}
                    className="hover:bg-white/[0.02] transition-colors group cursor-default"
                  >
                    <td className="px-5 py-4">
                      <div className="font-medium text-slate-200 group-hover:text-blue-400 transition-colors">
                        {patient.patient_name}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      {renderPhoneStatus(patient.phone_number, patient.phone_1_whatsapp_valid)}
                    </td>
                    <td className="px-5 py-4 border-l border-white/5">
                      {renderPhoneStatus(patient.phone_2, patient.phone_2_whatsapp_valid)}
                    </td>
                    <td className="px-5 py-4 border-l border-white/5">
                      {renderPhoneStatus(patient.phone_3, patient.phone_3_whatsapp_valid)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
