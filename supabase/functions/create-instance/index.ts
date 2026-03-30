import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { callEvolution } from '../_shared/evolution-api.ts'

type CreateInstanceBody = {
  instanceName?: string
  phoneNumber?: string
  slotId?: number
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { instanceName, phoneNumber, slotId } = (await req.json().catch(() => ({}))) as CreateInstanceBody

    if (!instanceName || !phoneNumber || slotId === undefined) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Nome da instância, número de telefone e slot_id são obrigatórios.',
        }),
        {
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
          status: 200, // Returning 200 so frontend can handle via 'success: false'
        },
      )
    }

    const data = await callEvolution('/instance/create', {
      method: 'POST',
      body: JSON.stringify({
        instanceName,
        qrcode: true,
        integration: 'WHATSAPP-BAILEYS',
      }),
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
