# Guia de Execução das Migrations - Automação PRN-Vigilante

**Data de Criação:** 13/03/2026
**Objetivo:** Aplicar as migrations SQL da automação no Supabase

---

## 📁 Arquivos de Migration Criados

As migrations foram organizadas em 5 arquivos na pasta `supabase/migrations/`:

1. **20260313190000_automation_core_fields.sql** - ALTER TABLEs
   - Adiciona `locked_by`, `locked_at`, `attempt_count` em `patients_queue`
   - Adiciona `last_message_at`, `messages_sent_count` em `whatsapp_instances`

2. **20260313190100_automation_new_tables.sql** - CREATE TABLEs
   - `message_logs` - Auditoria de envios
   - `worker_heartbeats` - Monitoramento de workers
   - `patient_consent` - LGPD: Consentimento
   - `message_blocks` - Opt-out: Bloqueios

3. **20260313190200_automation_indexes.sql** - CREATE INDEX
   - Índices para performance de fila, locks, heartbeats, logs e bloqueios

4. **20260313190300_automation_functions.sql** - CREATE FUNCTION
   - `claim_next_message` - Seleciona próxima mensagem com lock atômico
   - `release_expired_locks` - Libera locks de workers crashados

5. **20260313190400_automation_views.sql** - CREATE VIEW
   - `dashboard_realtime_metrics` - Métricas em tempo real
   - `expired_locks` - Diagnóstico de locks expirados
   - `worker_status_summary` - Status dos workers
   - `message_failure_insights` - Análise de falhas

6. **20260313190700_add_rotation_index.sql** - ALTER TABLE
   - Adiciona campo `rotation_index` em `whatsapp_instances`
   - Cria índice composto para round-robin

7. **20260313190800_fix_claim_next_message.sql** - CREATE FUNCTION
   - Substitui `claim_next_message` para usar round-robin (ORDER BY rotation_index ASC)
   - Garante alternância 1→2→3→1→2→3... entre instâncias conectadas

## Observações importantes antes de executar

- O worker backend deve preferir `SUPABASE_SERVICE_ROLE_KEY` em vez de `SUPABASE_ANON_KEY`
- O índice de bloqueios foi ajustado para evitar uso de `NOW()` em predicado de índice parcial, o que causaria erro no PostgreSQL
- A função `claim_next_message` não atualiza mais `last_message_at`; esse campo deve refletir envio real bem-sucedido, não apenas claim da fila

---

## 🚀 Como Executar as Migrations

### Método 1: Via Supabase Dashboard (Recomendado)

1. Acesse seu projeto no Supabase: https://app.supabase.com/project/SEU-PROJETO

2. Vá em **SQL Editor** no menu lateral

3. Execute as migrations **EM ORDEM**:

   **Passo 1: Core Fields**

   ```sql
   -- Copie o conteúdo de supabase/migrations/20260313190000_automation_core_fields.sql
   -- Cole no SQL Editor
   -- Execute
   ```

   **Passo 2: Novas Tabelas**

   ```sql
   -- Copie o conteúdo de supabase/migrations/20260313190100_automation_new_tables.sql
   -- Cole no SQL Editor
   -- Execute
   ```

   **Passo 3: Índices**

   ```sql
   -- Copie o conteúdo de supabase/migrations/20260313190200_automation_indexes.sql
   -- Cole no SQL Editor
   -- Execute
   ```

   **Passo 4: Funções**

   ```sql
   -- Copie o conteúdo de supabase/migrations/20260313190300_automation_functions.sql
   -- Cole no SQL Editor
   -- Execute
   ```

   **Passo 5: Views**

   ```sql
   -- Copie o conteúdo de supabase/migrations/20260313190400_automation_views.sql
   -- Cole no SQL Editor
   -- Execute
   ```

   **Passo 6: Round-Robin**

   ```sql
   -- Copie o conteúdo de supabase/migrations/20260313190700_add_rotation_index.sql
   -- Cole no SQL Editor
   -- Execute
   ```

   **Passo 7: Função de Seleção**

   ```sql
   -- Copie o conteúdo de supabase/migrations/20260313190800_fix_claim_next_message.sql
   -- Cole no SQL Editor
   -- Execute
   ```

   **Resultado esperado:** 7 colunas novas criadas

   **Bônus: Validar Round-Robin**

   ```sql
   -- Verificar se rotation_index existe e o índice foi criado
   SELECT
       table_name,
       column_name,
       data_type
   FROM information_schema.columns
   WHERE table_name = 'whatsapp_instances'
     AND column_name = 'rotation_index';

   -- Verificar se o índice de rotação foi criado
   SELECT indexname
   FROM pg_indexes
   WHERE schemaname = 'public'
     AND indexname = 'idx_whatsapp_instances_rotation';
   ```

### 2. Verificar Índices

```sql
-- Verificar índices criados
SELECT indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%';
```

    **Resultado esperado:** 7 índices novos
    - Inclui idx_whatsapp_instances_rotation (round-robin)

### 3. Verificar Funções

````sql
-- Verificar funções criadas
    SELECT routine_name
    FROM information_schema.routines
    WHERE routine_schema = 'public'
      AND routine_name IN ('claim_next_message', 'release_expired_locks');
    ```

    **Resultado esperado:** 2 funções criadas
    - A função `claim_next_message` deve usar round-robin (ORDER BY rotation_index)

### 4. Verificar Views

```sql
-- Verificar views criadas
SELECT viewname
FROM pg_views
WHERE schemaname = 'public'
  AND viewname IN ('dashboard_realtime_metrics', 'expired_locks', 'worker_status_summary', 'message_failure_insights');
````

**Resultado esperado:** 4 views criadas

### 5. Testar Funções Manualmente

**Testar claim_next_message:**

```sql
-- Tenta claimar uma mensagem
SELECT * FROM claim_next_message('test-worker-1', 3);
```

**Resultado esperado:**

- Se houver mensagens elegíveis, retorna uma mensagem
- Se não houver, retorna vazio (sem erro)

**Testar release_expired_locks:**

```sql
-- Libera locks expirados
SELECT * FROM release_expired_locks(5);
```

**Resultado esperado:**

- Retorna lista de mensagens liberadas ou vazio se não houver locks expirados

---

## 📋 Checklist de Validação

Antes de prosseguir para a próxima fase (Sprint 2), confirme:

- [ ] Todas as 5 migrations foram executadas sem erro
- [ ] `patients_queue` tem os campos `locked_by`, `locked_at`, `attempt_count`
- [ ] `whatsapp_instances` tem os campos `last_message_at`, `messages_sent_count`
- [ ] As 4 tabelas novas existem: `message_logs`, `worker_heartbeats`, `patient_consent`, `message_blocks`
- [ ] Os 6 índices foram criados
- [ ] As 2 funções SQL existem e funcionam
- [ ] As 4 views foram criadas
- [ ] Teste manual de `claim_next_message` funcionou
- [ ] Teste manual de `release_expired_locks` funcionou

---

## ⚠️ Problemas Comuns

### Erro: "column already exists"

Se receber erro de coluna já existir, verifique:

- A migration não foi executada anteriormente
- Execute a query de verificação para confirmar o estado atual

### Erro: "function already exists"

As migrations usam `CREATE OR REPLACE FUNCTION`, então isso não deveria ocorrer. Se ocorrer:

- Verifique se não há conflito de nomes com outras funções
- Execute `DROP FUNCTION nome_da_função(CASCADE);` e execute a migration novamente

### Erro: "relation does not exist"

Verifique:

- A ordem de execução das migrations (001, 002, 003, 004, 005)
- Dependências entre migrations (004 depende de 001 e 002)

---

## 🔄 Rollback (Se Precisar Desfazer)

Se precisar desfazer as migrations, execute na **ORDEM INVERSA**:

**Passo 5: Remover Views**
`sql
    DROP VIEW IF EXISTS message_failure_insights;
    DROP VIEW IF EXISTS worker_status_summary;
    DROP VIEW IF EXISTS expired_locks;
    DROP VIEW IF EXISTS dashboard_realtime_metrics;
    `

**Passo 6: Remover Função Corrigida**
`sql
    DROP FUNCTION IF EXISTS claim_next_message(TEXT, INT);
    `

**Passo 7: Remover Índice de Rotação**
`sql
    DROP INDEX IF EXISTS idx_whatsapp_instances_rotation;
    `

**Passo 8: Remover Coluna de Rotação**
`sql
    ALTER TABLE whatsapp_instances DROP COLUMN IF EXISTS rotation_index;
    `

**Passo 9: Remover Funções**
`sql
    DROP FUNCTION IF EXISTS release_expired_locks(INT);
    `

**Passo 10: Remover Índices**
`sql
    DROP INDEX IF EXISTS idx_patient_consent_patient_id;
    DROP INDEX IF EXISTS idx_message_blocks_lookup;
    DROP INDEX IF EXISTS idx_message_logs_message_id;
    DROP INDEX IF EXISTS idx_worker_heartbeats_last_heartbeat;
    DROP INDEX IF EXISTS idx_patients_queue_locks;
    DROP INDEX IF EXISTS idx_patients_queue_claim;
    `

**Passo 11: Remover Tabelas**
`sql
    DROP TABLE IF EXISTS message_blocks CASCADE;
    DROP TABLE IF EXISTS patient_consent CASCADE;
    DROP TABLE IF EXISTS worker_heartbeats CASCADE;
    DROP TABLE IF EXISTS message_logs CASCADE;
    `

**Passo 12: Remover Colunas das Tabelas Existentes**
`sql
    ALTER TABLE whatsapp_instances DROP COLUMN IF EXISTS messages_sent_count;
    ALTER TABLE whatsapp_instances DROP COLUMN IF EXISTS last_message_at;
    ALTER TABLE patients_queue DROP COLUMN IF EXISTS attempt_count;
    ALTER TABLE patients_queue DROP COLUMN IF EXISTS locked_at;
    ALTER TABLE patients_queue DROP COLUMN IF EXISTS locked_by;
    `

---

## 📝 Próximos Passos

Após validar que todas as migrations foram aplicadas com sucesso, você pode:

1. **Regerar tipos do Supabase**
   - Execute o comando de geração de tipos para atualizar `src/lib/supabase/types.ts`

2. **Atualizar tipos do worker**
   - Expanda `automation/src/types/index.ts` para incluir os novos tipos

3. **Iniciar Sprint 2**
   - Implementar os drivers do worker (Supabase e Evolution)
   - Criar Queue Manager e Instance Selector

---

**Última atualização:** 13/03/2026
**Status:** Pronto para execução no Supabase
