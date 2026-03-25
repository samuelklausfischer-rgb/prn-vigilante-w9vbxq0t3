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
-- Evita usar NOW() em índice parcial, pois isso quebra a imutabilidade exigida pelo PostgreSQL
CREATE INDEX IF NOT EXISTS idx_message_blocks_lookup
ON public.message_blocks(phone_number, permanent, expires_at);

COMMENT ON INDEX idx_message_blocks_lookup IS 'Índice para opt-out: lookup rápido por telefone e expiração do bloqueio';

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
