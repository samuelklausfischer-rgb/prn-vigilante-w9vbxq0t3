import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Search,
  Loader2,
  Archive as ArchiveIcon,
  Clock,
  Copy,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Checkbox } from '@/components/ui/checkbox'
import { fetchArchive, ArchiveFilters, PatientQueue } from '@/services/archive'
import { formatBrFromIso } from '@shared/templates/sara-message'
import { DatePickerWithRange } from '@/components/ui/date-picker-with-range'
import { DateRange } from 'react-day-picker'
import { useToast } from '@/hooks/use-toast'
import { useDebounce } from '@/hooks/use-debounce'
import { supabase } from '@/lib/supabase/client'
import { copyToClipboard, cn } from '@/lib/utils'

export default function Archive() {
  const [data, setData] = useState<PatientQueue[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 500)
  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  const [refreshKey, setRefreshKey] = useState(0)
  const { toast } = useToast()

  useEffect(() => {
    let mounted = true
    const loadData = async () => {
      setLoading(true)
      try {
        const filters: ArchiveFilters = {
          search: debouncedSearch,
          dateRange,
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
  }, [debouncedSearch, dateRange, refreshKey])

  const clearFilters = () => {
    setSearch('')
    setDateRange(undefined)
  }

  const hasFilters = search !== '' || dateRange !== undefined

  const formatScheduleTime = (value?: string | null) => {
    if (!value) return '—'
    return value.length >= 5 ? value.slice(0, 5) : value
  }

  const copyText = async (label: string, value: string) => {
    const success = await copyToClipboard(value)
    if (success) {
      toast({ title: 'Copiado', description: `${label} copiado.` })
    } else {
      toast({ title: 'Falha ao copiar', description: 'Não foi possível copiar.', variant: 'destructive' })
    }
  }

  const handleProcessed = async (id: string) => {
    const prev = data
    setData((d) => d.filter((r) => r.id !== id))
    try {
      const { error } = await (supabase.from('patients_queue') as any).delete().eq('id', id)
      if (error) throw error
      toast({ title: 'Removido', description: 'Paciente removido do Arquivo Morto e do banco.' })
    } catch (e: any) {
      setData(prev)
      toast({ title: 'Erro ao remover', description: e?.message || 'Falha inesperada.', variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-heading font-semibold text-slate-100">Arquivo Morto</h2>
          <p className="text-sm text-muted-foreground">
            Lista de pacientes que responderam. Filtre pela <strong>data do agendamento</strong>.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setRefreshKey((k) => k + 1)}
          disabled={loading}
          className="hidden sm:flex items-center gap-2 text-[10px] font-mono text-blue-400 bg-blue-400/10 px-4 py-2 rounded-full border border-blue-400/20 uppercase tracking-widest hover:bg-blue-400/20 transition-all shadow-[0_0_15px_rgba(59,130,246,0.15)]"
        >
          <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
          Atualizar Lista
        </Button>
      </div>

      <div className="bg-card/50 p-4 rounded-2xl border border-white/5 backdrop-blur-md shadow-sm space-y-4 transition-all">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar paciente ou telefone..."
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
          {hasFilters && (
            <Button
              variant="ghost"
              onClick={clearFilters}
              className="h-11 rounded-xl text-muted-foreground hover:text-white hover:bg-white/5 transition-all"
            >
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
              <div className="flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Checkbox onCheckedChange={(v) => v === true && handleProcessed(item.id)} />
                    <div>
                      <div className="text-sm font-semibold text-white flex items-center gap-2">
                        {item.patient_name}
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-muted-foreground hover:text-white"
                          onClick={() => copyText('Nome', item.patient_name)}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2">
                        <span className="font-mono">{item.phone_number}</span>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-muted-foreground hover:text-white"
                          onClick={() => copyText('Telefone', item.phone_number)}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2">
                        <span>
                          <span className="text-slate-300">Nascimento:</span> {item.Data_nascimento || '—'}
                        </span>
                        {item.Data_nascimento ? (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-muted-foreground hover:text-white"
                            onClick={() => copyText('Nascimento', String(item.Data_nascimento))}
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                        ) : null}
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2">
                        <span>
                          <span className="text-slate-300">Procedimento:</span> {item.procedimentos || '—'}
                        </span>
                        {item.procedimentos ? (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-muted-foreground hover:text-white"
                            onClick={() => copyText('Procedimento', String(item.procedimentos))}
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                        ) : null}
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2">
                        <span>
                          <span className="text-slate-300">Horário agendado:</span> {formatScheduleTime(item.horario_inicio)}
                        </span>
                        {item.horario_inicio ? (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-muted-foreground hover:text-white"
                            onClick={() => copyText('Horário agendado', formatScheduleTime(item.horario_inicio))}
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                        ) : null}
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2">
                        <span>
                          <span className="text-slate-300">Data do exame:</span> {item.data_exame ? formatBrFromIso(item.data_exame) : '—'}
                        </span>
                        {item.data_exame ? (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-muted-foreground hover:text-white"
                            onClick={() => copyText('Data do exame', formatBrFromIso(item.data_exame!))}
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="text-xs text-muted-foreground whitespace-nowrap bg-background/50 px-4 py-3 rounded-xl flex flex-col items-end gap-1.5 border border-white/5 shadow-inner">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 opacity-60" />
                      Entregue:{' '}
                      <span className="font-medium text-foreground/80">
                        {item.delivered_at
                          ? format(new Date(item.delivered_at as any), 'dd/MM/yyyy HH:mm', { locale: ptBR })
                          : '—'}
                      </span>
                    </span>
                    <span className="flex items-center gap-1.5 opacity-60">
                      <Clock className="w-3.5 h-3.5 opacity-50" />
                      Atualizado:{' '}
                      {format(new Date(item.updated_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
