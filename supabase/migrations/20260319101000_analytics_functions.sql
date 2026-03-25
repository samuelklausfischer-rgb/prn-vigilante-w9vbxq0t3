-- ========================================
-- MIGRACAO: Funcoes e triggers de analytics
-- Data: 19/03/2026
-- Proposito: Popular eventos e agregados diarios automaticamente
-- ========================================

CREATE OR REPLACE FUNCTION public.set_timestamp_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_analytics_daily_updated_at ON public.analytics_daily;
CREATE TRIGGER trigger_analytics_daily_updated_at
  BEFORE UPDATE ON public.analytics_daily
  FOR EACH ROW
  EXECUTE FUNCTION public.set_timestamp_updated_at();

CREATE OR REPLACE FUNCTION public.log_patient_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.message_events (
      message_id,
      to_phone,
      event_type,
      event_at,
      raw_payload
    ) VALUES (
      NEW.id,
      NEW.phone_number,
      'status_' || NEW.status::text,
      COALESCE(NEW.delivered_at, NEW.updated_at, NOW()),
      jsonb_build_object(
        'old_status', OLD.status,
        'new_status', NEW.status,
        'attempt_count', COALESCE(NEW.attempt_count, 0),
        'procedimentos', NEW.procedimentos,
        'data_exame', NEW.data_exame,
        'is_landline', NEW.is_landline,
        'updated_at', NEW.updated_at
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.log_patient_status_change IS 'Registra eventos de status em message_events sempre que patients_queue muda';

DROP TRIGGER IF EXISTS trigger_patient_status_change ON public.patients_queue;
CREATE TRIGGER trigger_patient_status_change
  AFTER UPDATE OF status ON public.patients_queue
  FOR EACH ROW
  EXECUTE FUNCTION public.log_patient_status_change();

CREATE OR REPLACE FUNCTION public.update_analytics_daily_from_event()
RETURNS TRIGGER AS $$
DECLARE
  v_data DATE;
BEGIN
  v_data := (NEW.event_at AT TIME ZONE 'America/Cuiaba')::date;

  INSERT INTO public.analytics_daily (data)
  VALUES (v_data)
  ON CONFLICT (data) DO NOTHING;

  UPDATE public.analytics_daily
  SET
    total_enviadas = total_enviadas + CASE WHEN NEW.event_type = 'status_sending' THEN 1 ELSE 0 END,
    sucesso = sucesso + CASE WHEN NEW.event_type = 'status_delivered' THEN 1 ELSE 0 END,
    falha = falha + CASE WHEN NEW.event_type = 'status_failed' THEN 1 ELSE 0 END,
    cancelada = cancelada + CASE WHEN NEW.event_type = 'status_cancelled' THEN 1 ELSE 0 END,
    updated_at = NOW()
  WHERE data = v_data;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.update_analytics_daily_from_event IS 'Atualiza contadores diarios com base nos eventos gravados em message_events';

DROP TRIGGER IF EXISTS trigger_update_analytics_daily ON public.message_events;
CREATE TRIGGER trigger_update_analytics_daily
  AFTER INSERT ON public.message_events
  FOR EACH ROW
  WHEN (NEW.event_type LIKE 'status_%')
  EXECUTE FUNCTION public.update_analytics_daily_from_event();

CREATE OR REPLACE FUNCTION public.update_analytics_daily_procedures(target_date DATE DEFAULT CURRENT_DATE)
RETURNS VOID AS $$
DECLARE
  v_payload JSONB;
BEGIN
  SELECT COALESCE(
    jsonb_object_agg(
      grouped.procedimento,
      jsonb_build_object(
        'enviadas', grouped.total_enviadas,
        'sucesso', grouped.sucesso,
        'falha', grouped.falha
      )
    ),
    '{}'::jsonb
  )
  INTO v_payload
  FROM (
    SELECT
      LOWER(TRIM(COALESCE(NULLIF(procedimentos, ''), 'nao_informado'))) AS procedimento,
      COUNT(*) FILTER (WHERE status IN ('sending', 'delivered', 'failed', 'cancelled')) AS total_enviadas,
      COUNT(*) FILTER (WHERE status = 'delivered') AS sucesso,
      COUNT(*) FILTER (WHERE status = 'failed') AS falha
    FROM public.patients_queue
    WHERE (updated_at AT TIME ZONE 'America/Cuiaba')::date = target_date
    GROUP BY 1
  ) grouped;

  INSERT INTO public.analytics_daily (data, por_procedimento)
  VALUES (target_date, COALESCE(v_payload, '{}'::jsonb))
  ON CONFLICT (data) DO UPDATE SET
    por_procedimento = EXCLUDED.por_procedimento,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.update_analytics_daily_procedures IS 'Recalcula os agregados por procedimento para uma data especifica';
