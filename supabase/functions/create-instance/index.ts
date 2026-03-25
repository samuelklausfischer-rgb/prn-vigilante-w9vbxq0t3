import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { instanceName } = await req.json()

    return new Response(
      JSON.stringify({
        success: true,
        instance: {
          id: crypto.randomUUID(),
          instanceName: instanceName || 'default-instance',
          status: 'created',
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Invalid request' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
