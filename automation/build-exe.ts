import { $ } from 'bun'

console.log('\n🚀 PRN-Vigilante - Build Executável\n')

if (! Bun.env.SUPABASE_URL) {
  console.error('❌ Erro: SUPABASE_URL não encontrado no .env')
  console.log('📝 Copie .env.example para .env e preencha as variáveis\n')
  process.exit(1)
}

if (! Bun.env.EVOLUTION_API_URL) {
  console.error('❌ Erro: EVOLUTION_API_URL não encontrado no .env')
  console.log('📝 Copie .env.example para .env e preencha as variáveis\n')
  process.exit(1)
}

console.log('✅ Variáveis de ambiente verificadas\n')
console.log('🔨 Compilando executável...\n')

await $`bun build --compile src/index.ts --outfile automation-worker.exe`

console.log('\n✅ Build concluído!')
console.log('📦 Arquivo: automation-worker.exe\n')
console.log('💡 Para executar:')
console.log('   bun run start:exe')
console.log('   ou')
console.log('   ./automation-worker.exe\n')
