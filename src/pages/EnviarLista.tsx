import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { formatDataExameBr, isValidDataExame, normalizeDataExame } from '@/lib/utils/data-exame'
import { Loader2, Wand2, RefreshCw, CheckCircle2, AlertTriangle, AlertCircle, MessageSquare } from 'lucide-react'
import { normalizePhone } from '../../packages/shared/index.ts'
import { WhatsAppInstance } from '@/types'
import { evolutionApi } from '@/services/evolution'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type AgendaStatus = 'agendado_dentro_janela' | 'fora_da_janela'

type PatientAgendaItem = {
  patient_name: string
  Data_nascimento?: string | null
  phone_number: string
  phone_2?: string | null
  phone_3?: string | null
  procedimentos: string
  time_proce: string
  tempo_total: string
  horario_inicio: string
  horario_final: string
  data_exame: string
  status_agenda: AgendaStatus
  message_body: string
  warning?: string | null
}

type OrganizeListResponse =
  | { success: true; data: { agenda_date?: string; patients: PatientAgendaItem[] } }
  | { success: false; error: string }

async function getEdgeFunctionErrorMessage(error: any): Promise<string> {
  if (!error) return 'Falha inesperada.'

  const rawMessage = String(error?.message || '')
  if (/z-ai\.com|UnrecognisedName|endpoint nao suportado/i.test(rawMessage)) {
    return 'A configuracao do provedor de IA esta incorreta na Edge Function. Ajuste o endpoint do modelo antes de tentar novamente.'
  }
  if (/sem data do exame/i.test(rawMessage)) {
    return 'A lista foi reconhecida, mas nao tem data do exame. Preencha o campo de data manualmente e gere novamente.'
  }

  const response = error?.context
  if (response && typeof response.clone === 'function') {
    try {
      const clone = response.clone()
      const payload = await clone.json()
      const payloadMessage = String(payload?.error || payload?.message || '')
      if (/z-ai\.com|UnrecognisedName|endpoint nao suportado/i.test(payloadMessage)) {
        return 'A configuracao do provedor de IA esta incorreta na Edge Function. Ajuste o endpoint do modelo antes de tentar novamente.'
      }
      if (/sem data do exame/i.test(payloadMessage)) {
        return 'A lista foi reconhecida, mas nao tem data do exame. Preencha o campo de data manualmente e gere novamente.'
      }
      if (typeof payload?.error === 'string' && payload.error.trim()) {
        return payload.error
      }
      if (typeof payload?.message === 'string' && payload.message.trim()) {
        return payload.message
      }
    } catch {
      try {
        const text = await response.clone().text()
        if (text?.trim()) return text
      } catch {
        // noop
      }
    }
  }

  return String(error?.message || 'Falha inesperada.')
}

function hasBlockingIssues(patients: PatientAgendaItem[]) {
  const outside = patients.some((p) => p.status_agenda === 'fora_da_janela')
  const undefinedTime = patients.some((p) => /Tempo de exame não definido/i.test(p.time_proce))
  const invalidDate = patients.some((p) => !isValidDataExame(p.data_exame))
  return { outside, undefinedTime, invalidDate, blocked: outside || undefinedTime || invalidDate }
}

function isSuspiciousName(value: string) {
  const normalized = String(value || '').toLowerCase()
  return ['telefone', 'procedimento', 'cid', 'data/hora', 'unidade solicitante', 'origem'].some((token) => normalized.includes(token))
}

function displayField(value?: string | null) {
  const normalized = String(value || '').trim()
  return normalized || 'Nao informado'
}

export default function EnviarLista() {
  const { toast } = useToast()
  const [rawText, setRawText] = useState('')
  const [manualExamDate, setManualExamDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [inserting, setInserting] = useState(false)
  const [result, setResult] = useState<{ agenda_date?: string; patients: PatientAgendaItem[] } | null>(null)
  const [instances, setInstances] = useState<WhatsAppInstance[]>([])
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null)

  useEffect(() => {
    const loadInstances = async () => {
      try {
        const data = await evolutionApi.getInstances()
        const connected = data.filter((i) => i.status === 'connected')
        setInstances(connected)
        if (connected.length > 0) {
          // Pré-seleciona a primeira se não houver selecionada
          setSelectedInstanceId(connected[0].id)
        }
      } catch (e) {
        console.error('Erro ao carregar instâncias', e)
      }
    }
    loadInstances()
  }, [])

  const issues = useMemo(() => hasBlockingIssues(result?.patients || []), [result])

  const handleGenerate = async () => {
    if (!rawText.trim()) {
      toast({ title: 'Lista vazia', description: 'Cole a lista desorganizada antes de gerar.', variant: 'destructive' })
      return
    }

    if (manualExamDate && !isValidDataExame(manualExamDate)) {
      toast({ title: 'Data invalida', description: 'Informe a data do exame no formato DD/MM/AAAA.', variant: 'destructive' })
      return
    }

    setLoading(true)
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) throw sessionError
      const accessToken = sessionData.session?.access_token
      if (!accessToken) {
        throw new Error('Sessão ausente/expirada. Faça login novamente antes de gerar.')
      }

      const invokePromise = supabase.functions.invoke<OrganizeListResponse>('organize-patient-list', {
        body: { rawText, manualExamDate: normalizeDataExame(manualExamDate) || manualExamDate || null },
        headers: { Authorization: `Bearer ${accessToken}` },
      })

      const timeoutMs = 120_000
      const timeoutPromise = new Promise<never>((_, reject) => {
        window.setTimeout(() => reject(new Error('Tempo limite ao gerar (lista grande). Tente novamente.')), timeoutMs)
      })

      if (rawText.split('\n').length > 80) {
        toast({
          title: 'Processando lista grande',
          description: 'Estamos processando em blocos. Pode demorar um pouco.',
        })
      }

      const { data, error } = await Promise.race([invokePromise, timeoutPromise])

      if (error) throw error
      if (!data) throw new Error('Resposta vazia da função.')

      if (!data.success) {
        const response = data as { success: false; error: string }
        throw new Error(response.error || 'Falha ao gerar agenda.')
      }

      setResult(data.data)
      toast({ title: 'Gerado', description: `Agenda gerada com ${data.data.patients.length} paciente(s).` })
    } catch (e: any) {
      setResult(null)
      const msg = await getEdgeFunctionErrorMessage(e)
      toast({ title: 'Erro ao gerar', description: msg, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const handleReject = async () => {
    // “Recusar” = gerar de novo com o mesmo texto (sem gravar)
    await handleGenerate()
  }

  const handleApproveInsert = async () => {
    if (!result) return
    if (issues.blocked) {
      toast({
        title: 'Não é possível aprovar',
        description: 'Existem pacientes fora da janela, com tempo indefinido, ou data inválida.',
        variant: 'destructive',
      })
      return
    }

    setInserting(true)
    try {
      const patientsWithWarnings = [...result.patients]
      let successCount = 0
      let duplicateCount = 0

      for (let i = 0; i < result.patients.length; i++) {
        const p = result.patients[i]
        const dataIso = normalizeDataExame(p.data_exame)
        if (!dataIso) throw new Error(`Data inválida para ${p.patient_name}`)

        const phoneNormalized = normalizePhone(p.phone_number)
        const phone2Normalized = p.phone_2 ? normalizePhone(p.phone_2) : null
        const phone3Normalized = p.phone_3 ? normalizePhone(p.phone_3) : null

        const { data, error } = await (supabase.rpc as any)('enqueue_patient', {
          p_patient_name: p.patient_name,
          p_phone_number: phoneNormalized,
          p_phone_2: phone2Normalized,
          p_phone_3: phone3Normalized,
          p_data_nascimento: p.Data_nascimento,
          p_procedimentos: p.procedimentos,
          p_time_proce: p.time_proce,
          p_horario_inicio: p.horario_inicio,
          p_horario_final: p.horario_final,
          p_data_exame: dataIso,
          p_message_body: p.message_body,
          p_locked_instance_id: selectedInstanceId,
        })

        const rpcResult = Array.isArray(data) ? data[0] : data

        if (error) {
          throw error
        }

        if (rpcResult?.status === 'duplicate_recent' || rpcResult?.status === 'duplicate_original') {
          patientsWithWarnings[i] = { ...p, warning: 'duplicado_recente_na_fila' }
          duplicateCount++
          continue
        }

        if (rpcResult?.status !== 'success') {
          throw new Error(rpcResult?.error_message || `Falha ao inserir ${p.patient_name}`)
        }

        if (rpcResult?.status === 'success') {
          successCount++
        }
      }

      setResult({ ...result, patients: patientsWithWarnings })

      const messages = []
      const selectedInstanceName = instances.find((i: any) => i.id === selectedInstanceId)?.instanceName || 'instância selecionada'
      if (successCount > 0) messages.push(`${successCount} paciente(s) inserido(s) via ${selectedInstanceName}`)
      if (duplicateCount > 0) messages.push(`${duplicateCount} duplicado(s) recente(s)`)

      toast({ title: 'Processamento concluído', description: messages.join('. ') })

      if (successCount === result.patients.length) {
        setResult(null)
        setRawText('')
      }
    } catch (e: any) {
      toast({ title: 'Falha ao inserir', description: e.message || 'Erro inesperado.', variant: 'destructive' })
    } finally {
      setInserting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-card/60 p-6">
        <h2 className="font-heading text-xl font-bold text-white">Enviar lista</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Cole a lista desorganizada. A IA vai organizar e gerar as mensagens. Você revisa e aprova para inserir no banco.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-white/10 bg-card/40 p-5 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-white">Lista desorganizada</h3>
              <p className="text-xs text-muted-foreground">Sem inventar dados. Se a data nao vier no texto, informe abaixo.</p>
            </div>
            <Button onClick={handleGenerate} disabled={loading} className="bg-blue-600 hover:bg-blue-700">
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Wand2 className="w-4 h-4 mr-2" />}
              Gerar
            </Button>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-200">Data do exame (opcional quando ja vier no texto)</label>
            <Input
              value={manualExamDate}
              onChange={(e) => setManualExamDate(e.target.value)}
              placeholder="DD/MM/AAAA"
              className="bg-black/30 border-white/10"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-200">Canal de WhatsApp (Instância)</label>
            <Select
              value={selectedInstanceId || undefined}
              onValueChange={(val) => setSelectedInstanceId(val)}
            >
              <SelectTrigger className="bg-black/30 border-white/10 text-white">
                <SelectValue placeholder={instances.length === 0 ? "Nenhum canal conectado" : "Selecione o canal..."} />
              </SelectTrigger>
              <SelectContent className="bg-[#1a1b1e] border-white/10 text-white">
                {instances.length === 0 ? (
                  <SelectItem value="none" disabled>Nenhum canal conectado</SelectItem>
                ) : (
                  instances.map((inst: any) => (
                    <SelectItem key={inst.id} value={inst.id}>
                      <div className="flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-emerald-400" />
                        <span>{inst.instanceName} {inst.phoneNumber ? `(${inst.phoneNumber})` : ''}</span>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {instances.length === 0 && (
              <p className="text-[10px] text-amber-400 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                Nenhuma instância conectada. Vá em configurações de WhatsApp.
              </p>
            )}
          </div>

          <Textarea
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder="Cole aqui a lista..."
            className="min-h-[420px] bg-black/30 border-white/10"
          />
        </div>

        <div className="rounded-2xl border border-white/10 bg-card/40 p-5 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-white">Preview</h3>
              <p className="text-xs text-muted-foreground">Aprovação só libera se não houver bloqueios.</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleReject} disabled={!result || loading} className="border-white/10">
                <RefreshCw className="w-4 h-4 mr-2" /> Recusar
              </Button>
              <Button
                onClick={handleApproveInsert}
                disabled={!result || inserting || issues.blocked}
                className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60"
              >
                {inserting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                Aprovar
              </Button>
            </div>
          </div>

          {!result ? (
            <div className="rounded-xl border border-dashed border-white/10 bg-black/20 p-6 text-sm text-muted-foreground">
              Gere a agenda para visualizar os pacientes organizados.
            </div>
          ) : (
            <>
              {(issues.outside || issues.undefinedTime || issues.invalidDate) && (
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-200 flex gap-3">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <div className="font-semibold">Bloqueios encontrados</div>
                    <ul className="list-disc pl-5 text-xs text-amber-200/90 space-y-0.5">
                      {issues.outside && <li>Existem pacientes fora da janela 07:00–23:00.</li>}
                      {issues.undefinedTime && <li>Existem procedimentos sem tempo definido.</li>}
                      {issues.invalidDate && <li>Existe data de exame inválida.</li>}
                    </ul>
                  </div>
                </div>
              )}

                <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                  {result.patients.map((p, idx) => (
                    <div key={idx} className={`rounded-2xl border ${p.warning ? 'border-amber-500/50 bg-amber-500/5' : 'border-white/10 bg-black/20'} p-4 space-y-2`}>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {p.warning && <AlertCircle className="w-4 h-4 text-amber-400" />}
                          <div>
                            <div className="text-sm font-semibold text-white">{p.patient_name}</div>
                            <div className="text-[11px] text-muted-foreground">Cadastro estruturado para gravacao no banco</div>
                          </div>
                        </div>
                        <div className="text-xs font-mono text-slate-300">
                          {formatDataExameBr(p.data_exame)} • {p.horario_inicio}–{p.horario_final}
                       </div>
                     </div>
                     {p.warning === 'duplicado_recente_na_fila' && (
                       <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2 text-xs text-amber-200">
                         Paciente duplicado na fila recente
                       </div>
                     )}
                      {isSuspiciousName(p.patient_name) && (
                        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-2 text-xs text-red-200">
                          O campo nome parece contaminado com texto de outros campos. Revise antes de aprovar.
                        </div>
                      )}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <div className="rounded-xl border border-white/10 bg-black/30 p-3 space-y-1">
                          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Nome</div>
                          <div className="text-sm text-slate-100">{displayField(p.patient_name)}</div>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-black/30 p-3 space-y-1">
                          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Data de nascimento</div>
                          <div className="text-sm text-slate-100">{displayField(p.Data_nascimento)}</div>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-black/30 p-3 space-y-1">
                          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Telefone principal</div>
                          <div className="text-sm text-slate-100">{displayField(p.phone_number)}</div>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-black/30 p-3 space-y-1">
                          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Telefone 2</div>
                          <div className="text-sm text-slate-100">{displayField(p.phone_2)}</div>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-black/30 p-3 space-y-1">
                          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Telefone 3</div>
                          <div className="text-sm text-slate-100">{displayField(p.phone_3)}</div>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-black/30 p-3 space-y-1">
                          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Data do exame</div>
                          <div className="text-sm text-slate-100">{displayField(formatDataExameBr(p.data_exame))}</div>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-black/30 p-3 space-y-1">
                          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Horario inicial</div>
                          <div className="text-sm text-slate-100">{displayField(p.horario_inicio)}</div>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-black/30 p-3 space-y-1">
                          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Horario final</div>
                          <div className="text-sm text-slate-100">{displayField(p.horario_final)}</div>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-black/30 p-3 space-y-1 md:col-span-2">
                          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Procedimentos</div>
                          <div className="text-sm text-slate-100 whitespace-pre-wrap">{displayField(p.procedimentos)}</div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        <div className="rounded-xl border border-white/10 bg-black/30 p-2">
                          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Time proce</div>
                          <div className="text-xs font-mono text-slate-200">{p.time_proce}</div>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-black/30 p-2">
                          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Tempo total</div>
                          <div className="text-xs font-mono text-slate-200">{p.tempo_total || p.time_proce}</div>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-black/30 p-2">
                          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Status</div>
                          <div className="text-xs font-mono text-slate-200">{p.status_agenda}</div>
                        </div>
                     </div>
                     <div className="rounded-xl border border-white/10 bg-black/30 p-2">
                       <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                         Message body (WhatsApp)
                       </div>
                       <Textarea value={p.message_body} readOnly className="min-h-[120px] bg-black/40 border-white/10 text-xs" />
                     </div>
                   </div>
                 ))}
               </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

