# 🔄 Transição para Journey Model - Guia de Produção

**Versão:** 1.0  
**Data:** 19/03/2026  
**Status:** 📝 Planejamento  
**PR:** 8 - Virada Operacional

---

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Modelo Atual vs Novo](#modelo-atual-vs-novo)
3. [Roteiro de Transição](#roteiro-de-transição)
4. [Checklist de Pré-Produção](#checklist-de-pré-produção)
5. [Planos de Rollback](#planos-de-rollback)
6. [Monitoramento Pós-Implementação](#monitoramento-pós-implementação)
7. [Dicas de Implementação](#dicas-de-implementação)
8. [Estratégia de Comunicação](#estratégia-de-comunicação)

---

## 📊 1. Visão Geral

### 1.1 O Que Está Mudando

#### Sistema Legado (Atual)
- **Tabela principal:** `patients_queue`
- **Abordagem:** Fila simples com status básico
- **Rastreamento:** Limitado a status de envio
- **Lifecycle:** Incompleto (sem tracking de respostas)

#### Sistema Novo (Journey Model)
- **Tabelas principais:**
  - `patient_journeys` - Jornada completa do paciente
  - `journey_messages` - Lifecycle completo de mensagens
  - `journey_events` - Timeline de eventos
  - `message_qualifications` - Classificação de respostas com IA
  - `webhook_events_raw` - Captura raw de webhooks
- **Abordagem:** Rastreamento completo de jornada
- **Rastreamento:** Todos os eventos, respostas e decisões
- **Lifecycle:** Completo (envio, entrega, leitura, resposta, classificação)

### 1.2 Por Que Está Mudando

#### Problemas do Modelo Legado

1. **Rastreamento Incompleto**
   - Não sabe quando paciente leu a mensagem
   - Não rastreia respostas específicas
   - Não diferencia tipos de follow-up
   - Sem visibilidade de timeline de eventos

2. **Ineficiência Operacional**
   - Dificuldade em identificar vagas automaticamente
   - Classificação manual de respostas
   - Sem follow-up inteligente
   - Métricas limitadas

3. **Custo Operacional**
   - Mensagens desnecessárias (sem resposta útil)
   - Retentativas sem contexto
   - Tempo manual elevado
   - Erros de classificação

#### Benefícios do Novo Modelo

1. **Rastreamento Completo**
   - ✅ Timeline completa de eventos
   - ✅ Status de entrega e leitura
   - ✅ Histórico de todas as mensagens
   - ✅ Traceability completa

2. **Eficiência Operacional**
   - ✅ Classificação automática com IA
   - ✅ Identificação automática de vagas
   - ✅ Follow-up inteligente
   - ✅ Priorização de ações manuais

3. **Melhor Visibilidade**
   - ✅ Dashboard estratégico em tempo real
   - ✅ Métricas detalhadas de performance
   - ✅ Alertas automáticos
   - ✅ Relatórios personalizados

4. **Menor Custo**
   - ✅ ~30-40% redução de tokens LLM (com otimizações em `packages/shared/`)
   - ✅ Menos mensagens desnecessárias
   - ✅ Automação de tarefas manuais
   - ✅ Prevenção de erros

### 1.3 Compatibilidade e Coexistência

#### Tabelas Legadas Continuam Ativas
- `patients_queue` mantida para compatibilidade
- Campo `journey_id` adicionado para link com novo sistema
- Campos aditivos adicionados para rastreamento

#### Sistema Híbrido
- Dupla escrita mantida durante período de transição
- Novas tabelas funcionam em paralelo com legado
- Views consolidam dados de ambos sistemas
- Gradual migracão de funcionalidades

#### Período de Coexistência
- **FASE 1-2:** Dupla escrita obrigatória
- **FASE 3:** Leitura primária do novo sistema
- **FASE 4:** Desativação progressiva do legado

---

## 🔄 2. Modelo Atual vs Novo

### 2.1 Tabela Legado: `patients_queue`

```sql
-- Estrutura simplificada do legado
patients_queue (
  id UUID PRIMARY KEY,
  patient_name TEXT,
  phone1 TEXT,
  phone2 TEXT,
  data_exame DATE,
  procedimentos TEXT,
  horario_inicio TIME,
  horario_final TIME,
  status TEXT,  -- 'pending', 'sent', 'delivered', etc.
  message_id TEXT,  -- ID na Evolution API
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
```

**Limitações:**
- ❌ Sem rastreamento de leitura
- ❌ Sem histórico de mensagens
- ❌ Sem timeline de eventos
- ❌ Sem classificação de respostas
- ❌ Sem identificação automática de vagas

### 2.2 Novas Tabelas

#### A. `patient_journeys` - Jornada do Paciente

```sql
patient_journeys (
  id UUID PRIMARY KEY,
  origin_queue_id UUID REFERENCES patients_queue(id),
  patient_name TEXT NOT NULL,
  canonical_phone TEXT NOT NULL,
  primary_phone TEXT NOT NULL,
  secondary_phone TEXT,
  tertiary_phone TEXT,
  data_exame DATE,
  procedimentos TEXT,
  horario_inicio TIME,
  horario_final TIME,
  journey_status journey_status NOT NULL DEFAULT 'queued',
  last_message_id UUID,
  last_event_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  pending_at TIMESTAMPTZ,
  needs_manual_action BOOLEAN NOT NULL DEFAULT false,
  manual_priority manual_priority,
  manual_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)
```

**Status possíveis:** `queued`, `contacting`, `delivered_waiting_reply`, `followup_due`, `followup_sent`, `confirmed`, `pending_manual`, `cancelled`, `archived`

#### B. `journey_messages` - Lifecycle de Mensagens

```sql
journey_messages (
  id UUID PRIMARY KEY,
  journey_id UUID NOT NULL REFERENCES patient_journeys(id) ON DELETE CASCADE,
  parent_message_id UUID REFERENCES journey_messages(id) ON DELETE SET NULL,
  queue_message_id UUID REFERENCES patients_queue(id) ON DELETE SET NULL,
  direction message_direction NOT NULL,  -- 'outbound' or 'inbound'
  message_kind message_kind NOT NULL DEFAULT 'original',
  provider_name TEXT NOT NULL DEFAULT 'evolution',
  provider_message_id TEXT,
  provider_chat_id TEXT,
  instance_id UUID REFERENCES whatsapp_instances(id) ON DELETE SET NULL,
  phone_number TEXT NOT NULL,
  message_body TEXT,
  status message_status NOT NULL DEFAULT 'queued',
  accepted_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  replied_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)
```

**Direções:** `outbound`, `inbound`  
**Tipos:** `original`, `retry_phone2`, `followup_confirm`, `patient_reply`  
**Status:** `queued`, `sending`, `accepted`, `delivered`, `read`, `replied`, `failed`, `cancelled`

#### C. `webhook_events_raw` - Captura Raw de Webhooks

```sql
webhook_events_raw (
  id UUID PRIMARY KEY,
  provider_name TEXT NOT NULL,
  provider_event_id TEXT,
  provider_message_id TEXT,
  event_type TEXT NOT NULL,
  instance_external_id TEXT,
  payload JSONB NOT NULL,
  headers JSONB,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  processing_status processing_status NOT NULL DEFAULT 'pending',
  processing_error TEXT,
  dedupe_hash TEXT
)
```

**Dedupe:** Hash único para evitar processamento duplicado

#### D. `message_qualifications` - Classificação com IA

```sql
message_qualifications (
  id UUID PRIMARY KEY,
  journey_id UUID NOT NULL REFERENCES patient_journeys(id) ON DELETE CASCADE,
  message_id UUID NOT NULL REFERENCES journey_messages(id) ON DELETE CASCADE,
  classification classification NOT NULL,
  confidence NUMERIC(5,4) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  summary TEXT,
  recommended_action recommended_action NOT NULL,
  vacancy_signal BOOLEAN NOT NULL DEFAULT false,
  vacancy_reason TEXT,
  needs_manual_review BOOLEAN NOT NULL DEFAULT false,
  model_name TEXT,
  raw_output JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)
```

**Classificações:** `confirmado_positivo`, `quer_remarcar`, `nao_pode_comparecer`, `cancelado`, `duvida`, `ambigua`, `sem_resposta_util`  
**Ações recomendadas:** `close_as_confirmed`, `move_to_pending`, `flag_vacancy`, `manual_review`, `ignore`

#### E. `journey_events` - Timeline de Eventos

```sql
journey_events (
  id UUID PRIMARY KEY,
  journey_id UUID NOT NULL REFERENCES patient_journeys(id) ON DELETE CASCADE,
  message_id UUID REFERENCES journey_messages(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  event_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source event_source NOT NULL,  -- 'worker', 'webhook', 'polling', 'ai', 'manual'
  payload JSONB
)
```

### 2.3 Novas Views

#### A. `strategic_followup_overview`

Visão estratégica para dashboard:
- Journeys ativos e follow-ups pendentes
- Último status de mensagem
- Classificações mais recentes
- Sinais de vaga
- Prioridades manuais

```sql
SELECT
  pj.id AS journey_id,
  pj.patient_name,
  pj.data_exame,
  pj.journey_status,
  (SELECT jm.message_kind FROM journey_messages jm
   WHERE jm.journey_id = pj.id ORDER BY jm.created_at DESC LIMIT 1) AS last_message_kind,
  (SELECT mq.classification FROM message_qualifications mq
   WHERE mq.journey_id = pj.id ORDER BY mq.created_at DESC LIMIT 1) AS latest_classification,
  pj.needs_manual_action,
  pj.manual_priority,
  EXTRACT(EPOCH FROM (NOW() - pj.last_event_at)) / 60 AS minutes_since_last_touch
FROM patient_journeys pj
ORDER BY
  CASE pj.manual_priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 END ASC,
  pj.data_exame ASC;
```

#### B. `vacancy_candidates_overview`

Candidatos a vagas:
- Pacientes que indicaram não comparecer
- Priorização por urgência
- Motivo da vaga
- Classificação da resposta

```sql
SELECT
  pj.id AS journey_id,
  pj.patient_name,
  pj.data_exame,
  pj.procedimentos,
  (SELECT mq.vacancy_reason FROM message_qualifications mq
   WHERE mq.journey_id = pj.id AND mq.vacancy_signal = true
   ORDER BY mq.created_at DESC LIMIT 1) AS vacancy_reason,
  (SELECT mq.classification FROM message_qualifications mq
   WHERE mq.journey_id = pj.id ORDER BY mq.created_at DESC LIMIT 1) AS latest_classification,
  -- priority_score calculation based on urgency and exam date
FROM patient_journeys pj
WHERE EXISTS (
  SELECT 1 FROM message_qualifications mq
  WHERE mq.journey_id = pj.id AND mq.vacancy_signal = true
)
ORDER BY priority_score DESC, pj.data_exame ASC;
```

#### C. `journey_timeline_view`

Timeline unificada de eventos:
- Combina `journey_events`, `journey_messages` e `message_qualifications`
- Histórico cronológico completo
- Excerpts de mensagens e classificações

```sql
SELECT
  je.journey_id,
  je.event_at,
  je.event_type,
  je.source,
  jm.message_kind,
  jm.status AS message_status,
  mq.summary,
  SUBSTRING(COALESCE(jm.message_body, mq.summary, je.payload::text), 1, 200) AS raw_excerpt
FROM journey_events je
LEFT JOIN journey_messages jm ON je.message_id = jm.id
LEFT JOIN message_qualifications mq ON jm.id = mq.message_id
ORDER BY journey_id, event_at DESC;
```

### 2.4 Campos Aditivos em `patients_queue`

Para manter compatibilidade durante transição:

```sql
ALTER TABLE patients_queue
  ADD COLUMN journey_id UUID REFERENCES patient_journeys(id) ON DELETE SET NULL,
  ADD COLUMN provider_message_id TEXT,
  ADD COLUMN provider_chat_id TEXT,
  ADD COLUMN accepted_at TIMESTAMPTZ,
  ADD COLUMN followup_due_at TIMESTAMPTZ,
  ADD COLUMN resolved_at TIMESTAMPTZ,
  ADD COLUMN current_outcome TEXT;
```

---

## 🚀 3. Roteiro de Transição

### 3.1 FASE 1: Observação (1 semana)

**Objetivo:** Ativar novo sistema sem impactar operação legado

#### Atividades

1. **Aplicar Migrations**
   ```bash
   # Aplicar migration do journey model
   supabase migration up 20260319000000_strategic_journey_tracking.sql
   
   # Verificar criação de tabelas
   supabase db execute --remote "
     SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public'
       AND table_name IN ('patient_journeys', 'journey_messages', 'webhook_events_raw',
                          'message_qualifications', 'journey_events');
   "
   
   # Verificar criação de views
   supabase db execute --remote "
     SELECT viewname FROM pg_views
     WHERE schemaname = 'public'
       AND viewname IN ('strategic_followup_overview', 'vacancy_candidates_overview',
                        'journey_timeline_view');
   "
   ```

2. **Ativar Dupla Escrita**
   - Worker escreve em ambas tabelas (`patients_queue` + `patient_journeys`)
   - Webhook grava em ambas tabelas
   - Edge functions gravam em ambas tabelas
   - **NENHUM** componente legado é desativado

3. **Monitorar Logs**
   ```bash
   # Verificar logs do worker
   tail -f automation/logs/worker.log | grep "journey"
   
   # Verificar logs do webhook
   supabase logs --service api --limit 100 | grep "webhook"
   
   # Verificar logs das edge functions
   supabase logs --service edge-function --limit 100 | grep "classify"
   ```

4. **Comparar Dados**
   ```sql
   -- Verificar consistência de dados
   SELECT
     'patients_queue' as source,
     COUNT(*) as total,
     COUNT(DISTINCT id) as unique_ids,
     COUNT(journey_id) as with_journey
   FROM patients_queue
   
   UNION ALL
   
   SELECT
     'patient_journeys' as source,
     COUNT(*) as total,
     COUNT(DISTINCT id) as unique_ids,
     COUNT(origin_queue_id) as with_origin
   FROM patient_journeys;
   
   -- Verificar discrepâncias
   SELECT
     pq.id as queue_id,
     pq.patient_name,
     pq.phone1,
     pj.id as journey_id,
     pj.patient_name as journey_name,
     pj.canonical_phone
   FROM patients_queue pq
   LEFT JOIN patient_journeys pj ON pq.journey_id = pj.id
   WHERE pq.journey_id IS NULL
   LIMIT 10;
   ```

5. **Identificar Anomalias**
   ```sql
   -- Verificar mensagens sem journey
   SELECT
     COUNT(*) as messages_without_journey
   FROM journey_messages jm
   WHERE NOT EXISTS (
     SELECT 1 FROM patient_journeys pj
     WHERE pj.id = jm.journey_id
   );
   
   -- Verificar journeys sem mensagens
   SELECT
     COUNT(*) as journeys_without_messages
   FROM patient_journeys pj
   WHERE NOT EXISTS (
     SELECT 1 FROM journey_messages jm
     WHERE jm.journey_id = pj.id
   );
   
   -- Verificar webhooks sem processamento
   SELECT
     COUNT(*) as pending_webhooks,
     COUNT(*) FILTER (WHERE processing_status = 'failed') as failed_webhooks
   FROM webhook_events_raw;
   ```

#### Checkpoint FASE 1

- [ ] Migrations aplicadas com sucesso
- [ ] Todas tabelas criadas corretamente
- [ ] Views retornando dados
- [ ] Índices criados e funcionando
- [ ] Worker compilando sem erros
- [ ] Dupla escrita funcionando
- [ ] Webhook gravando em ambas tabelas
- [ ] Logs sem erros críticos
- [ ] Dados consistentes entre legado e novo
- [ ] Sem anomalias significativas

#### Critério de Aprovação

- ✅ 0 erros críticos nos logs
- ✅ < 1% de discrepância entre sistemas
- ✅ Performance mantida (sem slowdown)
- ✅ Sem perda de dados

---

### 3.2 FASE 2: Parcial (1-2 semanas)

**Objetivo:** Migrar 50% do tráfego para novo sistema

#### Atividades

1. **Configurar Feature Flag**
   ```typescript
   // automation/src/config/features.ts
   export const FEATURE_FLAGS = {
     USE_JOURNEY_MODEL: Math.random() < 0.5,  // 50% de probabilidade
     DUAL_WRITE: true,  // Continuar dupla escrita
     LOG_JOURNEY_EVENTS: true,
     ENABLE_AI_CLASSIFICATION: true,
     ENABLE_VACANCY_DETECTION: true
   };
   ```

2. **Migrar Componentes Progressivamente**
   - **Semana 1:**
     - Worker: 50% das mensagens usam novo sistema
     - Webhook: 50% dos eventos processados com novo modelo
     - Frontend: Read-only da nova página estratégica
   
   - **Semana 2:**
     - Edge functions: 50% das classificações via novo modelo
     - Scheduler de follow-up: 50% via novo sistema
     - Dashboard: Visualização de dados híbridos

3. **Monitorar Intensivamente**
   ```bash
   # Script de monitoramento
   while true; do
     echo "=== $(date) ==="
     
     # Taxa de sucesso
     echo "Taxa de sucesso de envio:"
     supabase db execute --remote "
       SELECT
         'legado' as system,
         COUNT(*) FILTER (WHERE status = 'delivered') * 100.0 / COUNT(*) as success_rate
       FROM patients_queue
       WHERE created_at > NOW() - INTERVAL '1 hour'
       
       UNION ALL
       
       SELECT
         'novo' as system,
         COUNT(*) FILTER (WHERE status IN ('delivered', 'read', 'replied')) * 100.0 / COUNT(*) as success_rate
       FROM journey_messages
       WHERE created_at > NOW() - INTERVAL '1 hour'
         AND direction = 'outbound';
     "
     
     # Latência
     echo "Latência média:"
     supabase db execute --remote "
       SELECT
         'legado' as system,
         AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) as avg_latency_seconds
       FROM patients_queue
       WHERE created_at > NOW() - INTERVAL '1 hour'
       
       UNION ALL
       
       SELECT
         'novo' as system,
         AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) as avg_latency_seconds
       FROM journey_messages
       WHERE created_at > NOW() - INTERVAL '1 hour';
     "
     
     sleep 300  # 5 minutos
   done
   ```

4. **Coletar Feedback da Equipe**
   - Usabilidade da nova página estratégica
   - Precisão da classificação IA
   - Performance do sistema
   - Bugs e problemas encontrados

5. **Ajustar Bugs Rapidamente**
   - Hotfix via migration
   - Re-deploy do worker
   - Atualização das edge functions
   - Documentação de lições aprendidas

#### Checkpoint FASE 2

- [ ] Feature flag funcionando corretamente
- [ ] 50% do tráfego no novo sistema
- [ ] Logs monitorados intensivamente
- [ ] Bugs identificados e corrigidos
- [ ] Feedback coletado da equipe
- [ ] Performance aceitável
- [ ] Sem perda de dados

#### Critério de Aprovação

- ✅ Taxa de sucesso >= 95% em ambos sistemas
- ✅ Latência similar entre legado e novo
- ✅ < 5 bugs críticos por semana
- ✅ Feedback positivo da equipe
- ✅ Sem perda de dados

---

### 3.3 FASE 3: Completa (1-2 semanas)

**Objetivo:** 100% do tráfego no novo sistema

#### Atividades

1. **Remover Feature Flag**
   ```typescript
   // automation/src/config/features.ts
   export const FEATURE_FLAGS = {
     USE_JOURNEY_MODEL: true,  // 100% no novo sistema
     DUAL_WRITE: true,  // Ainda mantendo dupla escrita por segurança
     LOG_JOURNEY_EVENTS: true,
     ENABLE_AI_CLASSIFICATION: true,
     ENABLE_VACANCY_DETECTION: true
   };
   ```

2. **Ativar Funcionalidades Completas**
   - ✅ 100% dos envios usam novo modelo
   - ✅ 100% dos webhooks processados com novo modelo
   - ✅ 100% das classificações via IA
   - ✅ Scheduler de follow-up totalmente ativo
   - ✅ Detecção de vagas automática
   - ✅ Dashboard estratégico em produção

3. **Monitorar Continuamente**
   ```sql
   -- Dashboard SQL para monitoramento
   CREATE OR REPLACE VIEW monitoring_daily_overview AS
   SELECT
     'journeys_created' as metric,
     COUNT(*) as value,
     NOW()::date as date
   FROM patient_journeys
   WHERE created_at >= NOW()::date
   
   UNION ALL
   
   SELECT
     'messages_sent' as metric,
     COUNT(*) as value,
     NOW()::date as date
   FROM journey_messages
   WHERE created_at >= NOW()::date
     AND direction = 'outbound'
   
   UNION ALL
   
   SELECT
     'messages_delivered' as metric,
     COUNT(*) as value,
     NOW()::date as date
   FROM journey_messages
   WHERE created_at >= NOW()::date
     AND status IN ('delivered', 'read', 'replied')
   
   UNION ALL
   
   SELECT
     'patient_replies' as metric,
     COUNT(*) as value,
     NOW()::date as date
   FROM journey_messages
   WHERE created_at >= NOW()::date
     AND direction = 'inbound'
   
   UNION ALL
   
   SELECT
     'classifications_ai' as metric,
     COUNT(*) as value,
   NOW()::date as date
   FROM message_qualifications
   WHERE created_at >= NOW()::date
   
   UNION ALL
   
   SELECT
     'vacancies_detected' as metric,
     COUNT(*) as value,
   NOW()::date as date
   FROM message_qualifications
   WHERE created_at >= NOW()::date
     AND vacancy_signal = true;
   ```

4. **Planejar Retirada do Legado**
   - Identificar dependências do legado
   - Planejar migração de dados históricos
   - Documentar processos de desativação
   - Definir cronograma de FASE 4

#### Checkpoint FASE 3

- [ ] 100% do tráfego no novo sistema
- [ ] Funcionalidades completas ativas
- [ ] Monitoramento contínuo estabelecido
- [ ] Performance estável
- [ ] Sem bugs críticos
- [ ] Documentação atualizada

#### Critério de Aprovação

- ✅ Taxa de sucesso >= 95%
- ✅ Latência aceitável (< 5 segundos)
- ✅ 0 bugs críticos por semana
- ✅ Sistema estável por 1 semana completa
- ✅ Equipe confortável com novo sistema

---

### 3.4 FASE 4: Limpeza (1 semana)

**Objetivo:** Arquivar legado e finalizar transição

#### Atividades

1. **Arquivar Dados Legados**
   ```sql
   -- Criar schema de arquivamento
   CREATE SCHEMA IF NOT EXISTS archive;
   
   -- Mover tabela patients_queue para arquivamento
   ALTER TABLE patients_queue SET SCHEMA archive;
   
   -- Criar view de compatibilidade para consultas legadas (se necessário)
   CREATE OR REPLACE VIEW public.patients_queue_readonly AS
   SELECT * FROM archive.patients_queue;
   
   -- Arquivar dados históricos
   CREATE TABLE archive.patients_queue_history AS
   SELECT * FROM archive.patients_queue WHERE resolved_at < NOW() - INTERVAL '90 days';
   
   DELETE FROM archive.patients_queue WHERE resolved_at < NOW() - INTERVAL '90 days';
   ```

2. **Remover Dupla Escrita**
   ```typescript
   // automation/src/config/features.ts
   export const FEATURE_FLAGS = {
     USE_JOURNEY_MODEL: true,
     DUAL_WRITE: false,  // Remover dupla escrita
     LOG_JOURNEY_EVENTS: true,
     ENABLE_AI_CLASSIFICATION: true,
     ENABLE_VACANCY_DETECTION: true
   };
   ```

3. **Atualizar Código**
   - Remover referências a `patients_queue` (exceto arquivamento)
   - Remover campos de compatibilidade em `patient_journeys`
   - Atualizar queries para usar apenas tabelas novas
   - Remover código legado do worker

4. **Finalizar Documentação**
   - Atualizar `AGENTS.md`
   - Atualizar `MAPA_DO_PROJETO.md`
   - Atualizar `resumo_contexto.md`
   - Criar guia de troubleshooting
   - Criar guia de manutenção

5. **Celebrar!** 🎉
   - Comunicar sucesso para equipe
   - Documentar lições aprendidas
   - Planejar próximos passos
   - Ajustar métricas de KPI

#### Checkpoint FASE 4

- [ ] Dados legados arquivados
- [ ] Dupla escrita removida
- [ ] Código atualizado
- [ ] Documentação finalizada
- [ ] Equipe treinada no novo sistema
- [ ] Lições aprendidas documentadas

#### Critério de Aprovação

- ✅ 100% do sistema usando novo modelo
- ✅ 0 dependências do legado
- ✅ Documentação completa e atualizada
- ✅ Equipe 100% adaptada ao novo sistema

---

## ✅ 4. Checklist de Pré-Produção

### 4.1 Banco de Dados

#### Migrations
- [ ] Todas as migrations aplicadas
- [ ] Migration `20260319000000_strategic_journey_tracking.sql` aplicada
- [ ] Migration `20260319200000_add_processed_flag_to_qualifications.sql` aplicada
- [ ] Sem erros nas migrations

#### Tabelas
- [ ] `patient_journeys` criada com todos campos
- [ ] `journey_messages` criada com todos campos
- [ ] `webhook_events_raw` criada com todos campos
- [ ] `message_qualifications` criada com todos campos
- [ ] `journey_events` criada com todos campos

#### Índices
- [ ] Índice `idx_patient_journeys_canonical_phone` criado
- [ ] Índice `idx_patient_journeys_data_exame` criado
- [ ] Índice `idx_patient_journeys_journey_status` criado
- [ ] Índice `idx_patient_journeys_last_event_at` criado
- [ ] Índice `idx_patient_journeys_needs_manual_action` criado
- [ ] Índice `idx_journey_messages_journey_id` criado
- [ ] Índice `idx_journey_messages_provider_message_id` criado
- [ ] Índice `idx_journey_messages_provider_chat_id` criado
- [ ] Índice `idx_journey_messages_instance_id` criado
- [ ] Índice `idx_journey_messages_phone_number` criado
- [ ] Índice `idx_journey_messages_status` criado
- [ ] Índice `idx_journey_messages_journey_id_status` criado
- [ ] Índice `idx_webhook_events_raw_dedupe_hash_unique` criado
- [ ] Índice `idx_webhook_events_raw_provider_event_id_unique` criado
- [ ] Índice `idx_webhook_events_raw_provider_message_id` criado
- [ ] Índice `idx_webhook_events_raw_received_at` criado
- [ ] Índice `idx_webhook_events_raw_processing_status` criado
- [ ] Índice `idx_webhook_events_raw_event_type` criado
- [ ] Índice `idx_message_qualifications_journey_id` criado
- [ ] Índice `idx_message_qualifications_message_id` criado
- [ ] Índice `idx_message_qualifications_classification` criado
- [ ] Índice `idx_message_qualifications_vacancy_signal` criado
- [ ] Índice `idx_message_qualifications_needs_manual_review` criado
- [ ] Índice `idx_message_qualifications_created_at` criado
- [ ] Índice `idx_journey_events_journey_id` criado
- [ ] Índice `idx_journey_events_message_id` criado
- [ ] Índice `idx_journey_events_event_at` criado
- [ ] Índice `idx_journey_events_event_type` criado
- [ ] Índice `idx_journey_events_source` criado
- [ ] Índice `idx_journey_events_journey_id_event_at` criado

#### Views
- [ ] View `strategic_followup_overview` criada
- [ ] View `vacancy_candidates_overview` criada
- [ ] View `journey_timeline_view` criada
- [ ] Todas views retornam dados corretos
- [ ] Performance das views aceitável (< 1 segundo)

#### RLS (Row Level Security)
- [ ] RLS habilitado em `patient_journeys`
- [ ] RLS habilitado em `journey_messages`
- [ ] RLS habilitado em `webhook_events_raw`
- [ ] RLS habilitado em `message_qualifications`
- [ ] RLS habilitado em `journey_events`
- [ ] Política "Allow authenticated operations" aplicada em todas tabelas

#### Triggers
- [ ] Trigger `trigger_patient_journeys_updated_at` criado
- [ ] Trigger `trigger_journey_messages_updated_at` criado
- [ ] Função `set_timestamp_updated_at()` funciona corretamente

#### Funções
- [ ] Função `normalize_phone_for_journey()` funciona corretamente
- [ ] Função retorna telefone no formato `+5511999999999`

#### Backup
- [ ] Backup do banco de dados realizado
- [ ] Backup testado (restore verificado)
- [ ] Backup armazenado em local seguro

---

### 4.2 Worker de Automação

#### Compilação
- [ ] Worker compila sem erros
- [ ] TypeScript sem erros
- [ ] Lint sem erros
- [ ] Todas dependências instaladas

#### Funções de Journey
- [ ] `createJourney()` funciona
- [ ] `markMessageAccepted()` funciona
- [ ] `markMessageDelivered()` funciona
- [ ] `markMessageRead()` funciona
- [ ] `markMessageReplied()` funciona
- [ ] `markMessageFailed()` funciona
- [ ] `resolveJourneyMessage()` funciona
- [ ] `classifyPatientResponse()` funciona
- [ ] `detectVacancySignal()` funciona

#### Scheduler de Follow-up
- [ ] Scheduler de follow-up funciona
- [ ] Follow-ups enviados no tempo correto
- [ ] Lógica de priorização funciona
- [ ] Sem follow-ups duplicados

#### Logs
- [ ] Logs sem erros críticos
- [ ] Logs com nível de detalhe apropriado
- [ ] Logs de journey events presentes
- [ ] Logs de message qualifications presentes

#### Performance
- [ ] Tempo de resposta aceitável (< 5 segundos)
- [ ] Sem memory leaks
- [ ] Sem CPU spikes
- [ ] Conexões com banco estáveis

---

### 4.3 Webhook

#### Endpoint
- [ ] Endpoint de webhook acessível
- [ ] Endpoint retorna 200 OK em caso de sucesso
- [ ] Endpoint retorna 4xx em caso de erro de cliente
- [ ] Endpoint retorna 5xx em caso de erro de servidor

#### Funções
- [ ] `saveWebhookRaw()` funciona
- [ ] Idempotência funciona (dedupe hash)
- [ ] `resolveJourneyMessage()` funciona
- [ ] `createJourneyEvent()` funciona
- [ ] `triggerClassification()` funciona

#### Eventos
- [ ] Eventos de `MessageAccepted` processados
- [ ] Eventos de `MessageDelivered` processados
- [ ] Eventos de `MessageRead` processados
- [ ] Eventos de `MessageReaction` processados
- [ ] Eventos de `MessageDeleted` processados

#### Deduplicação
- [ ] Sem duplicação de eventos
- [ ] Hash de dedupe funciona
- [ ] Eventos duplicados ignorados
- [ ] Índices únicos funcionando

#### Logs
- [ ] Logs de webhooks presentes
- [ ] Logs de erros detalhados
- [ ] Logs de idempotência presentes
- [ ] Logs de performance presentes

---

### 4.4 Edge Functions

#### Classificação de Mensagens
- [ ] Edge function `classify-message` funciona
- [ ] Edge function `process-classification` funciona
- [ ] Edge function `detect-vacancy` funciona

#### LLM Provider
- [ ] LLM provider configurado
- [ ] API key válida
- [ ] Sem erros de autenticação
- [ ] Sem erros de quota

#### Retries
- [ ] Retries configurados
- [ ] Retry com backoff exponencial
- [ ] Limite de retries respeitado
- [ ] Logs de retries presentes

#### Fallback
- [ ] Fallback configurado
- [ ] Fallback funciona em caso de erro
- [ ] Fallback não deixa sistema inoperante
- [ ] Logs de fallback presentes

#### Logs
- [ ] Logs de edge functions presentes
- [ ] Logs de prompts LLM presentes
- [ ] Logs de respostas LLM presentes
- [ ] Logs de erros detalhados

---

### 4.5 Frontend

#### Página Estratégica
- [ ] Página `Estrategico` carrega
- [ ] Dados da view `strategic_followup_overview` exibidos
- [ ] Dados da view `vacancy_candidates_overview` exibidos
- [ ] Timeline da view `journey_timeline_view` exibida

#### Filtros
- [ ] Filtros por status funcionam
- [ ] Filtros por data funcionam
- [ ] Filtros por prioridade funcionam
- [ ] Filtros por classificação funcionam

#### Ações
- [ ] Botão de confirmar funciona
- [ ] Botão de cancelar funciona
- [ ] Botão de marcar como pendente funciona
- [ ] Botão de preencher vaga funciona

#### Performance
- [ ] Tempo de carregamento < 3 segundos
- [ ] Sem erros de console
- [ ] Sem warnings de console
- [ ] Sem memory leaks

#### Responsividade
- [ ] Funciona em desktop
- [ ] Funciona em tablet
- [ ] Funciona em mobile
- [ ] Layout não quebra

---

## 🛡️ 5. Planos de Rollback

### 5.1 Se o Novo Sistema Falhar

#### Sintomas
- Taxa de sucesso < 80%
- Latência > 10 segundos
- Bugs críticos > 10 por dia
- Perda de dados detectada

#### Ações Imediatas

1. **Desativar Edge Functions de IA**
   ```typescript
   // automation/src/config/features.ts
   export const FEATURE_FLAGS = {
     USE_JOURNEY_MODEL: false,  // Desativar novo sistema
     DUAL_WRITE: true,  // Manter dupla escrita por segurança
     ENABLE_AI_CLASSIFICATION: false,  // Desativar IA
     ENABLE_VACANCY_DETECTION: false  // Desativar detecção de vagas
   };
   ```

2. **Parar Scheduler de Follow-up Novo**
   ```typescript
   // automation/src/schedulers/followup-scheduler.ts
   export class FollowUpScheduler {
     private enabled = false;  // Desativar scheduler novo
   }
   ```

3. **Continuar Usando Sistema Legado**
   - Worker usa apenas tabela `patients_queue`
   - Webhook grava apenas em `patients_queue`
   - Frontend usa apenas dados legados
   - Remover referências a novas tabelas

4. **Limpar Dados Inconsistentes**
   ```sql
   -- Identificar journeys incompletos
   SELECT
     pj.id,
     pj.patient_name,
     pj.journey_status,
     COUNT(jm.id) as message_count
   FROM patient_journeys pj
   LEFT JOIN journey_messages jm ON pj.id = jm.journey_id
   WHERE pj.journey_status NOT IN ('confirmed', 'cancelled', 'archived')
   GROUP BY pj.id, pj.patient_name, pj.journey_status
   HAVING COUNT(jm.id) = 0;
   
   -- Marcar para investigação
   UPDATE patient_journeys
   SET needs_manual_action = true,
       manual_priority = 'high',
       manual_note = 'Jornada incompleta - necessita revisão manual'
   WHERE id IN (
     -- IDs da query acima
   );
   ```

#### Tempo de Rollback
- **Desativação:** 5 minutos
- **Limpeza:** 30 minutos
- **Verificação:** 15 minutos
- **TOTAL:** ~50 minutos

#### Critérios de Retorno ao Normal
- ✅ Sistema legado estável por 24h
- ✅ Causa raiz identificada
- ✅ Correção implementada e testada
- ✅ Plano de mitigação em vigor

---

### 5.2 Se Houver Perda de Dados

#### Sintomas
- Discrepância > 5% entre legado e novo
- Registros ausentes em tabelas novas
- Webhooks não processados
- Eventos faltando na timeline

#### Ações Imediatas

1. **Parar Todo o Tráfego**
   ```typescript
   // automation/src/config/features.ts
   export const FEATURE_FLAGS = {
     USE_JOURNEY_MODEL: false,  // Parar novo sistema
     DUAL_WRITE: false,  // Parar dupla escrita
     SYSTEM_MAINTENANCE: true  // Entrar em modo manutenção
   };
   ```

2. **Restaurar Backup de patients_queue**
   ```bash
   # Restaurar backup mais recente
   supabase db restore --remote --backup-id <backup_id>
   
   # Verificar integridade
   supabase db execute --remote "
     SELECT
       COUNT(*) as total_patients,
       COUNT(DISTINCT id) as unique_ids
     FROM patients_queue;
   "
   ```

3. **Reconciliar Dados Legados com Novos**
   ```sql
   -- Identificar patients_queue sem journey
   SELECT
     pq.id,
     pq.patient_name,
     pq.phone1,
     pq.status,
     pq.created_at
   FROM patients_queue pq
   LEFT JOIN patient_journeys pj ON pq.id = pj.origin_queue_id
   WHERE pj.id IS NULL
   ORDER BY pq.created_at DESC;
   
   -- Recomendar ação manual
   -- Opção 1: Reenviar mensagem (se status = 'pending')
   -- Opção 2: Marcar como confirmado (se paciente respondeu)
   -- Opção 3: Cancelar (se paciente não compareceu)
   ```

4. **Investigar Causa da Perda**
   ```sql
   -- Verificar webhooks não processados
   SELECT
     received_at,
     event_type,
     provider_message_id,
     processing_status,
     processing_error
   FROM webhook_events_raw
   WHERE processing_status IN ('pending', 'failed')
   ORDER BY received_at DESC
   LIMIT 20;
   
   -- Verificar mensagens sem journey
   SELECT
     jm.id,
     jm.journey_id,
     jm.provider_message_id,
     jm.status,
     jm.created_at
   FROM journey_messages jm
   WHERE jm.journey_id IS NULL;
   
   -- Verificar journeys sem mensagens
   SELECT
     pj.id,
     pj.patient_name,
     pj.journey_status,
     pj.created_at
   FROM patient_journeys pj
   WHERE NOT EXISTS (
     SELECT 1 FROM journey_messages jm
     WHERE jm.journey_id = pj.id
   );
   ```

5. **Documentar Lições Aprendidas**
   - Causa raiz da perda de dados
   - Medidas de prevenção
   - Ações corretivas
   - Atualizar documentação

#### Tempo de Rollback
- **Parada do sistema:** 5 minutos
- **Restauração do backup:** 30 minutos
- **Reconciliação de dados:** 2-4 horas
- **Investigação:** 2-4 horas
- **TOTAL:** ~6-10 horas

#### Critérios de Retorno ao Normal
- ✅ Todos dados legados restaurados
- ✅ Discrepância < 1%
- ✅ Causa raiz identificada
- ✅ Prevenção implementada
- ✅ Documentação atualizada

---

### 5.3 Se Performance For Ruim

#### Sintomas
- Queries demoram > 5 segundos
- Timeout em operações frequentes
- CPU usage > 80%
- Memory usage > 80%

#### Ações Imediatas

1. **Identificar Queries Lentas**
   ```sql
   -- Habilitar pg_stat_statements
   CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
   
   -- Identificar queries mais lentas
   SELECT
     query,
     calls,
     total_time,
     mean_time,
     max_time
   FROM pg_stat_statements
   ORDER BY mean_time DESC
   LIMIT 10;
   ```

2. **Revisar Índices**
   ```sql
   -- Verificar índices não utilizados
   SELECT
     schemaname,
     tablename,
     indexname,
     idx_scan
   FROM pg_stat_user_indexes
   WHERE idx_scan = 0
     AND indexname NOT LIKE '%_pkey';
   
   -- Verificar índices faltando
   -- (Usar EXPLAIN ANALYZE em queries lentas)
   
   -- Adicionar índices se necessário
   CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_temp_new_index
   ON patient_journeys(some_field)
   WHERE condition;
   ```

3. **Revisar Queries das Views**
   ```sql
   -- Testar performance das views
   EXPLAIN ANALYZE
   SELECT * FROM strategic_followup_overview LIMIT 100;
   
   EXPLAIN ANALYZE
   SELECT * FROM vacancy_candidates_overview LIMIT 100;
   
   EXPLAIN ANALYZE
   SELECT * FROM journey_timeline_view WHERE journey_id = 'some-id' LIMIT 100;
   
   -- Otimizar queries se necessário
   -- Adicionar índices, reescrever queries, materializar views, etc.
   ```

4. **Adicionar Cache se Necessário**
   ```typescript
   // automation/src/cache/query-cache.ts
   export class QueryCache {
     private cache = new Map<string, { data: any; expiresAt: number }>();
     
     get(key: string): any {
       const entry = this.cache.get(key);
       if (!entry) return null;
       
       if (Date.now() > entry.expiresAt) {
         this.cache.delete(key);
         return null;
       }
       
       return entry.data;
     }
     
     set(key: string, data: any, ttlSeconds: number = 60): void {
       this.cache.set(key, {
         data,
         expiresAt: Date.now() + ttlSeconds * 1000
       });
     }
   }
   ```

5. **Otimizar Webhook**
   ```typescript
   // Processar webhooks de forma assíncrona
   import { Queue } from 'bull';
   
   const webhookQueue = new Queue('webhook-processing', {
     redis: process.env.REDIS_URL
   });
   
   webhookQueue.add('process-webhook', {
     payload: webhookPayload
   });
   
   webhookQueue.process('process-webhook', async (job) => {
     // Processar webhook de forma assíncrona
     await processWebhook(job.data.payload);
   });
   ```

#### Tempo de Rollback
- **Identificação do problema:** 30 minutos
- **Revisão de índices:** 30 minutos
- **Otimização de queries:** 1-2 horas
- **Implementação de cache:** 30 minutos
- **TOTAL:** ~2-3 horas

#### Critérios de Retorno ao Normal
- ✅ Queries demoram < 2 segundos
- ✅ CPU usage < 60%
- ✅ Memory usage < 60%
- ✅ Sem timeouts

---

## 📊 6. Monitoramento Pós-Implementação

### 6.1 KPIs a Monitorar

#### KPIs de Envio

1. **Taxa de Sucesso de Envio**
   ```sql
   SELECT
     DATE(created_at) as date,
     COUNT(*) as total_sent,
     COUNT(*) FILTER (WHERE status IN ('delivered', 'read', 'replied')) as delivered,
     COUNT(*) FILTER (WHERE status = 'failed') as failed,
     COUNT(*) FILTER (WHERE status IN ('delivered', 'read', 'replied')) * 100.0 / COUNT(*) as success_rate
   FROM journey_messages
   WHERE direction = 'outbound'
     AND created_at >= NOW() - INTERVAL '30 days'
   GROUP BY DATE(created_at)
   ORDER BY date DESC;
   ```
   - **Meta:** >= 95%
   - **Alerta:** < 90%
   - **Crítico:** < 80%

2. **Tempo Médio de Entrega**
   ```sql
   SELECT
     DATE(created_at) as date,
     AVG(EXTRACT(EPOCH FROM (delivered_at - created_at))) / 60 as avg_delivery_minutes,
     MIN(EXTRACT(EPOCH FROM (delivered_at - created_at))) / 60 as min_delivery_minutes,
     MAX(EXTRACT(EPOCH FROM (delivered_at - created_at))) / 60 as max_delivery_minutes
   FROM journey_messages
   WHERE direction = 'outbound'
     AND status IN ('delivered', 'read', 'replied')
     AND created_at >= NOW() - INTERVAL '30 days'
   GROUP BY DATE(created_at)
   ORDER BY date DESC;
   ```
   - **Meta:** < 2 minutos
   - **Alerta:** > 5 minutos
   - **Crítico:** > 10 minutos

#### KPIs de Resposta

3. **Taxa de Resposta de Pacientes**
   ```sql
   SELECT
     DATE(created_at) as date,
     COUNT(*) as total_sent,
     COUNT(*) FILTER (WHERE direction = 'inbound') as total_replies,
     COUNT(*) FILTER (WHERE direction = 'inbound') * 100.0 / COUNT(*) as reply_rate
   FROM journey_messages
   WHERE created_at >= NOW() - INTERVAL '30 days'
   GROUP BY DATE(created_at)
   ORDER BY date DESC;
   ```
   - **Meta:** >= 70%
   - **Alerta:** < 50%
   - **Crítico:** < 30%

4. **Tempo Médio de Resposta**
   ```sql
   SELECT
     DATE(created_at) as date,
     AVG(EXTRACT(EPOCH FROM (jm_inbound.created_at - jm_outbound.created_at))) / 3600 as avg_response_hours
   FROM journey_messages jm_outbound
   JOIN journey_messages jm_inbound ON jm_outbound.journey_id = jm_inbound.journey_id
   WHERE jm_outbound.direction = 'outbound'
     AND jm_inbound.direction = 'inbound'
     AND jm_outbound.created_at >= NOW() - INTERVAL '30 days'
   GROUP BY DATE(jm_outbound.created_at)
   ORDER BY date DESC;
   ```
   - **Meta:** < 24 horas
   - **Alerta:** > 48 horas
   - **Crítico:** > 72 horas

#### KPIs de IA

5. **Taxa de Classificação IA**
   ```sql
   SELECT
     DATE(created_at) as date,
     COUNT(*) as total_replies,
     COUNT(DISTINCT message_id) as classified_replies,
     COUNT(DISTINCT message_id) * 100.0 / COUNT(*) as classification_rate,
     AVG(confidence) as avg_confidence
   FROM message_qualifications mq
   JOIN journey_messages jm ON mq.message_id = jm.id
   WHERE jm.direction = 'inbound'
     AND mq.created_at >= NOW() - INTERVAL '30 days'
   GROUP BY DATE(mq.created_at)
   ORDER BY date DESC;
   ```
   - **Meta:** >= 95%
   - **Alerta:** < 90%
   - **Crítico:** < 80%

6. **Taxa de Ambiguidade**
   ```sql
   SELECT
     DATE(created_at) as date,
     COUNT(*) as total_classified,
     COUNT(*) FILTER (WHERE classification = 'ambigua') as ambiguous,
   COUNT(*) FILTER (WHERE classification = 'ambigua') * 100.0 / COUNT(*) as ambiguity_rate
   FROM message_qualifications
   WHERE created_at >= NOW() - INTERVAL '30 days'
   GROUP BY DATE(created_at)
   ORDER BY date DESC;
   ```
   - **Meta:** < 10%
   - **Alerta:** > 20%
   - **Crítico:** > 30%

#### KPIs de Vagas

7. **Taxa de Vagas Preenchidas**
   ```sql
   SELECT
     DATE(created_at) as date,
     COUNT(*) FILTER (WHERE vacancy_signal = true) as total_vacancies,
   COUNT(*) FILTER (WHERE vacancy_signal = true AND needs_manual_action = false) as filled_vacancies,
   COUNT(*) FILTER (WHERE vacancy_signal = true AND needs_manual_action = false) * 100.0 /
     NULLIF(COUNT(*) FILTER (WHERE vacancy_signal = true), 0) as fill_rate
   FROM message_qualifications
   WHERE created_at >= NOW() - INTERVAL '30 days'
   GROUP BY DATE(created_at)
   ORDER BY date DESC;
   ```
   - **Meta:** >= 70%
   - **Alerta:** < 50%
   - **Crítico:** < 30%

8. **Tempo Médio de Encaixe**
   ```sql
   SELECT
     DATE(created_at) as date,
     AVG(EXTRACT(EPOCH FROM (confirmed_at - created_at))) / 3600 as avg_fill_hours
   FROM patient_journeys
   WHERE journey_status = 'confirmed'
     AND confirmed_at IS NOT NULL
     AND created_at >= NOW() - INTERVAL '30 days'
   GROUP BY DATE(created_at)
   ORDER BY date DESC;
   ```
   - **Meta:** < 24 horas
   - **Alerta:** > 48 horas
   - **Crítico:** > 72 horas

---

### 6.2 Alertas a Configurar

#### Alertas de Webhook

1. **Webhook com > 10% de Falha**
   ```typescript
   // automation/src/monitors/webhook-monitor.ts
   async function checkWebhookFailureRate() {
     const result = await supabase.rpc('calculate_webhook_failure_rate', {
       since: '1 hour ago'
     });
     
     if (result.data.failure_rate > 0.1) {
       await sendAlert({
         severity: 'high',
         title: 'Webhook com alta taxa de falha',
         message: `Taxa de falha: ${(result.data.failure_rate * 100).toFixed(2)}%`,
         metric: 'webhook_failure_rate',
         threshold: 0.1,
         currentValue: result.data.failure_rate
       });
     }
   }
   ```
   - **Severidade:** Alta
   - **Ação:** Investigar causa, corrigir bugs

2. **Webhook Não Respondendo**
   - **Sintoma:** Timeout > 30 segundos
   - **Severidade:** Crítica
   - **Ação:** Reiniciar servidor, verificar rede

#### Alertas de Worker

3. **Worker com > 5% de Erro**
   ```typescript
   async function checkWorkerErrorRate() {
     const result = await supabase.rpc('calculate_worker_error_rate', {
       since: '1 hour ago'
     });
     
     if (result.data.error_rate > 0.05) {
       await sendAlert({
         severity: 'medium',
         title: 'Worker com alta taxa de erro',
         message: `Taxa de erro: ${(result.data.error_rate * 100).toFixed(2)}%`,
         metric: 'worker_error_rate',
         threshold: 0.05,
         currentValue: result.data.error_rate
       });
     }
   }
   ```
   - **Severidade:** Média
   - **Ação:** Revisar logs, corrigir bugs

4. **Worker Não Respondendo**
   - **Sintoma:** Sem heartbeats há > 5 minutos
   - **Severidade:** Crítica
   - **Ação:** Reiniciar worker, verificar recursos

#### Alertas de LLM

5. **LLM com > 20% de Erro ou Timeout**
   ```typescript
   async function checkLLMFailureRate() {
     const result = await supabase.rpc('calculate_llm_failure_rate', {
       since: '1 hour ago'
     });
     
     if (result.data.failure_rate > 0.2) {
       await sendAlert({
         severity: 'high',
         title: 'LLM com alta taxa de falha',
         message: `Taxa de falha: ${(result.data.failure_rate * 100).toFixed(2)}%`,
         metric: 'llm_failure_rate',
         threshold: 0.2,
         currentValue: result.data.failure_rate
       });
     }
   }
   ```
   - **Severidade:** Alta
   - **Ação:** Verificar API key, quota, provider

6. **LLM com Baixa Confiança**
   - **Sintoma:** Média de confiança < 0.7
   - **Severidade:** Média
   - **Ação:** Revisar prompt, modelo

#### Alertas de Vagas

7. **Fila de Pendentes > 100 Pacientes**
   ```typescript
   async function checkPendingQueueSize() {
     const { count } = await supabase
       .from('patient_journeys')
       .select('*', { count: 'exact', head: true })
       .eq('journey_status', 'pending_manual');
     
     if (count > 100) {
       await sendAlert({
         severity: 'medium',
         title: 'Fila de pendentes muito grande',
         message: `Pendentes: ${count}`,
         metric: 'pending_queue_size',
         threshold: 100,
         currentValue: count
       });
     }
   }
   ```
   - **Severidade:** Média
   - **Ação:** Alocar mais recursos humanos

8. **Vagas Não Resolvidas > 24h**
   ```sql
   SELECT
     COUNT(*) as unresolved_vacancies
   FROM patient_journeys pj
   WHERE pj.needs_manual_action = true
     AND pj.journey_status = 'pending_manual'
     AND pj.pending_at < NOW() - INTERVAL '24 hours';
   ```
   - **Sintoma:** Count > 10
   - **Severidade:** Alta
   - **Ação:** Priorizar resolução de vagas

#### Alertas de Performance

9. **Queries Lentas**
   - **Sintoma:** Query demora > 5 segundos
   - **Severidade:** Média
   - **Ação:** Revisar índices, otimizar queries

10. **CPU Usage > 80%**
    - **Sintoma:** Média de CPU > 80% por 5 minutos
    - **Severidade:** Alta
    - **Ação:** Escalar recursos, otimizar código

---

### 6.3 Relatórios Diários

#### Status do Worker

```typescript
// automation/src/reports/daily-worker-report.ts
export async function generateDailyWorkerReport() {
  const today = new Date().toISOString().split('T')[0];
  
  const report = {
    date: today,
    uptime: await getWorkerUptime(),
    totalTasksProcessed: await getTotalTasksProcessed(),
    successRate: await getWorkerSuccessRate(),
    errorRate: await getWorkerErrorRate(),
    averageTaskDuration: await getAverageTaskDuration(),
    memoryUsage: await getMemoryUsage(),
    cpuUsage: await getCpuUsage(),
    topErrors: await getTopErrors()
  };
  
  await sendReport({
    channel: 'slack',
    report: 'worker_daily',
    data: report
  });
  
  return report;
}
```

#### Status do Webhook

```typescript
export async function generateDailyWebhookReport() {
  const today = new Date().toISOString().split('T')[0];
  
  const report = {
    date: today,
    totalWebhooksReceived: await getTotalWebhooksReceived(),
    totalWebhooksProcessed: await getTotalWebhooksProcessed(),
    successRate: await getWebhookSuccessRate(),
    failureRate: await getWebhookFailureRate(),
    averageProcessingTime: await getAverageWebhookProcessingTime(),
    duplicateWebhooks: await getDuplicateWebhooks(),
    topFailureReasons: await getTopFailureReasons()
  };
  
  await sendReport({
    channel: 'slack',
    report: 'webhook_daily',
    data: report
  });
  
  return report;
}
```

#### Status das Edge Functions

```typescript
export async function generateDailyEdgeFunctionReport() {
  const today = new Date().toISOString().split('T')[0];
  
  const report = {
    date: today,
    totalInvocations: await getTotalInvocations(),
    successRate: await getEdgeFunctionSuccessRate(),
    averageExecutionTime: await getAverageExecutionTime(),
    llmCalls: await getLLMCalls(),
    llmSuccessRate: await getLLMSuccessRate(),
    llmAverageConfidence: await getLLMAverageConfidence(),
    topErrors: await getTopEdgeFunctionErrors()
  };
  
  await sendReport({
    channel: 'slack',
    report: 'edge_function_daily',
    data: report
  });
  
  return report;
}
```

#### Métricas de IA

```typescript
export async function generateDailyAIReport() {
  const today = new Date().toISOString().split('T')[0];
  
  const report = {
    date: today,
    totalClassifications: await getTotalClassifications(),
    successRate: await getClassificationSuccessRate(),
    averageConfidence: await getAverageConfidence(),
    ambiguityRate: await getAmbiguityRate(),
    classificationsByType: await getClassificationsByType(),
    topClassifications: await getTopClassifications(),
    manualReviewRate: await getManualReviewRate()
  };
  
  await sendReport({
    channel: 'slack',
    report: 'ai_daily',
    data: report
  });
  
  return report;
}
```

#### Métricas de Vagas

```typescript
export async function generateDailyVacancyReport() {
  const today = new Date().toISOString().split('T')[0];
  
  const report = {
    date: today,
    totalVacanciesDetected: await getTotalVacanciesDetected(),
    totalVacanciesFilled: await getTotalVacanciesFilled(),
    fillRate: await getVacancyFillRate(),
    averageFillTime: await getAverageFillTime(),
    currentPendingVacancies: await getCurrentPendingVacancies(),
    topVacancyReasons: await getTopVacancyReasons(),
    fillTimeByPriority: await getFillTimeByPriority()
  };
  
  await sendReport({
    channel: 'slack',
    report: 'vacancy_daily',
    data: report
  });
  
  return report;
}
```

---

## 🧪 7. Dicas de Implementação

### 7.1 Testes Manuais

#### Teste 1: Enviar Mensagem e Verificar Lifecycle

**Objetivo:** Verificar se o lifecycle completo de mensagem funciona

**Passos:**
1. Criar novo paciente no dashboard
2. Enviar mensagem via worker
3. Verificar se `patient_journey` foi criado
4. Verificar se `journey_message` foi criada
5. Aguardar webhook de `MessageAccepted`
6. Verificar se status mudou para `accepted`
7. Aguardar webhook de `MessageDelivered`
8. Verificar se status mudou para `delivered`
9. Simular resposta do paciente
10. Aguardar webhook de `MessageReaction`
11. Verificar se status mudou para `replied`
12. Verificar se classificação IA foi criada
13. Verificar se vacancy signal foi detectado (se aplicável)

**Verificações:**
- ✅ Journey criada com status `queued`
- ✅ Mensagem criada com status `queued`
- ✅ Mensagem mudou para `sending`
- ✅ Mensagem mudou para `accepted` (webhook)
- ✅ Mensagem mudou para `delivered` (webhook)
- ✅ Status da journey mudou para `delivered_waiting_reply`
- ✅ Resposta do paciente criada (inbound)
- ✅ Classificação IA criada
- ✅ Ação recomendada aplicada (se aplicável)

---

#### Teste 2: Simular Resposta do Paciente

**Objetivo:** Verificar se a classificação IA funciona

**Passos:**
1. Enviar mensagem para paciente
2. Aguardar confirmação de entrega
3. Enviar resposta: "Sim, vou comparecer"
4. Verificar classificação IA
5. Verificar se status mudou para `confirmed`
6. Repetir com diferentes respostas

**Respostas para testar:**
- "Sim, vou comparecer" → `confirmado_positivo`
- "Não vou poder" → `nao_pode_comparecer`
- "Quero remarcar" → `quer_remarcar`
- "Cancelar" → `cancelado`
- "Qual horário?" → `duvida`
- "Ok" → `ambigua`

**Verificações:**
- ✅ Classificação correta para cada tipo de resposta
- ✅ Confiança >= 0.7 para respostas claras
- ✅ Ação recomendada correta aplicada
- ✅ Status da journey atualizado corretamente

---

#### Teste 3: Verificar Auto-Confirmação

**Objetivo:** Verificar se a auto-confirmação funciona

**Passos:**
1. Enviar mensagem para paciente
2. Aguardar resposta positiva
3. Verificar se status mudou para `confirmed`
4. Verificar se `confirmed_at` foi preenchido
5. Verificar se `needs_manual_action = false`

**Verificações:**
- ✅ Status mudou para `confirmed`
- ✅ `confirmed_at` preenchido
- ✅ `needs_manual_action = false`
- ✅ Journey arquivada (se configurado)

---

#### Teste 4: Verificar Detecção de Vaga

**Objetivo:** Verificar se a detecção de vaga funciona

**Passos:**
1. Enviar mensagem para paciente
2. Aguardar resposta negativa
3. Verificar se `vacancy_signal = true`
4. Verificar se `vacancy_reason` foi preenchido
5. Verificar se `needs_manual_action = true`
6. Verificar se paciente aparece em `vacancy_candidates_overview`

**Verificações:**
- ✅ `vacancy_signal = true`
- ✅ `vacancy_reason` preenchido
- ✅ `needs_manual_action = true`
- ✅ Paciente aparece em `vacancy_candidates_overview`
- ✅ Priorização correta

---

### 7.2 Testes de Carga

#### Teste 1: 100 Mensagens Simultâneas

**Objetivo:** Verificar se o sistema aguenta 100 mensagens simultâneas

**Passos:**
1. Criar 100 pacientes no dashboard
2. Disparar envio simultâneo de 100 mensagens
3. Monitorar CPU, memory e latency
4. Verificar se todas mensagens foram enviadas
5. Verificar se todas journeys foram criadas
6. Verificar se todas mensagens foram entregues

**Métricas:**
- ✅ Taxa de sucesso >= 95%
- ✅ Latência média < 5 segundos
- ✅ CPU usage < 80%
- ✅ Memory usage < 80%
- ✅ Sem timeouts
- ✅ Sem erros

---

#### Teste 2: 100 Webhooks Simultâneos

**Objetivo:** Verificar se o sistema aguenta 100 webhooks simultâneos

**Passos:**
1. Enviar 100 mensagens
2. Aguardar webhooks de confirmação
3. Monitorar CPU, memory e latency
4. Verificar se todos webhooks foram processados
5. Verificar se todos eventos foram criados
6. Verificar se todos status foram atualizados

**Métricas:**
- ✅ Taxa de sucesso >= 95%
- ✅ Latência média < 2 segundos
- ✅ CPU usage < 80%
- ✅ Memory usage < 80%
- ✅ Sem duplicação de eventos
- ✅ Sem eventos perdidos

---

#### Teste 3: 100 Classificações Simultâneas

**Objetivo:** Verificar se o sistema aguenta 100 classificações simultâneas

**Passos:**
1. Enviar 100 mensagens
2. Simular 100 respostas simultâneas
3. Aguardar classificações IA
4. Monitorar CPU, memory e latency
5. Verificar se todas classificações foram criadas
6. Verificar se todas ações recomendadas foram aplicadas

**Métricas:**
- ✅ Taxa de sucesso >= 95%
- ✅ Latência média < 10 segundos
- ✅ CPU usage < 80%
- ✅ Memory usage < 80%
- ✅ Sem timeouts LLM
- ✅ Confiança média >= 0.7

---

### 7.3 Testes de Borda

#### Teste 1: Eventos Fora de Ordem

**Objetivo:** Verificar se o sistema lida com eventos fora de ordem

**Passos:**
1. Enviar mensagem
2. Receber webhook de `MessageDelivered` antes de `MessageAccepted`
3. Verificar se sistema lida corretamente
4. Verificar se status final é correto

**Verificações:**
- ✅ Sistema não quebra
- ✅ Status final correto
- ✅ Timeline completa (mesmo fora de ordem)

---

#### Teste 2: Duplicação de Webhooks

**Objetivo:** Verificar se o sistema lida com webhooks duplicados

**Passos:**
1. Enviar mensagem
2. Receber webhook de `MessageAccepted`
3. Receber o mesmo webhook novamente
4. Verificar se sistema ignora duplicata

**Verificações:**
- ✅ Duplicata ignorada
- ✅ Sem eventos duplicados
- ✅ Sem dados inconsistentes

---

#### Teste 3: Respostas Ambíguas

**Objetivo:** Verificar se o sistema lida com respostas ambíguas

**Passos:**
1. Enviar mensagem
2. Responder: "ok", "hm", "talvez"
3. Verificar classificação
4. Verificar se `needs_manual_review = true`

**Verificações:**
- ✅ Classificação = `ambigua`
- ✅ `needs_manual_review = true`
- ✅ Ação recomendada = `manual_review`

---

#### Teste 4: Respostas com Áudio/Imagem

**Objetivo:** Verificar se o sistema lida com áudio/imagem

**Passos:**
1. Enviar mensagem
2. Responder com áudio ou imagem
3. Verificar classificação
4. Verificar se sistema lida corretamente

**Verificações:**
- ✅ Sistema não quebra
- ✅ Classificação = `ambigua` ou `duvida`
- ✅ `needs_manual_review = true`

---

## 💬 8. Estratégia de Comunicação

### 8.1 Para Equipe

#### Treinamento sobre Nova Página Estratégica

**Objetivo:** Capacitar equipe para usar a nova página estratégica

**Tópicos:**
1. **Visão Geral da Página Estratégica**
   - O que é a página estratégica
   - Por que ela foi criada
   - Quais são os benefícios

2. **Componentes da Página**
   - Cards de métricas (KPIs)
   - Lista de follow-ups pendentes
   - Lista de vagas disponíveis
   - Timeline de eventos

3. **Como Usar a Página**
   - Navegação entre abas
   - Filtragem de dados
   - Ações disponíveis (confirmar, cancelar, etc.)
   - Visualização de timeline

4. **Interpretação de Status**
   - O que significa cada status de jornada
   - O que significa cada classificação
   - Como priorizar ações

**Material de Apoio:**
- Tutorial em vídeo (10-15 minutos)
- Documentação escrita (guia rápido)
- Sessão de Q&A (1 hora)
- Hands-on (prática guiada)

---

#### Explicação das Regras de IA

**Objetivo:** Explicar como a IA classifica respostas

**Tópicos:**
1. **Como a IA Funciona**
   - Modelo usado (GPT-4o-mini)
   - Prompt de classificação
   - Nível de confiança

2. **Tipos de Classificação**
   - `confirmado_positivo` → Paciente confirmou
   - `quer_remarcar` → Paciente quer remarcar
   - `nao_pode_comparecer` → Paciente não pode comparecer
   - `cancelado` → Paciente cancelou
   - `duvida` → Paciente tem dúvida
   - `ambigua` → Resposta ambígua
   - `sem_resposta_util` → Resposta sem utilidade

3. **Ações Recomendadas**
   - `close_as_confirmed` → Fechar como confirmado
   - `move_to_pending` → Mover para pendentes
   - `flag_vacancy` → Marcar como vaga
   - `manual_review` → Revisão manual
   - `ignore` → Ignorar

4. **Quando Revisar Manualmente**
   - Confiança < 0.7
   - Classificação = `ambigua`
   - Classificação = `duvida`
   - `needs_manual_review = true`

**Material de Apoio:**
- Tabela de classificação com exemplos
- Guia de revisão manual
- Exemplos de respostas e classificações

---

#### Processo de Tratamento de Pendentes

**Objetivo:** Explicar como tratar pacientes pendentes

**Tópicos:**
1. **Identificar Pendentes**
   - Usar página estratégica
   - Filtrar por status `pending_manual`
   - Verificar prioridade

2. **Priorizar Pendentes**
   - Urgência (urgent > high > medium > low)
   - Proximidade do exame
   - Tipo de classificação

3. **Ações Disponíveis**
   - Confirmar (se paciente respondeu positivamente)
   - Cancelar (se paciente não comparecerá)
   - Remarcar (se paciente quer novo horário)
   - Chamar (se necessário)
   - Arquivar (se resolvido)

4. **Documentar Ação**
   - Adicionar nota manual
   - Atualizar status
   - Arquivar jornada

**Material de Apoio:**
- Fluxograma de tratamento
- Checklist de ações
- Template de notas manuais

---

#### Processo de Preenchimento de Vagas

**Objetivo:** Explicar como preencher vagas

**Tópicos:**
1. **Identificar Vagas**
   - Usar página de vagas disponíveis
   - Verificar `vacancy_candidates_overview`
   - Filtrar por prioridade

2. **Priorizar Vagas**
   - Urgência do exame
   - Prioridade do paciente que liberou vaga
   - Disponibilidade de aguardantes

3. **Encontrar Substituto**
   - Usar lista de aguardantes
   - Verificar compatibilidade de procedimento
   - Verificar disponibilidade de horário

4. **Preencher Vaga**
   - Atualizar dados do paciente
   - Confirmar novo paciente
   - Documentar troca

**Material de Apoio:**
- Lista de aguardantes
- Checklist de preenchimento
- Template de documentação

---

### 8.2 Para Pacientes

#### Nenhuma Mudança Visível

**Objetivo:** Garantir que pacientes não percebam mudança

**Comunicação:**
- Não é necessário comunicar mudança técnica
- Pacientes continuam recebendo mesmas mensagens
- Interface do WhatsApp não muda
- Experiência do paciente melhora (seguimento oportuno)

---

#### Melhor Experiência (Follow-up Oportuno)

**Benefícios para Pacientes:**
1. **Mensagens Mais Relevantes**
   - Apenas follow-ups necessários
   - Sem spam de mensagens

2. **Respostas Mais Rápidas**
   - Follow-ups automáticos
   - Respostas mais rápidas às dúvidas

3. **Menos Confusão**
   - Mensagens mais claras
   - Menos necessidade de contato manual

---

#### Menos Mensagens Desnecessárias

**Benefícios:**
1. **Menos Spam**
   - Apenas mensagens relevantes
   - Apenas follow-ups necessários

2. **Melhor UX**
   - Pacientes menos incomodados
   - Experiência mais positiva

---

## 📝 Apêndice

### A. SQL Queries Úteis

#### Query 1: Verificar Consistência de Dados

```sql
-- Verificar se todos patients_queue têm journey
SELECT
  COUNT(*) as total_queue,
  COUNT(DISTINCT journey_id) as with_journey,
  COUNT(*) - COUNT(DISTINCT journey_id) as without_journey
FROM patients_queue
WHERE journey_id IS NOT NULL;

-- Verificar se todos journeys têm mensagem
SELECT
  COUNT(*) as total_journeys,
  COUNT(DISTINCT jm.id) as with_messages,
  COUNT(*) - COUNT(DISTINCT jm.id) as without_messages
FROM patient_journeys pj
LEFT JOIN journey_messages jm ON pj.id = jm.journey_id;

-- Verificar se todas classificações têm mensagem
SELECT
  COUNT(*) as total_qualifications,
  COUNT(DISTINCT mq.message_id) as with_messages,
  COUNT(*) - COUNT(DISTINCT mq.message_id) as without_messages
FROM message_qualifications mq
LEFT JOIN journey_messages jm ON mq.message_id = jm.id;
```

---

#### Query 2: Identificar Anomalias

```sql
-- Journeys sem mensagens
SELECT
  pj.id,
  pj.patient_name,
  pj.journey_status,
  pj.created_at
FROM patient_journeys pj
WHERE NOT EXISTS (
  SELECT 1 FROM journey_messages jm
  WHERE jm.journey_id = pj.id
);

-- Mensagens sem journey
SELECT
  jm.id,
  jm.phone_number,
  jm.status,
  jm.created_at
FROM journey_messages jm
WHERE NOT EXISTS (
  SELECT 1 FROM patient_journeys pj
  WHERE pj.id = jm.journey_id
);

-- Classificações sem mensagem
SELECT
  mq.id,
  mq.classification,
  mq.confidence,
  mq.created_at
FROM message_qualifications mq
WHERE NOT EXISTS (
  SELECT 1 FROM journey_messages jm
  WHERE jm.id = mq.message_id
);

-- Webhooks não processados
SELECT
  wer.id,
  wer.event_type,
  wer.received_at,
  wer.processing_status,
  wer.processing_error
FROM webhook_events_raw wer
WHERE wer.processing_status IN ('pending', 'failed')
ORDER BY wer.received_at DESC
LIMIT 20;
```

---

#### Query 3: Métricas Diárias

```sql
-- Métricas diárias de envio
SELECT
  DATE(created_at) as date,
  COUNT(*) as total_sent,
  COUNT(*) FILTER (WHERE status IN ('delivered', 'read', 'replied')) as delivered,
  COUNT(*) FILTER (WHERE status = 'failed') as failed,
  COUNT(*) FILTER (WHERE status IN ('delivered', 'read', 'replied')) * 100.0 / COUNT(*) as success_rate
FROM journey_messages
WHERE direction = 'outbound'
  AND created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Métricas diárias de resposta
SELECT
  DATE(created_at) as date,
  COUNT(*) as total_sent,
  COUNT(*) FILTER (WHERE direction = 'inbound') as total_replies,
  COUNT(*) FILTER (WHERE direction = 'inbound') * 100.0 / COUNT(*) as reply_rate
FROM journey_messages
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Métricas diárias de IA
SELECT
  DATE(created_at) as date,
  COUNT(*) as total_classified,
  COUNT(*) FILTER (WHERE confidence >= 0.7) as high_confidence,
  COUNT(*) FILTER (WHERE confidence < 0.7) as low_confidence,
  AVG(confidence) as avg_confidence
FROM message_qualifications
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

---

### B. Checklist Final

#### Antes do Deploy

- [ ] Migrations aplicadas com sucesso
- [ ] Todas tabelas criadas
- [ ] Todas views funcionando
- [ ] Todos índices criados
- [ ] RLS configurado
- [ ] Backup realizado
- [ ] Worker compilando sem erros
- [ ] Webhook funcionando
- [ ] Edge functions funcionando
- [ ] Frontend carregando
- [ ] Tests manuais passando
- [ ] Tests de carga passando
- [ ] Tests de borda passando
- [ ] Planos de rollback documentados
- [ ] Alertas configurados
- [ ] Relatórios diários configurados
- [ ] Equipe treinada
- [ ] Documentação atualizada

---

#### Após o Deploy

- [ ] Migrations verificadas
- [ ] Logs sem erros críticos
- [ ] Performance aceitável
- [ ] Dupla escrita funcionando
- [ ] Dados consistentes
- [ ] Métricas monitoradas
- [ ] Alertas funcionando
- [ ] Relatórios gerados
- [ ] Equipe usando novo sistema
- [ ] Feedback coletado
- [ ] Bugs corrigidos
- [ ] Documentação atualizada

---

#### FASE 1 Concluída

- [ ] 1 semana de observação completada
- [ ] Logs analisados
- [ ] Dados comparados
- [ ] Anomalias identificadas
- [ ] Sem erros críticos
- [ ] Performance estável
- [ ] Aprovação para FASE 2

---

#### FASE 2 Concluída

- [ ] 50% do tráfego no novo sistema
- [ ] Monitoramento intenso completado
- [ ] Bugs corrigidos
- [ ] Feedback coletado
- [ ] Performance aceitável
- [ ] Aprovação para FASE 3

---

#### FASE 3 Concluída

- [ ] 100% do tráfego no novo sistema
- [ ] Funcionalidades completas ativas
- [ ] Monitoramento contínuo estabelecido
- [ ] Sistema estável por 1 semana
- [ ] Equipe confortável
- [ ] Aprovação para FASE 4

---

#### FASE 4 Concluída

- [ ] Dados legados arquivados
- [ ] Dupla escrita removida
- [ ] Código atualizado
- [ ] Documentação finalizada
- [ ] Equipe 100% adaptada
- [ ] Transição completada com sucesso! 🎉

---

## 🎓 Lições Aprendidas

Durante o desenvolvimento deste guia, identificamos várias lições importantes:

1. **Planejamento é Crítico**
   - Transições complexas exigem planejamento detalhado
   - Fases graduais reduzem risco
   - Planos de rollback são essenciais

2. **Dupla Escrita é Segura**
   - Permite comparação de sistemas
   - Reduz risco de perda de dados
   - Facilita rollback rápido

3. **Monitoramento é Essencial**
   - KPIs claros permitem detecção rápida de problemas
   - Alertas automáticos aceleram resposta
   - Relatórios diários fornecem visibilidade

4. **Testes Completos Imprevistos**
   - Testes de carga revelam limites
   - Testes de borda cobrem cenários extremos
   - Testes manuais validam UX

5. **Comunicação é Chave**
   - Equipe precisa de treinamento
   - Pacientes não devem perceber mudança
   - Documentação clara facilita manutenção

6. **Otimização de Tokens é Crucial**
   - Seguir `AGENTS.md` rigorosamente
   - Reutilizar código em `packages/shared/`
   - Economia real de ~2,630 tokens/request

---

## 📞 Suporte

Se encontrar problemas durante a transição:

1. **Verificar Logs**
   - Worker logs: `automation/logs/worker.log`
   - Supabase logs: `supabase logs --service <service>`

2. **Verificar Queries Úteis**
   - Consultar apêndice A para SQL queries úteis

3. **Verificar Planos de Rollback**
   - Consultar seção 5 para planos de rollback

4. **Consultar Documentação**
   - `AGENTS.md` - Instruções obrigatórias
   - `TOKEN_OPTIMIZATION_PHASE_1.md` - Otimizações
   - `MAPA_DO_PROJETO.md` - Arquitetura
   - `resumo_contexto.md` - Contexto geral

---

**Lembrete:** Esta transição é uma virada operacional crítica. Siga este guia rigorosamente e não pule etapas. A segurança e estabilidade do sistema são prioridade absoluta.

**Boa sorte! 🚀**
