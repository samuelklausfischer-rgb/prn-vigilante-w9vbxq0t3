import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Search, Archive as ArchiveIcon } from 'lucide-react'

export default function Archive() {
  return (
    <div className="space-y-6 animate-fade-in-up">
      <Card className="bg-card/50 backdrop-blur-sm border-white/5 shadow-xl">
        <CardHeader>
          <CardTitle className="font-heading flex items-center gap-2">
            <ArchiveIcon className="w-5 h-5 text-blue-400" />
            Auditoria de Arquivo Morto
          </CardTitle>
          <CardDescription>
            Pesquise o histórico completo de mensagens já processadas e arquivadas.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9 bg-background/50 border-white/10 rounded-xl focus-visible:ring-blue-500/50 h-10"
              placeholder="Buscar por número, nome ou ID..."
            />
          </div>

          <div className="p-12 text-center border border-dashed border-white/10 rounded-2xl bg-background/30 flex flex-col items-center justify-center gap-3">
            <div className="bg-white/5 p-3 rounded-full">
              <ArchiveIcon className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">
              Nenhum registro encontrado na sua busca.
            </p>
            <p className="text-xs text-muted-foreground max-w-xs">
              Tente utilizar parâmetros diferentes ou verifique se o número foi digitado
              corretamente.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
