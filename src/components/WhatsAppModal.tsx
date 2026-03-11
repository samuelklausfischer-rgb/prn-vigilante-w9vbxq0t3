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
import { WhatsAppInstance, evolutionApi } from '@/services/evolution'
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
    if (open && instance?.status === 'disconnected') loadQrCode()
    else {
      setQrCodeUrl(null)
      setNewInstanceName('')
      setNewPhoneNumber('')
    }
  }, [open, instance])

  const loadQrCode = async () => {
    if (!instance) return
    setLoading(true)
    try {
      const url = await evolutionApi.getQrCode(instance.slotId)
      setQrCodeUrl(url)
    } catch (e) {
      toast({ title: 'Erro', description: 'Falha ao buscar QR Code.', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const handleDisconnect = async () => {
    if (!instance) return
    setLoading(true)
    if (await evolutionApi.disconnect(instance.slotId)) {
      toast({ title: 'Desconectada', description: 'O aparelho foi desvinculado.' })
      await onRefresh()
    }
    setLoading(false)
  }

  const handleDelete = async () => {
    if (!instance) return
    setLoading(true)
    if (await evolutionApi.deleteInstance(instance.slotId)) {
      toast({ title: 'Removida', description: 'O slot foi liberado com sucesso.' })
      await onRefresh()
      onOpenChange(false)
    }
    setLoading(false)
  }

  const handleCreate = async () => {
    if (!instance || !newInstanceName.trim() || !newPhoneNumber.trim()) return
    setLoading(true)
    if (await evolutionApi.create(instance.slotId, newInstanceName.trim(), newPhoneNumber.trim())) {
      toast({ title: 'Slot Configurado', description: 'Aguarde para sincronizar o QR Code.' })
      await onRefresh()
    }
    setLoading(false)
  }

  const handleSimulateScan = async () => {
    if (!instance) return
    setLoading(true)
    if (await evolutionApi.simulateScan(instance.slotId)) {
      toast({ title: 'Sincronização Concluída', description: 'WhatsApp conectado!' })
      await onRefresh()
      onOpenChange(false)
    }
    setLoading(false)
  }

  if (!instance) return null

  return (
    <Dialog open={open} onOpenChange={(val) => !loading && onOpenChange(val)}>
      <DialogContent className="sm:max-w-md border-white/10 bg-card rounded-2xl">
        <DialogHeader>
          <DialogTitle className="font-heading flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-blue-400" /> Gerenciar Slot {instance.slotId}
          </DialogTitle>
          <DialogDescription>
            {instance.instanceName ? `Instância: ${instance.instanceName}` : 'Slot Disponível'}
          </DialogDescription>
        </DialogHeader>

        <div className="py-6 flex flex-col items-center justify-center min-h-[200px]">
          {instance.status === 'connected' && (
            <div className="text-center space-y-4 animate-in fade-in zoom-in duration-300">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-lg font-medium">Conexão Ativa</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Esta instância está conectada e processando mensagens normalmente.
                </p>
              </div>
            </div>
          )}

          {instance.status === 'disconnected' && (
            <div className="text-center space-y-4 w-full">
              {loading || !qrCodeUrl ? (
                <div className="flex flex-col items-center gap-4 text-muted-foreground">
                  <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
                  <p className="text-sm">Gerando QR Code seguro...</p>
                </div>
              ) : (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="bg-white p-4 rounded-xl inline-block shadow-lg mx-auto border-4 border-white/5">
                    <img src={qrCodeUrl} alt="QR Code" className="w-48 h-48 rounded-md" />
                  </div>
                  <p className="text-sm text-muted-foreground max-w-[280px] mx-auto">
                    Abra o WhatsApp, vá em "Aparelhos conectados" e aponte a câmera para o código
                    acima.
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-blue-400 hover:text-blue-300 mt-2"
                    onClick={handleSimulateScan}
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
                  Configure uma nova instância para este slot para começar.
                </p>
              </div>
              <div className="space-y-4">
                <div className="space-y-2 text-left">
                  <label className="text-sm font-medium">Nome da Instância</label>
                  <Input
                    placeholder="Ex: PRN Operação Sul"
                    value={newInstanceName}
                    onChange={(e) => setNewInstanceName(e.target.value)}
                    className="bg-background/50 border-white/10"
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2 text-left">
                  <label className="text-sm font-medium">Número de Telefone</label>
                  <Input
                    placeholder="Ex: +55 11 99999-9999"
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
              Fechar
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
                      Isso removerá a configuração desta instância ({instance.instanceName}) e
                      liberará o slot. Esta ação não pode ser desfeita.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="border-white/10">Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      Confirmar Exclusão
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
                onClick={handleDisconnect}
                disabled={loading}
                className="bg-amber-600 hover:bg-amber-700 w-full sm:w-auto"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}Desconectar
              </Button>
            )}
            {instance.status === 'empty' && (
              <Button
                onClick={handleCreate}
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
                Atualizar QR Code
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
