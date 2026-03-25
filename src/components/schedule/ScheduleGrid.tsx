import { useEffect, useState } from 'react'
import { Calendar, Clock, Phone, RefreshCw } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { fetchDaySchedule, type DayScheduleItem } from '@/services/schedule'
import { formatPhoneBR } from '@shared/utils/phone-utils'

const TIME_SLOTS = [
  { key: 'manha', label: 'Manhã', time: '07:00', icon: '🌅' },
  { key: 'tarde', label: 'Tarde', time: '13:00', icon: '☀️' },
  { key: 'noite', label: 'Noite', time: '19:00', icon: '🌙' },
] as const

type TimeSlotKey = (typeof TIME_SLOTS)[number]['key']

interface ScheduleGridProps {
  date: string
  onSlotClick?: (item: DayScheduleItem | null, slot: TimeSlotKey) => void
}

interface GroupedSchedule {
  manha: DayScheduleItem | null
  tarde: DayScheduleItem | null
  noite: DayScheduleItem | null
}

function getStatusStyle(status: string) {
  switch (status) {
    case 'confirmed':
      return 'bg-green-500/15 text-green-200 border-green-500/30'
    case 'contacting':
      return 'bg-emerald-500/15 text-emerald-200 border-emerald-500/30'
    case 'queued':
      return 'bg-blue-500/15 text-blue-200 border-blue-500/30'
    case 'followup_due':
      return 'bg-orange-500/15 text-orange-200 border-orange-500/30'
    case 'pending_manual':
      return 'bg-red-500/15 text-red-200 border-red-500/30'
    case 'cancelled':
      return 'bg-gray-500/15 text-gray-200 border-gray-500/30'
    default:
      return 'bg-white/10 text-white border-white/10'
  }
}

function formatDateBr(dateIso: string): string {
  const date = new Date(dateIso + 'T00:00:00')
  return date.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function formatTime(time: string): string {
  return time.slice(0, 5)
}

export function ScheduleGrid({ date, onSlotClick }: ScheduleGridProps) {
  const [loading, setLoading] = useState(true)
  const [schedule, setSchedule] = useState<GroupedSchedule>({
    manha: null,
    tarde: null,
    noite: null,
  })

  useEffect(() => {
    async function loadSchedule() {
      setLoading(true)
      try {
        const data = await fetchDaySchedule(date)
        const grouped = groupByTimeSlot(data)
        setSchedule(grouped)
      } finally {
        setLoading(false)
      }
    }
    loadSchedule()
  }, [date])

  function groupByTimeSlot(items: DayScheduleItem[]): GroupedSchedule {
    const result: GroupedSchedule = { manha: null, tarde: null, noite: null }

    for (const item of items) {
      const hour = parseInt(item.horario_inicio.split(':')[0], 10)
      if (hour >= 7 && hour < 13) {
        result.manha = item
      } else if (hour >= 13 && hour < 19) {
        result.tarde = item
      } else if (hour >= 19 || hour < 7) {
        result.noite = item
      }
    }

    return result
  }

  function handleSlotClick(slot: TimeSlotKey) {
    const item = schedule[slot]
    if (onSlotClick) {
      onSlotClick(item, slot)
    }
  }

  if (loading) {
    return (
      <Card className="border-white/10 bg-card/40">
        <CardHeader>
          <CardTitle className="text-white">{formatDateBr(date)}</CardTitle>
        </CardHeader>
        <CardContent className="flex h-64 items-center justify-center">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-white/10 bg-card/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white">{formatDateBr(date)}</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              fetchDaySchedule(date).then((data) => {
                const grouped = groupByTimeSlot(data)
                setSchedule(grouped)
              })
            }}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Atualizar
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-3">
          {TIME_SLOTS.map((slot) => {
            const item = schedule[slot.key]
            return (
              <div
                key={slot.key}
                className="flex flex-col gap-3 rounded-xl border border-white/10 bg-card/30 p-4"
              >
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{slot.icon}</span>
                    <span className="font-medium text-white">{slot.label}</span>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {slot.time}
                  </div>
                </div>

                {item ? (
                  <div
                    className="cursor-pointer rounded-lg bg-white/5 p-3 transition-colors hover:bg-white/10"
                    onClick={() => handleSlotClick(slot.key)}
                  >
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <span className="font-medium text-white">{item.patient_name}</span>
                      <Badge variant="outline" className={getStatusStyle(item.journey_status)}>
                        {item.journey_status}
                      </Badge>
                    </div>
                    <div className="mb-2 flex items-center gap-1 text-xs text-muted-foreground">
                      <Phone className="h-3 w-3" />
                      {formatPhoneBR(item.phone)}
                    </div>
                    {item.procedimentos && (
                      <div className="mb-2 line-clamp-2 text-xs text-muted-foreground">
                        {item.procedimentos}
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {formatTime(item.horario_inicio)} - {formatTime(item.horario_final)}
                    </div>
                    {item.vacancy_signal && (
                      <div className="mt-2 rounded bg-red-500/10 px-2 py-1 text-xs text-red-200">
                        ⚠️ {item.vacancy_signal}
                      </div>
                    )}
                  </div>
                ) : (
                  <button
                    type="button"
                    className="flex flex-1 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-white/10 py-8 text-sm text-muted-foreground transition-colors hover:border-white/20 hover:bg-white/5"
                    onClick={() => handleSlotClick(slot.key)}
                  >
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-lg">➕</span>
                      <span>VAGO</span>
                    </div>
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
