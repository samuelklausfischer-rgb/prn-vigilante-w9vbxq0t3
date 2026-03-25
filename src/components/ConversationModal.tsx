import { ArrowLeft, Clock, FileText, Loader2, MoreVertical, Phone, User } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  ConversationMessage,
  ConversationData,
  formatWhatsAppTime,
  formatWhatsAppDate,
} from '@/services/conversation'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface ConversationModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  conversation: ConversationData | null
  loading: boolean
}

function MessageBubble({ message }: { message: ConversationMessage }) {
  const isSent = message.direction === 'outbound'

  const getStatusIcon = () => {
    if (message.status === 'queued') {
      return <Clock className="ml-1 h-3 w-3 text-gray-400" />
    }
    if (message.status === 'sending') {
      return <Loader2 className="ml-1 h-3 w-3 text-gray-400 animate-spin" />
    }
    if (message.status === 'accepted') {
      return <span className="ml-1 text-gray-400">✓</span>
    }
    if (message.status === 'delivered') {
      return <span className="ml-1 text-gray-400">✓✓</span>
    }
    if (message.status === 'read') {
      return <span className="ml-1 text-blue-400">✓✔</span>
    }
    if (message.status === 'failed') {
      return <span className="ml-1 text-red-400">✕</span>
    }
    return null
  }

  return (
    <div
      className={`flex ${isSent ? 'justify-end' : 'justify-start'} mb-3`}
    >
      <div
        className={`max-w-[75%] rounded-lg px-3 py-2 text-sm shadow-sm ${
          isSent
            ? 'bg-[#DCF8C6] text-gray-800'
            : 'bg-white text-gray-800'
        }`}
        style={{
          borderRadius: isSent ? '0 8px 8px 8px' : '8px 8px 8px 0',
        }}
      >
        <div className="flex items-start gap-2">
          {!isSent && <User className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-500" />}
          <div className="flex-1">
            <p className="whitespace-pre-wrap break-words leading-relaxed">
              {message.messageBody}
            </p>
            <div
              className={`mt-1 flex items-center text-[11px] text-gray-500 ${
                isSent ? 'justify-end' : 'justify-start'
              }`}
            >
              <span>{formatWhatsAppTime(message.timestamp)}</span>
              {isSent && getStatusIcon()}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function DateSeparator({ date }: { date: string }) {
  return (
    <div className="mb-4 flex justify-center">
      <div className="rounded-full bg-[#E5DDD5] px-4 py-1 text-xs font-semibold text-gray-700">
        {formatWhatsAppDate(date)}
      </div>
    </div>
  )
}

export function ConversationModal({
  open,
  onOpenChange,
  conversation,
  loading,
}: ConversationModalProps) {
  if (!conversation) return null

  // Agrupar mensagens por data
  const groupedMessages = conversation.messages.reduce<Record<string, ConversationMessage[]>>(
    (acc, msg) => {
      const dateKey = msg.timestamp.split('T')[0]
      if (!acc[dateKey]) {
        acc[dateKey] = []
      }
      acc[dateKey].push(msg)
      return acc
    },
    {}
  )

  const formatDateHeader = (dateStr?: string | null, timeStr?: string | null) => {
    if (!dateStr) return ''
    return format(new Date(dateStr), 'dd/MM/yyyy', { locale: ptBR })
  }

  const formatTimeHeader = (timeStr?: string | null) => {
    if (!timeStr) return ''
    return timeStr.slice(0, 5)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex h-[85vh] max-h-[800px] flex-col gap-0 overflow-hidden bg-[#E5DDD5] p-0"
        style={{
          background: 'linear-gradient(to bottom, #E5DDD5 0%, #E5DDD5 100%)',
          backgroundImage:
            'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.05\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
        }}
      >
        {/* Header estilo WhatsApp */}
        <DialogHeader className="border-b bg-[#075E54] px-4 py-3 text-white">
          <div className="flex items-center gap-3">
            <button
              onClick={() => onOpenChange(false)}
              className="rounded-full p-2 hover:bg-white/10"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="flex-1">
              <DialogTitle className="text-base font-medium">
                {conversation.patientName}
              </DialogTitle>
              <p className="mt-0.5 text-xs text-white/80">
                {formatDateHeader(conversation.dataExame)}
                {' '}
                {formatTimeHeader(conversation.horarioInicio)}
                {' • '}
                {conversation.procedimentos || ''}
              </p>
            </div>
            <button className="rounded-full p-2 hover:bg-white/10">
              <MoreVertical className="h-5 w-5" />
            </button>
          </div>
        </DialogHeader>

        {/* Área de mensagens */}
        <ScrollArea className="flex-1 bg-[#E5DDD5]">
          <div className="p-4">
            {loading ? (
              <div className="flex h-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
              </div>
            ) : conversation.messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <FileText className="mb-3 h-12 w-12 text-gray-400" />
                <p className="text-sm text-gray-600">
                  Nenhuma mensagem encontrada
                </p>
              </div>
            ) : (
              <>
                {Object.entries(groupedMessages).map(([dateKey, messages]) => (
                  <div key={dateKey}>
                    <DateSeparator date={dateKey} />
                    {messages.map((message) => (
                      <MessageBubble key={message.id} message={message} />
                    ))}
                  </div>
                ))}
              </>
            )}
          </div>
        </ScrollArea>

        {/* Footer com informações do paciente */}
        <div className="border-t bg-white px-4 py-3">
          <div className="flex items-center gap-4 text-xs text-gray-600">
            <div className="flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5" />
              <span>{conversation.phoneNumber}</span>
            </div>
            {conversation.phone2 && (
              <div className="flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5" />
                <span>{conversation.phone2}</span>
                <span className="rounded bg-orange-100 px-1.5 py-0.5 text-[10px] font-medium text-orange-800">
                  Tel2
                </span>
              </div>
            )}
            {conversation.phone3 && (
              <div className="flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5" />
                <span>{conversation.phone3}</span>
                <span className="rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-medium text-purple-800">
                  Tel3
                </span>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
