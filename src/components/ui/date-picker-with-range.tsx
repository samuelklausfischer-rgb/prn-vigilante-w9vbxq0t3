import * as React from 'react'
import {
  format,
  subDays,
  startOfToday,
  startOfYesterday,
  endOfToday,
  endOfYesterday,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Calendar as CalendarIcon } from 'lucide-react'
import { DateRange } from 'react-day-picker'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

interface DatePickerWithRangeProps extends React.HTMLAttributes<HTMLDivElement> {
  date: DateRange | undefined
  setDate: (date: DateRange | undefined) => void
}

export function DatePickerWithRange({ className, date, setDate }: DatePickerWithRangeProps) {
  return (
    <div className={cn('grid gap-2', className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={'outline'}
            className={cn(
              'w-full justify-start text-left font-normal bg-background/50 border-white/10 h-10',
              !date && 'text-muted-foreground',
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, 'dd MMM', { locale: ptBR })} -{' '}
                  {format(date.to, 'dd MMM yyyy', { locale: ptBR })}
                </>
              ) : (
                format(date.from, 'dd MMM yyyy', { locale: ptBR })
              )
            ) : (
              <span>Selecione um período</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 flex flex-col sm:flex-row" align="start">
          <div className="flex flex-col gap-1 p-3 border-b sm:border-b-0 sm:border-r border-border min-w-[140px]">
            <Button
              variant="ghost"
              className="justify-start font-normal"
              onClick={() => setDate({ from: startOfToday(), to: endOfToday() })}
            >
              Hoje
            </Button>
            <Button
              variant="ghost"
              className="justify-start font-normal"
              onClick={() => setDate({ from: startOfYesterday(), to: endOfYesterday() })}
            >
              Ontem
            </Button>
            <Button
              variant="ghost"
              className="justify-start font-normal"
              onClick={() => setDate({ from: subDays(new Date(), 7), to: new Date() })}
            >
              Últimos 7 dias
            </Button>
            <Button
              variant="ghost"
              className="justify-start font-normal"
              onClick={() => setDate({ from: subDays(new Date(), 30), to: new Date() })}
            >
              Últimos 30 dias
            </Button>
          </div>
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={setDate}
            numberOfMonths={1}
            locale={ptBR}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
