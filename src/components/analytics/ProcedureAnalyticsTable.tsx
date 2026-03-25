import type { AnalyticsProcedureSummary } from '@/types'

interface ProcedureAnalyticsTableProps {
  data: AnalyticsProcedureSummary[]
}

export function ProcedureAnalyticsTable({ data }: ProcedureAnalyticsTableProps) {
  if (data.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 p-6 text-sm text-muted-foreground">
        Sem dados agregados por procedimento neste intervalo.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-white/10">
      <table className="min-w-full text-sm">
        <thead className="bg-white/5 text-left text-muted-foreground">
          <tr>
            <th className="px-4 py-3 font-medium">Procedimento</th>
            <th className="px-4 py-3 text-right font-medium">Enviadas</th>
            <th className="px-4 py-3 text-right font-medium">Sucesso</th>
            <th className="px-4 py-3 text-right font-medium">Falha</th>
            <th className="px-4 py-3 text-right font-medium">Taxa</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, index) => (
            <tr key={`${row.procedimento}-${index}`} className="border-t border-white/5">
              <td className="px-4 py-3 text-foreground">{row.procedimento}</td>
              <td className="px-4 py-3 text-right">{row.enviadas}</td>
              <td className="px-4 py-3 text-right text-emerald-400">{row.sucesso}</td>
              <td className="px-4 py-3 text-right text-red-400">{row.falha}</td>
              <td className="px-4 py-3 text-right font-semibold">{row.taxa_sucesso}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
