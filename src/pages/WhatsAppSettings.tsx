import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Smartphone, Plus, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export default function WhatsAppSettings() {
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const handleCreateInstance = async () => {
    setLoading(true)
    try {
      // Simulando a criação de uma instância
      setTimeout(() => {
        toast({
          title: 'Instância Solicitada',
          description: 'A nova instância do WhatsApp está sendo provisionada.',
        })
        setLoading(false)
      }, 1000)
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível criar a instância.',
        variant: 'destructive',
      })
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h2 className="text-2xl font-heading font-semibold">Configurações do WhatsApp</h2>
        <p className="text-muted-foreground">Gerencie suas conexões com a API de disparos.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="bg-card/50 border-white/5 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-blue-400" />
              Instâncias Ativas
            </CardTitle>
            <CardDescription>Dispositivos conectados e prontos para envio.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-xl bg-background/50 border border-white/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h4 className="font-medium">PRN Principal</h4>
                  <p className="text-xs text-muted-foreground">+55 (11) 99999-9999</p>
                </div>
              </div>
              <Badge className="bg-emerald-500/20 text-emerald-400 border-0">Conectado</Badge>
            </div>

            <Button onClick={handleCreateInstance} disabled={loading} className="w-full">
              {loading ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              Nova Instância
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-white/5 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-400" />
              Status do Serviço
            </CardTitle>
            <CardDescription>Monitoramento da API e Webhooks.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-white/5">
                <span className="text-sm text-muted-foreground">Webhooks</span>
                <Badge variant="outline" className="border-emerald-500/30 text-emerald-400">
                  Operacional
                </Badge>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-white/5">
                <span className="text-sm text-muted-foreground">Fila de Mensagens</span>
                <Badge variant="outline" className="border-emerald-500/30 text-emerald-400">
                  Processando
                </Badge>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-muted-foreground">Conectividade API</span>
                <Badge variant="outline" className="border-emerald-500/30 text-emerald-400">
                  Online
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
