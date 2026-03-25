/**
 * 🤖 PRN-Vigilante Automation Engine
 *
 * Ponto de entrada principal do motor de automação.
 * Executa o worker com loop contínuo, heartbeat e processamento da fila.
 *
 * Para rodar: bun run automation/src/index.ts
 */

import 'dotenv/config'
import { WorkerEngine } from './core/worker-engine'
import { runDiagnostics } from './diagnostic'

// ── Validação de Ambiente ──
const REQUIRED_ENV = {
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY,
  EVOLUTION_API_URL: process.env.EVOLUTION_API_URL,
  EVOLUTION_API_KEY: process.env.EVOLUTION_API_KEY,
}

const missing = Object.entries(REQUIRED_ENV)
  .filter(([, value]) => !value || value.trim() === '')
  .map(([key]) => key)

if (missing.length > 0) {
  console.error('─'.repeat(50))
  console.error('❌ ERRO FATAL: Variáveis de ambiente obrigatórias ausentes:')
  missing.forEach((key) => console.error(`   • ${key}`))
  console.error('')
  console.error('Verifique o arquivo automation/.env')
  console.error('─'.repeat(50))
  process.exit(1)
}

const args = process.argv.slice(2)
const isDiagnosticMode = args.includes('--diag') || args.includes('--diagnostic')

console.log('─'.repeat(50))
console.log('🤖 PRN-Vigilante — Automation Engine')
console.log('─'.repeat(50))

if (isDiagnosticMode) {
  console.log('🔍 Modo de Diagnóstico')
  console.log('─'.repeat(50))
  runDiagnostics().then(() => process.exit(0))
} else {
  console.log('🚀 Inicializando worker de automação...')
  console.log(`✅ Ambiente validado: ${Object.keys(REQUIRED_ENV).length} variáveis OK`)
  console.log('─'.repeat(50))
  
  const engine = new WorkerEngine()
  
  engine.start().catch((error) => {
    console.error('❌ Falha fatal ao iniciar o worker:', error)
    process.exit(1)
  })
}

