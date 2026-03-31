-- ========================================
-- MIGRATION: Claim por instancia (lane paralela)
-- Data: 31/03/2026
-- Proposito: Permitir que cada instancia conectada processe sua propria fila
-- ========================================

BEGIN;

CREATE INDEX IF NOT EXISTS idx_patients_queue_instance_claim
  ON public.patients_queue (locked_instance_id, queue_order, send_after)
  WHERE status = 'queued'
    AND is_approved = true
    AND locked_by IS NULL;

CREATE OR REPLACE FUNCTION public.claim_next_message_for_instance(
  p_worker_id text,
  p_instance_id text,
  p_instance_name text,
  p_max_attempts integer DEFAULT 3
)
RETURNS TABLE (
  id uuid,
  patient_name text,
  phone_number text,
  message_body text,
  instance_id text,
  instance_name text,
  attempt_count integer,
  journey_id uuid,
  provider_message_id text,
  provider_chat_id text,
  locked_instance_id text,
  phone_attempt_index integer,
  phone_2 text,
  phone_3 text,
  whatsapp_valid boolean,
  whatsapp_checked_at timestamptz,
  whatsapp_validated_format text
) AS $$
BEGIN
  RETURN QUERY
  WITH next_msg AS (
    SELECT pq.id
    FROM public.patients_queue pq
    WHERE pq.status = 'queued'
      AND pq.is_approved = true
      AND pq.locked_by IS NULL
      AND pq.attempt_count < p_max_attempts
      AND pq.send_after <= NOW()
      AND (
        pq.locked_instance_id = p_instance_id
        OR pq.locked_instance_id IS NULL
      )
    ORDER BY
      CASE WHEN pq.locked_instance_id = p_instance_id THEN 0 ELSE 1 END,
      pq.queue_order ASC NULLS LAST,
      pq.send_after ASC,
      pq.created_at ASC
    FOR UPDATE SKIP LOCKED
    LIMIT 1
  )
  UPDATE public.patients_queue
  SET
    status = 'sending',
    locked_by = p_worker_id,
    locked_at = NOW(),
    attempt_count = public.patients_queue.attempt_count + 1,
    locked_instance_id = COALESCE(public.patients_queue.locked_instance_id, p_instance_id),
    updated_at = NOW()
  FROM next_msg
  WHERE public.patients_queue.id = next_msg.id
  RETURNING
    public.patients_queue.id,
    public.patients_queue.patient_name,
    public.patients_queue.phone_number,
    public.patients_queue.message_body,
    p_instance_id,
    p_instance_name,
    public.patients_queue.attempt_count,
    public.patients_queue.journey_id,
    public.patients_queue.provider_message_id,
    public.patients_queue.provider_chat_id,
    public.patients_queue.locked_instance_id,
    public.patients_queue.phone_attempt_index::integer,
    public.patients_queue.phone_2,
    public.patients_queue.phone_3,
    public.patients_queue.whatsapp_valid,
    public.patients_queue.whatsapp_checked_at,
    public.patients_queue.whatsapp_validated_format;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.claim_next_message_for_instance IS 'Claima a proxima mensagem elegivel para a instancia informada. Prioriza afinidade (locked_instance_id) e usa fallback para mensagens sem vinculo.';

COMMIT;
