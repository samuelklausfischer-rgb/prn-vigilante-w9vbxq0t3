# Guia Passo a Passo - Aplicar Migrations no Supabase

**Data:** 13/03/2026
**Objetivo:** Aplicar as 7 migrations da automação no Supabase

---

## 🚀 ANTES DE COMEÇAR

### Pré-requisitos:
- [ ] Acesso ao Supabase Dashboard (https://app.supabase.com/project/SEU-PROJETO)
- [ ] Acesso ao SQL Editor (menu lateral)
- [ ] Confirmar que você tem a URL do projeto
- [ ] Ter 1+ instância de WhatsApp conectada no Evolution

### Backup Recomendado:
Antes de começar, considere fazer um backup do projeto. O Supabase não tem "snapshot" simples, mas você pode:
- Exportar schema atual (SQL Editor → New Query → SELECT pg_dump... )
- Ou simplesmente anotar que as migrations podem ser revertidas (rollback)

---

## 📋 PASSO A PASSO

### Migration 1: Core Fields (20260313190000)

**Objetivo:** Adicionar campos de controle à fila e instâncias

**Comando SQL:**
```sql
-- ========================================
-- MIGRAÇÃO: Core Fields da Automação
-- Data: 13/03/2026
-- Propósito: Adicionar campos de controle de concorrência e métricas às tabelas existentes
-- ========================================

-- 1. Alterar patients_queue - Controle de concorrência e tentativas
ALTER TABLE public.patients_queue
ADD COLUMN IF NOT EXISTS locked_by TEXT,
ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS attempt_count INTEGER DEFAULT 0;

-- Comentários explicativos
COMMENT ON COLUMN public.patients_queue.locked_by IS 'ID do worker que travou esta mensagem (SKIP LOCKED)';
COMMENT ON COLUMN public.patients_queue.locked_at IS 'Timestamp quando a mensagem foi travada pelo worker';
COMMENT ON COLUMN public.patients_queue.attempt_count IS 'Número de tentativas de envio (máximo 3)';

-- 2. Alterar whatsapp_instances - Métricas de uso para rotação e delay
ALTER TABLE public.whatsapp_instances
ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS messages_sent_count INTEGER DEFAULT 0;

-- Comentários explicativos
COMMENT ON COLUMN public.whatsapp_instances.last_message_at IS 'Timestamp do último envio bem-sucedido nesta instância (para cadência)';
COMMENT ON COLUMN public.whatsapp_instances.messages_sent_count IS 'Total de mensagens enviadas por esta instância (para rotação round-robin)';

-- 3. Verificar se os campos foram criados corretamente
SELECT
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name IN ('patients_queue', 'whatsapp_instances')
  AND column_name IN ('locked_by', 'locked_at', 'attempt_count', 'last_message_at', 'messages_sent_count')
ORDER BY table_name, column_name;
```

**Validação:**
- Execute o comando SQL acima
- Verifique se não houve erros
- Valide que 7 colunas foram listadas na tabela de verificação

**Resultado esperado:** 7 colunas criadas (3 em patients_queue, 4 em whatsapp_instances)

---

### Migration 2: Novas Tabelas (20260313190100)

**Objetivo:** Criar tabelas de logs, heartbeats, consentimento e bloqueios

**Comando SQL:**
```sql
-- ========================================
-- MIGRAÇÃO: Novas Tabelas da Automação
-- Data: 13/03/2026
-- Propósito: Criar tabelas de logs, heartbeats, consentimento e bloqueios
-- ========================================

-- 1. message_logs - Auditoria de envios
CREATE TABLE IF NOT EXISTS public.message_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES public.patients_queue(id) ON DELETE CASCADE,
  instance_id UUID REFERENCES public.whatsapp_instances(id) ON DELETE SET NULL,

  -- Detalhes do envio
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT NOT NULL CHECK (status IN ('sent', 'delivered', 'failed')),
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,

  -- LGPD: dados anonimizados
  phone_masked TEXT,
  patient_hash TEXT,

  -- Performance
  duration_ms INTEGER
);

COMMENT ON TABLE public.message_logs IS 'Auditoria completa de cada envio de mensagem';
COMMENT ON COLUMN public.message_logs.phone_masked IS 'Número de telefone mascarado para LGPD (ex: +55119****9999)';
COMMENT ON COLUMN public.message_logs.patient_hash IS 'Hash do nome do paciente para rastreabilidade sem expor dado pessoal';
COMMENT ON COLUMN public.message_logs.duration_ms IS 'Tempo de execução do envio em milissegundos';

-- 2. worker_heartbeats - Monitoramento de workers ativos
CREATE TABLE IF NOT EXISTS public.worker_heartbeats (
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

COMMENT ON TABLE public.worker_heartbeats IS 'Monitoramento de todos os workers ativos e detecção de crashes';
COMMENT ON COLUMN public.worker_heartbeats.worker_id IS 'ID único do worker (ex: hostname-pid)';
COMMENT ON COLUMN public.worker_heartbeats.current_job_id IS 'ID da mensagem atualmente sendo processada';

-- 3. patient_consent - LGPD: Consentimento explícito
CREATE TABLE IF NOT EXISTS public.patient_consent (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID,

  -- Status do consentimento
  consent_status TEXT NOT NULL
    CHECK (consent_status IN ('granted', 'denied', 'pending', 'revoked', 'expired')),
  consent_granted_at TIMESTAMPTZ,
  consent_revoked_at TIMESTAMPTZ,

  -- Onde foi coletado
  consent_source TEXT NOT NULL,

  -- Versões
  consent_version TEXT DEFAULT '1.0',
  privacy_policy_version TEXT DEFAULT '1.0',

  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.patient_consent IS 'LGPD: Consentimento explícito do paciente para envio de mensagens';
COMMENT ON COLUMN public.patient_consent.consent_status IS 'Status atual do consentimento';
COMMENT ON COLUMN public.patient_consent.consent_source IS 'Canal onde o consentimento foi obtido (checkbox, web, app)';

-- 4. message_blocks - Opt-out: Bloqueio de envios
CREATE TABLE IF NOT EXISTS public.message_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID,
  phone_number TEXT NOT NULL UNIQUE,

  -- Quando e por que
  blocked_at TIMESTAMPTZ DEFAULT NOW(),
  reason TEXT NOT NULL CHECK (reason IN ('opt_out', 'failed_payment', 'complaint')),
  source TEXT,

  -- Bloqueio permanente ou temporário
  permanent BOOLEAN DEFAULT TRUE,
  expires_at TIMESTAMPTZ,
  blocked_by TEXT
);

COMMENT ON TABLE public.message_blocks IS 'LGPD: Bloqueio de envios por opt-out ou outro motivo';
COMMENT ON COLUMN public.message_blocks.reason IS 'Motivo do bloqueio (opt_out, failed_payment, complaint)';
COMMENT ON COLUMN public.message_blocks.permanent IS 'TRUE para bloqueio permanente, FALSE para temporário';

-- RLS (Row Level Security) para as novas tabelas
ALTER TABLE public.message_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.worker_heartbeats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_consent ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_blocks ENABLE ROW LEVEL SECURITY;

-- Políticas RLS - Permitir tudo para autenticados
-- Nota: o worker idealmente deve usar service role key no backend.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'message_logs'
      AND policyname = 'Allow authenticated operations on message_logs'
  ) THEN
    CREATE POLICY "Allow authenticated operations on message_logs"
      ON public.message_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'worker_heartbeats'
      AND policyname = 'Allow authenticated operations on worker_heartbeats'
  ) THEN
    CREATE POLICY "Allow authenticated operations on worker_heartbeats"
      ON public.worker_heartbeats FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'patient_consent'
      AND policyname = 'Allow authenticated operations on patient_consent'
  ) THEN
    CREATE POLICY "Allow authenticated operations on patient_consent"
      ON public.patient_consent FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'message_blocks'
      AND policyname = 'Allow authenticated operations on message_blocks'
  ) THEN
    CREATE POLICY "Allow authenticated operations on message_blocks"
      ON public.message_blocks FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 5. Verificar se as tabelas foram criadas corretamente
SELECT
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name IN ('message_logs', 'worker_heartbeats', 'patient_consent', 'message_blocks')
ORDER BY table_name, ordinal_position;
```

**Validação:**
- Execute o comando SQL acima
- Verifique se não houve erros
- Valide que 4 tabelas foram criadas e cada uma tem as colunas corretas

**Resultado esperado:** 4 tabelas criadas

---

### Migration 3: Índices (20260313190200)

**Objetivo:** Criar índices de performance

**Comando SQL:**
```sql
-- ========================================
-- MIGRAÇÃO: Índices de Performance
-- Data: 13/03/2026
-- Propósito: Criar índices para otimizar consultas de fila, locks, heartbeats e logs
-- ========================================

-- 1. Índice para buscar próxima mensagem rapidamente (claim_next_message)
-- Este índice é crítico para o performance do worker
CREATE INDEX IF NOT EXISTS idx_patients_queue_claim
ON public.patients_queue(status, is_approved, send_after, locked_by, attempt_count, queue_order)
WHERE status IN ('queued', 'failed');

COMMENT ON INDEX idx_patients_queue_claim IS 'Índice para claim_next_message: busca próxima mensagem elegível rapidamente';

-- 2. Índice para identificar locks expirados (release_expired_locks)
-- Permite identificar mensagens travadas há muito tempo
CREATE INDEX IF NOT EXISTS idx_patients_queue_locks
ON public.patients_queue(locked_by, locked_at)
WHERE locked_by IS NOT NULL;

COMMENT ON INDEX idx_patients_queue_locks IS 'Índice para cleanup de locks expirados: identifica mensagens travadas por muito tempo';

-- 3. Índice para heartbeat de workers
-- Permite buscar workers que não responderam recentemente
CREATE INDEX IF NOT EXISTS idx_worker_heartbeats_last_heartbeat
ON public.worker_heartbeats(last_heartbeat);

COMMENT ON INDEX idx_worker_heartbeats_last_heartbeat IS 'Índice para monitoramento: detecta workers inativos';

-- 4. Índice para logs de mensagens
-- Permite buscar logs por mensagem_id para auditoria
CREATE INDEX IF NOT EXISTS idx_message_logs_message_id
ON public.message_logs(message_id);

COMMENT ON INDEX idx_message_logs_message_id IS 'Índice para auditoria: busca todos os logs de uma mensagem específica';

-- 5. Índice para bloqueios (opt-out)
-- Permite verificar rapidamente se um número está bloqueado
CREATE INDEX IF NOT EXISTS idx_message_blocks_lookup
ON public.message_blocks(phone_number, permanent, expires_at);

COMMENT ON INDEX idx_message_blocks_lookup IS 'Índice para opt-out: verificação rápida de números bloqueados (exclui bloqueios temporários expirados)';

-- 6. Índice para consentimento por paciente
-- Permite verificar rapidamente o status de consentimento
CREATE INDEX IF NOT EXISTS idx_patient_consent_patient_id
ON public.patient_consent(patient_id);

COMMENT ON INDEX idx_patient_consent_patient_id IS 'Índice para LGPD: busca consentimento de um paciente';

-- 7. Verificar se os índices foram criados corretamente
SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename IN ('patients_queue', 'worker_heartbeats', 'message_logs', 'message_blocks', 'patient_consent')
  AND schemaname = 'public'
ORDER BY tablename, indexname;
```

**Validação:**
- Execute o comando SQL acima
- Verifique se não houve erros
- Valide que 6 índices foram criados

**Resultado esperado:** 6 índices criados

---

### Migration 4: Funções (20260313190300)

**Objetivo:** Criar funções SQL para processamento da fila

**Comando SQL:**
```sql
-- ========================================
-- MIGRAÇÃO: Funções SQL da Automação
-- Data: 13/03/2026
-- Propósito: Criar funções para processamento da fila com concorrência segura
-- ========================================

-- Função 1: claim_next_message
-- Seleciona a próxima mensagem e trava atômicamente usando SKIP LOCKED
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
  -- 1. Seleciona instância menos usada que esteja conectada
  SELECT wi.id, wi.instance_name
  INTO v_instance_id, v_instance_name
  FROM public.whatsapp_instances wi
  WHERE wi.status = 'connected'
  ORDER BY
    wi.messages_sent_count ASC,
    wi.last_message_at ASC NULLS FIRST
  FOR UPDATE OF wi SKIP LOCKED
  LIMIT 1;

  IF v_instance_id IS NULL THEN
    RETURN;
  END IF;

  -- 2. Seleciona próxima mensagem e trava atômicamente
  RETURN QUERY
  WITH next_msg AS (
    SELECT pq.id
    FROM public.patients_queue pq
    WHERE pq.status = 'queued'
      AND pq.is_approved = true
      AND pq.send_after <= NOW()
      AND pq.locked_by IS NULL
      AND pq.attempt_count < p_max_attempts
    ORDER BY pq.queue_order ASC NULLS LAST, pq.send_after ASC
    FOR UPDATE SKIP LOCKED
    LIMIT 1
  )
  UPDATE public.patients_queue
  SET
    status = 'sending',
    locked_by = p_worker_id,
    locked_at = NOW(),
    attempt_count = attempt_count + 1,
    updated_at = NOW()
  FROM next_msg
  WHERE public.patients_queue.id = next_msg.id
  RETURNING
    public.patients_queue.id,
    public.patients_queue.patient_name,
    public.patients_queue.phone_number,
    public.patients_queue.message_body,
    v_instance_id,
    v_instance_name,
    public.patients_queue.attempt_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION claim_next_message IS 'Claima a próxima mensagem elegível e trava atômicamente para evitar processamento duplicado';

-- Função 2: release_expired_locks
-- Libera mensagens travadas se o worker crashou
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
    FROM public.patients_queue pq
    WHERE pq.locked_by IS NOT NULL
      AND pq.status = 'sending'
      AND pq.locked_at < NOW() - (p_lock_timeout_minutes || ' minutes')::INTERVAL
    FOR UPDATE SKIP LOCKED
  )
  UPDATE public.patients_queue
  SET
    status = CASE
      WHEN expired.attempt_count >= 2 THEN 'failed'
      ELSE 'queued'
    END,
    locked_by = NULL,
    locked_at = NULL,
    updated_at = NOW()
  FROM expired
  WHERE public.patients_queue.id = expired.id
  RETURNING
    public.patients_queue.id,
    CASE WHEN expired.attempt_count >= 2 THEN true ELSE false END as was_failed;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION release_expired_locks IS 'Libera locks expirados e marca mensagens como failed após 3 tentativas';

-- Teste das funções
-- NOTA: Estas funções devem ser testadas manualmente após a migration

-- Exemplo de teste para claim_next_message:
-- SELECT * FROM claim_next_message('worker-1', 3);

-- Exemplo de teste para release_expired_locks:
-- SELECT * FROM release_expired_locks(5);

-- Verificar se as funções foram criadas
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('claim_next_message', 'release_expired_locks');
```

**Validação:**
- Execute o comando SQL acima
- Verifique se não houve erros
- Valide que 2 funções foram listadas na verificação final
- Teste manual: `SELECT * FROM claim_next_message('test-worker', 3);`

**Resultado esperado:** 2 funções criadas

---

### Migration 5: Views (20260313190400)

**Objetivo:** Criar views para dashboard e monitoramento

**Comando SQL:**
```sql
-- ========================================
-- MIGRAÇÃO: Views para Dashboard e Operação
-- Data: 13/03/2026
-- Propósito: Criar views para métricas em tempo real e diagnóstico
-- ========================================

-- View 1: dashboard_realtime_metrics
-- Métricas agregadas em tempo real para o dashboard
CREATE OR REPLACE VIEW dashboard_realtime_metrics AS
SELECT
  (SELECT COUNT(*) FROM public.patients_queue WHERE status = 'queued') as queue_pending,
  (SELECT COUNT(*) FROM public.patients_queue WHERE status = 'sending') as queue_sending,
  (SELECT COUNT(*) FROM public.message_logs
   WHERE sent_at > NOW() - INTERVAL '5 minutes'
   AND status = 'sent') as sent_5m,
  (SELECT COUNT(*) FROM public.whatsapp_instances WHERE status = 'connected') as connected_instances,
  (SELECT COUNT(*) FROM public.worker_heartbeats
   WHERE last_heartbeat > NOW() - INTERVAL '2 minutes') as active_workers,
  (SELECT COUNT(*) FROM public.message_blocks
   WHERE permanent = TRUE OR expires_at > NOW()) as blocked_numbers,
  NOW() as metrics_timestamp;

COMMENT ON VIEW dashboard_realtime_metrics IS 'Métricas em tempo real para o dashboard operacional';

-- View 2: expired_locks
-- Identifica mensagens com locks expirados (worker provavelmente crashou)
CREATE OR REPLACE VIEW expired_locks AS
SELECT
  id,
  patient_name,
  locked_by,
  locked_at,
  EXTRACT(EPOCH FROM (NOW() - locked_at)) / 60 as lock_age_minutes
FROM public.patients_queue
WHERE locked_by IS NOT NULL
  AND status = 'sending'
  AND locked_at < NOW() - INTERVAL '5 minutes'
ORDER BY locked_at ASC;

COMMENT ON VIEW expired_locks IS 'Diagnóstico: mensagens com locks expirados (worker pode ter crashado)';

-- View 3: worker_status_summary
-- Resumo do status de todos os workers
CREATE OR REPLACE VIEW worker_status_summary AS
SELECT
  worker_id,
  worker_name,
  started_at,
  last_heartbeat,
  EXTRACT(EPOCH FROM (NOW() - last_heartbeat)) / 60 as minutes_since_heartbeat,
  current_job_id,
  current_job_started_at,
  messages_processed,
  messages_failed,
  CASE
    WHEN last_heartbeat > NOW() - INTERVAL '2 minutes' THEN 'active'
    WHEN last_heartbeat > NOW() - INTERVAL '5 minutes' THEN 'lagging'
    ELSE 'stale'
  END as status
FROM public.worker_heartbeats
ORDER BY last_heartbeat DESC;

COMMENT ON VIEW worker_status_summary IS 'Resumo do status de todos os workers ativos';

-- View 4: message_failure_insights
-- Análise de falhas de envio para troubleshooting
CREATE OR REPLACE VIEW message_failure_insights AS
SELECT
  COUNT(*) as total_failures,
  error_message,
  COUNT(DISTINCT instance_id) as affected_instances,
  MAX(sent_at) as last_failure_at
FROM public.message_logs
WHERE status = 'failed'
  AND sent_at > NOW() - INTERVAL '24 hours'
GROUP BY error_message
ORDER BY total_failures DESC;

COMMENT ON VIEW message_failure_insights IS 'Análise de falhas das últimas 24 horas para troubleshooting';

-- Verificar se as views foram criadas corretamente
SELECT
    viewname,
    definition
FROM pg_views
WHERE viewname IN ('dashboard_realtime_metrics', 'expired_locks', 'worker_status_summary', 'message_failure_insights')
  AND schemaname = 'public'
ORDER BY viewname;
```

**Validação:**
- Execute o comando SQL acima
- Verifique se não houve erros
- Valide que 4 views foram criadas
- Teste manualmente: `SELECT * FROM dashboard_realtime_metrics;`

**Resultado esperado:** 4 views criadas

---

### Migration 6: Índice de Rotação (20260313190700)

**Objetivo:** Adicionar campo rotation_index para round-robin

**Comando SQL:**
```sql
-- ========================================
-- MIGRAÇÃO: Índice de Rotação Round-Robin
-- Data: 13/03/2026
-- Propósito: Adicionar campo rotation_index para round-robin justo entre instâncias
-- ========================================

-- Adiciona campo de índice de rotação
ALTER TABLE public.whatsapp_instances
ADD COLUMN IF NOT EXISTS rotation_index INTEGER DEFAULT 0;

-- Índice composto para performance (status + rotation_index)
CREATE INDEX IF NOT EXISTS idx_whatsapp_instances_rotation
ON public.whatsapp_instances (status, rotation_index)
WHERE status = 'connected';

-- Comentários
COMMENT ON COLUMN public.whatsapp_instances.rotation_index IS 'Índice de rotação para round-robin justo (0, 1, 2...)';
COMMENT ON INDEX idx_whatsapp_instances_rotation IS 'Índice para seleção de instância conectada com menor rotation_index';

-- Validação
SELECT
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'whatsapp_instances'
  AND column_name = 'rotation_index'
ORDER BY table_name, column_name;
```

**Validação:**
- Execute o comando SQL acima
- Verifique se não houve erros
- Valide que a coluna rotation_index foi criada
- Valide que o índice idx_whatsapp_instances_rotation foi criado

**Resultado esperado:** 1 coluna criada, 1 índice criado

---

### Migration 7: Função Corrigida (20260313190800)

**Objetivo:** Substituir função claim_next_message para usar round-robin

**Comando SQL:**
```sql
-- ========================================
-- MIGRAÇÃO: Corrige claim_next_message para Round-Robin
-- Data: 13/03/2026
-- Propósito: Ajustar seleção de instância para round-robin justo
-- ========================================

-- Substitui a função claim_next_message com versão usando rotation_index
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
  -- 1. Seleciona instância conectada com menor rotation_index
  SELECT wi.id, wi.instance_name
  INTO v_instance_id, v_instance_name
  FROM public.whatsapp_instances wi
  WHERE wi.status = 'connected'
  ORDER BY wi.rotation_index ASC NULLS FIRST
  FOR UPDATE OF wi SKIP LOCKED
  LIMIT 1;

  -- Se não houver instância conectada, retorna vazio
  IF v_instance_id IS NULL THEN
    RETURN;
  END IF;

  -- 2. Seleciona próxima mensagem e trava atômicamente
  RETURN QUERY
  WITH next_msg AS (
    SELECT pq.id
    FROM public.patients_queue pq
    WHERE pq.status = 'queued'
      AND pq.is_approved = true
      AND pq.send_after <= NOW()
      AND pq.locked_by IS NULL
      AND pq.attempt_count < p_max_attempts
    ORDER BY pq.queue_order ASC NULLS LAST, pq.send_after ASC
    FOR UPDATE SKIP LOCKED
    LIMIT 1
  )
  UPDATE public.patients_queue
  SET
    status = 'sending',
    locked_by = p_worker_id,
    locked_at = NOW(),
    attempt_count = attempt_count + 1,
    updated_at = NOW()
  FROM next_msg
  WHERE public.patients_queue.id = next_msg.id
  RETURNING
    public.patients_queue.id,
    public.patients_queue.patient_name,
    public.patients_queue.phone_number,
    public.patients_queue.message_body,
    v_instance_id,
    v_instance_name,
    public.patients_queue.attempt_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION claim_next_message IS 'Claima a próxima mensagem elegível e trava atômicamente usando round-robin para seleção de instância';

-- Verificar se a função foi atualizada
SELECT
    p.proname as function_name,
    pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'claim_next_message';

-- Testar função (retorna vazio se não houver mensagens)
SELECT * FROM claim_next_message('test-worker', 3);
```

**Validação:**
- Execute o comando SQL acima
- Verifique se não houve erros
- Valide que a função foi atualizada
- Valide que a função agora usa ORDER BY wi.rotation_index ASC
- Teste manual: `SELECT * FROM claim_next_message('test-worker', 3);`

**Resultado esperado:** Função atualizada

---

## ✅ VALIDAÇÃO FINAL

Após executar todas as 7 migrations, execute esta validação:

```sql
-- 1. Verificar todas as tabelas
SELECT
    table_name,
    CASE
        WHEN table_name IN ('patients_queue', 'whatsapp_instances') THEN 'existing'
        ELSE 'new'
    END as table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'patients_queue', 'whatsapp_instances',
    'message_logs', 'worker_heartbeats', 'patient_consent', 'message_blocks'
  )
ORDER BY table_type, table_name;

-- 2. Verificar todos os índices
SELECT
    tablename,
    indexname,
    CASE indexname
        WHEN 'idx_patients_queue_claim' THEN '✓ performance'
        WHEN 'idx_patients_queue_locks' THEN '✓ locks'
        WHEN 'idx_worker_heartbeats_last_heartbeat' THEN '✓ monitoring'
        WHEN 'idx_message_logs_message_id' THEN '✓ audit'
        WHEN 'idx_message_blocks_lookup' THEN '✓ opt-out'
        WHEN 'idx_patient_consent_patient_id' THEN '✓ lgpd'
        WHEN 'idx_whatsapp_instances_rotation' THEN '✓ round-robin'
        ELSE '?'
    END as purpose
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- 3. Verificar todas as funções
SELECT
    routine_name,
    routine_type,
    CASE routine_name
        WHEN 'claim_next_message' THEN '✓ core automation'
        WHEN 'release_expired_locks' THEN '✓ recovery'
        ELSE '?'
    END as purpose
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('claim_next_message', 'release_expired_locks')
ORDER BY routine_name;

-- 4. Verificar todas as views
SELECT
    viewname,
    CASE viewname
        WHEN 'dashboard_realtime_metrics' THEN '✓ dashboard'
        WHEN 'expired_locks' THEN '✓ diagnostics'
        WHEN 'worker_status_summary' THEN '✓ monitoring'
        WHEN 'message_failure_insights' THEN '✓ troubleshooting'
        ELSE '?'
    END as purpose
FROM pg_views
WHERE schemaname = 'public'
  AND viewname IN (
    'dashboard_realtime_metrics', 'expired_locks',
    'worker_status_summary', 'message_message_insights'
  )
ORDER BY viewname;
```

**Resultado esperado da validação final:**
- 6 tabelas listadas (2 existing, 4 new)
- 7 índices listados
- 2 funções listadas
- 4 views listadas

---

## 🔄 ROLLBACK (SE PRECISAR DESFAZER)

Se precisar desfazer as migrations, execute na **ORDEM INVERSA**:

```sql
-- 1. Reverter fix_claim (90800)
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
  SELECT wi.id, wi.instance_name
  INTO v_instance_id, v_instance_name
  FROM public.whatsapp_instances wi
  WHERE wi.status = 'connected'
  ORDER BY
    wi.messages_sent_count ASC,
    wi.last_message_at ASC NULLS FIRST
  FOR UPDATE OF wi SKIP LOCKED
  LIMIT 1;

  IF v_instance_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH next_msg AS (
    SELECT pq.id
    FROM public.patients_queue pq
    WHERE pq.status = 'queued'
      AND pq.is_approved = true
      AND pq.send_after <= NOW()
      AND pq.locked_by IS NULL
      AND pq.attempt_count < p_max_attempts
    ORDER BY pq.queue_order ASC NULLS LAST, pq.send_after ASC
    FOR UPDATE SKIP LOCKED
    LIMIT 1
  )
  UPDATE public.patients_queue
  SET
    status = 'sending',
    locked_by = p_worker_id,
    locked_at = NOW(),
    attempt_count = attempt_count + 1,
    updated_at = NOW()
  FROM next_msg
  WHERE public.patients_queue.id = next_msg.id
  RETURNING
    public.patients_queue.id,
    public.patients_queue.patient_name,
    public.patients_queue.phone_number,
    public.patients_queue.message_body,
    v_instance_id,
    v_instance_name,
    public.patients_queue.attempt_count;
END;
$$ LANGUAGE plpgsql;

-- 2. Reverter rotation_index (90700)
DROP INDEX IF EXISTS idx_whatsapp_instances_rotation;
ALTER TABLE public.whatsapp_instances DROP COLUMN IF EXISTS rotation_index;

-- 3. Reverter views (90400)
DROP VIEW IF EXISTS message_failure_insights;
DROP VIEW IF EXISTS worker_status_summary;
DROP VIEW IF EXISTS expired_locks;
DROP VIEW IF EXISTS dashboard_realtime_metrics;

-- 4. Reverter functions (90300)
DROP FUNCTION IF EXISTS release_expired_locks(INT);
DROP FUNCTION IF EXISTS claim_next_message(TEXT, INT);

-- 5. Reverter indexes (90200)
DROP INDEX IF EXISTS idx_patient_consent_patient_id;
DROP INDEX IF EXISTS idx_message_blocks_lookup;
DROP INDEX IF EXISTS idx_message_logs_message_id;
DROP INDEX IF EXISTS idx_worker_heartbeats_last_heartbeat;
DROP INDEX IF EXISTS idx_patients_queue_locks;
DROP INDEX IF EXISTS idx_patients_queue_claim;

-- 6. Reverter new_tables (90100)
DROP POLICY IF EXISTS "Allow authenticated operations on message_logs" ON public.message_logs;
DROP POLICY IF EXISTS "Allow authenticated operations on worker_heartbeats" ON public.worker_heartbeats;
DROP POLICY IF EXISTS "Allow authenticated operations on patient_consent" ON public.patient_consent;
DROP POLICY IF EXISTS "Allow authenticated operations on message_blocks" ON public.message_blocks;
DROP TABLE IF EXISTS message_blocks CASCADE;
DROP TABLE IF EXISTS patient_consent CASCADE;
DROP TABLE IF EXISTS worker_heartbeats CASCADE;
DROP TABLE IF EXISTS message_logs CASCADE;

-- 7. Reverter core_fields (90000)
ALTER TABLE whatsapp_instances DROP COLUMN IF EXISTS messages_sent_count;
ALTER TABLE whatsapp_instances DROP COLUMN IF EXISTS last_message_at;
ALTER TABLE patients_queue DROP COLUMN IF EXISTS attempt_count;
ALTER TABLE patients_queue DROP COLUMN IF EXISTS locked_at;
ALTER TABLE patients_queue DROP COLUMN IF EXISTS locked_by;
```

---

## 📝 RESUMO

**Total de migrations:** 7
**Tempo estimado:** 10-15 minutos
**Risco:** Baixo (migrations usam IF NOT EXISTS e CREATE OR REPLACE)

**Se tudo der certo:**
- O worker da automação terá banco completo para operar
- As migrations 1-7 estarão aplicadas
- O sistema estará pronto para testar dry run e depois envio real

**Se algo der errado:**
- Use o script de rollback acima na ordem inversa
- Cada migration pode ser revertida individualmente se necessário

---

## 🚀 PRÓXIMO PASSO

Após validar que todas as migrations foram aplicadas com sucesso:

1. Execute o diagnóstico: `bun run automation/src/index.ts --diag`
2. Insira mensagens de teste (veja `docs/dry_run_test_messages.sql`)
3. Execute o worker em dry run: `bun run automation/src/index.ts`
4. Valide round-robin e lógica do worker
5. Depois de validar, forneça seu número real para teste real

---

**Guia completo!** Agora você pode aplicar as migrations no Supabase seguindo este passo a passo.
