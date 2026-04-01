-- ========================================
-- MIGRATION: Criar send_lists e vincular patients_queue
-- Data: 31/03/2026
-- Proposito: permitir agrupamento operacional das listas enviadas
-- ========================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.send_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  exam_date text,
  locked_instance_id text,
  status text NOT NULL DEFAULT 'queued',
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT send_lists_status_check CHECK (status IN ('draft', 'queued', 'in_progress', 'completed', 'cancelled'))
);

ALTER TABLE public.send_lists ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'send_lists'
      AND policyname = 'Allow all authenticated operations on send_lists'
  ) THEN
    CREATE POLICY "Allow all authenticated operations on send_lists"
      ON public.send_lists
      FOR ALL
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END
$$;

ALTER TABLE public.patients_queue
  ADD COLUMN IF NOT EXISTS send_list_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'patients_queue_send_list_id_fkey'
  ) THEN
    ALTER TABLE public.patients_queue
      ADD CONSTRAINT patients_queue_send_list_id_fkey
      FOREIGN KEY (send_list_id)
      REFERENCES public.send_lists(id)
      ON DELETE SET NULL;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_patients_queue_send_list_id
  ON public.patients_queue (send_list_id);

CREATE INDEX IF NOT EXISTS idx_send_lists_exam_date
  ON public.send_lists (exam_date);

CREATE INDEX IF NOT EXISTS idx_send_lists_locked_instance_id
  ON public.send_lists (locked_instance_id);

CREATE INDEX IF NOT EXISTS idx_send_lists_status
  ON public.send_lists (status);

COMMIT;
