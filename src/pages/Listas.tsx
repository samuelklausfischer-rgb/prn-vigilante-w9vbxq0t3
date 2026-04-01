import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useToast } from '@/hooks/use-toast'
import type { LegacyListGroup, PatientQueue, SendListStatus, SendListSummary, WhatsAppInstance } from '@/types'
import {
  cancelSendList,
  convertLegacyGroupToSendList,
  deleteSendList,
  fetchLegacyListGroups,
  fetchSendListPatients,
  fetchSendLists,
  reassignSendListInstance,
  updateSendList,
} from '@/services/send-lists'
import { evolutionApi } from '@/services/evolution'
import { formatDataExameBr } from '@/lib/utils/data-exame'
import { CalendarDays, Loader2, MessageSquare, RefreshCw, Trash2 } from 'lucide-react'
import { EditSendListDialog } from '@/components/send-lists/EditSendListDialog'

type SelectedKind = 'registered' | 'legacy'

const statusOptions: Array<{ value: SendListStatus | 'all'; label: string }> = [
  { value: 'all', label: 'Todos os status' },
  { value: 'draft', label: 'Rascunho' },
  { value: 'queued', label: 'Na fila' },
  { value: 'in_progress', label: 'Em andamento' },
  { value: 'completed', label: 'Concluida' },
  { value: 'cancelled', label: 'Cancelada' },
]

function statusBadgeClass(status: SendListStatus) {
  switch (status) {
    case 'queued':
      return 'bg-amber-500/20 text-amber-300 border-amber-500/40'
    case 'in_progress':
      return 'bg-blue-500/20 text-blue-300 border-blue-500/40'
    case 'completed':
      return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
    case 'cancelled':
      return 'bg-red-500/20 text-red-300 border-red-500/40'
    default:
      return 'bg-slate-500/20 text-slate-300 border-slate-500/40'
  }
}

function statusLabel(status: SendListStatus) {
  switch (status) {
    case 'draft':
      return 'Rascunho'
    case 'queued':
      return 'Na fila'
    case 'in_progress':
      return 'Em andamento'
    case 'completed':
      return 'Concluida'
    case 'cancelled':
      return 'Cancelada'
    default:
      return status
  }
}

function formatSchedule(patient: Pick<PatientQueue, 'horario_inicio' | 'horario_final'>) {
  if (patient.horario_inicio && patient.horario_final) {
    return `${patient.horario_inicio} - ${patient.horario_final}`
  }
  return patient.horario_inicio || 'Sem horario'
}

export default function Listas() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [lists, setLists] = useState<SendListSummary[]>([])
  const [legacyGroups, setLegacyGroups] = useState<LegacyListGroup[]>([])

  const [selectedKind, setSelectedKind] = useState<SelectedKind>('registered')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const [selectedPatients, setSelectedPatients] = useState<PatientQueue[]>([])
  const [loadingPatients, setLoadingPatients] = useState(false)
  const [instancesAll, setInstancesAll] = useState<WhatsAppInstance[]>([])

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<SendListStatus | 'all'>('all')
  const [examDateFilter, setExamDateFilter] = useState('')

  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [savingEditDialog, setSavingEditDialog] = useState(false)
  const [convertLegacyDialogOpen, setConvertLegacyDialogOpen] = useState(false)
  const [convertingLegacy, setConvertingLegacy] = useState(false)
  const [pendingLegacyGroup, setPendingLegacyGroup] = useState<LegacyListGroup | null>(null)
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  const connectedInstances = useMemo(
    () => instancesAll.filter((instance) => instance.status === 'connected'),
    [instancesAll],
  )

  const selectedList = useMemo(() => {
    if (selectedKind !== 'registered' || !selectedId) return null
    return lists.find((item) => item.id === selectedId) || null
  }, [selectedKind, selectedId, lists])

  const selectedLegacy = useMemo(() => {
    if (selectedKind !== 'legacy' || !selectedId) return null
    return legacyGroups.find((item) => item.id === selectedId) || null
  }, [selectedKind, selectedId, legacyGroups])

  const filteredRegistered = useMemo(() => {
    return lists.filter((list) => {
      const matchesSearch =
        list.name.toLowerCase().includes(search.toLowerCase()) ||
        (list.locked_instance_name || '').toLowerCase().includes(search.toLowerCase())
      const matchesStatus = statusFilter === 'all' || list.status === statusFilter
      const matchesExamDate = !examDateFilter || String(list.exam_date || '').includes(examDateFilter)
      return matchesSearch && matchesStatus && matchesExamDate
    })
  }, [lists, search, statusFilter, examDateFilter])

  const filteredLegacy = useMemo(() => {
    return legacyGroups.filter((group) => {
      const matchesSearch =
        group.title.toLowerCase().includes(search.toLowerCase()) ||
        (group.instance_name || '').toLowerCase().includes(search.toLowerCase())
      const matchesStatus = statusFilter === 'all' || group.status === statusFilter
      const matchesExamDate = !examDateFilter || String(group.exam_date || '').includes(examDateFilter)
      return matchesSearch && matchesStatus && matchesExamDate
    })
  }, [legacyGroups, search, statusFilter, examDateFilter])

  const totalCards = filteredRegistered.length + filteredLegacy.length

  const loadLists = async (showSpinner = false) => {
    try {
      if (showSpinner) setRefreshing(true)
      const [listsData, legacyData, instancesData] = await Promise.all([
        fetchSendLists(),
        fetchLegacyListGroups(),
        evolutionApi.getInstances(),
      ])

      setLists(listsData)
      setLegacyGroups(legacyData)
      setInstancesAll(instancesData)

      const hasRegisteredSelection =
        selectedKind === 'registered' &&
        selectedId &&
        listsData.some((item) => item.id === selectedId)

      const hasLegacySelection =
        selectedKind === 'legacy' &&
        selectedId &&
        legacyData.some((item) => item.id === selectedId)

      if (hasRegisteredSelection || hasLegacySelection) return

      if (listsData.length > 0) {
        setSelectedKind('registered')
        setSelectedId(listsData[0].id)
      } else if (legacyData.length > 0) {
        setSelectedKind('legacy')
        setSelectedId(legacyData[0].id)
      } else {
        setSelectedId(null)
      }
    } catch (error: any) {
      console.error('Erro ao carregar listas:', error)
      toast({
        title: 'Erro ao carregar listas',
        description: error?.message || 'Falha ao buscar listas cadastradas.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadLists()
  }, [])

  useEffect(() => {
    if (selectedKind !== 'registered' || !selectedId) {
      setSelectedPatients([])
      return
    }

    const loadPatients = async () => {
      setLoadingPatients(true)
      try {
        const data = await fetchSendListPatients(selectedId)
        setSelectedPatients(data)
      } catch (error: any) {
        toast({
          title: 'Erro ao carregar pacientes',
          description: error?.message || 'Falha ao carregar pacientes desta lista.',
          variant: 'destructive',
        })
      } finally {
        setLoadingPatients(false)
      }
    }

    loadPatients()
  }, [selectedKind, selectedId])

  const handleSaveEditDialog = async (payload: {
    name: string
    notes: string | null
    instanceId: string | null
    status: SendListStatus
  }) => {
    if (!selectedList) return

    try {
      setSavingEditDialog(true)

      const currentInstanceId = selectedList.locked_instance_id || null
      const nextInstanceId = payload.instanceId || null

      await updateSendList(selectedList.id, {
        name: payload.name,
        notes: payload.notes,
        status: payload.status,
      })

      if (currentInstanceId !== nextInstanceId) {
        await reassignSendListInstance(selectedList.id, nextInstanceId)
      }

      setEditDialogOpen(false)
      await loadLists(true)
      toast({ title: 'Lista atualizada', description: 'Dados salvos com sucesso.' })
    } catch (error: any) {
      toast({
        title: 'Erro ao salvar',
        description: error?.message || 'Falha ao atualizar a lista.',
        variant: 'destructive',
      })
    } finally {
      setSavingEditDialog(false)
    }
  }

  const handleCancelList = async () => {
    if (!selectedList) return
    try {
      await cancelSendList(selectedList.id)
      setCancelDialogOpen(false)
      await loadLists(true)
      toast({ title: 'Lista cancelada', description: 'Pacientes pendentes foram cancelados.' })
    } catch (error: any) {
      toast({ title: 'Erro ao cancelar', description: error?.message || 'Falha ao cancelar lista.', variant: 'destructive' })
    }
  }

  const handleDeleteList = async () => {
    if (!selectedList) return
    try {
      await deleteSendList(selectedList.id)
      setDeleteDialogOpen(false)
      await loadLists(true)
      toast({ title: 'Lista excluida', description: 'Lista removida com sucesso.' })
    } catch (error: any) {
      toast({ title: 'Erro ao excluir', description: error?.message || 'Falha ao excluir lista.', variant: 'destructive' })
    }
  }

  const handleRequestLegacyConversion = (group: LegacyListGroup) => {
    setPendingLegacyGroup(group)
    setConvertLegacyDialogOpen(true)
  }

  const handleConfirmLegacyConversion = async () => {
    if (!pendingLegacyGroup) return

    try {
      setConvertingLegacy(true)
      const { sendListId } = await convertLegacyGroupToSendList(pendingLegacyGroup)

      setConvertLegacyDialogOpen(false)
      setPendingLegacyGroup(null)

      await loadLists(true)
      setSelectedKind('registered')
      setSelectedId(sendListId)
      setEditDialogOpen(true)

      toast({
        title: 'Lista convertida',
        description: 'A lista legada foi convertida e esta pronta para edicao.',
      })
    } catch (error: any) {
      toast({
        title: 'Erro ao converter lista legada',
        description: error?.message || 'Falha ao converter esta lista.',
        variant: 'destructive',
      })
    } finally {
      setConvertingLegacy(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-card/60 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-heading text-xl font-bold text-white">Listas cadastradas e legadas</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Visualize listas novas e historicas sem alterar horarios ou status dos pacientes.
            </p>
          </div>
          <Button onClick={() => loadLists(true)} variant="outline" className="border-white/20">
            {refreshing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            Atualizar
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-card/40 p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar lista ou instancia"
          className="bg-black/30 border-white/10"
        />
        <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as SendListStatus | 'all')}>
          <SelectTrigger className="bg-black/30 border-white/10 text-white">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="bg-[#1a1b1e] border-white/10 text-white">
            {statusOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          value={examDateFilter}
          onChange={(event) => setExamDateFilter(event.target.value)}
          placeholder="Data exame (YYYY-MM-DD)"
          className="bg-black/30 border-white/10"
        />
        <div className="text-xs text-muted-foreground flex items-center px-2">
          {totalCards} card(s) encontrado(s)
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center rounded-2xl border border-white/10 bg-card/40">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : totalCards === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-card/30 p-8 text-center text-sm text-muted-foreground">
          Nenhuma lista encontrada com os filtros atuais.
        </div>
      ) : (
        <div className="space-y-6">
          <div className="space-y-3">
            <div className="text-sm font-semibold text-white">Listas cadastradas ({filteredRegistered.length})</div>
            {filteredRegistered.length === 0 ? (
              <div className="rounded-xl border border-white/10 bg-card/30 p-4 text-xs text-muted-foreground">
                Nenhuma lista cadastrada para os filtros atuais.
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {filteredRegistered.map((list) => (
                  <div
                    key={list.id}
                    onClick={() => {
                      setSelectedKind('registered')
                      setSelectedId(list.id)
                      setEditDialogOpen(true)
                    }}
                    className={`rounded-2xl border p-4 text-left transition-colors cursor-pointer ${selectedKind === 'registered' && selectedId === list.id ? 'border-blue-500/50 bg-blue-500/10' : 'border-white/10 bg-card/35 hover:bg-card/55'}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-white">{list.name}</div>
                        <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                          <CalendarDays className="w-3 h-3" />
                          {list.exam_date ? formatDataExameBr(list.exam_date) : 'Data nao informada'}
                        </div>
                      </div>
                      <div className="flex gap-2 items-center">
                        <Badge variant="outline" className="border-blue-500/40 text-blue-300">Cadastrada</Badge>
                        <Badge className={`border ${statusBadgeClass(list.status)}`}>{statusLabel(list.status)}</Badge>
                      </div>
                    </div>

                    <div className="mt-3 text-xs text-slate-300 flex items-center gap-2">
                      <MessageSquare className="w-3 h-3 text-emerald-400" />
                      {list.locked_instance_name || 'Canal nao definido'}
                      {list.locked_instance_phone ? `(${list.locked_instance_phone})` : ''}
                    </div>

                    <div className="mt-3 grid grid-cols-4 gap-2 text-xs">
                      <div className="rounded-lg border border-white/10 bg-black/20 p-2">
                        <div className="text-muted-foreground">Total</div>
                        <div className="text-white font-semibold">{list.total_patients}</div>
                      </div>
                      <div className="rounded-lg border border-white/10 bg-black/20 p-2">
                        <div className="text-muted-foreground">Fila</div>
                        <div className="text-white font-semibold">{list.queued_count}</div>
                      </div>
                      <div className="rounded-lg border border-white/10 bg-black/20 p-2">
                        <div className="text-muted-foreground">Enviando</div>
                        <div className="text-white font-semibold">{list.in_progress_count}</div>
                      </div>
                      <div className="rounded-lg border border-white/10 bg-black/20 p-2">
                        <div className="text-muted-foreground">Concluidos</div>
                        <div className="text-white font-semibold">{list.completed_count}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="text-sm font-semibold text-white">Listas legadas ({filteredLegacy.length})</div>
            {filteredLegacy.length === 0 ? (
              <div className="rounded-xl border border-white/10 bg-card/30 p-4 text-xs text-muted-foreground">
                Nenhum grupo legado para os filtros atuais.
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {filteredLegacy.map((group) => (
                  <button
                    key={group.id}
                    type="button"
                    onClick={() => {
                      handleRequestLegacyConversion(group)
                    }}
                    className={`rounded-2xl border p-4 text-left transition-colors ${selectedKind === 'legacy' && selectedId === group.id ? 'border-amber-500/50 bg-amber-500/10' : 'border-white/10 bg-card/35 hover:bg-card/55'}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-white">
                          {group.instance_name || 'Sem canal'} | {group.exam_date ? formatDataExameBr(group.exam_date) : 'Data nao informada'}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">Visualizacao legada (somente leitura)</div>
                      </div>
                      <div className="flex gap-2">
                        <Badge variant="outline" className="border-amber-500/40 text-amber-300">Legado</Badge>
                        <Badge className={`border ${statusBadgeClass(group.status)}`}>{statusLabel(group.status)}</Badge>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-5 gap-2 text-xs">
                      <div className="rounded-lg border border-white/10 bg-black/20 p-2">
                        <div className="text-muted-foreground">Total</div>
                        <div className="text-white font-semibold">{group.total_patients}</div>
                      </div>
                      <div className="rounded-lg border border-white/10 bg-black/20 p-2">
                        <div className="text-muted-foreground">Fila</div>
                        <div className="text-white font-semibold">{group.queued_count}</div>
                      </div>
                      <div className="rounded-lg border border-white/10 bg-black/20 p-2">
                        <div className="text-muted-foreground">Enviando</div>
                        <div className="text-white font-semibold">{group.in_progress_count}</div>
                      </div>
                      <div className="rounded-lg border border-white/10 bg-black/20 p-2">
                        <div className="text-muted-foreground">Concluidos</div>
                        <div className="text-white font-semibold">{group.completed_count}</div>
                      </div>
                      <div className="rounded-lg border border-white/10 bg-black/20 p-2">
                        <div className="text-muted-foreground">Falhas</div>
                        <div className="text-white font-semibold">{group.failed_count}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {selectedList && (
        <div className="rounded-2xl border border-white/10 bg-card/45 p-5 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-white">Detalhe da lista cadastrada</h3>
              <p className="text-xs text-muted-foreground">ID: {selectedList.id}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="border-blue-500/40 text-blue-200" onClick={() => setEditDialogOpen(true)}>
                Editar
              </Button>
              <Button variant="outline" className="border-red-500/40 text-red-300" onClick={() => setCancelDialogOpen(true)}>
                Cancelar lista
              </Button>
              <Button variant="outline" className="border-red-500/40 text-red-300" onClick={() => setDeleteDialogOpen(true)}>
                <Trash2 className="w-4 h-4 mr-2" /> Excluir
              </Button>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/20 p-3 text-xs text-slate-300 flex flex-wrap gap-3">
            <span>
              <strong className="text-white">Nome:</strong> {selectedList.name}
            </span>
            <span>
              <strong className="text-white">Status:</strong> {statusLabel(selectedList.status)}
            </span>
            <span>
              <strong className="text-white">Canal:</strong> {selectedList.locked_instance_name || 'Nao definido'}
            </span>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/20 p-3">
            <div className="text-sm font-semibold text-white mb-3">Pacientes vinculados</div>
            {loadingPatients ? (
              <div className="py-8 text-center text-muted-foreground text-sm">
                <Loader2 className="w-4 h-4 inline mr-2 animate-spin" /> Carregando pacientes...
              </div>
            ) : selectedPatients.length === 0 ? (
              <div className="py-6 text-center text-muted-foreground text-sm">Nenhum paciente vinculado a esta lista.</div>
            ) : (
              <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                {selectedPatients.map((patient) => (
                  <div key={patient.id} className="rounded-lg border border-white/10 bg-black/30 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm text-white font-medium">{patient.patient_name}</div>
                      <Badge variant="outline" className="border-white/20 text-slate-300">{patient.status}</Badge>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {formatSchedule(patient)} • {patient.procedimentos || 'Procedimento nao informado'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {selectedLegacy && (
        <div className="rounded-2xl border border-amber-500/30 bg-card/45 p-5 space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-white">Detalhe da lista legada</h3>
            <p className="text-xs text-amber-300 mt-1">
              Visualizacao somente leitura. Nenhum horario, status ou paciente foi alterado.
            </p>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/20 p-3">
            <div className="text-sm font-semibold text-white mb-3">Pacientes do card legado</div>
            {selectedLegacy.patients.length === 0 ? (
              <div className="py-6 text-center text-muted-foreground text-sm">Nenhum paciente neste card legado.</div>
            ) : (
              <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                {selectedLegacy.patients.map((patient) => (
                  <div key={patient.id} className="rounded-lg border border-white/10 bg-black/30 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm text-white font-medium">{patient.patient_name}</div>
                      <Badge variant="outline" className="border-white/20 text-slate-300">{patient.status}</Badge>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {formatSchedule(patient)} • {patient.procedimentos || 'Procedimento nao informado'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <EditSendListDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        list={selectedList}
        instances={connectedInstances}
        loading={savingEditDialog}
        onSave={handleSaveEditDialog}
      />

      <AlertDialog open={convertLegacyDialogOpen} onOpenChange={setConvertLegacyDialogOpen}>
        <AlertDialogContent className="border-white/10 bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle>Converter lista legada?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa acao criara uma lista cadastrada para este grupo e permitira edicao. Nenhum horario ou status dos pacientes sera alterado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setConvertLegacyDialogOpen(false)
                setPendingLegacyGroup(null)
              }}
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction className="bg-blue-600 hover:bg-blue-700" onClick={handleConfirmLegacyConversion}>
              {convertingLegacy ? 'Convertendo...' : 'Continuar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent className="border-white/10 bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar lista selecionada?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acao cancela pacientes pendentes desta lista. Pacientes ja processados sao preservados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={handleCancelList}>
              Confirmar cancelamento
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="border-white/10 bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir lista selecionada?</AlertDialogTitle>
            <AlertDialogDescription>
              Exclui a lista apenas se todos os pacientes estiverem em status seguro (queued/cancelled).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={handleDeleteList}>
              Confirmar exclusao
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
