-- ========================================
-- MIGRAÇÃO: Views para Dashboard e Operação
-- Data: 13/03/2026
-- Propósito: Criar views para métricas em tempo real e diagnóstico
-- ========================================

-- View 1: dashboard_realtime_metrics
-- Métricas agregadas em tempo real para o dashboard
CREATE OR REPLACE VIEW dashboard_realtime_metrics AS
SELECT
  (SELECT COUNT(*) FROM public.patients_queue WHERE status = 'queued') as queue_pending,
  (SELECT COUNT(*) FROM public.patients_queue WHERE status = 'sending') as queue_sending,
  (SELECT COUNT(*) FROM public.message_logs
   WHERE sent_at > NOW() - INTERVAL '5 minutes'
   AND status = 'sent') as sent_5m,
  (SELECT COUNT(*) FROM public.whatsapp_instances WHERE status = 'connected') as connected_instances,
  (SELECT COUNT(*) FROM public.worker_heartbeats
   WHERE last_heartbeat > NOW() - INTERVAL '2 minutes') as active_workers,
  (SELECT COUNT(*) FROM public.message_blocks
   WHERE permanent = TRUE OR expires_at > NOW()) as blocked_numbers,
  NOW() as metrics_timestamp;

COMMENT ON VIEW dashboard_realtime_metrics IS 'Métricas em tempo real para o dashboard operacional';

-- View 2: expired_locks
-- Identifica mensagens com locks expirados (worker provavelmente crashou)
CREATE OR REPLACE VIEW expired_locks AS
SELECT
  id,
  patient_name,
  locked_by,
  locked_at,
  EXTRACT(EPOCH FROM (NOW() - locked_at)) / 60 as lock_age_minutes
FROM public.patients_queue
WHERE locked_by IS NOT NULL
  AND status = 'sending'
  AND locked_at < NOW() - INTERVAL '5 minutes'
ORDER BY locked_at ASC;

COMMENT ON VIEW expired_locks IS 'Diagnóstico: mensagens com locks expirados (worker pode ter crashado)';

-- View 3: worker_status_summary
-- Resumo do status de todos os workers
CREATE OR REPLACE VIEW worker_status_summary AS
SELECT
  worker_id,
  worker_name,
  started_at,
  last_heartbeat,
  EXTRACT(EPOCH FROM (NOW() - last_heartbeat)) / 60 as minutes_since_heartbeat,
  current_job_id,
  current_job_started_at,
  messages_processed,
  messages_failed,
  CASE
    WHEN last_heartbeat > NOW() - INTERVAL '2 minutes' THEN 'active'
    WHEN last_heartbeat > NOW() - INTERVAL '5 minutes' THEN 'lagging'
    ELSE 'stale'
  END as status
FROM public.worker_heartbeats
ORDER BY last_heartbeat DESC;

COMMENT ON VIEW worker_status_summary IS 'Resumo do status de todos os workers ativos';

-- View 4: message_failure_insights
-- Análise de falhas de envio para troubleshooting
CREATE OR REPLACE VIEW message_failure_insights AS
SELECT
  COUNT(*) as total_failures,
  error_message,
  COUNT(DISTINCT instance_id) as affected_instances,
  MAX(sent_at) as last_failure_at
FROM public.message_logs
WHERE status = 'failed'
  AND sent_at > NOW() - INTERVAL '24 hours'
GROUP BY error_message
ORDER BY total_failures DESC;

COMMENT ON VIEW message_failure_insights IS 'Análise de falhas das últimas 24 horas para troubleshooting';

-- Verificar se as views foram criadas corretamente
SELECT
    viewname,
    definition
FROM pg_views
WHERE viewname IN ('dashboard_realtime_metrics', 'expired_locks', 'worker_status_summary', 'message_failure_insights')
  AND schemaname = 'public'
ORDER BY viewname;
