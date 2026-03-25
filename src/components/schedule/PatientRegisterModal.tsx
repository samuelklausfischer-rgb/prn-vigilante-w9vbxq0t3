import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { enqueuePatient, type ScheduleItem } from '@/services/schedule'
import { buildSaraMessage } from '@/lib/templates/sara-message'
import { format, parse, isValid } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const formSchema = z.object({
  patient_name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  phone_number: z.string().min(10, 'Telefone inválido'),
  phone_2: z.string().optional(),
  phone_3: z.string().optional(),
  data_exame: z.string().min(8, 'Data do exame é obrigatória'),
  procedimentos: z.string().min(3, 'Exame é obrigatório'),
  horario_inicio: z.string().min(5, 'Horário é obrigatório'),
  time_proce: z.string().optional(),
  message_body: z.string().min(10, 'Mensagem deve ter pelo menos 10 caracteres'),
})

type FormValues = z.infer<typeof formSchema>

interface PatientRegisterModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedDate?: string
  prefillTime?: string
  onSuccess?: () => void
}

const PROCEDURE_TYPES = [
  'Ressonância Magnética',
  'Tomografia',
  'Ultrassonografia',
  'Mamografia',
  'Raio-X',
  'Densitometria Óssea',
  'Biópsia',
  'PAAF',
  'Outro',
]

const DEFAULT_TIME_PROCE = '00:30:00'

export function PatientRegisterModal({
  open,
  onOpenChange,
  selectedDate,
  prefillTime,
  onSuccess,
}: PatientRegisterModalProps) {
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      patient_name: '',
      phone_number: '+55 ',
      phone_2: '',
      phone_3: '',
      data_exame: selectedDate || '',
      procedimentos: 'Ressonância Magnética ',
      horario_inicio: prefillTime || '',
      time_proce: DEFAULT_TIME_PROCE,
      message_body: '',
    },
  })

  useEffect(() => {
    if (open && selectedDate) {
      form.setValue('data_exame', selectedDate)
    }
    if (open && prefillTime) {
      form.setValue('horario_inicio', prefillTime)
    }
  }, [open, selectedDate, prefillTime, form])

  useEffect(() => {
    const subscription = form.watch((values) => {
      const { data_exame, procedimentos, horario_inicio, time_proce } = values
      if (data_exame && procedimentos && horario_inicio) {
        const dataIso = data_exame.split('/').reverse().join('-')
        const duration = time_proce || DEFAULT_TIME_PROCE
        const durationStr = duration.replace(':', 'h') + 'min'

        const message = buildSaraMessage({
          data_exame_iso: dataIso,
          dataBr: data_exame,
          horario: `${horario_inicio}–${calculateEndTime(horario_inicio, duration)}`,
        })

        form.setValue('message_body', message)
      }
    })
    return () => subscription.unsubscribe()
  }, [form])

  function calculateEndTime(startTime: string, duration: string): string {
    try {
      const [hours, minutes] = startTime.split(':').map(Number)
      const [durHours, durMinutes] = duration.split(':').map(Number)

      let totalMinutes = hours * 60 + minutes + durHours * 60 + durMinutes
      const endHours = Math.floor(totalMinutes / 60) % 24
      const endMinutes = totalMinutes % 60

      return `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`
    } catch {
      return startTime
    }
  }

  async function onSubmit(values: FormValues) {
    setIsSubmitting(true)
    try {
      const result = await enqueuePatient({
        patient_name: values.patient_name,
        phone_number: values.phone_number,
        phone_2: values.phone_2,
        phone_3: values.phone_3,
        data_exame: values.data_exame,
        procedimentos: values.procedimentos,
        horario_inicio: values.horario_inicio,
        time_proce: values.time_proce,
        message_body: values.message_body,
      })

      if (result.success) {
        toast({
          title: 'Paciente cadastrado',
          description: 'Paciente enfileirado com sucesso. A mensagem será enviada automaticamente.',
        })
        form.reset()
        onOpenChange(false)
        onSuccess?.()
      } else {
        toast({
          title: 'Erro ao cadastrar',
          description: result.error || 'Falha ao enfileirar paciente',
          variant: 'destructive',
        })
      }
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error?.message || 'Erro ao processar cadastro',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      form.reset()
    }
    onOpenChange(isOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Cadastrar Paciente</DialogTitle>
          <DialogDescription>
            Preencha os dados do paciente. A mensagem será enviada automaticamente.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="patient_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do Paciente *</FormLabel>
                    <FormControl>
                      <Input placeholder="João da Silva" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone (WhatsApp) *</FormLabel>
                    <FormControl>
                      <Input placeholder="+55 65 99999-9999" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="phone_2"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone 2 (opcional)</FormLabel>
                    <FormControl>
                      <Input placeholder="+55 65 99999-9999" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone_3"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone 3 (opcional)</FormLabel>
                    <FormControl>
                      <Input placeholder="+55 65 99999-9999" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="data_exame"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data do Exame *</FormLabel>
                    <FormControl>
                      <Input placeholder="DD/MM/YYYY" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="horario_inicio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Horário de Início *</FormLabel>
                    <FormControl>
                      <Input placeholder="HH:MM" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="time_proce"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duração do Procedimento</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value || DEFAULT_TIME_PROCE}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="00:08:00">8 min</SelectItem>
                        <SelectItem value="00:10:00">10 min</SelectItem>
                        <SelectItem value="00:15:00">15 min</SelectItem>
                        <SelectItem value="00:20:00">20 min</SelectItem>
                        <SelectItem value="00:30:00">30 min</SelectItem>
                        <SelectItem value="00:40:00">40 min</SelectItem>
                        <SelectItem value="00:50:00">50 min</SelectItem>
                        <SelectItem value="01:00:00">1 hora</SelectItem>
                        <SelectItem value="01:30:00">1h30min</SelectItem>
                        <SelectItem value="02:00:00">2 horas</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="procedimentos"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Procedimento *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o procedimento" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {PROCEDURE_TYPES.map((proc) => (
                        <SelectItem key={proc} value={proc}>
                          {proc}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="message_body"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mensagem (SARA) *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Mensagem automática..."
                      className="min-h-[120px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => handleClose(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Enviando...' : 'Cadastrar & Enviar'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
