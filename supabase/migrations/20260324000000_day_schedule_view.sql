-- ========================================
-- MIGRACAO: Funcao RPC get_day_schedule com gaps classificados
-- Data: 24/03/2026
-- Proposito: Retornar agenda diaria com pacientes E gaps classificados
-- Regras de gap: >=8min = encaixe, >=15min = significativo, >=30min = critico
-- ========================================

-- ========================================
-- 1. get_day_schedule - Lista pacientes por data E calcula gaps
-- ========================================

CREATE OR REPLACE FUNCTION get_day_schedule(p_date TEXT)
RETURNS TABLE (
  item_type TEXT,                    -- 'patient' ou 'gap'
  journey_id UUID,                   -- apenas para patient
  patient_name TEXT,                 -- apenas para patient
  phone TEXT,                        -- apenas para patient
  data_exame DATE,                   -- apenas para patient
  horario_inicio TIME,               -- inicio do patient OU inicio do gap
  horario_final TIME,                -- fim do patient OU fim do gap
  time_proce TEXT,                   -- apenas para patient (duração do procedimento)
  procedimentos TEXT,                -- apenas para patient
  journey_status TEXT,               -- apenas para patient
  latest_classification TEXT,        -- apenas para patient
  vacancy_signal BOOLEAN,            -- apenas para patient
  phone_ladder_exhausted BOOLEAN,    -- apenas para patient
  -- Campos específicos para gap
  gap_duration_minutes INTEGER,      -- apenas para gap
  gap_classification TEXT            -- 'encaixe' | 'significativo' | 'critico'
) AS $$
DECLARE
  rec RECORD;
  prev_horario_final TIME;
  gap_minutes INTEGER;
  current_item JSONB;
  result_items JSONB := '[]'::JSONB;
  first_iteration BOOLEAN := TRUE;
BEGIN
  -- Primeiro, buscar todos os pacientes do dia ordenados por horario
  FOR rec IN
    SELECT
      pj.id AS journey_id,
      pj.patient_name,
      pj.canonical_phone AS phone,
      pj.data_exame,
      pj.horario_inicio,
      COALESCE(pj.horario_final, pj.horario_inicio + INTERVAL '30 minutes') AS horario_final,
      pj.time_proce,
      pj.procedimentos,
      pj.journey_status::TEXT AS journey_status,
      pj.phone_ladder_exhausted,
      (
        SELECT mq.classification
        FROM public.message_qualifications mq
        WHERE mq.journey_id = pj.id
        ORDER BY mq.created_at DESC
        LIMIT 1
      ) AS latest_classification,
      (
        SELECT mq.vacancy_signal
        FROM public.message_qualifications mq
        WHERE mq.journey_id = pj.id
        ORDER BY mq.created_at DESC
        LIMIT 1
      ) AS vacancy_signal
    FROM public.patient_journeys pj
    WHERE pj.data_exame = p_date::date
      AND pj.journey_status NOT IN ('archived', 'cancelled')
    ORDER BY pj.horario_inicio ASC NULLS LAST
  LOOP
    -- Verificar se há gap entre o paciente anterior e o atual
    IF NOT first_iteration AND prev_horario_final IS NOT NULL AND rec.horario_inicio IS NOT NULL THEN
      gap_minutes := EXTRACT(EPOCH FROM (rec.horario_inicio - prev_horario_final)) / 60;
      
      -- Se gap >= 8 minutos, adicionar como item de gap
      IF gap_minutes >= 8 THEN
        -- Classificar o gap
        DECLARE
          gap_class TEXT;
        BEGIN
          IF gap_minutes >= 30 THEN
            gap_class := 'critico';
          ELSIF gap_minutes >= 15 THEN
            gap_class := 'significativo';
          ELSE
            gap_class := 'encaixe';
          END IF;
          
          -- Adicionar gap ao resultado
          current_item := jsonb_build_object(
            'item_type', 'gap',
            'journey_id', NULL,
            'patient_name', NULL,
            'phone', NULL,
            'data_exame', p_date::date,
            'horario_inicio', prev_horario_final,
            'horario_final', rec.horario_inicio,
            'time_proce', NULL,
            'procedimentos', NULL,
            'journey_status', NULL,
            'latest_classification', NULL,
            'vacancy_signal', NULL,
            'phone_ladder_exhausted', NULL,
            'gap_duration_minutes', gap_minutes,
            'gap_classification', gap_class
          );
          result_items := result_items || jsonb_build_array(current_item);
        END;
      END IF;
    END IF;
    
    -- Adicionar paciente atual ao resultado
    current_item := jsonb_build_object(
      'item_type', 'patient',
      'journey_id', rec.journey_id,
      'patient_name', rec.patient_name,
      'phone', rec.phone,
      'data_exame', rec.data_exame,
      'horario_inicio', rec.horario_inicio,
      'horario_final', rec.horario_final,
      'time_proce', rec.time_proce,
      'procedimentos', rec.procedimentos,
      'journey_status', rec.journey_status,
      'latest_classification', rec.latest_classification,
      'vacancy_signal', rec.vacancy_signal,
      'phone_ladder_exhausted', rec.phone_ladder_exhausted,
      'gap_duration_minutes', NULL,
      'gap_classification', NULL
    );
    result_items := result_items || jsonb_build_array(current_item);
    
    prev_horario_final := rec.horario_final;
    first_iteration := FALSE;
  END LOOP;
  
  -- Retornar cada item como linha
  FOR current_item IN SELECT * FROM jsonb_array_elements(result_items)
  LOOP
    item_type := current_item->>'item_type';
    journey_id := (current_item->>'journey_id')::UUID;
    patient_name := current_item->>'patient_name';
    phone := current_item->>'phone';
    data_exame := (current_item->>'data_exame')::DATE;
    horario_inicio := (current_item->>'horario_inicio')::TIME;
    horario_final := (current_item->>'horario_final')::TIME;
    time_proce := current_item->>'time_proce';
    procedimentos := current_item->>'procedimentos';
    journey_status := current_item->>'journey_status';
    latest_classification := current_item->>'latest_classification';
    vacancy_signal := (current_item->>'vacancy_signal')::BOOLEAN;
    phone_ladder_exhausted := (current_item->>'phone_ladder_exhausted')::BOOLEAN;
    gap_duration_minutes := (current_item->>'gap_duration_minutes')::INTEGER;
    gap_classification := current_item->>'gap_classification';
    
    RETURN NEXT;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_day_schedule IS 'Retorna agenda diaria com pacientes E gaps classificados. item_type: patient|gap. gap_classification: encaixe (8-14min)|significativo (15-29min)|critico (30+min). Ordenado por horario_inicio.';

-- ========================================
-- 2. get_day_schedule_summary - Estatisticas do dia (para header)
-- ========================================

CREATE OR REPLACE FUNCTION get_day_schedule_summary(p_date TEXT)
RETURNS TABLE (
  total_pacientes INTEGER,
  encaixe_count INTEGER,
  significativo_count INTEGER,
  critico_count INTEGER,
  total_minutos_livres INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH schedule AS (
    SELECT * FROM get_day_schedule(p_date)
  ),
  pacientes AS (
    SELECT COUNT(*)::INTEGER as cnt FROM schedule WHERE item_type = 'patient'
  ),
  gaps AS (
    SELECT 
      COUNT(*) FILTER (WHERE gap_classification = 'encaixe')::INTEGER as encaixe,
      COUNT(*) FILTER (WHERE gap_classification = 'significativo')::INTEGER as significativo,
      COUNT(*) FILTER (WHERE gap_classification = 'critico')::INTEGER as critico,
      COALESCE(SUM(gap_duration_minutes), 0)::INTEGER as total_minutos
    FROM schedule
    WHERE item_type = 'gap'
  )
  SELECT 
    pacientes.cnt,
    gaps.encaixe,
    gaps.significativo,
    gaps.critico,
    gaps.total_minutos
  FROM pacientes, gaps;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_day_schedule_summary IS 'Retorna estatisticas do dia: total de pacientes, contagem de gaps por classificacao, e total de minutos livres.';

-- ========================================
-- 3. get_available_dates - Lista datas com pacientes agendados
-- ========================================

CREATE OR REPLACE FUNCTION get_available_dates()
RETURNS TABLE (
  data_exame DATE,
  total_count BIGINT,
  paciente_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    pj.data_exame,
    COUNT(*)::BIGINT AS total_count,
    COUNT(*)::INTEGER AS paciente_count
  FROM public.patient_journeys pj
  WHERE pj.data_exame >= CURRENT_DATE
    AND pj.journey_status NOT IN ('archived', 'cancelled')
  GROUP BY pj.data_exame
  ORDER BY pj.data_exame ASC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_available_dates IS 'Retorna datas que tem pacientes agendados a partir de hoje com contagem.';

-- ========================================
-- 4. Verificacao
-- ========================================

SELECT
  'get_day_schedule' AS function_name,
  proname AS sql_name
FROM pg_proc
WHERE proname = 'get_day_schedule'
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

SELECT
  'get_day_schedule_summary' AS function_name,
  proname AS sql_name
FROM pg_proc
WHERE proname = 'get_day_schedule_summary'
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

SELECT
  'get_available_dates' AS function_name,
  proname AS sql_name
FROM pg_proc
WHERE proname = 'get_available_dates'
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');