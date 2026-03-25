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
    const badUrl = 'prndiagnosticos.com.br/wp-content/themes/prnd/assets/images/logo.png'

    // 1. Intercept Image.src setter to prevent the bad URL from ever being assigned
    const originalSrcDescriptor = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src')
    if (originalSrcDescriptor && originalSrcDescriptor.set) {
      Object.defineProperty(HTMLImageElement.prototype, 'src', {
        set: function (value) {
          if (typeof value === 'string' && value.includes(badUrl)) {
            originalSrcDescriptor.set.call(this, PRN_LOGO_BASE64)
          } else {
            originalSrcDescriptor.set.call(this, value)
          }
        },
        get: originalSrcDescriptor.get,
      })
    }

    // 2. Intercept setAttribute for edge cases where libraries set it directly
    const originalSetAttribute = Element.prototype.setAttribute
    Element.prototype.setAttribute = function (name, value) {
      if (name === 'src' && typeof value === 'string' && value.includes(badUrl)) {
        originalSetAttribute.call(this, name, PRN_LOGO_BASE64)
      } else {
        originalSetAttribute.call(this, name, value)
      }
    }

    // 3. Intercept fetch to safely handle any internal calls made by html-to-image
    const originalFetch = window.fetch
    window.fetch = async (...args) => {
      const [input] = args
      const url = typeof input === 'string' ? input : input instanceof Request ? input.url : ''
      if (url && url.includes(badUrl)) {
        // Return a mock response using the base64 data to completely avoid network requests
        const base64Data = PRN_LOGO_BASE64.split(',')[1]
        const binaryString = atob(base64Data)
        const bytes = new Uint8Array(binaryString.length)
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i)
        }
        return new Response(bytes, {
          status: 200,
          headers: { 'Content-Type': 'image/svg+xml' },
        })
      }
      return originalFetch(...args)
    }

    // 4. Mutate existing nodes already in the DOM just in case
    document.querySelectorAll('img').forEach((img) => {
      if (img.src && img.src.includes(badUrl)) {
        img.src = PRN_LOGO_BASE64
      }
    })

    return () => {
      window.fetch = originalFetch
      Element.prototype.setAttribute = originalSetAttribute
      if (originalSrcDescriptor) {
        Object.defineProperty(HTMLImageElement.prototype, 'src', originalSrcDescriptor)
      }
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
