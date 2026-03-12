import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Environment Handling: Allow override via env var for cloud environments,
    // fallback to the new Cloudflare tunnel URL as per acceptance criteria
    const webhookUrl =
      Deno.env.get('WEBHOOK_INSTANCES_LIST_URL') ||
      'https://edge-thompson-hoped-expenditure.trycloudflare.com/webhook/evolution/instances/list'

    const response = await fetch(webhookUrl, {
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
    // Return 200 with success: false to gracefully handle errors on the frontend
    // without crashing, allowing the UI to display the error toast.
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
      status: 200,
    })
  }
})
