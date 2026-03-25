# Guia de Validação - Dry Run (Caminho 2)

**Data:** 13/03/2026
**Objetivo:** Validar automação sem enviar mensagens reais

---

## ✅ MUDANÇAS APLICADAS

### 1. Arquivos Modificados

#### `automation/.env`
- ✅ Adicionado `SUPABASE_SERVICE_ROLE_KEY`
- ✅ Adicionado `DRY_RUN=true`
- ✅ Adicionado configs de worker (heartbeat, lock timeout, etc.)

#### `automation/src/core/worker-engine.ts`
- ✅ Adicionado `dryRun` (lê flag do .env)
- ✅ Log informativo no início se dry run ativo
- ✅ Passa `dryRun` para queue manager

#### `automation/src/core/queue-manager.ts`
- ✅ Adicionado parâmetro `dryRun` em `processClaimedMessage`
- ✅ Em dry run: simula delay, logs detalhados, não chama Evolution API
- ✅ Em produção: fluxo normal com envio real

#### `automation/src/services/supabase.ts`
- ✅ Adicionado parâmetro `dryRun` em `markMessageDelivered`
- ✅ Em dry run: NÃO incrementa `messages_sent_count`
- ✅ Em produção: incrementa contador normalmente

### 2. Arquivos Criados

#### `automation/src/diagnostic.ts`
- Função `runDiagnostics()` com 6 validações:
  1. Teste `claimNextMessage()`
  2. Teste `getSystemConfig()`
  3. Teste `checkEvolutionHealth()`
  4. Teste `getConnectionStatus()`
  5. Métricas em tempo real
  6. Locks expirados

#### `automation/src/index.ts`
- ✅ Suporta modo diagnóstico com `--diag` ou `--diagnostic`
- ✅ Modo worker padrão sem argumentos

#### `docs/dry_run_test_messages.sql`
- SQL para zerar contadores
- SQL para inserir 10 mensagens de teste
- SQL para verificar estado inicial

---

## 🚀 COMO EXECUTAR O DRY RUN

### Passo 1: Aplicar Migrations (se não aplicadas ainda)

No Supabase Dashboard SQL Editor, executar EM ORDEM:

1. `20260313190000_automation_core_fields.sql`
2. `20260313190100_automation_new_tables.sql`
3. `20260313190200_automation_indexes.sql`
4. `20260313190300_automation_functions.sql`
5. `20260313190400_automation_views.sql`
6. `20260313190700_add_rotation_index.sql`
7. `20260313190800_fix_claim_next_message.sql`

Validar após cada uma (conforme `guia_execucao_migrations.md`).

### Passo 2: Executar Diagnóstico

```bash
cd C:\Users\OPERACIONAL\Desktop\IA\prn-vigilante-a1bd0
bun run automation/src/index.ts --diag
```

**O que verificar:**
- ✅ Mensagem claimada ou fila vazia
- ✅ Configuração carregada
- ✅ Evolution API disponível
- ✅ Métricas em tempo real
- ✅ Nenhum lock expirado

### Passo 3: Inserir Mensagens de Teste

No Supabase Dashboard SQL Editor, executar:

```sql
-- Copiar conteúdo de docs/dry_run_test_messages.sql
-- Executar
```

**O que verificar:**
- ✅ 10 mensagens inseridas
- ✅ Status = 'queued'
- ✅ Instância conectada com `rotation_index = 0`

### Passo 4: Rodar Worker em Dry Run

```bash
cd C:\Users\OPERACIONAL\Desktop\IA\prn-vigilante-a1bd0
bun run automation/src/index.ts
```

**Logs esperados:**
```
────────────────────────────────────────────────────
🤖 PRN-Vigilante — Automation Engine
────────────────────────────────────────────────────
🚀 Inicializando worker de automação...
────────────────────────────────────────────────────
[14:30:00] 🤖 Worker iniciado: automation-worker (automation-worker-12345)
[14:30:00] 🔍 MODO DRY RUN ATIVADO - Mensagens não serão enviadas
[14:30:00] ✅ Evolution API disponível
[14:30:00] 📩 Mensagem claimada: abc-123 -> instance-01
[14:30:01] 🔍 [DRY RUN] Simulando envio para 11999999999
[14:30:01] 🔍 [DRY RUN] Instância: instance-01
[14:30:01] 🔍 [DRY RUN] Mensagem: 🧪 Mensagem de teste 1 - DRY RUN - Não responda...
[14:30:01] ✅ Mensagem entregue: abc-123
```

### Passo 5: Validar Round-Robin

Após 10 mensagens, rodar no Supabase SQL Editor:

```sql
SELECT 
  id,
  instance_name,
  status,
  rotation_index,
  messages_sent_count
FROM public.whatsapp_instances
WHERE status = 'connected'
ORDER BY rotation_index ASC;
```

**Resultado esperado (round-robin funcionando):**
- Se 1 instância: `messages_sent_count = 0`, `rotation_index = 0` (não incrementado)
- Se 2+ instâncias: `rotation_index` alternou (0, 1, 2...) mas `messages_sent_count = 0`

### Passo 6: Limpar Teste

Após validação, limpar mensagens de teste:

```sql
UPDATE public.patients_queue
SET status = 'cancelled', notes = 'Teste dry run concluído'
WHERE patient_name LIKE '%Paciente Teste%';
```

---

## 📊 CHECKLIST DE SUCESSO

### Pré-Execução
- [ ] Migrations 1-7 aplicadas
- [ ] SERVICE_ROLE_KEY configurado
- [ ] DRY_RUN=true no .env
- [ ] Evolution API online
- [ ] 1+ instância conectada

### Durante Execução
- [ ] Worker iniciou sem erros
- [ ] Log "MODO DRY RUN ATIVADO" aparece
- [ ] Logs "[DRY RUN]" aparecem para cada mensagem
- [ ] Nenhuma mensagem foi enviada para WhatsApp real
- [ ] Todas as 10 mensagens foram processadas

### Pós-Execução
- [ ] Mensagens marcadas como 'delivered'
- [ ] `messages_sent_count = 0` (não incrementou em dry run)
- [ ] Logs em `message_logs` criados
- [ ] Round-robin funcionando (se múltiplas instâncias)

---

## 🆘 COMANDOS RÁPIDOS

### Parar Worker
```bash
Ctrl+C
```

### Limpar Locks (se necessário)
```sql
UPDATE public.patients_queue
SET status = 'queued', locked_by = NULL, locked_at = NULL
WHERE status = 'sending';
```

### Verificar Status da Fila
```sql
SELECT status, COUNT(*)
FROM public.patients_queue
GROUP BY status;
```

### Verificar Heartbeats
```sql
SELECT * FROM worker_status_summary;
```

---

## ✅ PRÓXIMO PASSO

Após dry run validado com sucesso:

**Opção A:** Continuar para Caminho 3 (Teste real)
- Fornece seu número real
- Atualize fila com número real
- Desligar dry run (`DRY_RUN=false`)
- Rodar worker e enviar 1 mensagem real

**Opção B:** Continuar para Caminho 4 (Produção)
- Integrar LGPD/consentimento
- Implementar delay dinâmico
- Implementar circuit breaker
- Adotar logger estruturado

**Opção C:** Refinar round-robin
- Implementar atualização de `rotation_index`
- Validar rotação justa com múltiplas instâncias

---

## 📝 OBSERVAÇÕES

1. **Sobre round-robin:** A migration cria `rotation_index` mas o código atual NÃO o atualiza. Isso será corrigido quando implementarmos a rotação real.

2. **Sobre mensagens reais:** Em dry run, mensagens são simuladas com delay de 200-700ms. Nenhum envio real acontece.

3. **Sobre logs:** Logs `[DRY RUN]` ajudam a distinguir dry run de produção.

4. **Sobre validação:** O diagnóstico `--diag` não executa o worker, apenas testa componentes isolados.

---

**Guia completo e pronto para uso!**
