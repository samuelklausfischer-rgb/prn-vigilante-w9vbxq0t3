import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { PatientQueue } from '@/types'
import { User, Stethoscope, MessageSquare, Settings2, Loader2 } from 'lucide-react'
import { normalizeDataExame } from '@/lib/utils/data-exame'

interface EditModalProps {
  item: PatientQueue | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (id: string, updates: Partial<PatientQueue>) => Promise<boolean | void>
}

export function EditModal({ item, open, onOpenChange, onSave }: EditModalProps) {
  const [formData, setFormData] = useState<Partial<PatientQueue>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (item && open) {
      setFormData({
        ...item,
        send_after: item.send_after ? new Date(item.send_after).toISOString().slice(0, 16) : '',
        notes: item.notes || '',
        procedimentos: item.procedimentos || '',
        Data_nascimento: item.Data_nascimento || '',
        data_exame: normalizeDataExame(item.data_exame) || '',
        time_proce: item.time_proce || '',
        horario_inicio: item.horario_inicio || '',
        horario_final: item.horario_final || '',
        queue_order: item.queue_order ?? ('' as any),
      })
    }
  }, [item, open])

  const handleChange = (f: keyof PatientQueue, v: any) => setFormData((p) => ({ ...p, [f]: v }))

  const handleSave = async () => {
    if (!item) return
    setSaving(true)
    const dataExameIso = normalizeDataExame(formData.data_exame as any) || normalizeDataExame(item.data_exame) || null
    const updates: Partial<PatientQueue> = {
      patient_name: formData.patient_name,
      phone_number: formData.phone_number,
      Data_nascimento: formData.Data_nascimento || null,
      procedimentos: formData.procedimentos || null,
      data_exame: dataExameIso,
      time_proce: formData.time_proce || null,
      message_body: formData.message_body,
      send_after: formData.send_after
        ? new Date(formData.send_after as string).toISOString()
        : item.send_after,
      is_approved: formData.is_approved,
      status: formData.status as any,
      notes: formData.notes || null,
      queue_order:
        typeof formData.queue_order === 'string'
          ? formData.queue_order === ''
            ? null
            : Number(formData.queue_order)
          : formData.queue_order === undefined || formData.queue_order === null
          ? null
          : Number(formData.queue_order),
    }
    const success = await onSave(item.id, updates)
    setSaving(false)
    if (success !== false) onOpenChange(false)
  }

  if (!item) return null

  const Section = ({ title, icon: Icon, children }: any) => (
    <div className="space-y-4">
      <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
        <Icon className="w-4 h-4 text-emerald-400/80" /> {title}
      </h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>
    </div>
  )

  const Field = ({ label, colSpan = 1, children }: any) => (
    <div className={`space-y-1.5 ${colSpan === 2 ? 'sm:col-span-2' : ''}`}>
      <Label className="text-xs text-slate-300 font-medium">{label}</Label>
      {children}
    </div>
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl border-white/10 bg-[#0f1115] rounded-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">Editor de Lote de Paciente</DialogTitle>
          <DialogDescription>
            Modifique os dados de base de{' '}
            <span className="font-semibold text-foreground">{item.patient_name}</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          <Section title="Informações Pessoais" icon={User}>
            <Field label="Nome do Paciente *">
              <Input
                value={formData.patient_name || ''}
                onChange={(e) => handleChange('patient_name', e.target.value)}
                className="bg-black/20 border-white/10"
              />
            </Field>
            <Field label="WhatsApp *">
              <Input
                value={formData.phone_number || ''}
                onChange={(e) => handleChange('phone_number', e.target.value)}
                className="bg-black/20 border-white/10"
              />
            </Field>
            <Field label="Data de Nascimento">
              <Input
                type="date"
                value={formData.Data_nascimento || ''}
                onChange={(e) => handleChange('Data_nascimento', e.target.value)}
                className="bg-black/20 border-white/10 block"
              />
            </Field>
          </Section>

          <Separator className="bg-white/5" />

          <Section title="Dados Clínicos" icon={Stethoscope}>
            <Field label="Procedimentos Agendados" colSpan={2}>
              <Textarea
                value={formData.procedimentos || ''}
                onChange={(e) => handleChange('procedimentos', e.target.value)}
                className="bg-black/20 border-white/10 min-h-[60px]"
              />
            </Field>
            <Field label="Data do Exame *">
              <Input
                type="date"
                value={(formData.data_exame as any) || ''}
                onChange={(e) => handleChange('data_exame', e.target.value)}
                className="bg-black/20 border-white/10 block"
              />
            </Field>
            <Field label="Horário Agendado">
              <Input
                type="time"
                value={formData.time_proce || ''}
                onChange={(e) => handleChange('time_proce', e.target.value)}
                className="bg-black/20 border-white/10 block"
              />
            </Field>
            <Field label="Horário Início">
              <Input
                type="time"
                value={formData.horario_inicio || ''}
                onChange={(e) => handleChange('horario_inicio', e.target.value)}
                className="bg-black/20 border-white/10 block"
              />
            </Field>
            <Field label="Horário Final">
              <Input
                type="time"
                value={formData.horario_final || ''}
                onChange={(e) => handleChange('horario_final', e.target.value)}
                className="bg-black/20 border-white/10 block"
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                Opcional - quando termina a sessão
              </p>
            </Field>
          </Section>

          <Separator className="bg-white/5" />

          <Section title="Comunicação e Status" icon={MessageSquare}>
            <Field label="Status do Envio *">
              <Select
                value={formData.status || ''}
                onValueChange={(v) => handleChange('status', v)}
              >
                <SelectTrigger className="bg-black/20 border-white/10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="queued">Aguardando (Queued)</SelectItem>
                  <SelectItem value="sending">Processando (Sending)</SelectItem>
                  <SelectItem value="delivered">Entregue (Delivered)</SelectItem>
                  <SelectItem value="failed">Falha (Failed)</SelectItem>
                  <SelectItem value="cancelled">Cancelado (Cancelled)</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Agendar Disparo Para *">
              <Input
                type="datetime-local"
                value={formData.send_after || ''}
                onChange={(e) => handleChange('send_after', e.target.value)}
                className="bg-black/20 border-white/10 block"
              />
            </Field>
            <Field label="Corpo da Mensagem (WhatsApp) *" colSpan={2}>
              <Textarea
                value={formData.message_body || ''}
                onChange={(e) => handleChange('message_body', e.target.value)}
                className="bg-black/20 border-white/10 min-h-[100px] font-mono text-[13px]"
              />
            </Field>
            <div className="sm:col-span-2 flex items-center justify-between p-3.5 rounded-xl border border-white/5 bg-black/30 mt-1">
              <div>
                <Label className="text-sm">Liberar Disparo Automático</Label>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Ative para permitir que o sistema sincronize e envie esta mensagem.
                </p>
              </div>
              <Switch
                checked={formData.is_approved || false}
                onCheckedChange={(c) => handleChange('is_approved', c)}
                className="data-[state=checked]:bg-emerald-500"
              />
            </div>
          </Section>

          <Separator className="bg-white/5" />

          <Section title="Controle Interno" icon={Settings2}>
            <Field label="Ordem de Fila (Opcional)">
              <Input
                type="number"
                value={formData.queue_order ?? ''}
                onChange={(e) => handleChange('queue_order', e.target.value)}
                className="bg-black/20 border-white/10"
                placeholder="Automático"
              />
            </Field>
            <Field label="Notas da Supervisão" colSpan={2}>
              <Textarea
                value={formData.notes || ''}
                onChange={(e) => handleChange('notes', e.target.value)}
                className="bg-black/20 border-white/10 min-h-[60px]"
                placeholder="Observações internas..."
              />
            </Field>
          </Section>
        </div>

        <DialogFooter className="mt-6 pt-4 border-t border-white/5">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={saving}
            className="hover:bg-white/5"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-[0_0_15px_rgba(37,99,235,0.25)] transition-all"
          >
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {saving ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
