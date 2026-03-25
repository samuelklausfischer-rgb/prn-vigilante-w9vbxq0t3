import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider, useAuth } from '@/hooks/use-auth'
import AuthPage from './pages/Auth'
import Index from './pages/Index'
import Analytics from './pages/Analytics'
import Archive from './pages/Archive'
import ArchiveByDate from './pages/ArchiveByDate'
import WhatsAppSettings from './pages/WhatsAppSettings'
import EnviarLista from './pages/EnviarLista'
import SegundaChamada from './pages/SegundaChamada'
import Estrategico from './pages/Estrategico'
import CRM from './pages/CRM'
import NotFound from './pages/NotFound'
import Layout from './components/Layout'

// Simple guard to protect routes
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth()

  if (loading)
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  if (!user) return <AuthPage />

  return <>{children}</>
}

const AppRoutes = () => (
  <Routes>
    <Route
      element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }
    >
      <Route path="/" element={<Index />} />
      <Route path="/analytics" element={<Analytics />} />
      <Route path="/enviar-lista" element={<EnviarLista />} />
      <Route path="/segunda-chamada" element={<SegundaChamada />} />
      <Route path="/estrategico" element={<Estrategico />} />
      <Route path="/crm" element={<CRM />} />
      <Route path="/arquivar-por-data" element={<ArchiveByDate />} />
      <Route path="/arquivo" element={<Archive />} />
      <Route path="/whatsapp" element={<WhatsAppSettings />} />
    </Route>
    <Route path="*" element={<NotFound />} />
  </Routes>
)

const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AppRoutes />
      </TooltipProvider>
    </AuthProvider>
  </BrowserRouter>
)

export default App
