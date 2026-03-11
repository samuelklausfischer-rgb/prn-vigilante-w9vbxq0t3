import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Search,
  Loader2,
  Archive as ArchiveIcon,
  AlertCircle,
  Ban,
  CheckCircle2,
  Clock,
  Send,
  FilterX,
} from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Badge } from '@/components/ui/badge'
import { fetchArchive, ArchiveFilters, PatientQueue } from '@/services/archive'
import { DatePickerWithRange } from '@/components/ui/date-picker-with-range'
import { DateRange } from 'react-day-picker'
import { useToast } from '@/hooks/use-toast'
import { useDebounce } from '@/hooks/use-debounce'

export default function Archive() {
  const [data, setData] = useState<PatientQueue[]>([])
  const [loading, setLoading] = useState(true)

  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 500)
  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  const [status, setStatus] = useState<string>('all')
  const [approval, setApproval] = useState<string>('all')

  const { toast } = useToast()

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        const filters: ArchiveFilters = {
          search: debouncedSearch,
          dateRange,
          status,
          isApproved: approval === 'all' ? null : approval === 'approved',
        }
        setData(await fetchArchive(filters))
      } catch (error) {
        toast({
          title: 'Erro',
          description: 'Falha ao carregar histórico.',
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [debouncedSearch, dateRange, status, approval, toast])

  const clearFilters = () => {
    setSearch('')
    setDateRange(undefined)
    setStatus('all')
    setApproval('all')
  }

  const hasFilters =
    search !== '' || dateRange !== undefined || status !== 'all' || approval !== 'all'

  const getStatusBadge = (s: string) => {
    const badges: Record<string, JSX.Element> = {
      delivered: (
        <Badge className="bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border-0">
          <CheckCircle2 className="w-3 h-3 mr-1" /> Entregue
        </Badge>
      ),
      failed: (
        <Badge className="bg-red-500/20 text-red-400 hover:bg-red-500/30 border-0">
          <AlertCircle className="w-3 h-3 mr-1" /> Falha
        </Badge>
      ),
      cancelled: (
        <Badge className="bg-slate-500/20 text-slate-400 hover:bg-slate-500/30 border-0">
          <Ban className="w-3 h-3 mr-1" /> Cancelado
        </Badge>
      ),
      queued: (
        <Badge className="bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 border-0">
          <Clock className="w-3 h-3 mr-1" /> Fila
        </Badge>
      ),
      sending: (
        <Badge className="bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 border-0">
          <Send className="w-3 h-3 mr-1" /> Enviando
        </Badge>
      ),
    }
    return badges[s] || <Badge variant="outline">{s}</Badge>
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h2 className="text-2xl font-heading font-semibold">Histórico e Arquivo</h2>
        <p className="text-muted-foreground">Analise todos os disparos com filtros avançados.</p>
      </div>

      <div className="bg-card/50 p-4 rounded-2xl border border-white/5 backdrop-blur-md space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar paciente, telefone ou mensagem..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-background/50 border-white/10"
            />
          </div>
          <DatePickerWithRange date={dateRange} setDate={setDateRange} />
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="bg-background/50 border-white/10">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Status</SelectItem>
              <SelectItem value="queued">Na Fila</SelectItem>
              <SelectItem value="sending">Enviando</SelectItem>
              <SelectItem value="delivered">Entregue</SelectItem>
              <SelectItem value="failed">Falha</SelectItem>
              <SelectItem value="cancelled">Cancelado</SelectItem>
            </SelectContent>
          </Select>
          <Select value={approval} onValueChange={setApproval}>
            <SelectTrigger className="bg-background/50 border-white/10">
              <SelectValue placeholder="Aprovação" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas Aprovações</SelectItem>
              <SelectItem value="approved">Aprovados</SelectItem>
              <SelectItem value="pending">Pendentes</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {hasFilters && (
          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="text-muted-foreground hover:text-foreground h-8"
            >
              <FilterX className="w-4 h-4 mr-2" /> Limpar Filtros
            </Button>
          </div>
        )}
      </div>

      <div className="grid gap-3">
        {loading ? (
          <div className="flex h-32 items-center justify-center text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : data.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground border border-dashed border-white/10 rounded-2xl">
            <ArchiveIcon className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="mb-4">Nenhum resultado encontrado para estes filtros.</p>
            {hasFilters && (
              <Button variant="outline" onClick={clearFilters}>
                Limpar Filtros
              </Button>
            )}
          </div>
        ) : (
          data.map((item) => (
            <div
              key={item.id}
              className="bg-card/40 border border-white/5 rounded-xl p-4 hover:bg-card/60 transition-colors"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h4 className="font-medium mr-2">{item.patient_name}</h4>
                    {getStatusBadge(item.status)}
                    <Badge
                      variant="outline"
                      className={
                        item.is_approved
                          ? 'border-emerald-500/30 text-emerald-500'
                          : 'border-amber-500/30 text-amber-500'
                      }
                    >
                      {item.is_approved ? 'Aprovado' : 'Pendente'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground font-mono">{item.phone_number}</p>
                  <div className="mt-3 text-sm italic text-muted-foreground/80 pl-3 border-l-2 border-white/10">
                    {item.message_body}
                  </div>
                  {item.notes && (
                    <p className="text-xs text-amber-500/80 mt-2">Motivo/Nota: {item.notes}</p>
                  )}
                </div>
                <div className="text-xs text-muted-foreground whitespace-nowrap bg-background/50 px-3 py-1.5 rounded-lg flex flex-col items-end gap-1">
                  <span>
                    Agendado:{' '}
                    {format(new Date(item.send_after), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                  </span>
                  <span className="opacity-50">
                    Modificado:{' '}
                    {format(new Date(item.updated_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
