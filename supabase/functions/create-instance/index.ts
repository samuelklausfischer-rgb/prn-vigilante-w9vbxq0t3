import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  return new Response(JSON.stringify({ status: 'ok', instance_id: 'mock-instance-123' }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
