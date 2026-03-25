/**
 * Script para executar migrations SQL via Supabase
 * Este script usa o cliente Supabase para executar comandos SQL no banco
 */

import { createClient } from '@supabase/supabase-js'

// Configurações
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://yrvorowhddgmwcxrovkg.supabase.co'
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || ''

// Criar cliente
const supabase = createClient(supabaseUrl, supabaseKey)

/**
 * Executa comandos SQL via Supabase
 * @param sql - String SQL para executar
 */
async function executeSQL(sql: string): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql })

    if (error) {
      console.error('Erro ao executar SQL:', error)
      return { success: false, error: error.message }
    }

    return { success: true, data }
  } catch (err: any) {
    console.error('Erro inesperado:', err)
    return { success: false, error: err.message }
  }
}

/**
 * Migration: Adicionar campos de horário
 */
async function runMigration() {
  console.log('🚀 Iniciando migration: Adicionar campos de horário')
  console.log('==================================================')

  // Comandos SQL para executar
  const sqlCommands = [
    // 1. Adicionar horario_inicio
    `ALTER TABLE public.patients_queue
     ADD COLUMN IF NOT EXISTS horario_inicio TIME WITHOUT TIME ZONE`,

    // 2. Adicionar horario_final
    `ALTER TABLE public.patients_queue
     ADD COLUMN IF NOT EXISTS horario_final TIME WITHOUT TIME ZONE`,

    // 3. Adicionar comentários
    `COMMENT ON COLUMN public.patients_queue.time_proce IS 'Duração do procedimento em minutos (ex: 00:45:00 = 45 minutos)'`,

    // 4. Adicionar comentário horario_inicio
    `COMMENT ON COLUMN public.patients_queue.horario_inicio IS 'Horário de início da sessão do paciente (HH:MM)'`,

    // 5. Adicionar comentário horario_final
    `COMMENT ON COLUMN public.patients_queue.horario_final IS 'Horário de término da sessão do paciente (HH:MM)'`,

    // 6. Criar índice horario_inicio
    `CREATE INDEX IF NOT EXISTS idx_patients_queue_horario_inicio
     ON patients_queue(horario_inicio) WHERE horario_inicio IS NOT NULL`,

    // 7. Criar índice horario_final
    `CREATE INDEX IF NOT EXISTS idx_patients_queue_horario_final
     ON patients_queue(horario_final) WHERE horario_final IS NOT NULL`
  ]

  // Executar cada comando
  for (let i = 0; i < sqlCommands.length; i++) {
    console.log(`\n📝 Executando comando ${i + 1}/${sqlCommands.length}...`)
    console.log(`SQL: ${sqlCommands[i]}`)

    // Nota: O Supabase não permite execução de SQL direto via RPC
    // Esta é uma limitação conhecida. Precisamos usar outra abordagem.
    console.log('⚠️  Nota: Supabase não permite execução de SQL direto via client-side RPC')
    console.log('⚠️  Precisamos executar a migration manualmente no Supabase Dashboard')
  }

  console.log('\n==================================================')
  console.log('✅ Comandos SQL preparados. Execução manual necessária.')
}

// Executar migration
runMigration()
  .then(() => {
    console.log('\n✅ Migration preparada com sucesso')
    process.exit(0)
  })
  .catch((err) => {
    console.error('\n❌ Erro ao preparar migration:', err)
    process.exit(1)
  })
