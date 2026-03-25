-- ========================================
-- MIGRACAO: Add processed flag to message_qualifications
-- Data: 19/03/2026
-- Proposito: Adicionar campo processed para evitar reprocessamento de classificacoes
-- ========================================

ALTER TABLE public.message_qualifications
  ADD COLUMN IF NOT EXISTS processed BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.message_qualifications.processed IS 'Indica se a classificacao ja foi processada pela edge function de auto-execucao';

CREATE INDEX IF NOT EXISTS idx_message_qualifications_processed
  ON public.message_qualifications(processed)
  WHERE processed = false;

-- Verificacao
SELECT
  'message_qualifications.processed' as field_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'message_qualifications'
  AND column_name = 'processed';
