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
import { PatientQueue } from '@/types'

interface EditModalProps {
  item: PatientQueue | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (id: string, updates: Partial<PatientQueue>) => Promise<void>
}

export function EditModal({ item, open, onOpenChange, onSave }: EditModalProps) {
  const [message, setMessage] = useState('')
  const [notes, setNotes] = useState('')
  const [sendAfter, setSendAfter] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (item && open) {
      setMessage(item.message_body)
      setNotes(item.notes || '')
      // Format to simple datetime local string (YYYY-MM-DDTHH:mm)
      const dateStr = new Date(item.send_after).toISOString().slice(0, 16)
      setSendAfter(dateStr)
    }
  }, [item, open])

  const handleSave = async () => {
    if (!item) return
    setSaving(true)
    await onSave(item.id, {
      message_body: message,
      notes: notes,
      send_after: new Date(sendAfter).toISOString(),
    })
    setSaving(false)
    onOpenChange(false)
  }

  if (!item) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md border-white/10 bg-card rounded-2xl">
        <DialogHeader>
          <DialogTitle className="font-heading">Intervenção Manual</DialogTitle>
          <DialogDescription>
            Editando envio para{' '}
            <span className="font-semibold text-foreground">{item.patient_name}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="message">Corpo da Mensagem (WhatsApp)</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="min-h-[120px] bg-background/50 border-white/10 font-mono text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sendAfter">Agendado para</Label>
            <Input
              id="sendAfter"
              type="datetime-local"
              value={sendAfter}
              onChange={(e) => setSendAfter(e.target.value)}
              className="bg-background/50 border-white/10"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notas do Operador</Label>
            <Input
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Confirmação pendente por telefone..."
              className="bg-background/50 border-white/10"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
            {saving ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
