import { useAppData } from '@/hooks/use-app-data'
import { CheckCircle2, XCircle, HelpCircle, RefreshCw, Smartphone, Clock } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export default function ValidationDashboard() {
  const { items, loading, refetch } = useAppData(['queued'])

  // Filtrar apenas com o status de validação finalizado
  const validatedItems = items.filter(
    (i) => i.whatsapp_checked_at != null
  )

  const pendingItems = items.filter(
    (i) => i.whatsapp_checked_at == null
  )

  const renderStatusIcon = (validStatus?: boolean | null) => {
    if (validStatus === true) return <CheckCircle2 className="w-5 h-5 text-emerald-500" />
    if (validStatus === false) return <XCircle className="w-5 h-5 text-red-500" />
    return <HelpCircle className="w-5 h-5 text-slate-500" />
  }

  return (
    <div className="space-y-8 animate-fade-in-up pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-heading font-semibold tracking-tight text-slate-100 flex items-center gap-2">
            <Smartphone className="w-6 h-6 text-blue-400" />
            Raio-X de WhatsApp
          </h2>
          <p className="text-sm text-muted-foreground">
            Acompanhe o mapa de telefones validados automaticamente (Fase 1).
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-xl">
            <span className="text-sm font-medium text-blue-400">
              Escaneados:{' '}
              <strong className="text-white">{validatedItems.length}</strong>
            </span>
          </div>
          <div className="px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-xl">
            <span className="text-sm font-medium text-amber-400">
              Na fila:{' '}
              <strong className="text-white">{pendingItems.length}</strong>
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={loading}
            className="flex items-center gap-2 text-[10px] font-mono text-blue-400 bg-blue-400/10 px-4 py-2 rounded-full border border-blue-400/20 uppercase tracking-widest hover:bg-blue-400/20 transition-all shadow-[0_0_15px_rgba(59,130,246,0.15)]"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
            {loading ? 'Atualizando...' : 'Atualizar'}
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-white/5 bg-card/50 overflow-hidden shadow-2xl backdrop-blur-xl">
        <div className="p-4 border-b border-white/5 bg-white/[0.02]">
          <h3 className="font-heading font-medium text-lg text-slate-200">
            Últimos Pacientes Escaneados
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-white/5 text-xs uppercase text-slate-400 border-b border-white/10">
              <tr>
                <th className="px-6 py-4 font-medium tracking-wider">Paciente</th>
                <th className="px-6 py-4 font-medium tracking-wider text-center">Tel Principal</th>
                <th className="px-6 py-4 font-medium tracking-wider text-center">Telefone 2</th>
                <th className="px-6 py-4 font-medium tracking-wider text-center">Telefone 3</th>
                <th className="px-6 py-4 font-medium tracking-wider text-right">Escaneado Em</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {validatedItems.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                    Nenhum paciente passou pelo Raio-X ainda hoje.
                  </td>
                </tr>
              ) : (
                validatedItems.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-white/[0.02] transition-colors group cursor-default"
                  >
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-200 group-hover:text-blue-400 transition-colors">
                        {item.patient_name}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        ID: {item.id.split('-')[0]}...
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <span className="font-mono text-xs tracking-wider text-slate-300">
                          {item.phone_number || 'Sem número'}
                        </span>
                        {item.phone_number && renderStatusIcon(item.phone_1_whatsapp_valid)}
                      </div>
                    </td>
                    <td className="px-6 py-4 border-l border-white/5">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <span className="font-mono text-xs tracking-wider text-slate-400">
                          {item.phone_2 || '-'}
                        </span>
                        {item.phone_2 && renderStatusIcon(item.phone_2_whatsapp_valid)}
                      </div>
                    </td>
                    <td className="px-6 py-4 border-l border-white/5">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <span className="font-mono text-xs tracking-wider text-slate-400">
                          {item.phone_3 || '-'}
                        </span>
                        {item.phone_3 && renderStatusIcon(item.phone_3_whatsapp_valid)}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {item.whatsapp_checked_at && (
                        <div className="inline-flex items-center rounded-lg bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-400 border border-blue-500/20 shadow-[0_0_10px_rgba(59,130,246,0.1)]">
                          <Clock className="w-3 h-3 mr-1.5 opacity-70" />
                          {format(new Date(item.whatsapp_checked_at), "HH:mm '•' dd/MMM", {
                            locale: ptBR,
                          })}
                        </div>
                      )}
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
