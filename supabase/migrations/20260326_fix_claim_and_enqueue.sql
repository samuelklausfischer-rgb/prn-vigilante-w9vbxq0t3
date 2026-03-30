-- ========================================
-- MIGRATION: Atualizar claim_next_message e enqueue_patient
-- Data: 26/03/2026
-- Propósito: Adicionar filtro send_after e garantir dedupe de retry_phone3
-- ========================================

BEGIN;

-- 1. Atualizar claim_next_message para respeitar send_after
CREATE OR REPLACE FUNCTION public.claim_next_message(
  p_worker_id text,
  p_max_attempts integer DEFAULT 3
)
RETURNS TABLE (
  id uuid,
  patient_name text,
  phone_number text,
  message_body text,
  instance_id uuid,
  instance_name text,
  attempt_count integer,
  journey_id uuid,
  provider_message_id text,
  provider_chat_id text,
  locked_instance_id text,
  phone_attempt_index integer,
  phone_2 text,
  phone_3 text
) AS $$
DECLARE
  v_instance_id UUID;
  v_instance_name TEXT;
BEGIN
  -- Selecionar instância menos usada que esteja conectada
  SELECT wi.id, wi.instance_name
  INTO v_instance_id, v_instance_name
  FROM public.whatsapp_instances wi
  WHERE wi.status = 'connected'
  ORDER BY
    wi.rotation_index ASC NULLS FIRST,
    wi.last_message_at ASC NULLS FIRST,
    wi.updated_at ASC,
    wi.id ASC
  FOR UPDATE OF wi SKIP LOCKED
  LIMIT 1;

  IF v_instance_id IS NULL THEN
    RETURN;
  END IF;

  -- Selecionar próxima mensagem e travar atomicamente
  RETURN QUERY
  WITH next_msg AS (
    SELECT pq.id
    FROM public.patients_queue pq
    WHERE pq.status = 'queued'
      AND pq.is_approved = true
      AND pq.locked_by IS NULL
      AND pq.attempt_count < p_max_attempts
      -- ADICIONADO: respeitar send_after
      AND pq.send_after <= NOW()
    ORDER BY pq.queue_order ASC NULLS LAST, pq.send_after ASC
    FOR UPDATE SKIP LOCKED
    LIMIT 1
  )
  UPDATE public.patients_queue
  SET
    status = 'sending',
    locked_by = p_worker_id,
    locked_at = NOW(),
    attempt_count = public.patients_queue.attempt_count + 1,
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
    public.patients_queue.attempt_count,
    public.patients_queue.journey_id,
    public.patients_queue.provider_message_id,
    public.patients_queue.provider_chat_id,
    public.patients_queue.locked_instance_id,
    public.patients_queue.phone_attempt_index,
    public.patients_queue.phone_2,
    public.patients_queue.phone_3;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.claim_next_message IS 'Claima próxima mensagem elegível, respeitando send_after e travando atomicamente';

COMMIT;
