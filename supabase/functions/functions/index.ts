import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

Deno.serve(async () => {
  return new Response(JSON.stringify({ success: true, message: 'Placeholder function' }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
