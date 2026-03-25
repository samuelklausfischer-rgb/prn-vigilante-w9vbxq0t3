-- ========================================
-- MIGRAÇÃO: Função enqueue-patient RPC
-- Data: 18/03/2026
-- Propósito: Função RPC para enfileirar pacientes com deduplicação e rastreamento de origem
-- ========================================

CREATE OR REPLACE FUNCTION enqueue_patient(
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
  p_data_exame DATE DEFAULT NULL,
  p_horario_inicio TEXT DEFAULT NULL,
  p_procedimentos TEXT DEFAULT NULL
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
  -- 1. Normalizar telefone se não fornecido
  IF p_canonical_phone IS NULL THEN
    v_canonical_phone := REGEXP_REPLACE(p_phone_number, '[^0-9]', '', 'g');
    IF NOT v_canonical_phone LIKE '55%' AND LENGTH(v_canonical_phone) <= 11 THEN
      v_canonical_phone := '55' || v_canonical_phone;
    END IF;
  ELSE
    v_canonical_phone := p_canonical_phone;
  END IF;

  -- 2. Gerar hash de deduplicação se não fornecido e for mensagem original
  IF p_dedupe_hash IS NULL AND p_dedupe_kind = 'original' THEN
    v_dedupe_hash := MD5(
      v_canonical_phone || '|' ||
      COALESCE(p_data_exame::TEXT, '') || '|' ||
      COALESCE(p_horario_inicio, '') || '|' ||
      COALESCE(p_procedimentos, '')
    );
  ELSE
    v_dedupe_hash := p_dedupe_hash;
  END IF;

  -- 3. Verificar duplicata para mensagens originais
  IF p_dedupe_kind = 'original' THEN
    IF EXISTS (
      SELECT 1
      FROM public.patients_queue
      WHERE canonical_phone = v_canonical_phone
        AND data_exame = p_data_exame
        AND horario_inicio = p_horario_inicio
        AND COALESCE(procedimentos, '') = COALESCE(p_procedimentos, '')
        AND status IN ('queued', 'sending', 'delivered')
        AND dedupe_kind = 'original'
    ) THEN
      RETURN QUERY SELECT NULL::UUID, 'duplicate_original'::TEXT, 'Mensagem original duplicada'::TEXT;
      RETURN;
    END IF;
  END IF;

  -- 4. Verificar duplicata para segundas chamadas e follow-ups
  IF p_dedupe_kind IN ('retry_phone2', 'followup_confirm') AND p_origin_queue_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1
      FROM public.patients_queue
      WHERE origin_queue_id = p_origin_queue_id
        AND dedupe_kind = p_dedupe_kind
    ) THEN
      RETURN QUERY SELECT NULL::UUID, 'duplicate_recent'::TEXT, 'Segunda chamada duplicada'::TEXT;
      RETURN;
    END IF;
  END IF;

  -- 5. Verificar se há mensagem muito recente para o mesmo telefone (janela de 2 horas)
  IF EXISTS (
    SELECT 1
    FROM public.patients_queue
    WHERE canonical_phone = v_canonical_phone
      AND created_at > NOW() - INTERVAL '2 hours'
      AND status IN ('queued', 'sending', 'delivered')
  ) THEN
    RETURN QUERY SELECT NULL::UUID, 'duplicate_recent'::TEXT, 'Mensagem muito recente para o mesmo telefone'::TEXT;
    RETURN;
  END IF;

  -- 6. Inserir nova mensagem
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
    queue_order,
    created_at,
    updated_at
  ) VALUES (
    p_patient_name,
    p_phone_number,
    p_message_body,
    p_status,
    p_is_approved,
    p_send_after,
    p_notes,
    p_attempt_count,
    p_dedupe_kind,
    p_origin_queue_id,
    v_canonical_phone,
    v_dedupe_hash,
    p_data_exame,
    p_horario_inicio,
    p_procedimentos,
    COALESCE(
      (SELECT COALESCE(MAX(queue_order), 0) + 1 FROM public.patients_queue WHERE status = 'queued'),
      1
    ),
    NOW(),
    NOW()
  ) RETURNING id INTO v_new_id;

  -- 7. Retornar sucesso
  RETURN QUERY SELECT v_new_id, 'success'::TEXT, NULL::TEXT;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION enqueue_patient IS 'Enfileira paciente com deduplicação e rastreamento de origem. Retorna (id, status, error_message). Status pode ser: success, duplicate_original, duplicate_recent';
