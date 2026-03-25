-- ========================================
-- MIGRAÇÃO: Adicionar campos de horário
-- Data: 13/03/2026
-- Propósito: Adicionar horario_inicio, horario_final ao patients_queue
-- ========================================

-- 1. Adicionar horario_inicio (quando começa a sessão do paciente)
ALTER TABLE public.patients_queue
ADD COLUMN IF NOT EXISTS horario_inicio TIME WITHOUT TIME ZONE;

-- 2. Adicionar horario_final (quando termina a sessão)
ALTER TABLE public.patients_queue
ADD COLUMN IF NOT EXISTS horario_final TIME WITHOUT TIME ZONE;

-- 3. Adicionar comentários explicativos
COMMENT ON COLUMN public.patients_queue.time_proce IS 'Duração do procedimento em minutos (ex: 00:45:00 = 45 minutos)';
COMMENT ON COLUMN public.patients_queue.horario_inicio IS 'Horário de início da sessão do paciente (HH:MM)';
COMMENT ON COLUMN public.patients_queue.horario_final IS 'Horário de término da sessão do paciente (HH:MM)';

-- 4. Criar índices para buscas por horário
CREATE INDEX IF NOT EXISTS idx_patients_queue_horario_inicio 
ON patients_queue(horario_inicio) WHERE horario_inicio IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_patients_queue_horario_final 
ON patients_queue(horario_final) WHERE horario_final IS NOT NULL;

-- 5. Verificar se os campos foram criados corretamente
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'patients_queue' 
  AND column_name IN ('time_proce', 'horario_inicio', 'horario_final')
ORDER BY column_name;
