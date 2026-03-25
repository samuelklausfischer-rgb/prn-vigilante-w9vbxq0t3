import { useState, useEffect } from 'react'
import { useWorkerStatus } from '@/hooks/use-worker-status'
import { useToast } from '@/hooks/use-toast'
import type { SystemConfig } from '@/types'
import {
  Play,
  Pause,
  Activity,
  AlertTriangle,
  Wifi,
  WifiOff,
  Loader2,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
} from 'lucide-react'

/**
 * 🎛️ DispatchControl — O Centro de Comando
 *
 * Exibe o botão principal de Start/Pause, o status do Worker,
 * e o feed em tempo real de mensagens processadas.
 */
export function DispatchControl({
  config,
  onToggle,
}: {
  config: SystemConfig | null
  onToggle: (isPaused: boolean) => Promise<boolean>
}) {
  const { toast } = useToast()
  const { workerStatus, lastHeartbeat, recentLogs } = useWorkerStatus()
  const [toggling, setToggling] = useState(false)
  const [showFeed, setShowFeed] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('showFeed')
      return saved ? saved === 'true' : false
    }
    return false
  })

  useEffect(() => {
    localStorage.setItem('showFeed', String(showFeed))
  }, [showFeed])

  const isPaused = config?.is_paused ?? true
  const isActive = !isPaused

  const handleToggle = async () => {
    setToggling(true)
    const newState = !isPaused
    const success = await onToggle(newState)

    if (success) {
      toast({
        title: newState ? '⏸️ Disparo Pausado' : '🚀 Disparo Iniciado!',
        description: newState
          ? 'O motor de envio foi pausado. Nenhuma mensagem será enviada.'
          : 'O motor começou a processar a fila de mensagens.',
      })
    }
    setToggling(false)
  }

  const workerColor =
    workerStatus === 'active'
      ? 'text-emerald-400'
      : workerStatus === 'stale'
        ? 'text-amber-400'
        : 'text-red-400'

  const workerBg =
    workerStatus === 'active'
      ? 'bg-emerald-400/10 border-emerald-400/30'
      : workerStatus === 'stale'
        ? 'bg-amber-400/10 border-amber-400/30'
        : 'bg-red-400/10 border-red-400/30'

  const workerLabel =
    workerStatus === 'active'
      ? 'Worker Ativo'
      : workerStatus === 'stale'
        ? 'Worker Lento'
        : 'Worker Offline'

  return (
    <div className="space-y-4 animate-fade-in-up">
      {/* ── Control Center Header ── */}
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#0f1115] to-[#1a1d25] p-6 shadow-[0_0_40px_rgba(0,0,0,0.3)]">
        {/* Animated gradient border */}
        <div
          className={`absolute inset-0 rounded-2xl opacity-20 ${
            isActive
              ? 'bg-gradient-to-r from-emerald-500/20 via-transparent to-emerald-500/20 animate-pulse'
              : ''
          }`}
        />

        {/* Toggle Feed Button */}
        <button
          onClick={() => setShowFeed(!showFeed)}
          className="absolute top-4 right-4 flex items-center gap-1.5 text-[11px] font-mono text-slate-500 hover:text-slate-300 transition-colors border border-white/10 bg-white/5 hover:bg-white/10 px-2.5 py-1 rounded-lg"
        >
          {showFeed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          Feed
        </button>

        <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pr-24">
          {/* Left: Status Info */}
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-heading font-bold tracking-tight text-white">
                Centro de Controle
              </h2>
              <span
                className={`flex items-center gap-1.5 text-[10px] font-mono px-2.5 py-1 rounded-full border uppercase tracking-widest ${workerBg} ${workerColor}`}
              >
                {workerStatus === 'active' ? (
                  <Wifi className="w-3 h-3" />
                ) : workerStatus === 'stale' ? (
                  <AlertTriangle className="w-3 h-3" />
                ) : (
                  <WifiOff className="w-3 h-3" />
                )}
                {workerLabel}
              </span>
            </div>
            <p className="text-sm text-slate-400">
              {isActive
                ? '🟢 Disparos ativos — processando fila automaticamente.'
                : '🔴 Disparos pausados — aguardando seu comando.'}
            </p>
            {lastHeartbeat && (
              <p className="text-[11px] text-slate-500 font-mono">
                <Activity className="w-3 h-3 inline mr-1" />
                {lastHeartbeat.messages_processed} enviadas | {lastHeartbeat.messages_failed} falhas
                | RAM: {lastHeartbeat.memory_usage_mb ?? '?'}MB
              </p>
            )}
          </div>

          {/* Right: The Big Button */}
          <button
            onClick={handleToggle}
            disabled={toggling || workerStatus === 'offline'}
            className={`group relative flex items-center gap-3 px-8 py-4 rounded-2xl font-heading font-bold text-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed ${
              isActive
                ? 'bg-red-500/20 text-red-400 border-2 border-red-500/40 hover:bg-red-500/30 hover:border-red-500/60 hover:shadow-[0_0_30px_rgba(239,68,68,0.2)]'
                : 'bg-emerald-500/20 text-emerald-400 border-2 border-emerald-500/40 hover:bg-emerald-500/30 hover:border-emerald-500/60 hover:shadow-[0_0_30px_rgba(16,185,129,0.2)]'
            }`}
          >
            {toggling ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : isActive ? (
              <Pause className="w-6 h-6" />
            ) : (
              <Play className="w-6 h-6" />
            )}
            {toggling ? 'Processando...' : isActive ? 'Pausar Disparo' : 'Começar Disparo'}

            {/* Pulse animation when active */}
            {isActive && !toggling && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500" />
              </span>
            )}
          </button>
        </div>

        {/* Worker offline warning */}
        {workerStatus === 'offline' && (
          <div className="mt-4 flex items-center gap-2 text-sm text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded-xl px-4 py-2.5">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>
              O Worker está offline. Inicie o motor com{' '}
              <code className="text-[11px] bg-black/30 px-1.5 py-0.5 rounded">
                bun run automation/src/index.ts
              </code>{' '}
              antes de disparar.
            </span>
          </div>
        )}
      </div>

      {/* ── Mini Feed: Últimas Mensagens ── */}
      {showFeed && recentLogs.length > 0 && (
        <div className="rounded-xl border border-white/5 bg-[#0f1115]/50 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-mono text-slate-500 uppercase tracking-widest">
              📡 Feed em Tempo Real
            </h3>
            <span className="text-[10px] text-slate-600 font-mono">
              {recentLogs.slice(0, 5).length} / {recentLogs.length}
            </span>
          </div>
          <div className="space-y-1.5 max-h-40 overflow-y-auto">
            {recentLogs.slice(0, 5).map((log) => (
              <div
                key={log.id}
                className="flex items-center gap-2 text-xs font-mono text-slate-400"
              >
                {log.status === 'delivered' ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                ) : (
                  <XCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                )}
                <span className="text-slate-500">
                  {new Date(log.sent_at).toLocaleTimeString('pt-BR', { hour12: false })}
                </span>
                <span>
                  {log.phone_masked || '???'} → {log.status === 'delivered' ? 'Entregue' : 'Falha'}
                </span>
                {log.duration_ms && <span className="text-slate-600">({log.duration_ms}ms)</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
