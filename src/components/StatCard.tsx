import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface StatCardProps {
  title: string
  value: string | number
  icon: React.ReactNode
  trend?: string
  trendUp?: boolean
  alert?: boolean
  className?: string
}

export function StatCard({ title, value, icon, trend, trendUp, alert, className }: StatCardProps) {
  return (
    <Card
      className={cn(
        'border-white/5 bg-card/80 backdrop-blur-md rounded-2xl overflow-hidden',
        className,
      )}
    >
      <CardContent className="p-6 flex items-start gap-4">
        <div
          className={cn(
            'p-3 rounded-xl',
            alert ? 'bg-red-500/10 text-red-500' : 'bg-blue-500/10 text-blue-500',
          )}
        >
          {icon}
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <div className="flex items-baseline gap-2 mt-1">
            <h3 className="text-3xl font-heading font-bold">{value}</h3>
            {trend && (
              <span
                className={cn(
                  'text-xs font-medium',
                  trendUp ? 'text-emerald-500' : 'text-amber-500',
                )}
              >
                {trend}
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
