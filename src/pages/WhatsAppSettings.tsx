import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Smartphone, QrCode, Power, Settings2, RefreshCw } from 'lucide-react'

export default function WhatsAppSettings() {
  return (
    <div className="space-y-6 animate-fade-in-up">
      <Card className="bg-card/50 backdrop-blur-sm border-white/5 shadow-xl">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="font-heading flex items-center gap-2 text-xl">
                <Smartphone className="w-5 h-5 text-blue-400" />
                Instâncias WhatsApp
              </CardTitle>
              <CardDescription className="mt-1.5">
                Gerencie a conexão primária com a API do Evolution e monitore o status do
                dispositivo.
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" className="h-8 rounded-lg border-white/10">
              <RefreshCw className="w-3.5 h-3.5 mr-2" />
              Sincronizar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="p-5 rounded-2xl border border-white/5 bg-background/40 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/30">
                  <Power className="w-5 h-5 text-emerald-500" />
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-background" />
              </div>
              <div>
                <h3 className="font-semibold text-base font-heading">prn-principal-01</h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs font-medium text-emerald-400">Online & Conectado</span>
                  <span className="w-1 h-1 rounded-full bg-white/20" />
                  <span className="text-xs text-muted-foreground">+55 11 98888-7777</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button variant="secondary" className="rounded-xl h-9 text-xs font-medium">
                <Settings2 className="w-3.5 h-3.5 mr-2" />
                Configurar Webhooks
              </Button>
              <Button
                variant="outline"
                className="border-white/10 hover:bg-white/5 rounded-xl h-9 text-xs font-medium"
              >
                <QrCode className="w-3.5 h-3.5 mr-2" />
                Novo QR Code
              </Button>
              <Button
                variant="destructive"
                className="bg-red-500/10 text-red-400 hover:bg-red-500/20 border-red-500/20 rounded-xl h-9 text-xs font-medium"
              >
                Desconectar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
