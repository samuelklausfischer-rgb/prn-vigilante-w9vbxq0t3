import { useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ShieldCheck } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export default function AuthPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn } = useAuth()
  const { toast } = useToast()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { error } = await signIn(email, password)

    if (error) {
      toast({
        title: 'Erro de Autenticação',
        description: error.message,
        variant: 'destructive',
      })
    } else {
      toast({
        title: 'Acesso Liberado',
        description: 'Bem-vindo ao PRN Vigilante.',
      })
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-900/20 via-background to-background z-0" />

      <Card className="w-full max-w-md z-10 border-white/10 shadow-2xl backdrop-blur-glass bg-card/90 rounded-2xl">
        <CardHeader className="space-y-3 pb-6 text-center">
          <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center mx-auto mb-2 border border-blue-500/20">
            <ShieldCheck className="w-8 h-8 text-blue-500" />
          </div>
          <CardTitle className="text-2xl font-heading tracking-tight">PRN Vigilante</CardTitle>
          <CardDescription>Painel de Supervisão e Controle de Mensagens</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Input
                type="email"
                placeholder="E-mail corporativo"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-background/50 border-white/10"
                required
              />
            </div>
            <div className="space-y-2">
              <Input
                type="password"
                placeholder="Senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-background/50 border-white/10"
                required
              />
            </div>
            <Button
              type="submit"
              className="w-full h-11 text-base font-medium rounded-xl transition-transform active:scale-95"
              disabled={loading}
            >
              {loading ? 'Verificando credenciais...' : 'Acessar Sistema'}
            </Button>
            <p className="text-xs text-center text-muted-foreground mt-4">
              Uso exclusivo para operadores PRN Diagnósticos.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
