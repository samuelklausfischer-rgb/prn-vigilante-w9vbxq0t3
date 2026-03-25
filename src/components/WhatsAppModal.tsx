import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { WhatsAppInstance } from '@/types'
import { evolutionApi } from '@/services/evolution'
import { useToast } from '@/hooks/use-toast'
import { Loader2, QrCode, CheckCircle2, Smartphone, Zap, Trash2 } from 'lucide-react'

interface WhatsAppModalProps {
  instance: WhatsAppInstance | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onRefresh: () => Promise<void>
}

export function WhatsAppModal({ instance, open, onOpenChange, onRefresh }: WhatsAppModalProps) {
  const [loading, setLoading] = useState(false)
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null)
  const [newInstanceName, setNewInstanceName] = useState('')
  const [newPhoneNumber, setNewPhoneNumber] = useState('')
  const { toast } = useToast()

  useEffect(() => {
    let interval: any
    let qrInterval: any

    if (open && instance) {
      if (instance.status === 'disconnected' || instance.status === 'initializing' || instance.status === 'connecting') {
        loadQrCode()
        
        // Loop 1: Verifica status de conexão a cada 3 segundos
        interval = setInterval(async () => {
          if (!instance.instanceName) return
          const realStatus = await evolutionApi.getInstanceStatus(instance.instanceName)
          if (realStatus === 'open' || realStatus === 'connected' || realStatus === 'CONNECTED') {
            toast({ title: 'Sucesso!', description: 'WhatsApp conectado com sucesso.' })
            await onRefresh()
            onOpenChange(false)
          }
        }, 3000)

        // Loop 2: Atualiza QR Code a cada 40 segundos para evitar expiração
        qrInterval = setInterval(() => {
          loadQrCode()
        }, 40000)
      } else {
        setQrCodeUrl(null)
      }
      setNewInstanceName('')
      setNewPhoneNumber('')
    }

    return () => {
      if (interval) clearInterval(interval)
      if (qrInterval) clearInterval(qrInterval)
    }
  }, [open, instance?.status, instance?.instanceName])

  const loadQrCode = async () => {
    if (!instance) return
    setLoading(true)
    try {
      const url = await evolutionApi.getQrCode(instance.slotId)
      setQrCodeUrl(url)
    } catch (e) {
      // Falha silenciosa no polling, mas avisa na primeira carga
      if (!qrCodeUrl) {
        toast({ title: 'Erro', description: 'Falha ao buscar QR Code.', variant: 'destructive' })
      }
    } finally {
      setLoading(false)
    }
  }

  const handleAction = async (
    action: () => Promise<boolean | { success: boolean; error?: string }>,
    successTitle: string,
    successDesc: string,
    close = false,
  ) => {
    setLoading(true)
    try {
      const result = await action()
      const isSuccess = typeof result === 'boolean' ? result : result.success

      if (isSuccess) {
        toast({ title: successTitle, description: successDesc })
        await onRefresh()
        if (close) onOpenChange(false)
      } else {
        const errorMsg =
          typeof result === 'object' && result.error
            ? result.error
            : 'Ocorreu um erro ao processar sua solicitação.'
        toast({ title: 'Ação Falhou', description: errorMsg, variant: 'destructive' })
      }
    } catch (error: any) {
      toast({
        title: 'Erro Crítico',
        description: error.message || 'Falha inesperada ao executar a ação.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  if (!instance) return null

  return (
    <Dialog open={open} onOpenChange={(val) => !loading && onOpenChange(val)}>
      <DialogContent className="sm:max-w-md border-white/10 bg-card rounded-2xl">
        <DialogHeader>
          <DialogTitle className="font-heading flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-blue-400" />
            {instance.status === 'empty'
              ? 'Criar Nova Instância'
              : `Gerenciar Slot ${instance.slotId}`}
          </DialogTitle>
          <DialogDescription>
            {instance.status === 'empty'
              ? 'Configure os dados para adicionar um novo canal.'
              : instance.instanceName
                ? `Instância: ${instance.instanceName}`
                : 'Slot Disponível'}
          </DialogDescription>
        </DialogHeader>

        <div className="py-6 flex flex-col items-center justify-center min-h-[200px]">
          {instance.status === 'connected' && (
            <div className="text-center space-y-4 animate-in fade-in zoom-in w-full">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto mb-2">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-emerald-400">Conexão Ativa</h3>
                <p className="text-sm text-muted-foreground mt-1">Instância pronta para envio de mensagens.</p>
              </div>
              <div className="mt-6 space-y-3 bg-white/5 rounded-xl p-4 border border-white/10 text-left">
                <div>
                  <label className="text-xs text-muted-foreground uppercase font-semibold">
                    Nome da Instância
                  </label>
                  <p className="font-medium text-white">{instance.instanceName}</p>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground uppercase font-semibold">
                    Telefone Conectado
                  </label>
                  <p className="font-mono text-white flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-muted-foreground" />
                    {instance.phoneNumber || 'Desconhecido'}
                  </p>
                </div>
              </div>
              {/* Métricas de Analytics */}
              <div className="grid grid-cols-3 gap-3 mt-4">
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-3 text-center">
                  <p className="text-[10px] uppercase text-emerald-400/70 font-semibold tracking-wider">Uptime</p>
                  <p className="text-lg font-bold text-emerald-300 mt-1">
                    {instance.connectedAt
                      ? (() => {
                          const diff = Date.now() - new Date(instance.connectedAt).getTime()
                          const h = Math.floor(diff / 3600000)
                          const m = Math.floor((diff % 3600000) / 60000)
                          return h > 0 ? `${h}h ${m}m` : `${m}m`
                        })()
                      : '—'}
                  </p>
                </div>
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-3 text-center">
                  <p className="text-[10px] uppercase text-emerald-400/70 font-semibold tracking-wider">Msgs</p>
                  <p className="text-lg font-bold text-emerald-300 mt-1">{instance.messagesReceived ?? 0}</p>
                </div>
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-3 text-center">
                  <p className="text-[10px] uppercase text-emerald-400/70 font-semibold tracking-wider">Chats</p>
                  <p className="text-lg font-bold text-emerald-300 mt-1">{instance.chatsCount ?? 0}</p>
                </div>
              </div>
            </div>
          )}

          {(instance.status === 'disconnected' || instance.status === 'initializing' || instance.status === 'connecting') && (
            <div className="text-center space-y-4 w-full">
              {loading && !qrCodeUrl ? (
                <div className="flex flex-col items-center gap-4 text-muted-foreground">
                  <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
                  <p className="text-sm">Gerando QR Code seguro...</p>
                </div>
              ) : (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                  <div className="bg-white p-4 rounded-xl inline-block shadow-lg mx-auto border-4 border-white/5">
                    <img src={qrCodeUrl} alt="QR Code" className="w-48 h-48 rounded-md" />
                  </div>
                  <p className="text-sm text-muted-foreground max-w-[280px] mx-auto">
                    Abra o WhatsApp e aponte a câmera para o código acima.
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-blue-400 hover:text-blue-300 mt-2"
                    onClick={() =>
                      handleAction(
                        () => evolutionApi.simulateScan(instance.slotId),
                        'Concluído',
                        'WhatsApp conectado!',
                        true,
                      )
                    }
                    disabled={loading}
                  >
                    <Zap className="w-4 h-4 mr-2" /> Simular Leitura
                  </Button>
                </div>
              )}
            </div>
          )}

          {instance.status === 'empty' && (
            <div className="w-full space-y-4">
              <div className="text-center mb-6">
                <QrCode className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  Adicione os detalhes da nova conexão.
                </p>
              </div>
              <div className="space-y-4">
                <div className="space-y-2 text-left">
                  <label className="text-sm font-medium">Nome da Instância</label>
                  <Input
                    placeholder="Ex: PRN Sul"
                    value={newInstanceName}
                    onChange={(e) => setNewInstanceName(e.target.value)}
                    className="bg-background/50 border-white/10"
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2 text-left">
                  <label className="text-sm font-medium">Número de Telefone</label>
                  <Input
                    placeholder="Ex: 5511999999999"
                    value={newPhoneNumber}
                    onChange={(e) => setNewPhoneNumber(e.target.value)}
                    className="bg-background/50 border-white/10"
                    disabled={loading}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="sm:justify-between border-t border-white/5 pt-4 flex-col sm:flex-row gap-4 sm:gap-2">
          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="w-full sm:w-auto"
            >
              {instance.status === 'empty' ? 'Cancelar' : 'Fechar'}
            </Button>
            {instance.status !== 'empty' && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    disabled={loading}
                    className="text-red-500 hover:text-red-600 hover:bg-red-500/10 w-full sm:w-auto"
                  >
                    <Trash2 className="w-4 h-4 sm:mr-2" />{' '}
                    <span className="hidden sm:inline">Excluir</span>
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="border-white/10 bg-card rounded-2xl">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir Instância?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Isso removerá a configuração e liberará o slot.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="border-white/10">Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() =>
                        handleAction(
                          () => evolutionApi.deleteInstance(instance.slotId),
                          'Removida',
                          'O slot foi liberado.',
                          true,
                        )
                      }
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      Confirmar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
          <div className="flex gap-2 w-full sm:w-auto justify-end">
            {instance.status === 'connected' && (
              <Button
                variant="destructive"
                onClick={() =>
                  handleAction(
                    () => evolutionApi.disconnect(instance.slotId),
                    'Desconectada',
                    'O aparelho foi desvinculado.',
                  )
                }
                disabled={loading}
                className="bg-amber-600 hover:bg-amber-700 w-full sm:w-auto"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}Desconectar
              </Button>
            )}
            {instance.status === 'empty' && (
              <Button
                onClick={() =>
                  handleAction(
                    () =>
                      evolutionApi.create(
                        instance.slotId,
                        newInstanceName.trim(),
                        newPhoneNumber.trim(),
                      ),
                    'Instância Criada',
                    'A nova instância foi configurada com sucesso.',
                    true,
                  )
                }
                disabled={loading || !newInstanceName.trim() || !newPhoneNumber.trim()}
                className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}Criar
              </Button>
            )}
            {instance.status === 'disconnected' && (
              <Button
                variant="outline"
                onClick={loadQrCode}
                disabled={loading}
                className="border-white/10 hover:bg-white/5 w-full sm:w-auto"
              >
                Atualizar QR
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
