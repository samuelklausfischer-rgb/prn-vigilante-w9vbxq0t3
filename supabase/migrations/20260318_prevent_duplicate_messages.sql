-- ========================================
-- MIGRAÇÃO: Prevenir Mensagens Duplicadas
-- Data: 18/03/2026
-- Propósito: Adicionar colunas de dedupe e índices únicos parciais em patients_queue
-- ========================================

-- 1. Adicionar colunas para deduplicação
ALTER TABLE public.patients_queue
ADD COLUMN IF NOT EXISTS dedupe_kind TEXT,
ADD COLUMN IF NOT EXISTS canonical_phone TEXT,
ADD COLUMN IF NOT EXISTS origin_queue_id UUID REFERENCES public.patients_queue(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS dedupe_hash TEXT;

-- Comentários explicativos
COMMENT ON COLUMN public.patients_queue.dedupe_kind IS 'Tipo de mensagem: original, retry_phone1, retry_phone2, followup_confirm, followup_reminder';
COMMENT ON COLUMN public.patients_queue.canonical_phone IS 'Telefone normalizado para deduplicação (ex: +5511999999999)';
COMMENT ON COLUMN public.patients_queue.origin_queue_id IS 'ID da mensagem original quando esta é uma segunda chamada ou follow-up';
COMMENT ON COLUMN public.patients_queue.dedupe_hash IS 'Hash de deduplicação para evitar duplicatas idênticas';

-- 2. Índice único parcial para mensagens originais
-- Previne duplicatas baseadas em: (canonical_phone, data_exame, horario_inicio, procedimentos)
-- Apenas para mensagens ativas: status IN ('queued','sending','delivered') e dedupe_kind='original'
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_patients_queue_original_messages_unique
ON public.patients_queue (canonical_phone, data_exame, horario_inicio, COALESCE(procedimentos, ''))
WHERE status IN ('queued', 'sending', 'delivered')
  AND dedupe_kind = 'original';

COMMENT ON INDEX idx_patients_queue_original_messages_unique IS 'Previne mensagens duplicadas originais baseadas em telefone, data, horário e procedimentos';

-- 3. Índice único parcial para segundas chamadas e follow-ups
-- Previne múltiplas segundas chamadas ou follow-ups para a mesma mensagem original
-- Apenas para mensagens com origin_queue_id definido: origin_queue_id IS NOT NULL
-- E tipos específicos: dedupe_kind IN ('retry_phone2', 'followup_confirm')
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_patients_queue_second_calls_unique
ON public.patients_queue (origin_queue_id, dedupe_kind)
WHERE origin_queue_id IS NOT NULL
  AND dedupe_kind IN ('retry_phone2', 'followup_confirm');

COMMENT ON INDEX idx_patients_queue_second_calls_unique IS 'Previne múltiplas segundas chamadas ou follow-ups para a mesma mensagem original';

-- 4. Índice para busca rápida por canonical_phone
CREATE INDEX IF NOT EXISTS idx_patients_queue_canonical_phone
ON public.patients_queue(canonical_phone)
WHERE canonical_phone IS NOT NULL;

COMMENT ON INDEX idx_patients_queue_canonical_phone IS 'Busca rápida por telefone normalizado';

-- 5. Índice para busca rápida por origin_queue_id
CREATE INDEX IF NOT EXISTS idx_patients_queue_origin_queue_id
ON public.patients_queue(origin_queue_id)
WHERE origin_queue_id IS NOT NULL;

COMMENT ON INDEX idx_patients_queue_origin_queue_id IS 'Busca rápida por mensagem original';

-- 6. Índice para busca rápida por dedupe_hash
CREATE INDEX IF NOT EXISTS idx_patients_queue_dedupe_hash
ON public.patients_queue(dedupe_hash)
WHERE dedupe_hash IS NOT NULL;

COMMENT ON INDEX idx_patients_queue_dedupe_hash IS 'Busca rápida por hash de deduplicação';

-- 7. Verificar se as colunas e índices foram criados corretamente
SELECT
    'COLUMN' as object_type,
    column_name as object_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'patients_queue'
  AND column_name IN ('dedupe_kind', 'canonical_phone', 'origin_queue_id', 'dedupe_hash')

UNION ALL

SELECT
    'INDEX' as object_type,
    indexname as object_name,
    'INDEX' as data_type,
    CASE WHEN indisunique THEN 'YES' ELSE 'NO' END as is_nullable,
    indexdef as column_default
FROM pg_indexes
WHERE tablename = 'patients_queue'
  AND indexname IN (
    'idx_patients_queue_original_messages_unique',
    'idx_patients_queue_second_calls_unique',
    'idx_patients_queue_canonical_phone',
    'idx_patients_queue_origin_queue_id',
    'idx_patients_queue_dedupe_hash'
  )
ORDER BY object_type, object_name;
