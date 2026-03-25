import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider, useAuth } from '@/hooks/use-auth'
import AuthPage from './pages/Auth'
import Index from './pages/Index'
import Archive from './pages/Archive'
import WhatsAppSettings from './pages/WhatsAppSettings'
import NotFound from './pages/NotFound'
import Layout from './components/Layout'
import { useEffect } from 'react'

// Generic Base64 SVG Logo to replace the external CORS-blocked image
const PRN_LOGO_BASE64 =
  'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iNTAiPjx0ZXh0IHk9IjMwIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMjQiIGZvbnQtd2VpZ2h0PSJib2xkIiBmaWxsPSIjMGI1ZWEzIj5QUk4gRGlhZ27Ds3N0aWNvczwvdGV4dD48L3N2Zz4='

const CorsLogoFix = () => {
  useEffect(() => {
    // 1. Replace the image src in the DOM to prevent html-to-image from capturing the external URL
    const replaceLogos = () => {
      const imgs = document.querySelectorAll('img')
      imgs.forEach((img) => {
        if (
          img.src &&
          img.src.includes('prndiagnosticos.com.br/wp-content/themes/prnd/assets/images/logo.png')
        ) {
          img.src = PRN_LOGO_BASE64
        }
      })
    }

    replaceLogos()

    const observer = new MutationObserver((mutations) => {
      let shouldReplace = false
      for (const mutation of mutations) {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          shouldReplace = true
          break
        } else if (mutation.type === 'attributes' && mutation.attributeName === 'src') {
          shouldReplace = true
          break
        }
      }
      if (shouldReplace) replaceLogos()
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['src'],
    })

    // 2. Intercept fetch to safely handle any internal calls made by html-to-image
    const originalFetch = window.fetch
    window.fetch = async (...args) => {
      const [input] = args
      const url = typeof input === 'string' ? input : input instanceof Request ? input.url : ''
      if (
        url &&
        url.includes('prndiagnosticos.com.br/wp-content/themes/prnd/assets/images/logo.png')
      ) {
        return originalFetch(PRN_LOGO_BASE64)
      }
      return originalFetch(...args)
    }

    return () => {
      observer.disconnect()
      window.fetch = originalFetch
    }
  }, [])

  return null
}

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
      <Route path="/arquivo" element={<Archive />} />
      <Route path="/whatsapp" element={<WhatsAppSettings />} />
    </Route>
    <Route path="*" element={<NotFound />} />
  </Routes>
)

const App = () => (
  <BrowserRouter future={{ v7_startTransition: false, v7_relativeSplatPath: false }}>
    <AuthProvider>
      <TooltipProvider>
        <CorsLogoFix />
        <Toaster />
        <Sonner />
        <AppRoutes />
      </TooltipProvider>
    </AuthProvider>
  </BrowserRouter>
)

export default App
