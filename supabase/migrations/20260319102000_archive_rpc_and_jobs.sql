-- ========================================
-- MIGRACAO: RPCs de arquivamento e jobs
-- Data: 19/03/2026
-- Proposito: Permitir preview/arquivamento seguro por data_exame e agendamento de agregacao
-- ========================================

CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM cron.job
    WHERE jobname = 'update-analytics-procedures-prn'
  ) THEN
    PERFORM cron.schedule(
      'update-analytics-procedures-prn',
      '50 23 * * *',
      $$
      SELECT public.update_analytics_daily_procedures(CURRENT_DATE);
      SELECT public.update_analytics_daily_procedures((CURRENT_DATE - INTERVAL '1 day')::date);
      SELECT public.update_analytics_daily_procedures((CURRENT_DATE - INTERVAL '2 day')::date);
      $$
    );
  END IF;
EXCEPTION
  WHEN undefined_table THEN
    RAISE NOTICE 'pg_cron indisponivel neste ambiente; job nao foi agendado.';
END $$;

CREATE OR REPLACE FUNCTION public.preview_archive_by_data_exame(
  data_inicio DATE,
  data_fim DATE
)
RETURNS TABLE (
  total_to_archive INTEGER,
  blocked_sending INTEGER,
  status_breakdown JSONB,
  data_exame_range JSONB,
  message TEXT
) AS $$
DECLARE
  v_total INTEGER;
  v_blocked INTEGER;
  v_breakdown JSONB;
BEGIN
  IF data_inicio IS NULL OR data_fim IS NULL THEN
    RETURN QUERY SELECT 0, 0, '{}'::jsonb, '{}'::jsonb, 'Informe data inicial e final';
    RETURN;
  END IF;

  IF data_inicio > data_fim THEN
    RETURN QUERY SELECT 0, 0, '{}'::jsonb, '{}'::jsonb, 'Data inicial maior que data final';
    RETURN;
  END IF;

  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'sending' OR locked_by IS NOT NULL)
  INTO v_total, v_blocked
  FROM public.patients_queue
  WHERE NULLIF(data_exame, '') IS NOT NULL
    AND data_exame::date BETWEEN data_inicio AND data_fim;

  SELECT COALESCE(jsonb_object_agg(status, total), '{}'::jsonb)
  INTO v_breakdown
  FROM (
    SELECT status::text AS status, COUNT(*)::int AS total
    FROM public.patients_queue
    WHERE NULLIF(data_exame, '') IS NOT NULL
      AND data_exame::date BETWEEN data_inicio AND data_fim
    GROUP BY status
  ) grouped;

  RETURN QUERY
  SELECT
    COALESCE(v_total, 0),
    COALESCE(v_blocked, 0),
    COALESCE(v_breakdown, '{}'::jsonb),
    jsonb_build_object('from', data_inicio::text, 'to', data_fim::text),
    CASE
      WHEN COALESCE(v_total, 0) = 0 THEN 'Nenhum paciente encontrado no periodo'
      ELSE 'Preview carregado com sucesso'
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

COMMENT ON FUNCTION public.preview_archive_by_data_exame IS 'Retorna resumo seguro do arquivamento por data_exame sem alterar dados';

CREATE OR REPLACE FUNCTION public.archive_by_data_exame(
  data_inicio DATE,
  data_fim DATE,
  archive_reason TEXT DEFAULT 'manual_range',
  archived_by TEXT DEFAULT 'dashboard'
)
RETURNS TABLE (
  archived_count INTEGER,
  blocked_count INTEGER,
  success BOOLEAN,
  message TEXT
) AS $$
DECLARE
  v_archived INTEGER;
  v_blocked INTEGER;
BEGIN
  IF data_inicio IS NULL OR data_fim IS NULL THEN
    RETURN QUERY SELECT 0, 0, false, 'Informe data inicial e final';
    RETURN;
  END IF;

  IF data_inicio > data_fim THEN
    RETURN QUERY SELECT 0, 0, false, 'Data inicial maior que data final';
    RETURN;
  END IF;

  SELECT COUNT(*) FILTER (WHERE status = 'sending' OR locked_by IS NOT NULL)
  INTO v_blocked
  FROM public.patients_queue
  WHERE NULLIF(data_exame, '') IS NOT NULL
    AND data_exame::date BETWEEN data_inicio AND data_fim;

  WITH candidates AS (
    SELECT *
    FROM public.patients_queue
    WHERE NULLIF(data_exame, '') IS NOT NULL
      AND data_exame::date BETWEEN data_inicio AND data_fim
      AND NOT (status = 'sending' OR locked_by IS NOT NULL)
  ),
  inserted AS (
    INSERT INTO public.patients_queue_archive (
      id,
      patient_name,
      phone_number,
      message_body,
      status,
      is_approved,
      send_after,
      queue_order,
      notes,
      created_at,
      updated_at,
      data_exame,
      Data_nascimento,
      procedimentos,
      time_proce,
      horario_inicio,
      horario_final,
      phone_2,
      phone_3,
      is_landline,
      locked_by,
      locked_at,
      attempt_count,
      send_accepted_at,
      delivered_at,
      read_at,
      replied_at,
      last_delivery_status,
      needs_second_call,
      second_call_reason,
      retry_phone2_sent_at,
      followup_sent_at,
      last_contact_phone,
      dedupe_kind,
      canonical_phone,
      origin_queue_id,
      dedupe_hash,
      archived_at,
      archived_reason,
      archived_by
    )
    SELECT
      id,
      patient_name,
      phone_number,
      message_body,
      status::text,
      is_approved,
      send_after,
      queue_order,
      notes,
      created_at,
      updated_at,
      data_exame,
      Data_nascimento,
      procedimentos,
      time_proce,
      horario_inicio,
      horario_final,
      phone_2,
      phone_3,
      is_landline,
      locked_by,
      locked_at,
      attempt_count,
      send_accepted_at,
      delivered_at,
      read_at,
      replied_at,
      last_delivery_status,
      needs_second_call,
      second_call_reason,
      retry_phone2_sent_at,
      followup_sent_at,
      last_contact_phone,
      dedupe_kind,
      canonical_phone,
      origin_queue_id,
      dedupe_hash,
      NOW(),
      archive_reason,
      archived_by
    FROM candidates
    ON CONFLICT (id) DO NOTHING
    RETURNING id
  ),
  deleted AS (
    DELETE FROM public.patients_queue pq
    USING inserted
    WHERE pq.id = inserted.id
    RETURNING pq.id
  )
  SELECT COUNT(*)::int INTO v_archived FROM deleted;

  RETURN QUERY
  SELECT
    COALESCE(v_archived, 0),
    COALESCE(v_blocked, 0),
    true,
    CASE
      WHEN COALESCE(v_archived, 0) = 0 AND COALESCE(v_blocked, 0) > 0 THEN 'Nenhum paciente arquivado porque todos estavam em processamento'
      WHEN COALESCE(v_archived, 0) = 0 THEN 'Nenhum paciente elegivel para arquivamento no periodo'
      ELSE 'Arquivamento concluido com sucesso'
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

COMMENT ON FUNCTION public.archive_by_data_exame IS 'Move pacientes elegiveis para patients_queue_archive e remove da fila principal, respeitando locks ativos';

CREATE OR REPLACE FUNCTION public.archive_selected_patients(
  patient_ids UUID[],
  archive_reason TEXT DEFAULT 'manual_selection',
  archived_by TEXT DEFAULT 'dashboard'
)
RETURNS TABLE (
  archived_count INTEGER,
  blocked_count INTEGER,
  success BOOLEAN,
  message TEXT
) AS $$
DECLARE
  v_archived INTEGER;
  v_blocked INTEGER;
BEGIN
  IF patient_ids IS NULL OR COALESCE(array_length(patient_ids, 1), 0) = 0 THEN
    RETURN QUERY SELECT 0, 0, false, 'Nenhum paciente selecionado';
    RETURN;
  END IF;

  SELECT COUNT(*) FILTER (WHERE status = 'sending' OR locked_by IS NOT NULL)
  INTO v_blocked
  FROM public.patients_queue
  WHERE id = ANY(patient_ids);

  WITH candidates AS (
    SELECT *
    FROM public.patients_queue
    WHERE id = ANY(patient_ids)
      AND NOT (status = 'sending' OR locked_by IS NOT NULL)
  ),
  inserted AS (
    INSERT INTO public.patients_queue_archive (
      id, patient_name, phone_number, message_body, status, is_approved,
      send_after, queue_order, notes, created_at, updated_at, data_exame,
      Data_nascimento, procedimentos, time_proce, horario_inicio, horario_final,
      phone_2, phone_3, is_landline, locked_by, locked_at, attempt_count,
      send_accepted_at, delivered_at, read_at, replied_at, last_delivery_status,
      needs_second_call, second_call_reason, retry_phone2_sent_at, followup_sent_at,
      last_contact_phone, dedupe_kind, canonical_phone, origin_queue_id, dedupe_hash,
      archived_at, archived_reason, archived_by
    )
    SELECT
      id, patient_name, phone_number, message_body, status::text, is_approved,
      send_after, queue_order, notes, created_at, updated_at, data_exame,
      Data_nascimento, procedimentos, time_proce, horario_inicio, horario_final,
      phone_2, phone_3, is_landline, locked_by, locked_at, attempt_count,
      send_accepted_at, delivered_at, read_at, replied_at, last_delivery_status,
      needs_second_call, second_call_reason, retry_phone2_sent_at, followup_sent_at,
      last_contact_phone, dedupe_kind, canonical_phone, origin_queue_id, dedupe_hash,
      NOW(), archive_reason, archived_by
    FROM candidates
    ON CONFLICT (id) DO NOTHING
    RETURNING id
  ),
  deleted AS (
    DELETE FROM public.patients_queue pq
    USING inserted
    WHERE pq.id = inserted.id
    RETURNING pq.id
  )
  SELECT COUNT(*)::int INTO v_archived FROM deleted;

  RETURN QUERY
  SELECT
    COALESCE(v_archived, 0),
    COALESCE(v_blocked, 0),
    true,
    CASE
      WHEN COALESCE(v_archived, 0) = 0 AND COALESCE(v_blocked, 0) > 0 THEN 'Nenhum paciente arquivado porque todos estavam em processamento'
      WHEN COALESCE(v_archived, 0) = 0 THEN 'Nenhum paciente elegivel para arquivamento na selecao'
      ELSE 'Arquivamento da selecao concluido com sucesso'
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

COMMENT ON FUNCTION public.archive_selected_patients IS 'Arquiva pacientes selecionados individualmente sem afetar registros em processamento';
