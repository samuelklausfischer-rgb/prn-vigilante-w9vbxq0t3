-- ========================================
-- MIGRAÇÃO: Core Fields da Automação
-- Data: 13/03/2026
-- Propósito: Adicionar campos de controle de concorrência e métricas às tabelas existentes
-- ========================================

-- 1. Alterar patients_queue - Controle de concorrência e tentativas
ALTER TABLE public.patients_queue
ADD COLUMN IF NOT EXISTS locked_by TEXT,
ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS attempt_count INTEGER DEFAULT 0;

-- Comentários explicativos
COMMENT ON COLUMN public.patients_queue.locked_by IS 'ID do worker que travou esta mensagem (SKIP LOCKED)';
COMMENT ON COLUMN public.patients_queue.locked_at IS 'Timestamp quando a mensagem foi travada pelo worker';
COMMENT ON COLUMN public.patients_queue.attempt_count IS 'Número de tentativas de envio (máximo 3)';

-- 2. Alterar whatsapp_instances - Métricas de uso para rotação e delay
ALTER TABLE public.whatsapp_instances
ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS messages_sent_count INTEGER DEFAULT 0;

-- Comentários explicativos
COMMENT ON COLUMN public.whatsapp_instances.last_message_at IS 'Timestamp do último envio bem-sucedido nesta instância (para cadência)';
COMMENT ON COLUMN public.whatsapp_instances.messages_sent_count IS 'Total de mensagens enviadas por esta instância (para rotação round-robin)';

-- 3. Verificar se os campos foram criados corretamente
SELECT
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name IN ('patients_queue', 'whatsapp_instances')
  AND column_name IN ('locked_by', 'locked_at', 'attempt_count', 'last_message_at', 'messages_sent_count')
ORDER BY table_name, column_name;
