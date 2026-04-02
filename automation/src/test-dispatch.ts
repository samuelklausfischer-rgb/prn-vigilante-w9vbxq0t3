import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function runTest() {
  console.log('🚀 Preparando Teste Real de Disparo...')

  const testTag = process.env.TEST_TAG || `teste-dup-${Date.now()}`
  const rawPhone = process.env.TEST_PHONE || process.argv[2] || '557191279085'
  const testPhone = rawPhone.replace(/\D/g, '')
  const patientName = `TESTE DUPLICIDADE ${testTag}`
  const messageBody = `[${testTag}] Mensagem de teste controlado para investigar duplicidade no worker PRN-Vigilante.`

  // 1. Enfileirar usando RPC enqueue_patient (com deduplicação)
  console.log(`\nEnfileirando paciente via RPC: ${patientName} (${testPhone})`)
  
  const { data: rpcData, error: rpcError } = await supabase
    .rpc('enqueue_patient_v2', {
      p_patient_name: patientName,
      p_phone_number: testPhone,
      p_message_body: messageBody,
      p_data_exame: '2026-03-18',
      p_horario_inicio: '14:00',
      p_procedimentos: 'Ressonância de Crânio',
      p_status: 'queued',
      p_is_approved: true,
      p_send_after: new Date().toISOString(),
      p_notes: `Teste controlado ${testTag}`,
    })

  const results = rpcData as any[] | null
  const result = results && results.length > 0 ? results[0] : null

  if (!result) {
    console.error('❌ Erro: Nenhum resultado retornado pela RPC enqueue_patient')
    return
  }

  console.log(`✅ Paciente enfileirado com sucesso! ID: ${result.id}`)
  console.log(`🏷️ Tag do teste: ${testTag}`)
  
  // 2. Garantir que LGPD não bloqueie (inserir consentimento)
  console.log(`\nGarantindo consentimento LGPD para o teste...`)
  await supabase
    .from('patient_consent')
    .insert({
      patient_id: rpcData.id, // Improviso para teste (patient_id fk é opcional)
      consent_status: 'granted',
      consent_source: 'admin',
      consent_version: '1.0',
      privacy_policy_version: '1.0'
    })
    
  // 3. Remover possíveis bloqueios antigos
  await supabase
    .from('message_blocks')
    .delete()
    .eq('phone_number', testPhone)

  console.log('\n✅ Ambiente de teste preparado!')
  console.log('👉 Agora rode o motor para ele processar a fila:')
  console.log('    bun run automation/src/index.ts')
}

runTest().catch(console.error)
