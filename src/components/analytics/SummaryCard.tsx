import { TrendingDown, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SummaryCardProps {
  title: string
  value: number | string
  change: string
  color?: 'default' | 'green' | 'red' | 'blue'
}

const colorMap = {
  default: 'text-white',
  green: 'text-emerald-300',
  red: 'text-red-300',
  blue: 'text-blue-300',
}

export function SummaryCard({ title, value, change, color = 'default' }: SummaryCardProps) {
  const isPositive = !change.startsWith('-')

  return (
    <div className="rounded-2xl border border-white/10 bg-card/60 p-5 shadow-lg shadow-black/10 backdrop-blur-sm">
      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {title}
      </div>
      <div className={cn('mt-3 text-3xl font-bold', colorMap[color])}>{value}</div>
      <div
        className={cn(
          'mt-3 flex items-center gap-2 text-sm',
          isPositive ? 'text-emerald-400' : 'text-red-400',
        )}
      >
        {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
        <span>{change}</span>
        <span className="text-muted-foreground">vs janela anterior</span>
      </div>
    </div>
  )
}
