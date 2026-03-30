# 📋 Contexto de Migrações SQL - PRN-Vigilante Automação

**Data de Criação:** 13/03/2026
**Status:** Planejamento Concluído - Aguardando Execução
**Projeto:** PRN-Vigilante - Sistema de Automação de WhatsApp

---

## 📌 O QUE FOI FEITO

### 1. Análise Completa com 7 Sub-Agentes
- ✅ Arquiteto de Sistema - Diagrama de arquitetura e componentes
- ✅ Engenheiro de Banco - Schema e queries SQL
- ✅ Especialista Evolution API - Driver completo
- ✅ Engenheiro de Filas - SKIP LOCKED, round-robin, circuit breaker
- ✅ Analista de Métricas - Logs JSON, Prometheus, alertas
- ✅ Validador LGPD - Consentimento, opt-out, retenção
- ✅ Especialista Humanização - Delays, spinning, split

### 2. Documentação Visual
- ✅ HTML criado: `docs/presentations/planejamento_automacao.html` (clique duplo para abrir)

### 3. Planejamento de Migrações SQL
- ✅ 2 tabelas existentes precisam de ALTER TABLE
- ✅ 4 novas tabelas precisam ser criadas
- ✅ 5 índices para performance
- ✅ 2 funções SQL (claim_next_message, release_expired_locks)
- ✅ 2 views para dashboard
- ✅ Total: 15 operações SQL

---

## 🗄️ MIGRAÇÕES PLANEJADAS

### Tabelas Existentes - ALTER TABLE

#### 1. patients_queue
**Campos a adicionar:**
```sql
-- Controle de concorrência
ALTER TABLE patients_queue
ADD COLUMN IF NOT EXISTS locked_by TEXT,
ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS attempt_count INTEGER DEFAULT 0;
```

**Por que?**
- `locked_by`: Garante que só um worker processe cada mensagem (SKIP LOCKED)
- `locked_at`: Para detectar locks expirados (worker crashou)
- `attempt_count`: Tentar novamente até 3x antes de falhar permanentemente

#### 2. whatsapp_instances
**Campos a adicionar:**
```sql
-- Métricas de uso para rotação e delay
ALTER TABLE whatsapp_instances
ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS messages_sent_count INTEGER DEFAULT 0;
```

**Por que?**
- `last_message_at`: Calcular delay desde último envio (anti-ban 3-12min)
- `messages_sent_count`: Distribuir carga (instância menos usada primeiro)

---

### Novas Tabelas - CREATE TABLE

#### 3. message_logs
**Propósito:** Auditar todo envio para compliance e métricas

```sql
CREATE TABLE message_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES patients_queue(id),
  instance_id UUID REFERENCES whatsapp_instances(id),

  -- Detalhes do envio
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT NOT NULL,  -- 'sent', 'delivered', 'failed'
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,

  -- LGPD: dados anonimizados
  phone_masked TEXT,      -- +55119****9999
  patient_hash TEXT,      -- Hash do nome

  -- Performance
  duration_ms INTEGER
);
```

#### 4. worker_heartbeats
**Propósito:** Monitorar workers ativos e detectar crashes

```sql
CREATE TABLE worker_heartbeats (
  worker_id TEXT PRIMARY KEY,
  worker_name TEXT NOT NULL,

  -- Sinal de vida
  started_at TIMESTAMPTZ DEFAULT NOW(),
  last_heartbeat TIMESTAMPTZ DEFAULT NOW(),

  -- Status atual
  current_job_id UUID,
  current_job_started_at TIMESTAMPTZ,

  -- Métricas
  messages_processed INT DEFAULT 0,
  messages_failed INT DEFAULT 0,

  -- Infraestrutura
  memory_usage_mb INT,
  cpu_usage_percent NUMERIC,
  ip_address INET
);
```

#### 5. patient_consent
**Propósito:** LGPD - Consentimento explícito do paciente

```sql
CREATE TABLE patient_consent (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID,

  -- Status do consentimento
  consent_status TEXT NOT NULL
    CHECK (consent_status IN ('granted', 'denied', 'pending', 'revoked', 'expired')),

  consent_granted_at TIMESTAMPTZ,
  consent_revoked_at TIMESTAMPTZ,

  -- Onde foi coletado
  consent_source TEXT NOT NULL,  -- 'checkbox', 'web', 'app'

  -- Versões
  consent_version TEXT DEFAULT '1.0',
  privacy_policy_version TEXT DEFAULT '1.0',

  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 6. message_blocks
**Propósito:** Bloquear envios (opt-out - resposta "SAIR")

```sql
CREATE TABLE message_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID,
  phone_number TEXT NOT NULL UNIQUE,

  -- Quando e por que
  blocked_at TIMESTAMPTZ DEFAULT NOW(),
  reason TEXT NOT NULL,  -- 'opt_out', 'failed_payment', 'complaint'
  source TEXT,           -- 'whatsapp_reply', 'web_portal', 'admin'

  -- Bloqueio permanente ou temporário
  permanent BOOLEAN DEFAULT TRUE,
  expires_at TIMESTAMPTZ,
  blocked_by TEXT
);
```

---

### Índices - CREATE INDEX

```sql
-- Para buscar próxima mensagem rapidamente
CREATE INDEX idx_patients_queue_claim
ON patients_queue(status, is_approved, send_after, locked_by, attempt_count, queue_order)
WHERE status IN ('queued', 'failed');

-- Para identificar locks expirados
CREATE INDEX idx_patients_queue_locks
ON patients_queue(locked_by, locked_at)
WHERE locked_by IS NOT NULL;

-- Para heartbeat de workers
CREATE INDEX idx_worker_heartbeats_last_heartbeat
ON worker_heartbeats(last_heartbeat);

-- Para logs de mensagens
CREATE INDEX idx_message_logs_message_id
ON message_logs(message_id);

-- Para bloqueios (opt-out)
CREATE INDEX idx_message_blocks_phone
ON message_blocks(phone_number);
```

---

### Funções SQL - CREATE FUNCTION

#### Função 1: claim_next_message
**Propósito:** Selecionar próxima mensagem e travar atômicamente

```sql
CREATE OR REPLACE FUNCTION claim_next_message(
  p_worker_id TEXT,
  p_max_attempts INT DEFAULT 3
)
RETURNS TABLE (
  id UUID,
  patient_name TEXT,
  phone_number TEXT,
  message_body TEXT,
  instance_id UUID,
  instance_name TEXT,
  attempt_count INT
) AS $$
DECLARE
  v_instance_id UUID;
  v_instance_name TEXT;
BEGIN
  -- 1. Seleciona instância menos usada
  SELECT wi.id, wi.instance_name
  INTO v_instance_id, v_instance_name
  FROM whatsapp_instances wi
  WHERE wi.status = 'connected'
  ORDER BY
    wi.messages_sent_count ASC,
    wi.last_message_at ASC NULLS FIRST
  FOR UPDATE OF wi SKIP LOCKED
  LIMIT 1;

  IF v_instance_id IS NULL THEN
    RETURN;
  END IF;

  -- 2. Atualiza timestamp da instância
  UPDATE whatsapp_instances
  SET last_message_at = NOW()
  WHERE id = v_instance_id;

  -- 3. Seleciona próxima mensagem e trava
  RETURN QUERY
  WITH next_msg AS (
    SELECT pq.id
    FROM patients_queue pq
    WHERE pq.status = 'queued'
      AND pq.is_approved = true
      AND pq.send_after <= NOW()
      AND pq.locked_by IS NULL
      AND pq.attempt_count < p_max_attempts
    ORDER BY pq.queue_order ASC NULLS LAST, pq.send_after ASC
    FOR UPDATE SKIP LOCKED
    LIMIT 1
  )
  UPDATE patients_queue
  SET
    status = 'sending',
    locked_by = p_worker_id,
    locked_at = NOW(),
    attempt_count = attempt_count + 1,
    updated_at = NOW()
  FROM next_msg
  WHERE patients_queue.id = next_msg.id
  RETURNING
    patients_queue.id,
    patients_queue.patient_name,
    patients_queue.phone_number,
    patients_queue.message_body,
    v_instance_id,
    v_instance_name,
    patients_queue.attempt_count;
END;
$$ LANGUAGE plpgsql;
```

#### Função 2: release_expired_locks
**Propósito:** Liberar mensagens travadas se worker crashou

```sql
CREATE OR REPLACE FUNCTION release_expired_locks(
  p_lock_timeout_minutes INT DEFAULT 5
)
RETURNS TABLE (
  released_id UUID,
  was_failed BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  WITH expired AS (
    SELECT pq.id, pq.attempt_count
    FROM patients_queue pq
    WHERE pq.locked_by IS NOT NULL
      AND pq.status = 'sending'
      AND pq.locked_at < NOW() - (p_lock_timeout_minutes || ' minutes')::INTERVAL
    FOR UPDATE SKIP LOCKED
  )
  UPDATE patients_queue
  SET
    status = CASE
      WHEN expired.attempt_count >= 2 THEN 'failed'
      ELSE 'queued'
    END,
    locked_by = NULL,
    locked_at = NULL,
    updated_at = NOW()
  FROM expired
  WHERE patients_queue.id = expired.id
  RETURNING
    patients_queue.id,
    CASE WHEN expired.attempt_count >= 2 THEN true ELSE false END as was_failed;
END;
$$ LANGUAGE plpgsql;
```

---

### Views - CREATE VIEW

```sql
-- View para métricas em tempo real
CREATE VIEW dashboard_realtime_metrics AS
SELECT
  (SELECT COUNT(*) FROM patients_queue WHERE status = 'queued') as queue_pending,
  (SELECT COUNT(*) FROM patients_queue WHERE status = 'sending') as queue_sending,
  (SELECT COUNT(*) FROM message_logs
    WHERE sent_at > NOW() - INTERVAL '5 minutes'
    AND status = 'sent') as sent_5m,
  (SELECT COUNT(*) FROM whatsapp_instances WHERE status = 'connected') as connected_instances;

-- View para locks expirados
CREATE VIEW expired_locks AS
SELECT
  id,
  patient_name,
  locked_by,
  locked_at,
  EXTRACT(EPOCH FROM (NOW() - locked_at)) / 60 as lock_age_minutes
FROM patients_queue
WHERE locked_by IS NOT NULL
  AND status = 'sending'
  AND locked_at < NOW() - INTERVAL '5 minutes';
```

---

## 📌 COMO RETOMAR ESTE TRABALHO

### Instruções para Voltar:

**Opção 1: Executar Migrations como Arquivo SQL**
```
"Execute as 15 operações SQL das migrações planejadas em docs/migrations/migrations_contexto.md.
Arquivo para criar: supabase/migrations/20260313_automation_features.sql"
```

**Opção 2: Migrations Separadas por Prioridade**
```
"Crie os arquivos de migração separados:
1. supabase/migrations/20260313190000_automation_core_fields.sql (ALTER TABLEs)
2. supabase/migrations/20260313190100_automation_new_tables.sql (CREATE TABLEs)
3. supabase/migrations/20260313190200_automation_indexes.sql (CREATE INDEX)
4. supabase/migrations/20260313190300_automation_functions.sql (CREATE FUNCTION)
5. supabase/migrations/20260313190400_automation_views.sql (CREATE VIEW)"
```

**Opção 3: Passo a Passo com Validação**
```
"Execute as migrações SQL passo a passo, validando cada uma:
1. Primeiro: ALTER TABLE patients_queue
2. Segundo: ALTER TABLE whatsapp_instances
3. Terceiro: Criar as 4 novas tabelas
4. Quarto: Criar os 5 índices
5. Quinto: Criar as 2 funções
6. Sexto: Criar as 2 views
Valide cada uma após executar"
```

---

## 🎯 PRÓXIMOS PASSOS (QUANDO RETOMAR)

### Fase 1: Executar Migrations (Task 1)
- [ ] Criar arquivo SQL em `/supabase/migrations/`
- [ ] Executar migrations no Supabase
- [ ] Validar que tabelas e campos foram criados
- [ ] Testar funções SQL manualmente

### Fase 2: Continuar com Tasks 2-8
- [ ] Task 2: Criar estrutura de pastas `/automation/src/`
- [ ] Task 3: Definir Types TypeScript
- [ ] Task 4: Implementar Drivers Supabase
- [ ] Task 5: Implementar Evolution Driver
- [ ] Task 6: Queue Manager
- [ ] Task 7: Instance Selector
- [ ] Task 8: Worker Engine

### Fase 3: Continuar Tasks 9-20
- Resiliência, Observabilidade, Humanização

---

## 📊 RESUMO

| Item | Quantidade | Status |
|------|------------|--------|
| Sub-agentes concluídos | 7/7 | ✅ |
| HTML de planejamento | 1 | ✅ |
| Tasks definidas | 20 | ✅ |
| Operações SQL pendentes | 15 | ⏳ |
| Implementação código | 0 | ❌ |

---

## 📁 ARQUIVOS RELACIONADOS

1. `docs/presentations/planejamento_automacao.html` - Visual interativo do projeto
2. `docs/migrations/migrations_contexto.md` - Este arquivo (contexto salvo)
3. `docs/resumo_contexto.md` - Contexto original do projeto
4. `supabase/migrations/` - A SER CRIADO quando executar

---

**Última atualização:** 13/03/2026
**Pronto para execução:** Aguardando comando
