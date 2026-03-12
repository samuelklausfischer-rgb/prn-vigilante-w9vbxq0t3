import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, x-supabase-client-platform, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { instanceName, phoneNumber } = await req.json()

    if (!instanceName || !phoneNumber) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Nome da instância e número de telefone são obrigatórios.',
        }),
        {
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
          status: 200, // Returning 200 so frontend can handle via 'success: false'
        },
      )
    }

    // Default webhook URL falls back to a tunnel if not provided in environment variables
    const webhookUrl =
      Deno.env.get('WEBHOOK_INSTANCE_CREATE_URL') ||
      'https://edge-thompson-hoped-expenditure.trycloudflare.com/webhook/evolution/instances/create'

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ instanceName, phoneNumber }),
    }).catch((e) => {
      throw new Error(`Falha de rede ao contatar webhook: ${e.message}`)
    })

    if (!response.ok) {
      let errorMsg = `Webhook retornou status HTTP ${response.status}`
      try {
        const errData = await response.json()
        errorMsg = errData.message || errData.error || errorMsg
      } catch (_) {
        // Fallback to default message if response isn't valid JSON
      }
      throw new Error(`Falha na API: ${errorMsg}`)
    }

    const data = await response.json().catch(() => ({}))

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
