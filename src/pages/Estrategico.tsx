import { useState, useEffect, useCallback } from 'react'
import { Calendar as CalendarIcon, RefreshCw, AlertTriangle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import {
  fetchDaySchedule,
  fetchAvailableDates,
  fetchDayScheduleSummary,
  type ScheduleItem,
  type AvailableDate,
  type DayScheduleSummary,
} from '@/services/schedule'
import { ScheduleList } from '@/components/schedule/ScheduleList'
import { PatientRegisterModal } from '@/components/schedule/PatientRegisterModal'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

function formatDateForDisplay(dateStr: string): string {
  try {
    const date = new Date(dateStr + 'T00:00:00')
    return date.toLocaleDateString('pt-BR', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
    })
  } catch {
    return dateStr
  }
}

function formatDateForInput(dateStr: string): string {
  try {
    const date = new Date(dateStr + 'T00:00:00')
    return date.toLocaleDateString('pt-BR')
  } catch {
    return dateStr
  }
}

export default function Estrategico() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [scheduleData, setScheduleData] = useState<ScheduleItem[]>([])
  const [scheduleSummary, setScheduleSummary] = useState<DayScheduleSummary | null>(null)
  const [availableDates, setAvailableDates] = useState<AvailableDate[]>([])
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [refreshing, setRefreshing] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [prefillTime, setPrefillTime] = useState<string>('')

  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd')

  const refetchSchedule = useCallback(async () => {
    setRefreshing(true)
    try {
      const [schedule, dates, summary] = await Promise.all([
        fetchDaySchedule(selectedDateStr),
        fetchAvailableDates(),
        fetchDayScheduleSummary(selectedDateStr),
      ])
      setScheduleData(schedule)
      setAvailableDates(dates)
      setScheduleSummary(summary)
    } catch (e) {
      console.error('Error fetching schedule:', e)
      toast({
        title: 'Erro ao carregar',
        description: 'Falha ao buscar dados da agenda',
        variant: 'destructive',
      })
    } finally {
      setRefreshing(false)
      setLoading(false)
    }
  }, [selectedDateStr, toast])

  useEffect(() => {
    refetchSchedule()
  }, [refetchSchedule])

  const handleGapClick = (item: ScheduleItem) => {
    if (item.item_type === 'gap') {
      setPrefillTime(item.horario_inicio || '')
      setModalOpen(true)
    }
  }

  const handlePatientClick = (item: ScheduleItem) => {
    if (item.item_type === 'patient' && item.journey_id) {
      toast({
        title: 'Paciente selecionado',
        description: `ID: ${item.journey_id}`,
      })
    }
  }

  const handleModalSuccess = () => {
    refetchSchedule()
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Agenda de Exames</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Gerencie os agendamentos do dia e identifique lacunas no schedule.
          </p>
        </div>
      </div>

      <Card className="border-white/10 bg-card/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg text-white">Selecione a Data</CardTitle>
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-[240px] justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, 'PPP', { locale: ptBR }) : 'Selecione uma data'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && setSelectedDate(date)}
                    locale={ptBR}
                    fromDate={new Date()}
                  />
                </PopoverContent>
              </Popover>
              <Button variant="outline" size="sm" onClick={() => setSelectedDate(new Date())}>
                HOJE
              </Button>
              <Button variant="outline" size="sm" onClick={refetchSchedule} disabled={refreshing}>
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {scheduleSummary && (
            <div className="flex flex-wrap gap-3 mb-4">
              <Badge variant="outline" className="bg-blue-500/15 text-blue-200 border-blue-500/30">
                {scheduleSummary.total_pacientes} pacientes
              </Badge>
              <Badge variant="outline" className="bg-yellow-500/15 text-yellow-200 border-yellow-500/30">
                🟡 {scheduleSummary.encaixe_count} encaixes
              </Badge>
              <Badge variant="outline" className="bg-orange-500/15 text-orange-200 border-orange-500/30">
                🟠 {scheduleSummary.significativo_count} significativos
              </Badge>
              <Badge variant="outline" className="bg-red-500/15 text-red-200 border-red-500/30">
                🔴 {scheduleSummary.critico_count} críticos
              </Badge>
              {scheduleSummary.total_minutos_livres > 0 && (
                <Badge variant="outline" className="bg-purple-500/15 text-purple-200 border-purple-500/30">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  {Math.floor(scheduleSummary.total_minutos_livres / 60)}h {scheduleSummary.total_minutos_livres % 60}min sem paciente
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-white/10 bg-card/50">
        <CardContent className="p-4">
          {loading ? (
            <div className="flex items-center justify-center h-72">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <ScheduleList
              schedule={scheduleData}
              onPatientClick={handlePatientClick}
              onGapClick={handleGapClick}
            />
          )}
        </CardContent>
      </Card>

      <PatientRegisterModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        selectedDate={format(selectedDate, 'dd/MM/yyyy')}
        prefillTime={prefillTime}
        onSuccess={handleModalSuccess}
      />
    </div>
  )
}