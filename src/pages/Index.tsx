import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Activity, Clock, Send, AlertCircle } from 'lucide-react'

export default function Index() {
  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card/50 backdrop-blur-sm border-white/5 shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-400" />
              Taxa de Envio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-heading">45/min</div>
            <p className="text-xs text-muted-foreground mt-1">Status ideal</p>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-white/5 shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              Na Fila
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-heading">1.204</div>
            <p className="text-xs text-muted-foreground mt-1">Aguardando processamento</p>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-white/5 shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Send className="w-4 h-4 text-emerald-400" />
              Enviados Hoje
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-heading">15.832</div>
            <p className="text-xs text-emerald-400/80 mt-1">+12% comparado a ontem</p>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-white/5 shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400" />
              Falhas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-heading text-red-400">23</div>
            <p className="text-xs text-muted-foreground mt-1">Requer atenção</p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card/50 backdrop-blur-sm border-white/5 shadow-xl">
        <CardHeader>
          <CardTitle className="font-heading text-lg">Últimos Envios Processados</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="flex items-center justify-between p-4 rounded-xl border border-white/5 bg-background/50 hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 z-10 relative" />
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 absolute inset-0 animate-ping opacity-75" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">+55 11 99999-999{i}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Confirmação de Agendamento
                    </p>
                  </div>
                </div>
                <div className="text-xs font-medium text-muted-foreground bg-white/5 px-2 py-1 rounded-md">
                  Há {i} min
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
