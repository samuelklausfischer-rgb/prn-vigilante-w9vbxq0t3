import { Outlet, Link, useLocation } from 'react-router-dom'
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { Button } from '@/components/ui/button'
import { ShieldCheck, ListTodo, Archive, PowerOff, LogOut, Smartphone, Send, Repeat2, BarChart3, CalendarRange, Target, LayoutGrid, FolderOpen } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { useAppData } from '@/hooks/use-app-data'
import { useToast } from '@/hooks/use-toast'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { cn } from '@/lib/utils'
function AppSidebar() {
  const location = useLocation()
  const { signOut } = useAuth()
  
  const menuItems = [
    { title: 'Analytics', url: '/analytics', icon: BarChart3 },
    { title: 'Fila de Envios', url: '/', icon: ListTodo },
    { title: 'Enviar lista', url: '/enviar-lista', icon: Send },
    { title: 'Listas', url: '/listas', icon: FolderOpen },
    { title: 'Segunda chamada', url: '/segunda-chamada', icon: Repeat2 },
    { title: 'Estratégico', url: '/estrategico', icon: Target },
    { title: 'CRM Kanban', url: '/crm', icon: LayoutGrid },
    { title: 'Arquivar por data', url: '/arquivar-por-data', icon: CalendarRange },
    { title: 'Arquivo Morto', url: '/arquivo', icon: Archive },
    { title: 'WhatsApp', url: '/whatsapp', icon: Smartphone },
  ]

  return (
    <Sidebar className="border-r border-white/5 bg-card/90 backdrop-blur-xl">
      <SidebarHeader className="p-5 flex flex-col gap-6 border-b border-white/5 pb-6">
        <div className="flex items-center justify-center w-full px-2 pt-1 shrink-0">
          <img
            src="https://prndiagnosticos.com.br/wp-content/themes/prnd/assets/images/logo.png"
            alt="PRN Diagnósticos"
            className="h-10 sm:h-11 w-auto max-w-[200px] object-contain mix-blend-screen grayscale invert brightness-200 contrast-200 transition-opacity hover:opacity-90"
          />
        </div>
        <div className="flex flex-row items-center gap-3 px-1">
          <div className="bg-blue-500/20 border border-blue-500/30 text-blue-400 p-1.5 rounded-lg shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="font-heading font-bold text-lg leading-tight tracking-tight text-white">
              PRN Vigilante
            </span>
            <span className="text-[10px] text-blue-400 uppercase tracking-wider font-semibold">
              Torre de Controle
            </span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent className="px-2 py-4">
        <SidebarMenu>
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                asChild
                isActive={location.pathname === item.url}
                className={cn(
                  'rounded-xl h-10 transition-all',
                  location.pathname === item.url
                    ? 'bg-blue-500/10 text-blue-400'
                    : 'hover:bg-white/5',
                )}
              >
                <Link to={item.url} className="flex items-center gap-3">
                  <item.icon className="w-4 h-4" />
                  <span className="font-medium">{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <div className="mt-auto p-4 border-t border-white/5">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 rounded-xl"
          onClick={signOut}
        >
          <LogOut className="w-4 h-4" /> Sair do Sistema
        </Button>
      </div>
    </Sidebar>
  )
}

function TopBar() {
  const { config, toggleSystemPause } = useAppData([])
  const { toast } = useToast()
  const location = useLocation()
  const isPaused = config?.is_paused ?? false

  const handleToggleKillSwitch = async () => {
    const success = await toggleSystemPause(!isPaused)
    if (success) {
      toast({
        title: !isPaused ? 'Sistema Pausado' : 'Sistema Retomado',
        description: !isPaused
          ? 'Todos os envios foram paralisados com sucesso.'
          : 'O motor de envio voltou a operar.',
        variant: !isPaused ? 'destructive' : 'default',
      })
    }
  }

  const pageTitle =
    location.pathname === '/analytics'
      ? 'Dashboard de Analytics'
      : location.pathname === '/'
      ? 'Monitoramento em Tempo Real'
      : location.pathname === '/enviar-lista'
        ? 'Enviar lista'
        : location.pathname === '/listas'
          ? 'Listas cadastradas'
        : location.pathname === '/segunda-chamada'
          ? 'Segunda chamada'
          : location.pathname === '/estrategico'
            ? 'Acompanhamento Estratégico'
        : location.pathname === '/arquivar-por-data'
          ? 'Arquivamento por data'
       : location.pathname === '/arquivo'
         ? 'Auditoria de Arquivo'
         : 'Gerenciamento WhatsApp'

  return (
    <header className="h-16 flex items-center justify-between px-4 lg:px-8 border-b border-white/5 bg-background/50 backdrop-blur-lg sticky top-0 z-40">
      <div className="flex items-center gap-4">
        <SidebarTrigger className="text-muted-foreground hover:text-white" />
        <div className="flex items-center sm:hidden h-full mt-1">
          <img
            src="https://prndiagnosticos.com.br/wp-content/themes/prnd/assets/images/logo.png"
            alt="PRN"
            className="h-6 w-auto object-contain mix-blend-screen grayscale invert brightness-200 contrast-200"
          />
        </div>
        <h1 className="font-heading font-semibold text-lg hidden sm:block">{pageTitle}</h1>
      </div>

      <div className="flex items-center gap-3 sm:gap-4">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-card/50 border border-white/5 text-xs font-medium">
          <span className="relative flex h-2 w-2">
            {!isPaused && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            )}
            <span
              className={cn(
                'relative inline-flex rounded-full h-2 w-2',
                isPaused ? 'bg-red-500' : 'bg-emerald-500',
              )}
            ></span>
          </span>
          <span className="text-muted-foreground hidden sm:inline">Motor:</span>
          <span className={isPaused ? 'text-red-400' : 'text-emerald-400'}>
            {isPaused ? 'Parado' : 'Ativo'}
          </span>
        </div>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant={isPaused ? 'default' : 'destructive'}
              size="sm"
              className={cn(
                'h-9 rounded-xl font-medium shadow-lg transition-transform active:scale-95 px-3 sm:px-4',
                !isPaused && 'animate-pulse-soft shadow-red-500/20',
              )}
            >
              <PowerOff className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">{isPaused ? 'Retomar Motor' : 'Kill Switch'}</span>
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="border-red-500/20 bg-card rounded-2xl w-[90vw] sm:w-full max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle>
                {isPaused ? 'Retomar envios automatizados?' : 'Pausar todos os envios?'}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {isPaused
                  ? 'O motor voltará a processar a fila imediatamente, respeitando a cadência configurada.'
                  : 'Isso interromperá o processamento da fila no nível do banco de dados. Nenhuma mensagem será enviada até que o sistema seja retomado.'}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleToggleKillSwitch}
                className={cn(
                  'rounded-xl',
                  !isPaused ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700',
                )}
              >
                Confirmar Ação
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </header>
  )
}

export default function Layout() {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background selection:bg-blue-500/30">
        <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/10 via-background to-background pointer-events-none" />
        <AppSidebar />
        <main className="flex-1 flex flex-col min-w-0 relative z-10">
          <TopBar />
          <div className="flex-1 overflow-auto p-4 lg:p-8">
            <div className="max-w-6xl mx-auto">
              <Outlet />
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  )
}
