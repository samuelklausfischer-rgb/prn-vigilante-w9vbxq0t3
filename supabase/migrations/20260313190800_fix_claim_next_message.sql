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
