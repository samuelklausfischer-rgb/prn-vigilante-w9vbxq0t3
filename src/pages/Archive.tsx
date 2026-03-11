import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
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
  ListFilter,
} from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Badge } from '@/components/ui/badge'
import { fetchArchive, ArchiveFilters, PatientQueue } from '@/services/archive'
import { DatePickerWithRange } from '@/components/ui/date-picker-with-range'
import { DateRange } from 'react-day-picker'
import { useToast } from '@/hooks/use-toast'
import { useDebounce } from '@/hooks/use-debounce'
import { cn } from '@/lib/utils'

const STATUS_OPTIONS = [
  {
    value: 'all',
    label: 'Todos os Status',
    icon: ListFilter,
    style: {
      trigger: 'border-white/10 bg-background/50 hover:bg-white/5 text-foreground',
      icon: 'text-muted-foreground',
    },
  },
  {
    value: 'queued',
    label: 'Na Fila',
    icon: Clock,
    style: {
      trigger: 'border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400',
      icon: 'text-blue-400',
    },
  },
  {
    value: 'sending',
    label: 'Enviando',
    icon: Send,
    style: {
      trigger: 'border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400',
      icon: 'text-amber-400',
    },
  },
  {
    value: 'delivered',
    label: 'Entregue',
    icon: CheckCircle2,
    style: {
      trigger: 'border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400',
      icon: 'text-emerald-400',
    },
  },
  {
    value: 'failed',
    label: 'Falha',
    icon: AlertCircle,
    style: {
      trigger: 'border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-400',
      icon: 'text-red-400',
    },
  },
  {
    value: 'cancelled',
    label: 'Cancelado',
    icon: Ban,
    style: {
      trigger: 'border-slate-500/30 bg-slate-500/10 hover:bg-slate-500/20 text-slate-300',
      icon: 'text-slate-400',
    },
  },
]

const APPROVAL_OPTIONS = [
  {
    value: 'all',
    label: 'Todas as Aprovações',
    icon: ListFilter,
    style: {
      trigger: 'border-white/10 bg-background/50 hover:bg-white/5 text-foreground',
      icon: 'text-muted-foreground',
    },
  },
  {
    value: 'approved',
    label: 'Aprovados',
    icon: CheckCircle2,
    style: {
      trigger: 'border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400',
      icon: 'text-emerald-400',
    },
  },
  {
    value: 'pending',
    label: 'Pendentes',
    icon: Clock,
    style: {
      trigger: 'border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400',
      icon: 'text-amber-400',
    },
  },
]

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
    let mounted = true
    const loadData = async () => {
      setLoading(true)
      try {
        const filters: ArchiveFilters = {
          search: debouncedSearch,
          dateRange,
          status,
          isApproved: approval === 'all' ? null : approval === 'approved',
        }
        const result = await fetchArchive(filters)
        if (mounted) setData(result)
      } catch (error) {
        if (mounted)
          toast({
            title: 'Erro',
            description: 'Falha ao carregar histórico.',
            variant: 'destructive',
          })
      } finally {
        if (mounted) setLoading(false)
      }
    }
    loadData()
    return () => {
      mounted = false
    }
  }, [debouncedSearch, dateRange, status, approval, toast])

  const clearFilters = () => {
    setSearch('')
    setDateRange(undefined)
    setStatus('all')
    setApproval('all')
  }

  const hasFilters =
    search !== '' || dateRange !== undefined || status !== 'all' || approval !== 'all'
  const activeStatus = STATUS_OPTIONS.find((o) => o.value === status) || STATUS_OPTIONS[0]
  const activeApproval = APPROVAL_OPTIONS.find((o) => o.value === approval) || APPROVAL_OPTIONS[0]

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h2 className="text-2xl font-heading font-semibold">Histórico e Arquivo</h2>
        <p className="text-muted-foreground">
          Analise todos os disparos com filtros avançados e interativos.
        </p>
      </div>

      <div className="bg-card/50 p-4 rounded-2xl border border-white/5 backdrop-blur-md shadow-sm space-y-4 transition-all">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar paciente, telefone ou mensagem..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-background/50 border-white/10 h-11 rounded-xl focus-visible:ring-blue-500/50"
            />
          </div>
          <div className="w-full md:w-auto md:min-w-[260px]">
            <DatePickerWithRange
              date={dateRange}
              setDate={setDateRange}
              className="[&_button]:h-11 [&_button]:rounded-xl [&_button]:bg-background/50"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'h-10 rounded-xl border-dashed transition-all duration-300',
                  activeStatus.style.trigger,
                )}
              >
                <activeStatus.icon className={cn('w-4 h-4 mr-2', activeStatus.style.icon)} />
                <span className="font-medium mr-1 opacity-70">Status:</span>
                <span className="font-semibold">{activeStatus.label}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className="w-[200px] rounded-xl border-white/10 bg-card/95 backdrop-blur-xl shadow-xl"
            >
              <DropdownMenuLabel className="text-xs text-muted-foreground uppercase font-medium tracking-wider">
                Filtrar por Status
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-white/5" />
              <DropdownMenuRadioGroup value={status} onValueChange={setStatus}>
                {STATUS_OPTIONS.map((opt) => (
                  <DropdownMenuRadioItem
                    key={opt.value}
                    value={opt.value}
                    className="rounded-lg cursor-pointer focus:bg-white/10 transition-colors py-2"
                  >
                    <opt.icon className={cn('w-4 h-4 mr-2', opt.style.icon)} />
                    {opt.label}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'h-10 rounded-xl border-dashed transition-all duration-300',
                  activeApproval.style.trigger,
                )}
              >
                <activeApproval.icon className={cn('w-4 h-4 mr-2', activeApproval.style.icon)} />
                <span className="font-medium mr-1 opacity-70">Aprovação:</span>
                <span className="font-semibold">{activeApproval.label}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className="w-[220px] rounded-xl border-white/10 bg-card/95 backdrop-blur-xl shadow-xl"
            >
              <DropdownMenuLabel className="text-xs text-muted-foreground uppercase font-medium tracking-wider">
                Filtrar por Aprovação
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-white/5" />
              <DropdownMenuRadioGroup value={approval} onValueChange={setApproval}>
                {APPROVAL_OPTIONS.map((opt) => (
                  <DropdownMenuRadioItem
                    key={opt.value}
                    value={opt.value}
                    className="rounded-lg cursor-pointer focus:bg-white/10 transition-colors py-2"
                  >
                    <opt.icon className={cn('w-4 h-4 mr-2', opt.style.icon)} />
                    {opt.label}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          {hasFilters && (
            <Button
              variant="ghost"
              onClick={clearFilters}
              className="h-10 rounded-xl text-muted-foreground hover:text-white hover:bg-white/5 transition-all ml-auto sm:ml-0"
            >
              <FilterX className="w-4 h-4 mr-2" />
              Limpar
            </Button>
          )}
        </div>
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
              className="bg-card/40 border border-white/5 rounded-2xl p-5 hover:bg-card/60 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/20 group"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h4 className="font-heading font-semibold text-lg mr-2 group-hover:text-blue-400 transition-colors">
                      {item.patient_name}
                    </h4>
                    {getStatusBadge(item.status)}
                    <Badge
                      variant="outline"
                      className={
                        item.is_approved
                          ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10'
                          : 'border-amber-500/30 text-amber-400 bg-amber-500/10'
                      }
                    >
                      {item.is_approved ? 'Aprovado' : 'Pendente'}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground font-mono bg-background/50 w-fit px-2 py-1 rounded-md">
                    {item.phone_number}
                  </div>
                  <div className="mt-3 text-sm text-muted-foreground/90 pl-4 border-l-2 border-white/10 relative">
                    <div className="absolute left-[-2px] top-0 bottom-0 w-[2px] bg-gradient-to-b from-blue-500/50 to-transparent rounded-full" />
                    {item.message_body}
                  </div>
                  {item.notes && (
                    <p className="text-xs text-amber-500/80 mt-2 bg-amber-500/10 px-3 py-1.5 rounded-lg inline-block">
                      Motivo: {item.notes}
                    </p>
                  )}
                </div>
                <div className="text-xs text-muted-foreground whitespace-nowrap bg-background/50 px-4 py-3 rounded-xl flex flex-col items-end gap-1.5 border border-white/5 shadow-inner">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 opacity-50" />
                    Agendado:{' '}
                    <span className="font-medium text-foreground/80">
                      {format(new Date(item.send_after), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                    </span>
                  </span>
                  <span className="flex items-center gap-1.5 opacity-60">
                    <ArchiveIcon className="w-3.5 h-3.5 opacity-50" />
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
