import { useState, useMemo } from 'react'
import { useAppData } from '@/hooks/use-app-data'
import { Input } from '@/components/ui/input'
import { Search, Loader2, MessageSquare, AlertCircle, Ban, CheckCircle2 } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Badge } from '@/components/ui/badge'

export default function Archive() {
  const { items, loading } = useAppData(['delivered', 'failed', 'cancelled'])
  const [search, setSearch] = useState('')

  const filteredItems = useMemo(() => {
    if (!search) return items
    const lower = search.toLowerCase()
    return items.filter(
      (i) => i.patient_name.toLowerCase().includes(lower) || i.phone_number.includes(lower),
    )
  }, [items, search])

  if (loading && items.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    )
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'delivered':
        return (
          <Badge className="bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border-0">
            <CheckCircle2 className="w-3 h-3 mr-1" /> Entregue
          </Badge>
        )
      case 'failed':
        return (
          <Badge className="bg-red-500/20 text-red-400 hover:bg-red-500/30 border-0">
            <AlertCircle className="w-3 h-3 mr-1" /> Falha
          </Badge>
        )
      case 'cancelled':
        return (
          <Badge className="bg-slate-500/20 text-slate-400 hover:bg-slate-500/30 border-0">
            <Ban className="w-3 h-3 mr-1" /> Cancelado
          </Badge>
        )
      default:
        return null
    }
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card/50 p-4 rounded-2xl border border-white/5 backdrop-blur-md">
        <div>
          <h2 className="text-xl font-heading font-semibold">Histórico de Disparos</h2>
          <p className="text-sm text-muted-foreground">
            Registro de todas as mensagens finalizadas.
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por paciente ou telefone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-background/50 border-white/10 rounded-xl h-10"
          />
        </div>
      </div>

      <div className="grid gap-3">
        {filteredItems.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground border border-dashed border-white/10 rounded-2xl">
            <Archive className="w-12 h-12 mx-auto mb-3 opacity-20" />
            Nenhum registro encontrado no arquivo.
          </div>
        ) : (
          filteredItems.map((item) => (
            <div
              key={item.id}
              className="bg-card/40 border border-white/5 rounded-xl p-4 hover:bg-card/60 transition-colors"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h4 className="font-medium">{item.patient_name}</h4>
                    {getStatusBadge(item.status)}
                  </div>
                  <p className="text-sm text-muted-foreground font-mono">{item.phone_number}</p>
                  <div className="mt-3 text-sm italic text-muted-foreground/80 pl-3 border-l-2 border-white/10">
                    {item.message_body}
                  </div>
                  {item.notes && (
                    <p className="text-xs text-amber-500/80 mt-2">Motivo/Nota: {item.notes}</p>
                  )}
                </div>
                <div className="text-xs text-muted-foreground whitespace-nowrap bg-background/50 px-3 py-1.5 rounded-lg">
                  {format(new Date(item.updated_at), 'dd MMM yyyy, HH:mm', { locale: ptBR })}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
