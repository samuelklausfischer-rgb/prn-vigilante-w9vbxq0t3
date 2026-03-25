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
