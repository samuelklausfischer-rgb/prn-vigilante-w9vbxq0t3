import {
  claimNextMessage,
  getSystemConfig,
  getRealtimeMetrics,
  getExpiredLocks,
} from './services/supabase'
import { checkEvolutionHealth, getConnectionStatus } from './services/evolution'

export async function runDiagnostics() {
  console.log('─'.repeat(60))
  console.log('🔍 DIAGNÓSTICO DO SISTEMA PRN-VIGILANTE')
  console.log('─'.repeat(60))
  
  // 1. Teste claimNextMessage
  console.log('\n[1/6] Testando claimNextMessage()...')
  const claimed = await claimNextMessage('diag-worker', 3)
  if (claimed) {
    console.log('✅ Mensagem claimada com sucesso:')
    console.log(`   ID: ${claimed.id}`)
    console.log(`   Paciente: ${claimed.patient_name}`)
    console.log(`   Telefone: ${claimed.phone_number}`)
    console.log(`   Instância: ${claimed.instance_name}`)
  } else {
    console.log('ℹ️  Nenhuma mensagem elegível (fila vazia ou todas pendentes)')
  }
  
  // 2. Teste getSystemConfig
  console.log('\n[2/6] Testando getSystemConfig()...')
  const config = await getSystemConfig()
  if (config) {
    console.log('✅ Configuração carregada:')
    console.log(`   Pausado: ${config.is_paused}`)
    console.log(`   Delay seguro: ${config.safe_cadence_delay}ms`)
  } else {
    console.log('❌ Erro ao carregar configuração')
  }
  
  // 3. Teste checkEvolutionHealth
  console.log('\n[3/6] Testando checkEvolutionHealth()...')
  const evolutionHealthy = await checkEvolutionHealth()
  if (evolutionHealthy) {
    console.log('✅ Evolution API disponível')
  } else {
    console.log('❌ Evolution API indisponível')
  }
  
  // 4. Teste getConnectionStatus (se houver instância)
  console.log('\n[4/6] Testando getConnectionStatus()...')
  try {
    const status = await getConnectionStatus('instance-1')
    console.log(`✅ Status da instância: ${status}`)
  } catch (error) {
    console.log('ℹ️  Não foi possível verificar status da instância')
  }
  
  // 5. Métricas em tempo real
  console.log('\n[5/6] Métricas em tempo real...')
  const metrics = await getRealtimeMetrics()
  if (metrics) {
    console.log('📊 Métricas:')
    console.log(`   Fila pendente: ${metrics.queue_pending}`)
    console.log(`   Fila enviando: ${metrics.queue_sending}`)
    console.log(`   Enviados 5min: ${metrics.sent_5m}`)
    console.log(`   Instâncias conectadas: ${metrics.connected_instances}`)
    console.log(`   Workers ativos: ${metrics.active_workers}`)
  } else {
    console.log('❌ Erro ao carregar métricas')
  }
  
  // 6. Locks expirados
  console.log('\n[6/6] Verificando locks expirados...')
  const expiredLocks = await getExpiredLocks()
  if (expiredLocks.length > 0) {
    console.log(`⚠️  ${expiredLocks.length} lock(s) expirado(s) encontrado(s):`)
    expiredLocks.forEach(lock => {
      console.log(`   - ID: ${lock.released_id} | Falha: ${lock.was_failed}`)
    })
  } else {
    console.log('✅ Nenhum lock expirado encontrado')
  }
  
  console.log('\n' + '─'.repeat(60))
  console.log('✅ DIAGNÓSTICO CONCLUÍDO')
  console.log('─'.repeat(60) + '\n')
}
