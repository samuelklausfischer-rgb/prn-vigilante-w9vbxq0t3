-- ========================================
-- MIGRACAO: Afinidade de Instância + Escada de Telefones
-- Data: 23/03/2026
-- Proposito: Garantir que a mesma instância sempre fale com o mesmo número
--            e rastrear a escada de tentativas (Tel1 → Tel2 → Tel3)
-- ========================================

-- ========================================
-- 1. NOVOS CAMPOS EM patients_queue
-- ========================================

-- Instância que é "dona" deste número — follow-ups DEVEM usar a mesma
ALTER TABLE public.patients_queue
  ADD COLUMN IF NOT EXISTS locked_instance_id UUID REFERENCES public.whatsapp_instances(id) ON DELETE SET NULL;

-- Qual telefone da escada está sendo usado (1=principal, 2=phone_2, 3=phone_3)
ALTER TABLE public.patients_queue
  ADD COLUMN IF NOT EXISTS phone_attempt_index SMALLINT NOT NULL DEFAULT 1;

-- Quando o número foi verificado no WhatsApp (cache de 24h)
ALTER TABLE public.patients_queue
  ADD COLUMN IF NOT EXISTS whatsapp_checked_at TIMESTAMPTZ;

-- Resultado da verificação (true=tem WhatsApp, false=fixo/inválido)
ALTER TABLE public.patients_queue
  ADD COLUMN IF NOT EXISTS whatsapp_valid BOOLEAN;

COMMENT ON COLUMN public.patients_queue.locked_instance_id IS 'Instância vinculada a este número. Follow-ups para o MESMO número DEVEM sair por esta instância.';
COMMENT ON COLUMN public.patients_queue.phone_attempt_index IS 'Posição na escada de telefones: 1=principal, 2=phone_2, 3=phone_3';
COMMENT ON COLUMN public.patients_queue.whatsapp_checked_at IS 'Timestamp da última verificação proativa de WhatsApp para este número';
COMMENT ON COLUMN public.patients_queue.whatsapp_valid IS 'Resultado da verificação: true=número tem WhatsApp, false=fixo ou inválido';

-- Índices para queries de afinidade
CREATE INDEX IF NOT EXISTS idx_patients_queue_locked_instance_id
  ON public.patients_queue(locked_instance_id)
  WHERE locked_instance_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_patients_queue_phone_attempt_index
  ON public.patients_queue(phone_attempt_index);

CREATE INDEX IF NOT EXISTS idx_patients_queue_whatsapp_valid
  ON public.patients_queue(whatsapp_valid)
  WHERE whatsapp_valid = false;

-- ========================================
-- 2. NOVOS CAMPOS EM patient_journeys
-- ========================================

-- Notas automáticas da escada (legíveis para o frontend)
ALTER TABLE public.patient_journeys
  ADD COLUMN IF NOT EXISTS automation_notes TEXT;

-- Sinaliza que todos os números da escada foram esgotados
ALTER TABLE public.patient_journeys
  ADD COLUMN IF NOT EXISTS phone_ladder_exhausted BOOLEAN NOT NULL DEFAULT false;

-- Instância atual vinculada à jornada
ALTER TABLE public.patient_journeys
  ADD COLUMN IF NOT EXISTS current_instance_id UUID REFERENCES public.whatsapp_instances(id) ON DELETE SET NULL;

-- Qual telefone está ativo na escada (1, 2 ou 3)
ALTER TABLE public.patient_journeys
  ADD COLUMN IF NOT EXISTS current_phone_index SMALLINT NOT NULL DEFAULT 1;

COMMENT ON COLUMN public.patient_journeys.automation_notes IS 'Histórico legível da escada de telefones. Ex: "Tel1: Fixo | Tel2: Timeout 60min | Tel3: Enviado"';
COMMENT ON COLUMN public.patient_journeys.phone_ladder_exhausted IS 'true quando todos os telefones (1, 2 e 3) falharam — paciente vai para aba Crítico';
COMMENT ON COLUMN public.patient_journeys.current_instance_id IS 'Instância vinculada ao telefone ativo atual';
COMMENT ON COLUMN public.patient_journeys.current_phone_index IS 'Telefone ativo na escada: 1=primary, 2=secondary, 3=tertiary';

-- Índice para filtrar pacientes com escada esgotada (aba Crítico)
CREATE INDEX IF NOT EXISTS idx_patient_journeys_phone_ladder_exhausted
  ON public.patient_journeys(phone_ladder_exhausted)
  WHERE phone_ladder_exhausted = true;

CREATE INDEX IF NOT EXISTS idx_patient_journeys_current_instance_id
  ON public.patient_journeys(current_instance_id)
  WHERE current_instance_id IS NOT NULL;

-- ========================================
-- 3. claim_next_message COM AFINIDADE
-- ========================================

CREATE OR REPLACE FUNCTION claim_next_message(
  p_worker_id TEXT,
  p_max_attempts INT DEFAULT 3
)
RETURNS TABLE (
  id UUID,
  patient_name TEXT,
  phone_number TEXT,
  message_body TEXT,
  instance_id UUID,
  instance_name TEXT,
  attempt_count INT,
  locked_instance_id UUID,
  phone_attempt_index SMALLINT
) AS $$
DECLARE
  v_msg RECORD;
  v_instance_id UUID;
  v_instance_name TEXT;
  v_locked_instance_id UUID;
BEGIN
  -- 1. Selecionar próxima mensagem elegível (sem travar ainda)
  SELECT pq.id, pq.locked_instance_id, pq.phone_attempt_index
  INTO v_msg
  FROM public.patients_queue pq
  WHERE pq.status = 'queued'
    AND pq.is_approved = true
    AND pq.send_after <= NOW()
    AND pq.locked_by IS NULL
    AND pq.attempt_count < p_max_attempts
  ORDER BY pq.queue_order ASC NULLS LAST, pq.send_after ASC
  FOR UPDATE SKIP LOCKED
  LIMIT 1;

  IF v_msg.id IS NULL THEN
    RETURN;
  END IF;

  -- 2. Resolver instância baseado na AFINIDADE
  IF v_msg.locked_instance_id IS NOT NULL THEN
    -- REGRA DE AFINIDADE: Mensagem já tem instância vinculada
    -- Verificar se essa instância está online
    SELECT wi.id, wi.instance_name
    INTO v_instance_id, v_instance_name
    FROM public.whatsapp_instances wi
    WHERE wi.id = v_msg.locked_instance_id
      AND wi.status = 'connected'
    FOR UPDATE OF wi SKIP LOCKED;

    IF v_instance_id IS NULL THEN
      -- Instância vinculada está OFFLINE — NÃO trocar!
      -- Devolver mensagem para a fila (não processar)
      RETURN;
    END IF;

    v_locked_instance_id := v_instance_id;
  ELSE
    -- SEM VÍNCULO: Round-robin normal (instância menos usada)
    SELECT wi.id, wi.instance_name
    INTO v_instance_id, v_instance_name
    FROM public.whatsapp_instances wi
    WHERE wi.status = 'connected'
    ORDER BY
      wi.messages_sent_count ASC,
      wi.last_message_at ASC NULLS FIRST
    FOR UPDATE OF wi SKIP LOCKED
    LIMIT 1;

    IF v_instance_id IS NULL THEN
      RETURN;
    END IF;

    v_locked_instance_id := v_instance_id;
  END IF;

  -- 3. Travar a mensagem atomicamente e gravar afinidade
  RETURN QUERY
  UPDATE public.patients_queue
  SET
    status = 'sending',
    locked_by = p_worker_id,
    locked_at = NOW(),
    attempt_count = patients_queue.attempt_count + 1,
    locked_instance_id = v_locked_instance_id,
    updated_at = NOW()
  WHERE patients_queue.id = v_msg.id
  RETURNING
    patients_queue.id,
    patients_queue.patient_name,
    patients_queue.phone_number,
    patients_queue.message_body,
    v_instance_id,
    v_instance_name,
    patients_queue.attempt_count,
    patients_queue.locked_instance_id,
    patients_queue.phone_attempt_index;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION claim_next_message IS 'Claima a próxima mensagem com AFINIDADE DE INSTÂNCIA: se a mensagem já tem instância vinculada, usa ela obrigatoriamente. Se não, round-robin e grava o vínculo.';

-- ========================================
-- 4. enqueue_patient COM locked_instance_id
-- ========================================

CREATE OR REPLACE FUNCTION public.enqueue_patient(
  p_patient_name TEXT,
  p_phone_number TEXT,
  p_message_body TEXT,
  p_status TEXT DEFAULT 'queued',
  p_is_approved BOOLEAN DEFAULT true,
  p_send_after TIMESTAMPTZ DEFAULT NOW(),
  p_notes TEXT DEFAULT NULL,
  p_attempt_count INT DEFAULT 0,
  p_dedupe_kind TEXT DEFAULT 'original',
  p_origin_queue_id UUID DEFAULT NULL,
  p_canonical_phone TEXT DEFAULT NULL,
  p_dedupe_hash TEXT DEFAULT NULL,
  p_data_exame TEXT DEFAULT NULL,
  p_horario_inicio TEXT DEFAULT NULL,
  p_procedimentos TEXT DEFAULT NULL,
  p_phone_2 TEXT DEFAULT NULL,
  p_phone_3 TEXT DEFAULT NULL,
  p_data_nascimento TEXT DEFAULT NULL,
  p_horario_final TEXT DEFAULT NULL,
  p_time_proce TEXT DEFAULT NULL,
  p_locked_instance_id UUID DEFAULT NULL,
  p_phone_attempt_index SMALLINT DEFAULT 1
)
RETURNS TABLE (
  id UUID,
  status TEXT,
  error_message TEXT
) AS $$
DECLARE
  v_canonical_phone TEXT;
  v_dedupe_hash TEXT;
  v_new_id UUID;
BEGIN
  IF p_canonical_phone IS NULL THEN
    v_canonical_phone := REGEXP_REPLACE(p_phone_number, '[^0-9]', '', 'g');
    IF NOT v_canonical_phone LIKE '55%' AND LENGTH(v_canonical_phone) <= 11 THEN
      v_canonical_phone := '55' || v_canonical_phone;
    END IF;
  ELSE
    v_canonical_phone := p_canonical_phone;
  END IF;

  IF p_dedupe_hash IS NULL AND p_dedupe_kind = 'original' THEN
    v_dedupe_hash := MD5(
      v_canonical_phone || '|' ||
      COALESCE(p_data_exame, '') || '|' ||
      COALESCE(p_horario_inicio, '') || '|' ||
      COALESCE(p_procedimentos, '')
    );
  ELSE
    v_dedupe_hash := p_dedupe_hash;
  END IF;

  IF p_dedupe_kind = 'original' THEN
    IF EXISTS (
      SELECT 1
      FROM public.patients_queue pq
      WHERE pq.canonical_phone = v_canonical_phone
        AND pq.data_exame = p_data_exame
        AND pq.horario_inicio = p_horario_inicio::time
        AND COALESCE(pq.procedimentos, '') = COALESCE(p_procedimentos, '')
        AND pq.status IN ('queued', 'sending', 'delivered')
        AND pq.dedupe_kind = 'original'
    ) THEN
      RETURN QUERY SELECT NULL::UUID, 'duplicate_original'::TEXT, 'Mensagem original duplicada'::TEXT;
      RETURN;
    END IF;
  END IF;

  IF p_dedupe_kind IN ('retry_phone2', 'retry_phone3', 'followup_confirm') AND p_origin_queue_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1
      FROM public.patients_queue pq
      WHERE pq.origin_queue_id = p_origin_queue_id
        AND pq.dedupe_kind = p_dedupe_kind
    ) THEN
      RETURN QUERY SELECT NULL::UUID, 'duplicate_recent'::TEXT, 'Segunda chamada duplicada'::TEXT;
      RETURN;
    END IF;
  END IF;

  IF p_dedupe_kind NOT IN ('retry_phone2', 'retry_phone3', 'followup_confirm') THEN
    IF EXISTS (
      SELECT 1
      FROM public.patients_queue pq
      WHERE pq.canonical_phone = v_canonical_phone
        AND pq.created_at > NOW() - INTERVAL '2 hours'
        AND pq.status IN ('queued', 'sending', 'delivered')
    ) THEN
      RETURN QUERY SELECT NULL::UUID, 'duplicate_recent'::TEXT, 'Mensagem muito recente para o mesmo telefone'::TEXT;
      RETURN;
    END IF;
  END IF;

  INSERT INTO public.patients_queue (
    patient_name,
    phone_number,
    message_body,
    status,
    is_approved,
    send_after,
    notes,
    attempt_count,
    dedupe_kind,
    origin_queue_id,
    canonical_phone,
    dedupe_hash,
    data_exame,
    horario_inicio,
    procedimentos,
    phone_2,
    phone_3,
    "Data_nascimento",
    horario_final,
    time_proce,
    locked_instance_id,
    phone_attempt_index,
    queue_order,
    created_at,
    updated_at
  ) VALUES (
    p_patient_name,
    p_phone_number,
    p_message_body,
    p_status::queue_status,
    p_is_approved,
    p_send_after,
    p_notes,
    p_attempt_count,
    p_dedupe_kind,
    p_origin_queue_id,
    v_canonical_phone,
    v_dedupe_hash,
    p_data_exame,
    p_horario_inicio::time,
    p_procedimentos,
    p_phone_2,
    p_phone_3,
    p_data_nascimento,
    CASE WHEN p_horario_final IS NULL OR p_horario_final = '' THEN NULL ELSE p_horario_final::time END,
    p_time_proce,
    p_locked_instance_id,
    p_phone_attempt_index,
    COALESCE(
      (SELECT COALESCE(MAX(pq.queue_order), 0) + 1 FROM public.patients_queue pq WHERE pq.status = 'queued'),
      1
    ),
    NOW(),
    NOW()
  ) RETURNING patients_queue.id INTO v_new_id;

  RETURN QUERY SELECT v_new_id, 'success'::TEXT, NULL::TEXT;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.enqueue_patient IS 'Enfileira paciente com deduplicação, afinidade de instância e rastreamento de escada de telefones. Parâmetros p_locked_instance_id e p_phone_attempt_index garantem continuidade de instância.';

-- ========================================
-- 5. VIEW ATUALIZADA: strategic_followup_overview
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
  pj.automation_notes,
  pj.phone_ladder_exhausted,
  pj.current_phone_index,
  pj.current_instance_id,
  (SELECT wi.instance_name FROM public.whatsapp_instances wi WHERE wi.id = pj.current_instance_id) AS current_instance_name,
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
  pj.phone_ladder_exhausted DESC,
  pj.data_exame ASC NULLS LAST,
  pj.horario_inicio ASC NULLS LAST;

COMMENT ON VIEW public.strategic_followup_overview IS 'Visao estrategica com afinidade de instância, notas de automação e status da escada de telefones';

-- ========================================
-- 6. VERIFICACAO
-- ========================================

SELECT
  'patients_queue' AS tabela,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'patients_queue'
  AND column_name IN ('locked_instance_id', 'phone_attempt_index', 'whatsapp_checked_at', 'whatsapp_valid')

UNION ALL

SELECT
  'patient_journeys' AS tabela,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'patient_journeys'
  AND column_name IN ('automation_notes', 'phone_ladder_exhausted', 'current_instance_id', 'current_phone_index')

ORDER BY tabela, column_name;
