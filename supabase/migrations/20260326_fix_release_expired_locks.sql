-- ========================================
-- MIGRATION: Corrigir requeue indevido de mensagens aceitas
-- Data: 26/03/2026
-- Propósito: Impedir que mensagens já aceitas pelo provider sejam reenfileiradas
-- ========================================

BEGIN;

-- Verificar se a migration já foi aplicada
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables pt
    JOIN pg_attribute pa ON pa.attrelid = pt.oid
    JOIN pg_namespace pn ON pn.oid = pt.relnamespace
    WHERE pn.nspname = 'public'
      AND pt.relname = 'patients_queue'
      AND pa.attname = 'accepted_at'
  ) THEN
    RAISE NOTICE 'Coluna accepted_at já existe. Migration ignorada.';
    RETURN;
  END IF;
END $$;

-- Atualizar a função release_expired_locks para NÃO requeue se já foi aceita
CREATE OR REPLACE FUNCTION public.release_expired_locks(
  p_lock_timeout_minutes integer DEFAULT 5
)
RETURNS TABLE (
  released_id uuid,
  was_failed boolean
) AS $$
BEGIN
  RETURN QUERY
  WITH expired AS (
    SELECT pq.id, pq.attempt_count, pq.accepted_at, pq.locked_by, pq.locked_at
    FROM public.patients_queue pq
    WHERE pq.locked_by IS NOT NULL
      AND pq.status = 'sending'
      AND pq.locked_at < NOW() - (p_lock_timeout_minutes || ' minutes')::INTERVAL
    FOR UPDATE OF pq SKIP LOCKED
  )
  UPDATE public.patients_queue
  SET
    status = CASE
      WHEN expired.attempt_count >= 2 THEN 'failed'::queue_status
      WHEN expired.accepted_at IS NOT NULL THEN 'sending'::queue_status
      ELSE 'queued'::queue_status
    END,
    locked_by = NULL,
    locked_at = NULL,
    updated_at = NOW()
  FROM expired
  WHERE public.patients_queue.id = expired.id
    -- Só requeue/fail se ainda não foi aceita
    AND expired.accepted_at IS NULL
  RETURNING
    public.patients_queue.id,
    CASE WHEN expired.attempt_count >= 2 THEN true ELSE false END as was_failed;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.release_expired_locks IS 'Libera locks expirados, mas NÃO requeue mensagens já aceitas (accepted_at IS NOT NULL)';

COMMIT;
