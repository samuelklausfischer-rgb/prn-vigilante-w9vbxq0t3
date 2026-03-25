-- ========================================
-- MIGRACAO: Strategic Journey Tracking Schema
-- Data: 19/03/2026
-- Proposito: Schema base para rastreamento completo de jornada do paciente e lifecycle de mensagens
-- ========================================

-- ========================================
-- 1. ENUMS
-- ========================================

-- journey_status: Status da jornada do paciente
CREATE TYPE journey_status AS ENUM (
  'queued',
  'contacting',
  'delivered_waiting_reply',
  'followup_due',
  'followup_sent',
  'confirmed',
  'pending_manual',
  'cancelled',
  'archived'
);

-- message_direction: Direcao da mensagem
CREATE TYPE message_direction AS ENUM (
  'outbound',
  'inbound'
);

-- message_kind: Tipo de mensagem na jornada
CREATE TYPE message_kind AS ENUM (
  'original',
  'retry_phone2',
  'followup_confirm',
  'patient_reply'
);

-- message_status: Status da mensagem
CREATE TYPE message_status AS ENUM (
  'queued',
  'sending',
  'accepted',
  'delivered',
  'read',
  'replied',
  'failed',
  'cancelled'
);

-- processing_status: Status de processamento de eventos
CREATE TYPE processing_status AS ENUM (
  'pending',
  'processing',
  'processed',
  'failed',
  'ignored'
);

-- classification: Classificacao de resposta do paciente
CREATE TYPE classification AS ENUM (
  'confirmado_positivo',
  'quer_remarcar',
  'nao_pode_comparecer',
  'cancelado',
  'duvida',
  'ambigua',
  'sem_resposta_util'
);

-- recommended_action: Acao recomendada pela classificacao
CREATE TYPE recommended_action AS ENUM (
  'close_as_confirmed',
  'move_to_pending',
  'flag_vacancy',
  'manual_review',
  'ignore'
);

-- manual_priority: Prioridade de acao manual
CREATE TYPE manual_priority AS ENUM (
  'low',
  'medium',
  'high',
  'urgent'
);

-- event_source: Fonte do evento
CREATE TYPE event_source AS ENUM (
  'worker',
  'webhook',
  'polling',
  'ai',
  'manual'
);

-- ========================================
-- 2. patient_journeys: Jornada completa do paciente
-- ========================================

CREATE TABLE IF NOT EXISTS public.patient_journeys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Origem e identificacao
  origin_queue_id UUID REFERENCES public.patients_queue(id) ON DELETE SET NULL,
  patient_name TEXT NOT NULL,
  canonical_phone TEXT NOT NULL,
  primary_phone TEXT NOT NULL,
  secondary_phone TEXT,
  tertiary_phone TEXT,

  -- Dados do exame
  data_exame DATE,
  procedimentos TEXT,
  horario_inicio TIME,
  horario_final TIME,

  -- Status da jornada
  journey_status journey_status NOT NULL DEFAULT 'queued',

  -- Referencias
  last_message_id UUID,

  -- Timestamps de jornada
  last_event_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  pending_at TIMESTAMPTZ,

  -- Acao manual
  needs_manual_action BOOLEAN NOT NULL DEFAULT false,
  manual_priority manual_priority,
  manual_note TEXT,

  -- Auditoria
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.patient_journeys IS 'Jornada completa do paciente, rastreando todos os contatos, respostas e status ate confirmacao ou cancelacao';
COMMENT ON COLUMN public.patient_journeys.origin_queue_id IS 'ID da mensagem original na fila que iniciou esta jornada';
COMMENT ON COLUMN public.patient_journeys.canonical_phone IS 'Telefone normalizado para deduplicacao (ex: +5511999999999)';
COMMENT ON COLUMN public.patient_journeys.journey_status IS 'Status atual da jornada do paciente';
COMMENT ON COLUMN public.patient_journeys.needs_manual_action IS 'Indica se a jornada requer intervencao manual';

-- Indices para patient_journeys
CREATE INDEX idx_patient_journeys_canonical_phone
  ON public.patient_journeys(canonical_phone);

CREATE INDEX idx_patient_journeys_data_exame
  ON public.patient_journeys(data_exame)
  WHERE data_exame IS NOT NULL;

CREATE INDEX idx_patient_journeys_journey_status
  ON public.patient_journeys(journey_status);

CREATE INDEX idx_patient_journeys_last_event_at
  ON public.patient_journeys(last_event_at DESC)
  WHERE last_event_at IS NOT NULL;

CREATE INDEX idx_patient_journeys_needs_manual_action
  ON public.patient_journeys(needs_manual_action, manual_priority DESC)
  WHERE needs_manual_action = true;

-- Trigger para updated_at (criado depois da funcao)

-- RLS para patient_journeys
ALTER TABLE public.patient_journeys ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'patient_journeys'
      AND policyname = 'Allow authenticated operations on patient_journeys'
  ) THEN
    CREATE POLICY "Allow authenticated operations on patient_journeys"
      ON public.patient_journeys FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ========================================
-- 3. journey_messages: Lifecycle completo de mensagens na jornada
-- ========================================

CREATE TABLE IF NOT EXISTS public.journey_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relacionamento
  journey_id UUID NOT NULL REFERENCES public.patient_journeys(id) ON DELETE CASCADE,
  parent_message_id UUID REFERENCES public.journey_messages(id) ON DELETE SET NULL,
  queue_message_id UUID REFERENCES public.patients_queue(id) ON DELETE SET NULL,

  -- Classificacao da mensagem
  direction message_direction NOT NULL,
  message_kind message_kind NOT NULL DEFAULT 'original',

  -- Provider (WhatsApp)
  provider_name TEXT NOT NULL DEFAULT 'evolution',
  provider_message_id TEXT,
  provider_chat_id TEXT,
  instance_id UUID REFERENCES public.whatsapp_instances(id) ON DELETE SET NULL,
  phone_number TEXT NOT NULL,

  -- Conteudo
  message_body TEXT,

  -- Status da mensagem
  status message_status NOT NULL DEFAULT 'queued',

  -- Timestamps de status
  accepted_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  replied_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,

  -- Auditoria
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.journey_messages IS 'Lifecycle completo de todas as mensagens enviadas/recebidas na jornada do paciente';
COMMENT ON COLUMN public.journey_messages.parent_message_id IS 'ID da mensagem pai (para followups, respostas)';
COMMENT ON COLUMN public.journey_messages.direction IS 'outbound: enviada pelo hospital, inbound: resposta do paciente';
COMMENT ON COLUMN public.journey_messages.message_kind IS 'Tipo de mensagem: original, retry_phone2, followup_confirm, patient_reply';

-- Indices para journey_messages
CREATE INDEX idx_journey_messages_journey_id
  ON public.journey_messages(journey_id);

CREATE INDEX idx_journey_messages_provider_message_id
  ON public.journey_messages(provider_message_id)
  WHERE provider_message_id IS NOT NULL;

CREATE INDEX idx_journey_messages_provider_chat_id
  ON public.journey_messages(provider_chat_id)
  WHERE provider_chat_id IS NOT NULL;

CREATE INDEX idx_journey_messages_instance_id
  ON public.journey_messages(instance_id)
  WHERE instance_id IS NOT NULL;

CREATE INDEX idx_journey_messages_phone_number
  ON public.journey_messages(phone_number);

CREATE INDEX idx_journey_messages_status
  ON public.journey_messages(status);

CREATE INDEX idx_journey_messages_journey_id_status
  ON public.journey_messages(journey_id, status DESC);

-- Trigger para updated_at (criado depois da funcao)

-- RLS para journey_messages
ALTER TABLE public.journey_messages ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'journey_messages'
      AND policyname = 'Allow authenticated operations on journey_messages'
  ) THEN
    CREATE POLICY "Allow authenticated operations on journey_messages"
      ON public.journey_messages FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ========================================
-- 4. webhook_events_raw: Captura raw de eventos webhook
-- ========================================

CREATE TABLE IF NOT EXISTS public.webhook_events_raw (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identificacao do evento
  provider_name TEXT NOT NULL,
  provider_event_id TEXT,
  provider_message_id TEXT,

  -- Tipo do evento
  event_type TEXT NOT NULL,
  instance_external_id TEXT,

  -- Payload
  payload JSONB NOT NULL,
  headers JSONB,

  -- Timestamps
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,

  -- Processamento
  processing_status processing_status NOT NULL DEFAULT 'pending',
  processing_error TEXT,

  -- Deduplicacao
  dedupe_hash TEXT
);

COMMENT ON TABLE public.webhook_events_raw IS 'Captura raw de todos os eventos webhook recebidos dos providers (Evolution, etc)';
COMMENT ON COLUMN public.webhook_events_raw.dedupe_hash IS 'Hash para deduplicacao de eventos recebidos multiplas vezes';

-- Indices unicos para deduplicacao
CREATE UNIQUE INDEX idx_webhook_events_raw_dedupe_hash_unique
  ON public.webhook_events_raw(dedupe_hash)
  WHERE dedupe_hash IS NOT NULL;

CREATE UNIQUE INDEX idx_webhook_events_raw_provider_event_id_unique
  ON public.webhook_events_raw(provider_event_id, provider_name)
  WHERE provider_event_id IS NOT NULL;

-- Indices para queries
CREATE INDEX idx_webhook_events_raw_provider_message_id
  ON public.webhook_events_raw(provider_message_id)
  WHERE provider_message_id IS NOT NULL;

CREATE INDEX idx_webhook_events_raw_received_at
  ON public.webhook_events_raw(received_at DESC);

CREATE INDEX idx_webhook_events_raw_processing_status
  ON public.webhook_events_raw(processing_status);

CREATE INDEX idx_webhook_events_raw_event_type
  ON public.webhook_events_raw(event_type, received_at DESC);

-- RLS para webhook_events_raw
ALTER TABLE public.webhook_events_raw ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'webhook_events_raw'
      AND policyname = 'Allow authenticated operations on webhook_events_raw'
  ) THEN
    CREATE POLICY "Allow authenticated operations on webhook_events_raw"
      ON public.webhook_events_raw FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ========================================
-- 5. message_qualifications: Classificacao de respostas com LLM
-- ========================================

CREATE TABLE IF NOT EXISTS public.message_qualifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relacionamentos
  journey_id UUID NOT NULL REFERENCES public.patient_journeys(id) ON DELETE CASCADE,
  message_id UUID NOT NULL REFERENCES public.journey_messages(id) ON DELETE CASCADE,

  -- Classificacao
  classification classification NOT NULL,
  confidence NUMERIC(5,4) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  summary TEXT,

  -- Acao recomendada
  recommended_action recommended_action NOT NULL,
  vacancy_signal BOOLEAN NOT NULL DEFAULT false,
  vacancy_reason TEXT,

  -- Revisao manual
  needs_manual_review BOOLEAN NOT NULL DEFAULT false,

  -- Metadata do modelo
  model_name TEXT,
  raw_output JSONB,

  -- Auditoria
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.message_qualifications IS 'Classificacao de respostas de pacientes usando LLM para determinar confirmacao, cancelamento, duvidas, etc';
COMMENT ON COLUMN public.message_qualifications.vacancy_signal IS 'Indica se a resposta sugere que o paciente nao comparecera, criando vaga';
COMMENT ON COLUMN public.message_qualifications.confidence IS 'Nivel de confianca do modelo (0.0000 a 1.0000)';

-- Indices para message_qualifications
CREATE INDEX idx_message_qualifications_journey_id
  ON public.message_qualifications(journey_id);

CREATE INDEX idx_message_qualifications_message_id
  ON public.message_qualifications(message_id);

CREATE INDEX idx_message_qualifications_classification
  ON public.message_qualifications(classification);

CREATE INDEX idx_message_qualifications_vacancy_signal
  ON public.message_qualifications(vacancy_signal)
  WHERE vacancy_signal = true;

CREATE INDEX idx_message_qualifications_needs_manual_review
  ON public.message_qualifications(needs_manual_review)
  WHERE needs_manual_review = true;

CREATE INDEX idx_message_qualifications_created_at
  ON public.message_qualifications(created_at DESC);

-- RLS para message_qualifications
ALTER TABLE public.message_qualifications ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'message_qualifications'
      AND policyname = 'Allow authenticated operations on message_qualifications'
  ) THEN
    CREATE POLICY "Allow authenticated operations on message_qualifications"
      ON public.message_qualifications FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ========================================
-- 6. journey_events: Timeline de eventos da jornada
-- ========================================

CREATE TABLE IF NOT EXISTS public.journey_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relacionamentos
  journey_id UUID NOT NULL REFERENCES public.patient_journeys(id) ON DELETE CASCADE,
  message_id UUID REFERENCES public.journey_messages(id) ON DELETE SET NULL,

  -- Evento
  event_type TEXT NOT NULL,
  event_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source event_source NOT NULL,

  -- Payload adicional
  payload JSONB
);

COMMENT ON TABLE public.journey_events IS 'Timeline unificada de todos os eventos da jornada (mudancas de status, decisoes, acoes manuais, etc)';
COMMENT ON COLUMN public.journey_events.source IS 'Fonte do evento: worker, webhook, polling, ai, manual';

-- Indices para journey_events
CREATE INDEX idx_journey_events_journey_id
  ON public.journey_events(journey_id);

CREATE INDEX idx_journey_events_message_id
  ON public.journey_events(message_id)
  WHERE message_id IS NOT NULL;

CREATE INDEX idx_journey_events_event_at
  ON public.journey_events(event_at DESC);

CREATE INDEX idx_journey_events_event_type
  ON public.journey_events(event_type);

CREATE INDEX idx_journey_events_source
  ON public.journey_events(source);

CREATE INDEX idx_journey_events_journey_id_event_at
  ON public.journey_events(journey_id, event_at DESC);

-- RLS para journey_events
ALTER TABLE public.journey_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'journey_events'
      AND policyname = 'Allow authenticated operations on journey_events'
  ) THEN
    CREATE POLICY "Allow authenticated operations on journey_events"
      ON public.journey_events FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ========================================
-- 7. ALTER TABLE patients_queue: Campos aditivos para rastreamento
-- ========================================

ALTER TABLE public.patients_queue
  ADD COLUMN IF NOT EXISTS journey_id UUID REFERENCES public.patient_journeys(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS provider_message_id TEXT,
  ADD COLUMN IF NOT EXISTS provider_chat_id TEXT,
  ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS followup_due_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS current_outcome TEXT;

COMMENT ON COLUMN public.patients_queue.journey_id IS 'ID da jornada de paciente associada (link para rastreamento completo)';
COMMENT ON COLUMN public.patients_queue.provider_message_id IS 'ID da mensagem no provider (Evolution)';
COMMENT ON COLUMN public.patients_queue.provider_chat_id IS 'ID do chat no provider (para monitorar conversas)';
COMMENT ON COLUMN public.patients_queue.followup_due_at IS 'Momento em que followup esta planejado';
COMMENT ON COLUMN public.patients_queue.resolved_at IS 'Momento em que a mensagem foi resolvida (confirmada, cancelada, etc)';
COMMENT ON COLUMN public.patients_queue.current_outcome IS 'Resultado atual da mensagem (confirmed, cancelled, pending, etc)';

-- Indices para novos campos em patients_queue
CREATE INDEX IF NOT EXISTS idx_patients_queue_journey_id
  ON public.patients_queue(journey_id)
  WHERE journey_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_patients_queue_provider_message_id
  ON public.patients_queue(provider_message_id)
  WHERE provider_message_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_patients_queue_followup_due_at
  ON public.patients_queue(followup_due_at)
  WHERE followup_due_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_patients_queue_resolved_at
  ON public.patients_queue(resolved_at)
  WHERE resolved_at IS NOT NULL;

-- ========================================
-- 8. VIEW: strategic_followup_overview
-- ========================================

CREATE OR REPLACE VIEW public.strategic_followup_overview AS
SELECT
  pj.id AS journey_id,
  pj.patient_name,
  pj.canonical_phone,
  pj.data_exame,
  pj.procedimentos,
  pj.horario_inicio,
  pj.horario_final,
  pj.journey_status,
  (SELECT jm.message_kind FROM public.journey_messages jm
   WHERE jm.journey_id = pj.id
   ORDER BY jm.created_at DESC
   LIMIT 1) AS last_message_kind,
  (SELECT jm.status FROM public.journey_messages jm
   WHERE jm.journey_id = pj.id
   ORDER BY jm.created_at DESC
   LIMIT 1) AS last_message_status,
  (SELECT je.event_type FROM public.journey_events je
   WHERE je.journey_id = pj.id
   ORDER BY je.event_at DESC
   LIMIT 1) AS last_event_type,
  pj.last_event_at,
  EXTRACT(EPOCH FROM (NOW() - pj.last_event_at)) / 60 AS minutes_since_last_touch,
  CASE
    WHEN pj.journey_status IN ('delivered_waiting_reply', 'followup_due') THEN true
    ELSE false
  END AS followup_due,
  CASE
    WHEN pj.journey_status = 'followup_sent' THEN true
    ELSE false
  END AS followup_sent,
  EXISTS (
    SELECT 1 FROM public.journey_messages jm
    WHERE jm.journey_id = pj.id
      AND jm.direction = 'inbound'
      AND jm.status = 'replied'
  ) AS has_reply,
  (SELECT mq.classification FROM public.message_qualifications mq
   WHERE mq.journey_id = pj.id
   ORDER BY mq.created_at DESC
   LIMIT 1) AS latest_classification,
  (SELECT mq.summary FROM public.message_qualifications mq
   WHERE mq.journey_id = pj.id
   ORDER BY mq.created_at DESC
   LIMIT 1) AS latest_summary,
  pj.needs_manual_action,
  (SELECT mq.vacancy_signal FROM public.message_qualifications mq
   WHERE mq.journey_id = pj.id
   ORDER BY mq.created_at DESC
   LIMIT 1) AS vacancy_signal,
  pj.manual_priority
FROM public.patient_journeys pj
ORDER BY
  CASE pj.manual_priority
    WHEN 'urgent' THEN 1
    WHEN 'high' THEN 2
    WHEN 'medium' THEN 3
    WHEN 'low' THEN 4
    ELSE 5
  END ASC,
  pj.data_exame ASC NULLS LAST,
  pj.horario_inicio ASC NULLS LAST;

COMMENT ON VIEW public.strategic_followup_overview IS 'Visao estrategica para dashboard de followup: mostra journeys ativos, followups pendentes e acoes manuais necessarias';

-- ========================================
-- 9. VIEW: vacancy_candidates_overview
-- ========================================

CREATE OR REPLACE VIEW public.vacancy_candidates_overview AS
SELECT
  pj.id AS journey_id,
  pj.patient_name,
  pj.data_exame,
  pj.horario_inicio,
  pj.horario_final,
  pj.procedimentos,
  (SELECT mq.vacancy_reason FROM public.message_qualifications mq
    WHERE mq.journey_id = pj.id AND mq.vacancy_signal = true
    ORDER BY mq.created_at DESC LIMIT 1) AS vacancy_reason,
  (SELECT mq.classification FROM public.message_qualifications mq
   WHERE mq.journey_id = pj.id
   ORDER BY mq.created_at DESC
   LIMIT 1) AS latest_classification,
  (SELECT jm.message_body FROM public.journey_messages jm
   WHERE jm.journey_id = pj.id
     AND jm.direction = 'inbound'
   ORDER BY jm.created_at DESC
   LIMIT 1) AS latest_patient_message,
  CASE
    WHEN pj.manual_priority = 'urgent' THEN 100
    WHEN pj.manual_priority = 'high' THEN 75
    WHEN pj.manual_priority = 'medium' THEN 50
    WHEN pj.manual_priority = 'low' THEN 25
    WHEN pj.data_exame < NOW() + INTERVAL '2 days' THEN 60
    WHEN pj.data_exame < NOW() + INTERVAL '7 days' THEN 40
    ELSE 20
  END AS priority_score,
  pj.needs_manual_action
FROM public.patient_journeys pj
WHERE EXISTS (
  SELECT 1 FROM public.message_qualifications mq
  WHERE mq.journey_id = pj.id
    AND mq.vacancy_signal = true
  ORDER BY mq.created_at DESC
  LIMIT 1
)
ORDER BY priority_score DESC, pj.data_exame ASC;

COMMENT ON VIEW public.vacancy_candidates_overview IS 'Candidatos a vagas: journeys onde pacientes indicaram que nao comparecerao, permitindo preenchimento com aguardantes';

-- ========================================
-- 10. VIEW: journey_timeline_view
-- ========================================

CREATE OR REPLACE VIEW public.journey_timeline_view AS
SELECT
  je.journey_id,
  je.event_at,
  je.event_type,
  je.source,
  jm.message_kind,
  jm.status AS message_status,
  mq.summary,
  SUBSTRING(
    COALESCE(jm.message_body, mq.summary, je.payload::text),
    1, 200
  ) AS raw_excerpt
FROM public.journey_events je
LEFT JOIN public.journey_messages jm ON je.message_id = jm.id
LEFT JOIN public.message_qualifications mq ON jm.id = mq.message_id
WHERE je.journey_id IS NOT NULL
UNION ALL
SELECT
  jm.journey_id,
  jm.created_at AS event_at,
  'message_created' AS event_type,
  'worker' AS source,
  jm.message_kind,
  jm.status AS message_status,
  NULL::text AS summary,
  SUBSTRING(jm.message_body, 1, 200) AS raw_excerpt
FROM public.journey_messages jm
ORDER BY journey_id, event_at DESC;

COMMENT ON VIEW public.journey_timeline_view IS 'Timeline unificada de todos os eventos da jornada, combinando journey_events, journey_messages e message_qualifications';

-- ========================================
-- 11. FUNCAO HELPER: set_timestamp_updated_at
-- ========================================

CREATE OR REPLACE FUNCTION public.set_timestamp_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 12. TRIGGERS para updated_at
-- ========================================

DROP TRIGGER IF EXISTS trigger_patient_journeys_updated_at ON public.patient_journeys;
CREATE TRIGGER trigger_patient_journeys_updated_at
  BEFORE UPDATE ON public.patient_journeys
  FOR EACH ROW EXECUTE FUNCTION public.set_timestamp_updated_at();

DROP TRIGGER IF EXISTS trigger_journey_messages_updated_at ON public.journey_messages;
CREATE TRIGGER trigger_journey_messages_updated_at
  BEFORE UPDATE ON public.journey_messages
  FOR EACH ROW EXECUTE FUNCTION public.set_timestamp_updated_at();

-- ========================================
-- 13. FUNCAO HELPER: normalize_phone_for_journey
-- ========================================

CREATE OR REPLACE FUNCTION public.normalize_phone_for_journey(raw_phone TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN REGEXP_REPLACE(
    REGEXP_REPLACE(raw_phone, '[^0-9]', '', 'g'),
    '^55(\d{2})',
    '+55\1'
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION public.normalize_phone_for_journey IS 'Normaliza telefone brasileiro para formato +55XX...';

-- ========================================
-- 14. VERIFICACAO FINAL
-- ========================================

-- Verificar criacao de tabelas
SELECT
  'TABLE' as object_type,
  table_name as object_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'patient_journeys',
    'journey_messages',
    'webhook_events_raw',
    'message_qualifications',
    'journey_events'
  )

UNION ALL

-- Verificar criacao de views
SELECT
  'VIEW' as object_type,
  viewname as object_name
FROM pg_views
WHERE schemaname = 'public'
  AND viewname IN (
    'strategic_followup_overview',
    'vacancy_candidates_overview',
    'journey_timeline_view'
  )

UNION ALL

-- Verificar criacao de tipos
SELECT
  'TYPE' as object_type,
  typname as object_name
FROM pg_type
WHERE typname IN (
  'journey_status',
  'message_direction',
  'message_kind',
  'message_status',
  'processing_status',
  'classification',
  'recommended_action',
  'manual_priority',
  'event_source'
)

ORDER BY object_type, object_name;
