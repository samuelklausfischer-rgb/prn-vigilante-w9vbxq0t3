import { useState, useEffect } from 'react'
import { WhatsAppInstance } from '@/types'
import { Smartphone, RefreshCw, PlusCircle, CheckCircle2, AlertCircle, Clock, MessageCircle, MessagesSquare, Wifi, WifiOff } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface WhatsAppSlotCardProps {
  instance: WhatsAppInstance
  onClick: () => void
}

function formatUptime(connectedAt: string | null | undefined): string {
  if (!connectedAt) return '—'
  const diff = Date.now() - new Date(connectedAt).getTime()
  if (diff < 0) return 'Agora'
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) return `${days}d ${hours % 24}h`
  if (hours > 0) return `${hours}h ${minutes % 60}m`
  if (minutes > 0) return `${minutes}m`
  return 'Agora'
}

const getStatusDisplay = (status: string) => {
  switch (status) {
    case 'connected':
      return {
        label: 'Conectado',
        badge: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50',
        icon: <CheckCircle2 className="w-5 h-5 text-emerald-400" />,
        border: 'border-emerald-500/50 shadow-[0_0_30px_rgba(16,185,129,0.2)] bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent',
        pulse: 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]',
        ringColor: 'ring-emerald-500/30',
        statusIcon: <Wifi className="w-4 h-4 text-emerald-400" />,
      }
    case 'disconnected':
      return {
        label: 'Desconectada',
        badge: 'bg-amber-500/20 text-amber-400 border-amber-500/50',
        icon: <AlertCircle className="w-5 h-5 text-amber-400" />,
        border: 'border-amber-500/50 shadow-[0_0_30px_rgba(245,158,11,0.2)] bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent',
        pulse: 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.8)]',
        ringColor: 'ring-amber-500/30',
        statusIcon: <WifiOff className="w-4 h-4 text-amber-400" />,
      }
    case 'initializing':
    case 'connecting':
      return {
        label: 'Desconectada',
        badge: 'bg-amber-500/20 text-amber-400 border-amber-500/50',
        icon: <RefreshCw className="w-5 h-5 text-amber-400 animate-spin" />,
        border: 'border-amber-500/50 shadow-[0_0_30px_rgba(245,158,11,0.2)] bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent',
        pulse: 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.8)]',
        ringColor: 'ring-amber-500/30',
        statusIcon: <WifiOff className="w-4 h-4 text-amber-400" />,
      }
    default:
      return {
        label: 'Slot Vazio',
        badge: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
        icon: <PlusCircle className="w-5 h-5 text-slate-500" />,
        border: 'border-white/10 hover:border-white/20 bg-card/40',
        pulse: 'bg-slate-600',
        ringColor: 'ring-slate-500/10',
        statusIcon: null,
      }
  }
}

export function WhatsAppSlotCard({ instance, onClick }: WhatsAppSlotCardProps) {
  const display = getStatusDisplay(instance.status)
  const [uptime, setUptime] = useState(formatUptime(instance.connectedAt))

  // Atualiza o uptime a cada minuto para instâncias conectadas
  useEffect(() => {
    if (instance.status !== 'connected' || !instance.connectedAt) return
    setUptime(formatUptime(instance.connectedAt))
    const interval = setInterval(() => {
      setUptime(formatUptime(instance.connectedAt))
    }, 60000)
    return () => clearInterval(interval)
  }, [instance.status, instance.connectedAt])

  return (
    <div
      onClick={onClick}
      className={cn(
        'group relative p-6 rounded-2xl backdrop-blur-md cursor-pointer transition-all duration-500 hover:-translate-y-2 border overflow-hidden',
        display.border,
      )}
    >
      {/* Background icon decorativo */}
      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
        <Smartphone className="w-24 h-24 rotate-12" />
      </div>

      {/* Status Pill e Indicador */}
      <div className="flex justify-between items-start mb-5 relative z-10">
        <div className={cn(
          'p-3 rounded-xl bg-background/80 backdrop-blur-sm border border-white/10 group-hover:scale-110 transition-transform shadow-lg',
          instance.status === 'connected' && 'ring-2 ring-emerald-500/30',
          instance.status === 'disconnected' && 'ring-2 ring-amber-500/30',
        )}>
          {display.icon}
        </div>
        <div className="flex items-center gap-3">
          <span className="flex h-3 w-3 relative">
            {instance.status !== 'empty' && (
              <span
                className={cn(
                  'animate-ping absolute inline-flex h-full w-full rounded-full opacity-75',
                  display.pulse,
                )}
              />
            )}
            <span className={cn('relative inline-flex rounded-full h-3 w-3', display.pulse)} />
          </span>
          <Badge
            variant="outline"
            className={cn('uppercase tracking-wider text-[10px] font-bold', display.badge)}
          >
            {display.label}
          </Badge>
        </div>
      </div>

      {/* Identificação do Slot */}
      <div className="relative z-10 space-y-1">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-mono bg-white/10 px-2 py-0.5 rounded text-white/70">
            SLOT 0{instance.slotId}
          </span>
        </div>
        <h3
          className={cn(
            'text-xl font-heading font-bold truncate tracking-tight',
            instance.status === 'empty' ? 'text-muted-foreground/50' : 'text-white',
          )}
        >
          {instance.instanceName || 'Slot Disponível'}
        </h3>

        <div className="h-6 mt-1">
          {instance.phoneNumber && instance.status !== 'empty' ? (
            <p className="text-sm text-muted-foreground/90 font-mono truncate flex items-center gap-1.5">
              <Smartphone className="w-3.5 h-3.5 opacity-50" />
              {instance.phoneNumber}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground/50 italic">Nenhum número vinculado</p>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          BLOCO CONECTADO: Analytics em tempo real
          ═══════════════════════════════════════════════════════════ */}
      {instance.status === 'connected' && (
        <div className="relative z-10 mt-5 grid grid-cols-3 gap-2 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2 text-center">
            <Clock className="w-3.5 h-3.5 text-emerald-400 mx-auto mb-1" />
            <p className="text-[10px] uppercase text-emerald-400/70 font-semibold tracking-wider">Online</p>
            <p className="text-sm font-bold text-emerald-300">{uptime}</p>
          </div>
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2 text-center">
            <MessageCircle className="w-3.5 h-3.5 text-emerald-400 mx-auto mb-1" />
            <p className="text-[10px] uppercase text-emerald-400/70 font-semibold tracking-wider">Msgs</p>
            <p className="text-sm font-bold text-emerald-300">{instance.messagesReceived ?? 0}</p>
          </div>
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2 text-center">
            <MessagesSquare className="w-3.5 h-3.5 text-emerald-400 mx-auto mb-1" />
            <p className="text-[10px] uppercase text-emerald-400/70 font-semibold tracking-wider">Chats</p>
            <p className="text-sm font-bold text-emerald-300">{instance.chatsCount ?? 0}</p>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          BLOCO DESCONECTADO: Aviso laranja forte
          ═══════════════════════════════════════════════════════════ */}
      {instance.status === 'disconnected' && (
        <div className="relative z-10 mt-5 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0 animate-pulse">
              <WifiOff className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <p className="text-xs font-bold text-amber-400 uppercase tracking-wide">Reconexão Necessária</p>
              <p className="text-[11px] text-amber-400/60 mt-0.5">Escaneie o QR Code para reconectar esta instância.</p>
            </div>
          </div>
        </div>
      )}

      {/* Barra inferior de gradiente */}
      <div
        className={cn(
          'absolute inset-x-0 bottom-0 h-1.5 transition-all duration-500',
          instance.status === 'connected'
            ? 'bg-gradient-to-r from-emerald-500 via-emerald-400 to-transparent'
            : instance.status === 'disconnected'
              ? 'bg-gradient-to-r from-amber-500 via-amber-400 to-transparent'
              : instance.status === 'initializing' || instance.status === 'connecting'
                ? 'bg-gradient-to-r from-blue-500 to-transparent'
                : 'bg-transparent',
        )}
      />

      {/* Overlay de ação Hover: Desconectado */}
      {instance.status === 'disconnected' && (
        <div className="absolute inset-0 bg-background/90 backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center z-20">
          <AlertCircle className="w-8 h-8 text-amber-500 mb-3" />
          <Button
            variant="outline"
            className="border-amber-500/50 text-amber-400 hover:bg-amber-500/20"
          >
            Gerar QR Code
          </Button>
        </div>
      )}

      {/* Overlay de ação Hover: Vazio */}
      {instance.status === 'empty' && (
        <div className="absolute inset-0 bg-background/90 backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center z-20">
          <PlusCircle className="w-8 h-8 text-blue-500 mb-3" />
          <Button
            variant="outline"
            className="border-blue-500/50 text-blue-400 hover:bg-blue-500/20"
          >
            Configurar Instância
          </Button>
        </div>
      )}
    </div>
  )
}
