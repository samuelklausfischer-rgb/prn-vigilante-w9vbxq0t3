import { useState } from 'react'
import { AlertTriangle, Archive, CalendarDays, Loader2, ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { archiveByDate, previewArchiveByDate } from '@/services/analytics'
import type { ArchivePreview } from '@/types'

export default function ArchiveByDate() {
  const { toast } = useToast()
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [preview, setPreview] = useState<ArchivePreview | null>(null)
  const [loading, setLoading] = useState(false)
  const [archiving, setArchiving] = useState(false)

  const loadPreview = async () => {
    setLoading(true)
    try {
      const result = await previewArchiveByDate(dataInicio, dataFim)
      setPreview(result)
    } catch (error: any) {
      toast({
        title: 'Erro ao gerar preview',
        description: error?.message || 'Falha inesperada.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const confirmArchive = async () => {
    setArchiving(true)
    try {
      const result = await archiveByDate(dataInicio, dataFim)
      toast({
        title: result.success ? 'Arquivamento concluido' : 'Arquivamento incompleto',
        description: `${result.message}. Arquivados: ${result.archived_count}. Bloqueados: ${result.blocked_count}.`,
        variant: result.success ? 'default' : 'destructive',
      })
      setPreview(null)
    } catch (error: any) {
      toast({
        title: 'Erro ao arquivar',
        description: error?.message || 'Falha inesperada.',
        variant: 'destructive',
      })
    } finally {
      setArchiving(false)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">
          Arquivamento por data de exame
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Selecione um intervalo de `data_exame` para mover pacientes resolvidos para a tabela de
          historico sem tocar nos registros em processamento.
        </p>
      </div>

      <Card className="border-white/10 bg-card/55">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <CalendarDays className="h-5 w-5" />
            Intervalo de arquivamento
          </CardTitle>
          <CardDescription>
            Exemplo: arquivar todos os agendamentos do dia 01 ao dia 15, mantendo o restante na
            fila.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-[1fr_1fr_auto]">
          <Input
            type="date"
            value={dataInicio}
            onChange={(event) => setDataInicio(event.target.value)}
          />
          <Input type="date" value={dataFim} onChange={(event) => setDataFim(event.target.value)} />
          <Button onClick={loadPreview} disabled={!dataInicio || !dataFim || loading}>
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Archive className="mr-2 h-4 w-4" />
            )}
            Visualizar
          </Button>
        </CardContent>
      </Card>

      {preview && (
        <Card className="border-white/10 bg-card/55">
          <CardHeader>
            <CardTitle className="text-white">Preview resumido</CardTitle>
            <CardDescription>{preview.message}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 p-4">
                <div className="text-xs uppercase tracking-[0.16em] text-blue-200">
                  Selecionados no periodo
                </div>
                <div className="mt-2 text-3xl font-bold text-white">{preview.total_to_archive}</div>
              </div>
              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4">
                <div className="text-xs uppercase tracking-[0.16em] text-amber-200">
                  Bloqueados por envio
                </div>
                <div className="mt-2 text-3xl font-bold text-white">{preview.blocked_sending}</div>
              </div>
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                <div className="text-xs uppercase tracking-[0.16em] text-emerald-200">
                  Elegiveis agora
                </div>
                <div className="mt-2 text-3xl font-bold text-white">
                  {Math.max(preview.total_to_archive - preview.blocked_sending, 0)}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-background/40 p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
                <ShieldAlert className="h-4 w-4 text-amber-300" />
                Breakdown por status
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                {Object.entries(preview.status_breakdown).map(([status, count]) => (
                  <div
                    key={status}
                    className="flex items-center justify-between rounded-xl border border-white/5 px-3 py-2 text-sm"
                  >
                    <span className="capitalize text-muted-foreground">{status}</span>
                    <span className="font-semibold text-white">{count}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-100">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <span>
                  O arquivamento move os registros para `patients_queue_archive` e remove apenas os
                  pacientes fora de processamento ativo.
                </span>
              </div>
            </div>

            <Button
              onClick={confirmArchive}
              disabled={archiving || preview.total_to_archive === 0}
              className="w-full md:w-auto"
            >
              {archiving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Archive className="mr-2 h-4 w-4" />
              )}
              Confirmar arquivamento
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
