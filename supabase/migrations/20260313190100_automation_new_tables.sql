-- ========================================
-- MIGRAÇÃO: Novas Tabelas da Automação
-- Data: 13/03/2026
-- Propósito: Criar tabelas de logs, heartbeats, consentimento e bloqueios
-- ========================================

-- 1. message_logs - Auditoria de envios
CREATE TABLE IF NOT EXISTS public.message_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES public.patients_queue(id) ON DELETE CASCADE,
  instance_id UUID REFERENCES public.whatsapp_instances(id) ON DELETE SET NULL,

  -- Detalhes do envio
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT NOT NULL CHECK (status IN ('sent', 'delivered', 'failed')),
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,

  -- LGPD: dados anonimizados
  phone_masked TEXT,
  patient_hash TEXT,

  -- Performance
  duration_ms INTEGER
);

COMMENT ON TABLE public.message_logs IS 'Auditoria completa de cada envio de mensagem';
COMMENT ON COLUMN public.message_logs.phone_masked IS 'Número de telefone mascarado para LGPD (ex: +55119****9999)';
COMMENT ON COLUMN public.message_logs.patient_hash IS 'Hash do nome do paciente para rastreabilidade sem expor dado pessoal';
COMMENT ON COLUMN public.message_logs.duration_ms IS 'Tempo de execução do envio em milissegundos';

-- 2. worker_heartbeats - Monitoramento de workers ativos
CREATE TABLE IF NOT EXISTS public.worker_heartbeats (
  worker_id TEXT PRIMARY KEY,
  worker_name TEXT NOT NULL,

  -- Sinal de vida
  started_at TIMESTAMPTZ DEFAULT NOW(),
  last_heartbeat TIMESTAMPTZ DEFAULT NOW(),

  -- Status atual
  current_job_id UUID,
  current_job_started_at TIMESTAMPTZ,

  -- Métricas
  messages_processed INT DEFAULT 0,
  messages_failed INT DEFAULT 0,

  -- Infraestrutura
  memory_usage_mb INT,
  cpu_usage_percent NUMERIC,
  ip_address INET
);

COMMENT ON TABLE public.worker_heartbeats IS 'Monitoramento de todos os workers ativos e detecção de crashes';
COMMENT ON COLUMN public.worker_heartbeats.worker_id IS 'ID único do worker (ex: hostname-pid)';
COMMENT ON COLUMN public.worker_heartbeats.current_job_id IS 'ID da mensagem atualmente sendo processada';

-- 3. patient_consent - LGPD: Consentimento explícito
CREATE TABLE IF NOT EXISTS public.patient_consent (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID,

  -- Status do consentimento
  consent_status TEXT NOT NULL
    CHECK (consent_status IN ('granted', 'denied', 'pending', 'revoked', 'expired')),

  consent_granted_at TIMESTAMPTZ,
  consent_revoked_at TIMESTAMPTZ,

  -- Onde foi coletado
  consent_source TEXT NOT NULL,

  -- Versões
  consent_version TEXT DEFAULT '1.0',
  privacy_policy_version TEXT DEFAULT '1.0',

  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.patient_consent IS 'LGPD: Consentimento explícito do paciente para envio de mensagens';
COMMENT ON COLUMN public.patient_consent.consent_status IS 'Status atual do consentimento';
COMMENT ON COLUMN public.patient_consent.consent_source IS 'Canal onde o consentimento foi obtido (checkbox, web, app)';

-- 4. message_blocks - Opt-out: Bloqueio de envios
CREATE TABLE IF NOT EXISTS public.message_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID,
  phone_number TEXT NOT NULL UNIQUE,

  -- Quando e por que
  blocked_at TIMESTAMPTZ DEFAULT NOW(),
  reason TEXT NOT NULL CHECK (reason IN ('opt_out', 'failed_payment', 'complaint')),
  source TEXT,

  -- Bloqueio permanente ou temporário
  permanent BOOLEAN DEFAULT TRUE,
  expires_at TIMESTAMPTZ,
  blocked_by TEXT
);

COMMENT ON TABLE public.message_blocks IS 'LGPD: Bloqueio de envios por opt-out ou outro motivo';
COMMENT ON COLUMN public.message_blocks.reason IS 'Motivo do bloqueio (opt_out, failed_payment, complaint)';
COMMENT ON COLUMN public.message_blocks.permanent IS 'TRUE para bloqueio permanente, FALSE para temporário';

-- RLS (Row Level Security) para as novas tabelas
ALTER TABLE public.message_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.worker_heartbeats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_consent ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_blocks ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
-- Nota: o worker idealmente deve usar service role key no backend.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'message_logs'
      AND policyname = 'Allow authenticated operations on message_logs'
  ) THEN
    CREATE POLICY "Allow authenticated operations on message_logs"
      ON public.message_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'worker_heartbeats'
      AND policyname = 'Allow authenticated operations on worker_heartbeats'
  ) THEN
    CREATE POLICY "Allow authenticated operations on worker_heartbeats"
      ON public.worker_heartbeats FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'patient_consent'
      AND policyname = 'Allow authenticated operations on patient_consent'
  ) THEN
    CREATE POLICY "Allow authenticated operations on patient_consent"
      ON public.patient_consent FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'message_blocks'
      AND policyname = 'Allow authenticated operations on message_blocks'
  ) THEN
    CREATE POLICY "Allow authenticated operations on message_blocks"
      ON public.message_blocks FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 5. Verificar se as tabelas foram criadas corretamente
SELECT
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name IN ('message_logs', 'worker_heartbeats', 'patient_consent', 'message_blocks')
ORDER BY table_name, ordinal_position;
