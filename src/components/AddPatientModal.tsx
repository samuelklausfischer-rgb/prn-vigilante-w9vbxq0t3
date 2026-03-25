import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { PlusCircle, Loader2, MessageSquare } from 'lucide-react'
import { isValidDataExame, normalizeDataExame } from '@/lib/utils/data-exame'
import { buildSaraMessage } from '@shared/templates/sara-message'
import { normalizePhone } from '../../packages/shared/validators'

// Schema de validação
const formSchema = z.object({
  patient_name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  phone_number: z.string().min(10, 'Telefone inválido'),
  phone_2: z.string().optional(),
  phone_3: z.string().optional(),
  data_exame: z
    .string()
    .min(8, 'Data do exame é obrigatória')
    .refine((v) => isValidDataExame(v), 'Data do exame inválida'),
  message_body: z.string().min(10, 'Mensagem deve ter pelo menos 10 caracteres'),
  Data_nascimento: z.string().optional(),
  procedimentos: z.string().min(3, 'Exame é obrigatório'),
  horario_inicio: z.string().min(5, 'Horário é obrigatório'),
  time_proce: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

interface AddPatientModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

// Helper para somar horários (HH:mm + HH:mm:ss)
function calculateEndTime(startTime: string, duration: string): string {
  if (!startTime || !duration) return ''

  try {
    const [sHours, sMinutes] = startTime.split(':').map(Number)
    const [dHours, dMinutes] = duration.split(':').map(Number)

    let totalMinutes = sHours * 60 + sMinutes + dHours * 60 + dMinutes

    // Ajuste para não passar de 24h (opcional, mas bom pra segurança)
    totalMinutes = totalMinutes % (24 * 60)

    const endHours = Math.floor(totalMinutes / 60)
    const endMinutes = totalMinutes % 60

    return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`
  } catch (_e) {
    return ''
  }
}

export function AddPatientModal({ isOpen, onClose, onSuccess }: AddPatientModalProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      patient_name: '',
      phone_number: '+55 ',
      phone_2: '',
      phone_3: '',
      data_exame: '',
      message_body: '',
      Data_nascimento: '',
      procedimentos: 'Ressonância Magnética ',
      horario_inicio: '',
      time_proce: '00:30:00', // Padrão 30 min
    },
  })

  // Gerador de mensagem padrão baseada nos campos (Prompt da Sara)
  const watchName = form.watch('patient_name')
  const watchExame = form.watch('procedimentos')
  const watchHora = form.watch('horario_inicio')
  const watchDataExame = form.watch('data_exame')

  useEffect(() => {
    if (watchName && watchExame && watchHora && watchDataExame && !form.getValues('message_body')) {
      const newTemplate = buildSaraMessage({
        data_exame_iso: watchDataExame,
        horario: watchHora,
        nome: watchName,
        procedimentos: watchExame,
      })
      form.setValue('message_body', newTemplate)
    }
  }, [watchName, watchExame, watchHora, watchDataExame, form])

  const onSubmit = async (values: FormValues) => {
    setLoading(true)
    try {
      const horario_final = calculateEndTime(values.horario_inicio, values.time_proce || '00:00:00')
      const dataExameIso = normalizeDataExame(values.data_exame)
      if (!dataExameIso) throw new Error('Data do exame inválida.')

      const normalizedPhone = normalizePhone(values.phone_number)

      const { data, error } = await (supabase.rpc as any)('enqueue_patient', {
        p_patient_name: values.patient_name,
        p_phone_number: normalizedPhone,
        p_phone_2: values.phone_2 || null,
        p_phone_3: values.phone_3 || null,
        p_data_exame: dataExameIso,
        p_message_body: values.message_body,
        p_data_nascimento: values.Data_nascimento || null,
        p_procedimentos: values.procedimentos,
        p_horario_inicio: values.horario_inicio,
        p_horario_final: horario_final,
        p_time_proce: values.time_proce || null,
        p_is_approved: true,
        p_send_after: new Date().toISOString(),
      })

      const result = Array.isArray(data) ? data[0] : data

      if (error) {
        throw error
      }

      if (!result) throw new Error('Nenhum retorno recebido ao enfileirar paciente.')

      if (result.status === 'duplicate_recent' || result.status === 'duplicate_original') {
        throw new Error(
          result.error_message ||
            'Paciente já tem agendamento recente para o mesmo horário/procedimento',
        )
      }

      if (result.status !== 'success') {
        throw new Error(result.error_message || 'Falha ao enfileirar paciente.')
      }

      toast({
        title: '✅ Paciente Cadastrado!',
        description: `${values.patient_name} foi adicionado à fila. Fim previsto: ${horario_final}.`,
      })

      form.reset()
      onSuccess()
      onClose()
    } catch (error: any) {
      console.error('Erro ao cadastrar:', error)
      toast({
        title: '❌ Falha ao Cadastrar',
        description: error.message || 'Erro interno ao conectar no banco.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-3xl bg-[#0f1115] border-white/10 text-white rounded-2xl shadow-2xl overflow-y-auto max-h-[95vh]">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-emerald-500/20 p-2 rounded-xl text-emerald-400">
              <PlusCircle className="w-6 h-6" />
            </div>
            <DialogTitle className="text-2xl font-heading font-bold">
              Novo Cadastro de Paciente
            </DialogTitle>
          </div>
          <DialogDescription className="text-slate-400 text-sm">
            Cadastros manuais geram automaticamente o template da "Sara" para o Hospital São
            Benedito.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
              {/* Seção: Dados Pessoais */}
              <div className="space-y-4">
                <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-400/50 mb-2">
                  Identificação
                </h3>

                <FormField
                  control={form.control}
                  name="patient_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-medium text-slate-300">
                        Nome Completo
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ex: João Silva"
                          {...field}
                          className="bg-white/5 border-white/10 rounded-xl focus:border-blue-500/50 transition-colors"
                        />
                      </FormControl>
                      <FormMessage className="text-red-400 text-[10px]" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="Data_nascimento"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-medium text-slate-300">
                        Data de Nascimento
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="DD/MM/AAAA"
                          {...field}
                          className="bg-white/5 border-white/10 rounded-xl"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              {/* Seção: Contatos */}
              <div className="space-y-4">
                <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400/50 mb-2">
                  Contatos Rápidos
                </h3>

                <FormField
                  control={form.control}
                  name="phone_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-medium text-slate-300">
                        WhatsApp Principal
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="+55 11 99999-9999"
                          {...field}
                          className="bg-emerald-500/10 border-white/10 rounded-xl border-emerald-500/20"
                        />
                      </FormControl>
                      <FormMessage className="text-red-400 text-[10px]" />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="phone_2"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            placeholder="Fone 2 (Opcional)"
                            {...field}
                            className="bg-white/5 border-white/10 rounded-xl text-xs"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="phone_3"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            placeholder="Fone 3 (Opcional)"
                            {...field}
                            className="bg-white/5 border-white/10 rounded-xl text-xs"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>

            {/* Seção: Procedimento */}
            <div className="bg-blue-600/5 p-4 rounded-2xl border border-blue-500/20 space-y-4">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-400/70">
                Regras de Agendamento
              </h3>

              <FormField
                control={form.control}
                name="procedimentos"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium text-slate-300">
                      Tipo de Exame / Procedimento
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ex: Ressonância Magnética de Crânio"
                        {...field}
                        className="bg-white/10 border-white/10 rounded-xl"
                      />
                    </FormControl>
                    <FormMessage className="text-red-400 text-[10px]" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="data_exame"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium text-slate-300">
                      Data do Exame
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                        className="bg-white/10 border-white/10 rounded-xl"
                      />
                    </FormControl>
                    <FormMessage className="text-red-400 text-[10px]" />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="horario_inicio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-medium text-slate-300">
                        Horário de Início
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ex: 14:30"
                          {...field}
                          className="bg-white/5 border-white/10 rounded-xl"
                        />
                      </FormControl>
                      <FormMessage className="text-red-400 text-[10px]" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="time_proce"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-medium text-slate-300">
                        Duração (Procedimento)
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ex: 00:45:00"
                          {...field}
                          className="bg-white/5 border-white/10 rounded-xl"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Mensagem Preview */}
            <FormField
              control={form.control}
              name="message_body"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2 text-xs font-medium text-emerald-400 mb-2">
                    <MessageSquare className="w-3.5 h-3.5" />
                    Preview da Mensagem (Hospital São Benedito)
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Template Sara..."
                      className="bg-[#0a0c10] border-white/5 min-h-[160px] rounded-xl text-sm leading-relaxed p-4 font-sans focus:border-emerald-500/30"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-red-400 text-[10px]" />
                </FormItem>
              )}
            />

            <DialogFooter className="gap-2 sm:gap-0 border-t border-white/5 pt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={onClose}
                className="text-slate-400 hover:text-white"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl px-10 shadow-lg shadow-blue-500/20"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <PlusCircle className="w-4 h-4 mr-2" />
                )}
                Registrar na Fila
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
