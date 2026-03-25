import { useMemo, useState } from 'react'
import { AlertCircle, CalendarDays, Loader2, Search, XCircle } from 'lucide-react'
import { useAppData } from '@/hooks/use-app-data'
import { useToast } from '@/hooks/use-toast'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TabCounter } from '@/components/TabCounter'
import { BulkActionsBar } from '@/components/BulkActionsBar'
import { PatientCardWithActions } from '@/components/PatientCardWithActions'
import { ConversationModal } from '@/components/ConversationModal'
import { updateQueueItemsBulk, deleteQueueItemsBulk } from '@/services/data'
import { archiveSelectedPatients } from '@/services/analytics'
import { getPatientConversation, type ConversationData } from '@/services/conversation'
import type { PatientCategory, PatientQueue } from '@/types'

const tabOrder: Array<{
  key: PatientCategory
  label: string
  tone?: 'default' | 'warning' | 'danger' | 'success' | 'info'
}> = [
  { key: 'respondido', label: 'Respondidos', tone: 'info' },
  { key: 'pendente', label: 'Pendentes', tone: 'warning' },
  { key: 'falha', label: 'Falhas', tone: 'default' },
  { key: 'critico', label: 'Critico', tone: 'danger' },
  { key: 'fixo', label: 'Telefone Fixo', tone: 'info' },
  { key: 'concluido', label: 'Concluidos', tone: 'success' },
  { key: 'historico', label: 'Historico', tone: 'default' },
]

function appendCompletedNote(notes?: string | null) {
  const current = String(notes || '').trim()
  if (current.toLowerCase().includes('concluido_manual')) return current
  return current ? `${current} | concluido_manual` : 'concluido_manual'
}

function categorizePatients(patients: PatientQueue[]) {
  const result: Record<PatientCategory, PatientQueue[]> = {
    respondido: [],
    pendente: [],
    falha: [],
    critico: [],
    fixo: [],
    concluido: [],
    historico: [],
  }

  patients.forEach((patient) => {
    const notes = (patient.notes || '').toLowerCase()
    const isConcluido = notes.includes('concluido_manual') || patient.status === 'completed'
    const isHistorico = patient.status === 'archived'

    if (isHistorico) {
      result.historico.push(patient)
    } else if (isConcluido) {
      result.concluido.push(patient)
    } else if (patient.status === 'failed') {
      result.falha.push(patient)
    } else if (patient.phone_ladder_exhausted || patient.status === 'pending_manual') {
      result.critico.push(patient)
    } else if (patient.phone_number?.replace(/\D/g, '').length === 10) {
      result.fixo.push(patient)
    } else if (patient.has_reply) {
      result.respondido.push(patient)
    } else {
      result.pendente.push(patient)
    }
  })

  return result
}

function filterPatients(patients: PatientQueue[], search: string, filterDate: string) {
  let filtered = patients

  // 1. Filtro por data de agendamento (data_exame)
  if (filterDate) {
    filtered = filtered.filter((p) => p.data_exame === filterDate)
  }

  // 2. Filtro por busca textual
  const query = search.trim().toLowerCase()
  if (!query) return filtered

  return filtered.filter((patient) => {
    const haystack = [
      patient.patient_name,
      patient.phone_number,
      patient.procedimentos || '',
      patient.data_exame || '',
      patient.notes || '',
      patient.current_outcome || '',
    ]
      .join(' ')
      .toLowerCase()

    return haystack.includes(query)
  })
}

export default function SegundaChamada() {
  const { toast } = useToast()
  const { items, loading, refetch } = useAppData(['failed', 'delivered'])
  const [activeTab, setActiveTab] = useState<PatientCategory>('respondido')
  const [search, setSearch] = useState('')
  const [filterDate, setFilterDate] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)

  // Estados para modal de conversação
  const [conversationModalOpen, setConversationModalOpen] = useState(false)
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null)
  const [conversationData, setConversationData] = useState<ConversationData | null>(null)
  const [conversationLoading, setConversationLoading] = useState(false)

  const categorized = useMemo(() => categorizePatients(items), [items])

  const filteredByTab = useMemo(() => {
    return {
      respondido: filterPatients(categorized.respondido, search, filterDate),
      pendente: filterPatients(categorized.pendente, search, filterDate),
      falha: filterPatients(categorized.falha, search, filterDate),
      critico: filterPatients(categorized.critico, search, filterDate),
      fixo: filterPatients(categorized.fixo, search, filterDate),
      concluido: filterPatients(categorized.concluido, search, filterDate),
      historico: filterPatients(categorized.historico, search, filterDate),
    }
  }, [categorized, search, filterDate])

  const currentItems = filteredByTab[activeTab]

  const resetSelection = () => setSelectedIds([])

  const clearFilters = () => {
    setSearch('')
    setFilterDate('')
  }

  const toggleSelected = (patientId: string, checked: boolean) => {
    setSelectedIds((current) => {
      if (checked) return current.includes(patientId) ? current : [...current, patientId]
      return current.filter((id) => id !== patientId)
    })
  }

  const handlePatientClick = (patient: PatientQueue) => {
    setSelectedPatientId(patient.id)
    setConversationModalOpen(true)
    setConversationLoading(true)
    setConversationData(null)

    getPatientConversation(patient.id)
      .then((data) => {
        setConversationData(data)
      })
      .catch((error) => {
        console.error('Erro ao buscar conversa:', error)
        toast({
          title: 'Erro ao carregar conversa',
          description: 'Não foi possível carregar o histórico de mensagens.',
          variant: 'destructive',
        })
      })
      .finally(() => {
        setConversationLoading(false)
      })
  }

  const toggleSelectAllCurrentTab = (checked: boolean) => {
    if (!checked) {
      const currentIds = new Set(currentItems.map((patient) => patient.id))
      setSelectedIds((current) => current.filter((id) => !currentIds.has(id)))
      return
    }

    setSelectedIds((current) =>
      Array.from(new Set([...current, ...currentItems.map((patient) => patient.id)])),
    )
  }

  const runBulkAction = async (action: () => Promise<void>) => {
    setSubmitting(true)
    try {
      await action()
      resetSelection()
      await refetch()
    } finally {
      setSubmitting(false)
    }
  }

  const handleReturnSelected = async () => {
    await runBulkAction(async () => {
      const success = await updateQueueItemsBulk(selectedIds, {
        status: 'queued',
        locked_by: null,
        locked_at: null,
        needs_second_call: false,
        second_call_reason: null,
        attempt_count: 0,
        updated_at: new Date().toISOString(),
      })

      if (!success) {
        throw new Error('Nao foi possivel devolver os pacientes para a fila.')
      }

      toast({
        title: 'Pacientes devolvidos para a fila',
        description: `${selectedIds.length} registro(s) retornaram para reenvio.`,
      })
    }).catch((error: any) => {
      toast({
        title: 'Erro ao voltar para fila',
        description: error?.message || 'Falha inesperada.',
        variant: 'destructive',
      })
    })
  }

  const handleCompleteSelected = async () => {
    await runBulkAction(async () => {
      for (const patient of items.filter((item) => selectedIds.includes(item.id))) {
        const ok = await updateQueueItemsBulk([patient.id], {
          notes: appendCompletedNote(patient.notes),
          needs_second_call: false,
          second_call_reason: null,
          updated_at: new Date().toISOString(),
        })

        if (!ok) throw new Error('Nao foi possivel marcar todos os pacientes como concluidos.')
      }

      toast({
        title: 'Pacientes concluidos',
        description: `${selectedIds.length} registro(s) foram movidos para a aba de concluidos.`,
      })
    }).catch((error: any) => {
      toast({
        title: 'Erro ao concluir',
        description: error?.message || 'Falha inesperada.',
        variant: 'destructive',
      })
    })
  }

  const handleArchiveSelected = async () => {
    await runBulkAction(async () => {
      const result = await archiveSelectedPatients(selectedIds)
      toast({
        title: result.success ? 'Selecao arquivada' : 'Arquivamento parcial',
        description: `${result.message}. Arquivados: ${result.archived_count}. Bloqueados: ${result.blocked_count}.`,
        variant: result.success ? 'default' : 'destructive',
      })
    }).catch((error: any) => {
      toast({
        title: 'Erro ao arquivar',
        description: error?.message || 'Falha inesperada.',
        variant: 'destructive',
      })
    })
  }

  const handleDeleteSelected = async () => {
    const confirmed = window.confirm(
      `Excluir ${selectedIds.length} paciente(s) selecionado(s)? Essa acao nao arquiva os dados.`,
    )
    if (!confirmed) return

    await runBulkAction(async () => {
      const success = await deleteQueueItemsBulk(selectedIds)
      if (!success) throw new Error('Nao foi possivel excluir os pacientes selecionados.')
      toast({
        title: 'Pacientes excluidos',
        description: `${selectedIds.length} registro(s) foram removidos da fila.`,
      })
    }).catch((error: any) => {
      toast({
        title: 'Erro ao excluir',
        description: error?.message || 'Falha inesperada.',
        variant: 'destructive',
      })
    })
  }

  const handleSingleReturn = async (patient: PatientQueue) => {
    setSelectedIds([patient.id])
    await handleReturnSelected()
  }

  const currentTabSelectedCount = currentItems.filter((patient) =>
    selectedIds.includes(patient.id),
  ).length

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Segunda chamada</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Organize pendencias, falhas, casos criticos e telefones fixos sem perder o controle dos
            concluidos e do historico.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative w-full max-w-[200px]">
            <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="date"
              value={filterDate}
              onChange={(event) => setFilterDate(event.target.value)}
              className="pl-9 bg-black/30 border-white/10 text-xs"
            />
          </div>

          <div className="relative w-full max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="pl-9"
              placeholder="Buscar nome, telefone, exame..."
            />
          </div>

          {(search || filterDate) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="text-muted-foreground hover:text-white"
            >
              <XCircle className="mr-2 h-4 w-4" />
              Limpar
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex h-72 items-center justify-center rounded-3xl border border-white/10 bg-card/40">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <Card className="border-white/10 bg-card/55">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <AlertCircle className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="text-lg font-semibold text-white">Sem pacientes para segunda chamada</h3>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              Nenhum registro com status de falha ou entregue precisa de tratamento manual agora.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Tabs
            value={activeTab}
            onValueChange={(value) => {
              setActiveTab(value as PatientCategory)
              resetSelection()
            }}
            className="space-y-4"
          >
            <TabsList className="h-auto w-full flex-wrap justify-start gap-2 rounded-2xl border border-white/10 bg-card/50 p-2">
              {tabOrder.map((tab) => (
                <TabsTrigger key={tab.key} value={tab.key} className="rounded-xl px-3 py-2">
                  {tab.label}
                  <TabCounter count={filteredByTab[tab.key].length} tone={tab.tone} />
                </TabsTrigger>
              ))}
            </TabsList>

            {tabOrder.map((tab) => (
              <TabsContent key={tab.key} value={tab.key} className="space-y-4">
                <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-card/50 p-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="text-sm font-semibold text-white">
                      {tab.label}
                      {filterDate && (
                        <span className="ml-2 text-blue-400 font-normal opacity-80">
                          (Filtrado por data)
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {filteredByTab[tab.key].length} registro(s) visiveis nesta aba.
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Checkbox
                        checked={
                          currentItems.length > 0 && currentTabSelectedCount === currentItems.length
                        }
                        onCheckedChange={(checked) => toggleSelectAllCurrentTab(Boolean(checked))}
                      />
                      Selecionar tudo
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => refetch()}
                      disabled={submitting}
                    >
                      Atualizar
                    </Button>
                  </div>
                </div>

                {filteredByTab[tab.key].length === 0 ? (
                  <Card className="border-white/10 bg-card/45">
                    <CardContent className="py-10 text-center text-sm text-muted-foreground">
                      Nenhum paciente encontrado nesta aba com os filtros atuais.
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {filteredByTab[tab.key].map((patient) => (
                      <PatientCardWithActions
                        key={patient.id}
                        patient={patient}
                        selected={selectedIds.includes(patient.id)}
                        onToggleSelect={(checked) => toggleSelected(patient.id, checked)}
                        onReturnToQueue={() => handleSingleReturn(patient)}
                        onClick={() => handlePatientClick(patient)}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>

          {selectedIds.length > 0 && (
            <BulkActionsBar
              selectedCount={selectedIds.length}
              onReturnToQueue={handleReturnSelected}
              onMarkCompleted={handleCompleteSelected}
              onArchive={handleArchiveSelected}
              onDelete={handleDeleteSelected}
              onClearSelection={resetSelection}
            />
          )}

          {submitting && (
            <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 backdrop-blur-[2px]">
              <div className="rounded-2xl border border-white/10 bg-card/80 px-5 py-4 text-sm text-white shadow-xl">
                <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
                Processando acao em lote...
              </div>
            </div>
          )}

          <ConversationModal
            open={conversationModalOpen}
            onOpenChange={setConversationModalOpen}
            conversation={conversationData}
            loading={conversationLoading}
          />
        </>
      )}
    </div>
  )
}
