import { cn } from '@/lib/utils'

interface TabCounterProps {
  count: number
  tone?: 'default' | 'warning' | 'danger' | 'success' | 'info'
}

const toneClasses = {
  default: 'bg-white/10 text-white',
  warning: 'bg-amber-500/20 text-amber-200',
  danger: 'bg-red-500/20 text-red-200',
  success: 'bg-emerald-500/20 text-emerald-200',
  info: 'bg-sky-500/20 text-sky-200',
}

export function TabCounter({ count, tone = 'default' }: TabCounterProps) {
  return (
    <span className={cn('ml-2 inline-flex min-w-6 items-center justify-center rounded-full px-2 py-0.5 text-[11px] font-semibold', toneClasses[tone])}>
      {count}
    </span>
  )
}
