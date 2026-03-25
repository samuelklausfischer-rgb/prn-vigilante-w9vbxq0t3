import { useState, type ReactNode } from 'react'
import { AlertCircle, BarChart3, Loader2 } from 'lucide-react'
import { useAnalytics } from '@/hooks/use-analytics'
import type { DateRangeFilter } from '@/types'
import { DateRangePicker, buildPresetRange } from '@/components/analytics/DateRangePicker'
import { SummaryCard } from '@/components/analytics/SummaryCard'
import { DailyTrendChart } from '@/components/analytics/DailyTrendChart'
import { SuccessRateChart } from '@/components/analytics/SuccessRateChart'
import { ProcedureAnalyticsTable } from '@/components/analytics/ProcedureAnalyticsTable'

function buildDefaultRange(): DateRangeFilter {
  return buildPresetRange('today')
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-card/55 p-5 shadow-xl shadow-black/10 backdrop-blur-sm">
      <div className="mb-4 text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {title}
      </div>
      {children}
    </div>
  )
}

export default function Analytics() {
  const [range, setRange] = useState<DateRangeFilter>(buildDefaultRange())
  const [preset, setPreset] = useState<
    'yesterday' | 'today' | 'last7' | 'last14' | 'last30' | 'custom'
  >('today')
  const { analytics, loading, error } = useAnalytics(30, range)

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-blue-300">
            <BarChart3 className="h-3.5 w-3.5" />
            Analytics
          </div>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-white">
            Painel principal de desempenho
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Acompanhe volume disparado, taxa de sucesso e comportamento por procedimento sem
            misturar com a fila operacional.
          </p>
        </div>
        <DateRangePicker
          value={range}
          selectedPreset={preset}
          onChange={(nextRange, nextPreset) => {
            setRange(nextRange)
            setPreset(nextPreset)
          }}
        />
      </div>

      {loading ? (
        <div className="flex h-72 items-center justify-center rounded-3xl border border-white/10 bg-card/40">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="flex items-center gap-3 rounded-3xl border border-red-500/20 bg-red-500/10 p-5 text-red-200">
          <AlertCircle className="h-5 w-5" />
          <span>{error}</span>
        </div>
      ) : analytics ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              title="Total disparado"
              value={analytics.total_enviadas}
              change={analytics.change_enviadas}
              color="blue"
            />
            <SummaryCard
              title="Sucesso"
              value={analytics.sucesso}
              change={analytics.change_sucesso}
              color="green"
            />
            <SummaryCard
              title="Falha"
              value={analytics.falha}
              change={analytics.change_falha}
              color="red"
            />
            <SummaryCard
              title="Taxa de sucesso"
              value={`${analytics.taxa_sucesso}%`}
              change={analytics.change_taxa_sucesso}
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <Panel title="Volume diario">
              <DailyTrendChart data={analytics.daily_trend} />
            </Panel>
            <Panel title="Taxa diaria de sucesso">
              <SuccessRateChart data={analytics.success_rate} />
            </Panel>
          </div>

          <Panel title="Performance por procedimento">
            <ProcedureAnalyticsTable data={analytics.por_procedimento} />
          </Panel>
        </>
      ) : null}
    </div>
  )
}
