import { useState, useEffect, useMemo } from 'react'
import {
  RefreshCw,
  Search,
  Phone,
  Calendar,
  MessageCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  User,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { fetchKanbanData, searchKanbanCards } from '@/services/crm'
import type { KanbanCard, KanbanColumn } from '@/types'
import { formatDataExameBr } from '@/lib/utils/data-exame'
import { formatPhoneBR } from '@shared/utils/phone-utils'

const COLUMN_CONFIG: Record<KanbanColumn, { title: string; color: string; icon: any }> = {
  mensagem_recebida: { title: 'Mensagem recebida', color: 'border-blue-500/30', icon: MessageCircle },
  em_andamento: { title: 'Em andamento', color: 'border-amber-500/30', icon: Clock },
  cancelou: { title: 'Cancelou', color: 'border-red-500/30', icon: AlertTriangle },
  concluido: { title: 'Concluído', color: 'border-green-500/30', icon: CheckCircle2 },
  reagendar: { title: 'Reagendar', color: 'border-orange-500/30', icon: Calendar },
}

function getJourneyStatusLabel(status: string) {
  switch (status) {
    case 'queued':
      return { label: 'Aguardando', className: 'bg-blue-500/15 text-blue-200' }
    case 'contacting':
      return { label: 'Enviando', className: 'bg-emerald-500/15 text-emerald-200' }
    case 'delivered_waiting_reply':
      return { label: 'Aguardando resposta', className: 'bg-amber-500/15 text-amber-200' }
    case 'followup_sent':
      return { label: 'Follow-up', className: 'bg-purple-500/15 text-purple-200' }
    case 'confirmed':
      return { label: 'Confirmado', className: 'bg-green-500/15 text-green-200' }
    case 'pending_manual':
      return { label: 'Pendente', className: 'bg-red-500/15 text-red-200' }
    default:
      return { label: status, className: 'bg-gray-500/15 text-gray-200' }
  }
}

function getClassificationBadge(classification: string | null) {
  if (!classification) return null
  switch (classification) {
    case 'confirmado_positivo':
      return { label: 'Confirmado', className: 'bg-green-500/20 text-green-300 border-green-500/30' }
    case 'quer_remarcar':
      return { label: 'Remarcar', className: 'bg-orange-500/20 text-orange-300 border-orange-500/30' }
    case 'nao_pode_comparecer':
      return { label: 'Não pode', className: 'bg-red-500/20 text-red-300 border-red-500/30' }
    case 'cancelado':
      return { label: 'Cancelado', className: 'bg-gray-500/20 text-gray-300 border-gray-500/30' }
    case 'duvida':
      return { label: 'Dúvida', className: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' }
    case 'ambigua':
      return { label: 'Ambígua', className: 'bg-purple-500/20 text-purple-300 border-purple-500/30' }
    default:
      return { label: classification, className: 'bg-blue-500/20 text-blue-300 border-blue-500/30' }
  }
}

function KanbanCardComponent({ card }: { card: KanbanCard }) {
  const journeyStatus = getJourneyStatusLabel(card.journey_status)
  const classificationBadge = getClassificationBadge(card.latest_classification)

  return (
    <Card className="mb-3 hover:shadow-lg transition-shadow cursor-pointer bg-slate-800/50 backdrop-blur-sm">
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <User className="w-4 h-4 text-slate-400" />
              <span className="font-medium text-sm text-white truncate">{card.patient_name}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <Phone className="w-3 h-3" />
              <span className="font-mono">{formatPhoneBR(card.canonical_phone)}</span>
            </div>
          </div>
          <Badge className={`text-xs ${journeyStatus.className}`}>
            {journeyStatus.label}
          </Badge>
        </div>

        {card.data_exame && (
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <Calendar className="w-3 h-3" />
            <span>{formatDataExameBr(card.data_exame)}</span>
            {card.horario_inicio && <span>{card.horario_inicio}</span>}
            {card.horario_final && card.horario_final !== card.horario_inicio && (
              <span>- {card.horario_final}</span>
            )}
          </div>
        )}

        {card.procedimentos && (
          <div className="text-xs text-slate-400 line-clamp-2">{card.procedimentos}</div>
        )}

        {card.last_inbound_message && (
          <div className="text-xs text-slate-300 line-clamp-2">
            Resposta: {card.last_inbound_message}
          </div>
        )}

        <div className="flex flex-wrap gap-1">
          {card.phone_ladder_exhausted && (
            <Badge variant="outline" className="text-xs border-red-500/50 text-red-300">
              Escada esgotada
            </Badge>
          )}
          {card.has_reply && classificationBadge && (
            <Badge className={`text-xs ${classificationBadge.className}`}>
              {classificationBadge.label}
            </Badge>
          )}
          {card.current_instance_name && (
            <Badge variant="outline" className="text-xs border-slate-500/50 text-slate-300">
              {card.current_instance_name}
            </Badge>
          )}
          {card.automation_notes && (
            <Badge variant="outline" className="text-xs border-slate-500/50 text-slate-400">
              {card.automation_notes.split('|').pop()?.trim().substring(0, 30)}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default function CRM() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [boardData, setBoardData] = useState({
    mensagem_recebida: [] as KanbanCard[],
    em_andamento: [] as KanbanCard[],
    cancelou: [] as KanbanCard[],
    concluido: [] as KanbanCard[],
    reagendar: [] as KanbanCard[],
  })
  const [search, setSearch] = useState('')
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const refetch = async () => {
    setRefreshing(true)
    try {
      const data = await fetchKanbanData()
      setBoardData(data)
    } catch (e) {
      console.error('Error fetching kanban data:', e)
      toast({ title: 'Erro ao carregar dados', description: 'Falha ao buscar dados do CRM.', variant: 'destructive' })
    } finally {
      setRefreshing(false)
      setLoading(false)
    }
  }

  useEffect(() => {
    refetch()
  }, [])

  useEffect(() => {
    if (!autoRefresh) return
    const interval = setInterval(refetch, 30000)
    return () => clearInterval(interval)
  }, [autoRefresh])

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!search.trim()) {
      await refetch()
      return
    }

    setLoading(true)
    try {
      const results = await searchKanbanCards(search)
      const searchResults = {
        mensagem_recebida: results.filter((r) => r.crm_bucket === 'mensagem_recebida'),
        em_andamento: results.filter((r) => !r.crm_bucket || r.crm_bucket === 'em_andamento'),
        cancelou: results.filter((r) => r.crm_bucket === 'cancelou'),
        concluido: results.filter((r) => r.crm_bucket === 'concluido'),
        reagendar: results.filter((r) => r.crm_bucket === 'reagendar'),
      }
      setBoardData(searchResults)
    } finally {
      setLoading(false)
    }
  }

  const handleClearSearch = async () => {
    setSearch('')
    await refetch()
  }

  const totalCounts = useMemo(() => {
    return {
      mensagem_recebida: boardData.mensagem_recebida.length,
      em_andamento: boardData.em_andamento.length,
      cancelou: boardData.cancelou.length,
      concluido: boardData.concluido.length,
      reagendar: boardData.reagendar.length,
    }
  }, [boardData])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <RefreshCw className="w-8 h-8 animate-spin text-slate-400 mx-auto" />
          <p className="text-slate-300">Carregando CRM...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <h1 className="text-2xl font-bold text-white">CRM Kanban</h1>
        
        <form onSubmit={handleSearch} className="flex gap-2 w-full lg:w-auto">
          <div className="relative flex-1 lg:flex-none lg:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Buscar paciente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-slate-800/50 border-slate-700 text-white"
            />
          </div>
          <Button
            type="submit"
            variant="outline"
            className="border-slate-700 text-white"
          >
            Buscar
          </Button>
          {search && (
            <Button
              type="button"
              variant="ghost"
              onClick={handleClearSearch}
              className="text-slate-300 hover:text-white"
            >
              Limpar
            </Button>
          )}
        </form>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={autoRefresh ? 'border-green-500/50 text-green-300' : 'border-slate-700 text-slate-300'}
          >
            Auto-refresh {autoRefresh ? 'ON' : 'OFF'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={refetch}
            disabled={refreshing}
            className="border-slate-700 text-white"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 overflow-x-auto">
        {Object.entries(boardData).map(([column, cards]) => {
          const config = COLUMN_CONFIG[column as KanbanColumn]
          const count = totalCounts[column as KanbanColumn]
          const Icon = config.icon

          return (
            <div key={column} className="flex flex-col h-[calc(100vh-200px)] min-w-[300px]">
              <Card className={`flex-shrink-0 border-2 ${config.color}`}>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4" />
                      <span className="font-semibold text-white">{config.title}</span>
                    </div>
                    <Badge className="bg-white/10 text-white border-white/20">{count}</Badge>
                  </div>
                </CardContent>
              </Card>

              <div className="flex-1 overflow-y-auto space-y-2 mt-3 pr-2">
                {cards.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-sm">
                    Vazio
                  </div>
                ) : (
                  cards.map((card) => (
                    <KanbanCardComponent key={card.journey_id} card={card} />
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
