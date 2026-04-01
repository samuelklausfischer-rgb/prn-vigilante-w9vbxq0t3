import { useValidatedPatients } from '@/hooks/use-validated-patients'
import { CheckCircle2, XCircle, HelpCircle, RefreshCw, Smartphone, Clock, FolderOpen, AlertCircle } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export default function ValidationDashboard() {
  const { items, activeLists, hasActiveList, loading, refetch, listNameById } = useValidatedPatients()

  const renderStatusIcon = (validStatus?: boolean | null) => {
    if (validStatus === true) return <CheckCircle2 className="w-5 h-5 text-emerald-500" />
    if (validStatus === false) return <XCircle className="w-5 h-5 text-red-500" />
    return <HelpCircle className="w-5 h-5 text-slate-500" />
  }

  const listStatusBadge = (status: string) => {
    if (status === 'in_progress') return 'bg-blue-500/20 text-blue-300 border-blue-500/30'
    if (status === 'queued') return 'bg-amber-500/20 text-amber-300 border-amber-500/30'
    return 'bg-slate-500/20 text-slate-300 border-slate-500/30'
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
            Validacao de telefones das listas de disparo ativas.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-xl">
            <span className="text-sm font-medium text-blue-400">
              Escaneados:{' '}
              <strong className="text-white">{items.length}</strong>
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

      {hasActiveList && (
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <FolderOpen className="w-4 h-4" />
            <span>Listas ativas ({activeLists.length}):</span>
          </div>
          {activeLists.map((list) => (
            <Badge
              key={list.id}
              variant="outline"
              className={cn('text-xs px-3 py-1', listStatusBadge(list.status))}
            >
              {list.name}
              {list.exam_date && (
                <span className="ml-1.5 opacity-70">
                  {format(new Date(list.exam_date + 'T12:00:00'), 'dd/MM')}
                </span>
              )}
            </Badge>
          ))}
        </div>
      )}

      <div className="rounded-2xl border border-white/5 bg-card/50 overflow-hidden shadow-2xl backdrop-blur-xl">
        <div className="p-4 border-b border-white/5 bg-white/[0.02]">
          <h3 className="font-heading font-medium text-lg text-slate-200">
            Pacientes Escaneados
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
                <th className="px-5 py-4 font-medium tracking-wider">Lista</th>
                <th className="px-5 py-4 font-medium tracking-wider text-right">Escaneado Em</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {!hasActiveList ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <AlertCircle className="w-8 h-8 text-slate-600" />
                      <span>Nenhuma lista de disparo ativa no momento.</span>
                      <span className="text-xs opacity-60">Crie uma lista em &quot;Enviar lista&quot; para ver a validacao aqui.</span>
                    </div>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <Smartphone className="w-8 h-8 text-slate-600" />
                      <span>Nenhum paciente escaneado ainda nesta lista.</span>
                      <span className="text-xs opacity-60">O worker deve iniciar a validacao em breve.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-white/[0.02] transition-colors group cursor-default"
                  >
                    <td className="px-5 py-4">
                      <div className="font-medium text-slate-200 group-hover:text-blue-400 transition-colors">
                        {item.patient_name}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <span className="font-mono text-xs tracking-wider text-slate-300">
                          {item.phone_number || '-'}
                        </span>
                        {item.phone_number && renderStatusIcon(item.phone_1_whatsapp_valid ?? item.whatsapp_valid)}
                      </div>
                    </td>
                    <td className="px-5 py-4 border-l border-white/5">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <span className="font-mono text-xs tracking-wider text-slate-400">
                          {item.phone_2 || '-'}
                        </span>
                        {item.phone_2 && renderStatusIcon(item.phone_2_whatsapp_valid)}
                      </div>
                    </td>
                    <td className="px-5 py-4 border-l border-white/5">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <span className="font-mono text-xs tracking-wider text-slate-400">
                          {item.phone_3 || '-'}
                        </span>
                        {item.phone_3 && renderStatusIcon(item.phone_3_whatsapp_valid)}
                      </div>
                    </td>
                    <td className="px-5 py-4 border-l border-white/5">
                      <span className="text-xs text-slate-400">
                        {listNameById(item.send_list_id) || '-'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      {(item.whatsapp_checked_at || item.updated_at) && (
                        <div className="inline-flex items-center rounded-lg bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-400 border border-blue-500/20 shadow-[0_0_10px_rgba(59,130,246,0.1)]">
                          <Clock className="w-3 h-3 mr-1.5 opacity-70" />
                          {format(
                            new Date(item.whatsapp_checked_at || item.updated_at),
                            "HH:mm '•' dd/MMM",
                            { locale: ptBR },
                          )}
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
