import { CalendarRange, Clock3 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { DateRangeFilter } from '@/types'

type QuickRangeKey = 'yesterday' | 'today' | 'last7' | 'last14' | 'last30' | 'custom'

interface QuickRangeOption {
  key: QuickRangeKey
  label: string
}

interface DateRangePickerProps {
  value: DateRangeFilter
  selectedPreset: QuickRangeKey
  onChange: (range: DateRangeFilter, preset: QuickRangeKey) => void
}

const quickOptions: QuickRangeOption[] = [
  { key: 'yesterday', label: 'Ontem' },
  { key: 'today', label: 'Hoje' },
  { key: 'last7', label: 'Ultimos 7 dias' },
  { key: 'last14', label: 'Ultimos 14 dias' },
  { key: 'last30', label: 'Ultimos 30 dias' },
]

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0)
}

function endOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999)
}

function toInputValue(date?: Date) {
  if (!date) return ''
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function buildPresetRange(preset: QuickRangeKey): DateRangeFilter {
  const now = new Date()

  switch (preset) {
    case 'yesterday': {
      const yesterday = new Date(now)
      yesterday.setDate(now.getDate() - 1)
      return { from: startOfDay(yesterday), to: endOfDay(yesterday) }
    }
    case 'today':
      return { from: startOfDay(now), to: endOfDay(now) }
    case 'last7': {
      const from = new Date(now)
      from.setDate(now.getDate() - 6)
      return { from: startOfDay(from), to: endOfDay(now) }
    }
    case 'last14': {
      const from = new Date(now)
      from.setDate(now.getDate() - 13)
      return { from: startOfDay(from), to: endOfDay(now) }
    }
    case 'last30': {
      const from = new Date(now)
      from.setDate(now.getDate() - 29)
      return { from: startOfDay(from), to: endOfDay(now) }
    }
    default:
      return { from: startOfDay(now), to: endOfDay(now) }
  }
}

export function DateRangePicker({ value, selectedPreset, onChange }: DateRangePickerProps) {
  const handlePreset = (preset: QuickRangeKey) => {
    onChange(buildPresetRange(preset), preset)
  }

  const handleDateChange = (field: 'from' | 'to', rawValue: string) => {
    const nextDate = rawValue
      ? field === 'from'
        ? startOfDay(new Date(`${rawValue}T00:00:00`))
        : endOfDay(new Date(`${rawValue}T00:00:00`))
      : undefined

    onChange(
      {
        from: field === 'from' ? nextDate : value.from,
        to: field === 'to' ? nextDate : value.to,
      },
      'custom',
    )
  }

  return (
    <div className="w-full max-w-4xl rounded-3xl border border-white/10 bg-card/50 p-4 shadow-xl shadow-black/10 backdrop-blur-sm">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          <Clock3 className="h-3.5 w-3.5" />
          Periodo do painel
        </div>

        <div className="flex flex-wrap gap-2">
          {quickOptions.map((option) => (
            <Button
              key={option.key}
              type="button"
              size="sm"
              variant={selectedPreset === option.key ? 'default' : 'outline'}
              className={cn(selectedPreset === option.key && 'bg-blue-600 hover:bg-blue-500')}
              onClick={() => handlePreset(option.key)}
            >
              {option.label}
            </Button>
          ))}
        </div>

        <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
          <label className="space-y-2 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em]">
              <CalendarRange className="h-3.5 w-3.5" />
              Data inicial
            </span>
            <input
              type="date"
              value={toInputValue(value.from)}
              onChange={(event) => handleDateChange('from', event.target.value)}
              className="h-11 w-full rounded-2xl border border-white/10 bg-background/60 px-3 text-sm text-foreground"
            />
          </label>

          <label className="space-y-2 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em]">
              <CalendarRange className="h-3.5 w-3.5" />
              Data final
            </span>
            <input
              type="date"
              value={toInputValue(value.to)}
              onChange={(event) => handleDateChange('to', event.target.value)}
              className="h-11 w-full rounded-2xl border border-white/10 bg-background/60 px-3 text-sm text-foreground"
            />
          </label>

          <div className="rounded-2xl border border-white/10 bg-background/40 px-4 py-3 text-sm text-muted-foreground">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em]">Modo atual</div>
            <div className="mt-1 font-medium text-white">{selectedPreset === 'custom' ? 'Calendario personalizado' : quickOptions.find((option) => option.key === selectedPreset)?.label}</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export { buildPresetRange }
