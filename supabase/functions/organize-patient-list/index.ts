import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { formatPhone, sleep } from '../_shared/utils.ts'
import { templates } from '../_shared/templates.ts'
import { examDurations } from '../_shared/exam-durations.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Note: Deno Edge Functions should use Deno.env.get() instead of dotenv
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''

    const phone = formatPhone('11 99999-9999')
    const msg = templates.reminder
    const duration = examDurations['ressonancia'] || examDurations['default']

    await sleep(50)

    return new Response(
      JSON.stringify({
        success: true,
        count: 1,
        patients: [{ phone, message: msg, duration }],
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
