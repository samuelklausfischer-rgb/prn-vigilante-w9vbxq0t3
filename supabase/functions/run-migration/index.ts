/**
 * Edge Function para executar migration SQL
 * NOTA: Esta é uma solução temporária para executar migrations de banco de dados
 * Em produção, migrations devem ser executadas via Supabase Dashboard ou CLI
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// Criar cliente com service role (tem permissão para executar DDL)
const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function executeMigration() {
  console.log('🚀 Iniciando migration: Adicionar campos de horário')

  try {
    // Usar RPC para executar SQL
    // Nota: Supabase não permite executar DDL direto via RPC
    // Esta função serve como exemplo, mas não funciona para migrations DDL

    return {
      status: 'error',
      message: 'DDL commands não podem ser executados via Edge Function. Use Supabase Dashboard.',
      suggestion: 'Execute o SQL manualmente em: https://app.supabase.com/project/.../sql'
    }
  } catch (error) {
    return {
      status: 'error',
      error: error.message
    }
  }
}

serve(async (req) => {
  const { method } = req

  if (method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const result = await executeMigration()

  return new Response(
    JSON.stringify(result),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  )
})
