import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

interface DailyTrendChartProps {
  data: Array<{ date: string; enviadas: number; sucesso: number; falha: number }>
}

export function DailyTrendChart({ data }: DailyTrendChartProps) {
  const chartData = data.map((item) => ({
    ...item,
    date: new Date(`${item.date}T00:00:00`).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
    }),
  }))

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
        <XAxis dataKey="date" stroke="#94a3b8" />
        <YAxis stroke="#94a3b8" />
        <Tooltip />
        <Legend />
        <Bar dataKey="enviadas" name="Enviadas" fill="#3b82f6" radius={[8, 8, 0, 0]} />
        <Bar dataKey="sucesso" name="Sucesso" fill="#10b981" radius={[8, 8, 0, 0]} />
        <Bar dataKey="falha" name="Falha" fill="#ef4444" radius={[8, 8, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
