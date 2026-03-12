import { WhatsAppInstance } from '@/types'
import { Smartphone, RefreshCw, PlusCircle, CheckCircle2, AlertCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface WhatsAppSlotCardProps {
  instance: WhatsAppInstance
  onClick: () => void
}

const getStatusDisplay = (status: string) => {
  switch (status) {
    case 'connected':
      return {
        label: 'Conectado',
        badge: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50',
        icon: <CheckCircle2 className="w-5 h-5 text-emerald-400" />,
        border: 'border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.15)] bg-emerald-500/5',
        pulse: 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]',
      }
    case 'disconnected':
      return {
        label: 'Desconectado',
        badge: 'bg-amber-500/20 text-amber-400 border-amber-500/50',
        icon: <AlertCircle className="w-5 h-5 text-amber-400" />,
        border: 'border-amber-500/40 shadow-[0_0_20px_rgba(245,158,11,0.15)] bg-amber-500/5',
        pulse: 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.8)]',
      }
    case 'initializing':
      return {
        label: 'Inicializando',
        badge: 'bg-blue-500/20 text-blue-400 border-blue-500/50',
        icon: <RefreshCw className="w-5 h-5 text-blue-400 animate-spin" />,
        border: 'border-blue-500/40 shadow-[0_0_20px_rgba(59,130,246,0.15)] bg-blue-500/5',
        pulse: 'bg-blue-400 animate-pulse shadow-[0_0_10px_rgba(59,130,246,0.8)]',
      }
    default:
      return {
        label: 'Slot Vazio',
        badge: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
        icon: <PlusCircle className="w-5 h-5 text-slate-500" />,
        border: 'border-white/10 hover:border-white/20 bg-card/40',
        pulse: 'bg-slate-600',
      }
  }
}

export function WhatsAppSlotCard({ instance, onClick }: WhatsAppSlotCardProps) {
  const display = getStatusDisplay(instance.status)

  return (
    <div
      onClick={onClick}
      className={cn(
        'group relative p-6 rounded-2xl backdrop-blur-md cursor-pointer transition-all duration-500 hover:-translate-y-2 border overflow-hidden',
        display.border,
      )}
    >
      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
        <Smartphone className="w-24 h-24 rotate-12" />
      </div>

      <div className="flex justify-between items-start mb-6 relative z-10">
        <div className="p-3 rounded-xl bg-background/80 backdrop-blur-sm border border-white/10 group-hover:scale-110 transition-transform shadow-lg">
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

      <div
        className={cn(
          'absolute inset-x-0 bottom-0 h-1 transition-all duration-500',
          instance.status === 'connected'
            ? 'bg-gradient-to-r from-emerald-500 to-transparent'
            : instance.status === 'disconnected'
              ? 'bg-gradient-to-r from-amber-500 to-transparent'
              : instance.status === 'initializing'
                ? 'bg-gradient-to-r from-blue-500 to-transparent'
                : 'bg-transparent',
        )}
      />

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
