import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { message } = await req.json()

    // Using Deno.env.get() to securely access environment variables
    const apiKey = Deno.env.get('NVIDIA_API_KEY') || Deno.env.get('GLM_API_KEY')

    return new Response(
      JSON.stringify({
        success: true,
        classification: 'respondido',
        confidence: 0.95,
        originalMessage: message,
        hasKey: !!apiKey,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
