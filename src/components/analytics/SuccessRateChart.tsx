import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

interface SuccessRateChartProps {
  data: Array<{ date: string; rate: string }>
}

export function SuccessRateChart({ data }: SuccessRateChartProps) {
  const chartData = data.map((item) => ({
    date: new Date(`${item.date}T00:00:00`).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
    }),
    rate: Number(item.rate),
  }))

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
        <XAxis dataKey="date" stroke="#94a3b8" />
        <YAxis stroke="#94a3b8" domain={[0, 100]} />
        <Tooltip formatter={(value: number) => [`${value.toFixed(1)}%`, 'Taxa de sucesso']} />
        <Line type="monotone" dataKey="rate" stroke="#38bdf8" strokeWidth={3} dot={{ r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  )
}
