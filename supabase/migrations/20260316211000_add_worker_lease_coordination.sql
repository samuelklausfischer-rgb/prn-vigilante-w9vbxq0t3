-- ========================================
-- MIGRACAO: Coordenacao de lease do worker
-- Data: 16/03/2026
-- Proposito: Evitar multiplos workers ativos e limpar heartbeats obsoletos
-- ========================================

CREATE TABLE IF NOT EXISTS public.automation_runtime_control (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  active_worker_id TEXT,
  lease_expires_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.automation_runtime_control (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.automation_runtime_control ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'automation_runtime_control'
      AND policyname = 'Allow authenticated operations on automation_runtime_control'
  ) THEN
    CREATE POLICY "Allow authenticated operations on automation_runtime_control"
      ON public.automation_runtime_control FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.acquire_worker_lease(
  p_worker_id TEXT,
  p_lease_seconds INTEGER DEFAULT 90
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  v_updated INTEGER;
BEGIN
  UPDATE public.automation_runtime_control
  SET active_worker_id = p_worker_id,
      lease_expires_at = NOW() + make_interval(secs => GREATEST(p_lease_seconds, 30)),
      updated_at = NOW()
  WHERE id = 1
    AND (
      active_worker_id IS NULL
      OR active_worker_id = p_worker_id
      OR lease_expires_at IS NULL
      OR lease_expires_at < NOW()
    );

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated > 0;
END;
$$;

CREATE OR REPLACE FUNCTION public.release_worker_lease(
  p_worker_id TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  v_updated INTEGER;
BEGIN
  UPDATE public.automation_runtime_control
  SET active_worker_id = NULL,
      lease_expires_at = NULL,
      updated_at = NOW()
  WHERE id = 1
    AND active_worker_id = p_worker_id;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated > 0;
END;
$$;

CREATE OR REPLACE FUNCTION public.cleanup_stale_heartbeats(
  p_stale_after_minutes INTEGER DEFAULT 10
)
RETURNS TABLE (
  worker_id TEXT,
  current_job_id UUID
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  DELETE FROM public.worker_heartbeats wh
  WHERE wh.last_heartbeat < NOW() - make_interval(mins => GREATEST(p_stale_after_minutes, 1))
  RETURNING wh.worker_id, wh.current_job_id;
END;
$$;

COMMENT ON TABLE public.automation_runtime_control IS 'Coordena lease do worker ativo para evitar concorrencia acidental';
COMMENT ON FUNCTION public.acquire_worker_lease IS 'Adquire ou renova o lease do worker ativo';
COMMENT ON FUNCTION public.release_worker_lease IS 'Libera o lease do worker ativo';
COMMENT ON FUNCTION public.cleanup_stale_heartbeats IS 'Remove heartbeats obsoletos para reduzir sujeira operacional';
