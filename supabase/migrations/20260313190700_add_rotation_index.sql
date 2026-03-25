-- ========================================
-- MIGRAÇÃO: Índice de Rotação Round-Robin
-- Data: 13/03/2026
-- Propósito: Adicionar campo rotation_index para round-robin justo entre instâncias
-- ========================================

-- Adiciona campo de índice de rotação
ALTER TABLE public.whatsapp_instances
ADD COLUMN IF NOT EXISTS rotation_index INTEGER DEFAULT 0;

-- Índice composto para performance (status + rotation_index)
CREATE INDEX IF NOT EXISTS idx_whatsapp_instances_rotation
ON public.whatsapp_instances (status, rotation_index)
WHERE status = 'connected';

-- Comentários
COMMENT ON COLUMN public.whatsapp_instances.rotation_index IS 'Índice de rotação para round-robin justo (0, 1, 2...)';
COMMENT ON INDEX idx_whatsapp_instances_rotation IS 'Índice para seleção de instância conectada com menor rotation_index';

-- Validação
SELECT
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'whatsapp_instances'
  AND column_name = 'rotation_index'
ORDER BY table_name, column_name;
