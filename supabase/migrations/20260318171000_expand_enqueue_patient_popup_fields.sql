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
  p_time_proce TEXT DEFAULT NULL
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

  IF p_dedupe_kind IN ('retry_phone2', 'followup_confirm') AND p_origin_queue_id IS NOT NULL THEN
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
