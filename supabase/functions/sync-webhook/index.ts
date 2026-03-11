import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const response = await fetch('http://host.docker.internal:5678/webhook/a', {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    }).catch((e) => {
      throw new Error(`Falha de rede ao contatar webhook: ${e.message}`)
    })

    if (!response.ok) {
      throw new Error(`Webhook retornou status HTTP ${response.status}`)
    }

    const data = await response.json().catch(() => {
      throw new Error('Formato de resposta inválido (esperado JSON)')
    })

    return new Response(JSON.stringify({ success: true, data }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
      status: 200,
    })
  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
      status: 200,
    })
  }
})
