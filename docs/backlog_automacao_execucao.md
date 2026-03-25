# Backlog de Execucao - Automacao PRN-Vigilante

Data: 13/03/2026
Status: Planejado para implementacao
Escopo: Worker de automacao WhatsApp + base SQL + operacao

---

## Objetivo

Transformar o plano conceitual da automacao em uma sequencia executavel de sprints, com dependencias, entregaveis, criterios de aceite e riscos.

---

## Visao Geral

O projeto ja possui:

- Dashboard funcional em `/src`
- Schema inicial em `/supabase/migrations`
- Esqueleto do worker em `/automation/src`
- Planejamento detalhado em `docs/migrations_contexto.md`

O projeto ainda nao possui:

- Migrations da automacao executadas
- Core do worker implementado
- Observabilidade operacional completa
- Regras LGPD e opt-out integradas ao fluxo de envio
- Testes ponta a ponta da automacao

---

## Ordem Recomendada

1. Sprint 1 - Banco e contratos
2. Sprint 2 - Driver e fila
3. Sprint 3 - Worker e operacao
4. Sprint 4 - Compliance, humanizacao e testes

---

## Sprint 1 - Banco e Contratos

### Objetivo

Materializar a base transacional da automacao no banco e alinhar os contratos usados por frontend e worker.

### Itens

- Revisar `docs/migrations_contexto.md` e corrigir inconsistencias antes de executar SQL
- Criar migration unica ou migrations separadas com:
  - ALTER TABLE em `patients_queue`
  - ALTER TABLE em `whatsapp_instances`
  - CREATE TABLE de `message_logs`
  - CREATE TABLE de `worker_heartbeats`
  - CREATE TABLE de `patient_consent`
  - CREATE TABLE de `message_blocks`
  - CREATE INDEX planejados
  - CREATE FUNCTION `claim_next_message`
  - CREATE FUNCTION `release_expired_locks`
  - CREATE VIEW `dashboard_realtime_metrics`
  - CREATE VIEW `expired_locks`
- Validar manualmente as funcoes SQL no Supabase
- Regenerar ou alinhar `src/lib/supabase/types.ts`
- Expandir `automation/src/types/index.ts` com tipos reais da automacao
- Revisar `src/types/index.ts` para refletir o schema novo sem drift

### Entregaveis

- Arquivos SQL em `supabase/migrations/`
- Schema novo aplicado
- Tipos do frontend e do worker alinhados
- Documento de divergencias corrigido

### Criterios de Aceite

- Tabelas, colunas, indices, views e funcoes existem no banco
- `claim_next_message` retorna uma mensagem valida ou vazio sem erro
- `release_expired_locks` libera locks expirados corretamente
- Tipos do app nao usam campos inexistentes no schema

### Riscos

- A view planejada usa `message_logs.created_at`, mas a tabela planejada mostra `sent_at`
- O frontend hoje depende de campos de instancias ainda nao refletidos no schema gerado
- Mudancas de schema podem quebrar `src/services/evolution.ts`

---

## Sprint 2 - Driver, Fila e Selecao de Instancia

### Objetivo

Criar a camada tecnica que permite ao worker buscar a proxima mensagem, escolher a melhor instancia e atualizar estados com seguranca.

### Itens

- Refatorar `automation/src/services/supabase.ts` para expor metodos de negocio:
  - `claimNextMessage()`
  - `markMessageDelivered()`
  - `markMessageFailed()`
  - `releaseExpiredLocks()`
  - `upsertHeartbeat()`
  - `getSystemConfig()`
- Endurecer `automation/src/services/evolution.ts` com:
  - timeout
  - retry classificado
  - health check
  - retorno padronizado de erro
- Definir `QueueManager` em `automation/src/engine/` ou `automation/src/services/`
- Definir `InstanceSelector` usando:
  - status conectado
  - menor uso
  - ultima atividade
  - estado de protecao da instancia
- Definir transicoes oficiais de status:
  - `queued -> sending -> delivered`
  - `queued -> sending -> failed`
  - `queued -> cancelled`

### Entregaveis

- Driver Supabase operacional para o worker
- Driver Evolution com tratamento consistente
- Queue Manager implementado
- Instance Selector implementado

### Criterios de Aceite

- Dois workers em paralelo nao processam a mesma mensagem
- Mensagens nao aprovadas nao sao processadas
- Instancias desconectadas nao sao selecionadas
- Falhas da Evolution retornam erro tratavel e nao quebram o processo inteiro

### Riscos

- Usar `SUPABASE_ANON_KEY` no worker pode ser insuficiente para operacao real
- Duplicacao entre o driver do frontend e o driver do worker pode gerar comportamentos diferentes
- Falta de classificacao de erro pode causar retry incorreto

---

## Sprint 3 - Worker, Heartbeat e Operacao

### Objetivo

Colocar o motor da automacao para rodar continuamente com controle de pausa, heartbeat, limpeza de lock e rastreabilidade minima.

### Itens

- Implementar loop principal em `automation/src/index.ts`
- Criar `WorkerEngine` com:
  - polling controlado
  - leitura de `system_config`
  - pausa global por `is_paused`
  - graceful shutdown
  - tratamento de excecoes sem derrubar o processo
- Criar heartbeat periodico em `worker_heartbeats`
- Executar liberacao periodica de locks expirados
- Criar logs estruturados minimos para:
  - worker iniciado
  - mensagem claimada
  - envio realizado
  - envio falhou
  - lock expirado liberado
- Incrementar metricas de instancia apos envio bem-sucedido

### Entregaveis

- Worker funcional rodando em loop
- Heartbeat persistido no banco
- Cleanup de locks em operacao
- Logs estruturados minimos

### Criterios de Aceite

- Worker sobe e registra heartbeat
- Worker respeita `system_config.is_paused`
- Worker encerra sem deixar lock preso em desligamento controlado
- Locks expirados sao recuperados automaticamente
- `whatsapp_instances.last_message_at` e `messages_sent_count` sao atualizados apos envio

### Riscos

- Sem cleanup, mensagens podem ficar presas indefinidamente
- Sem logs, sera dificil auditar erros de producao
- Sem shutdown correto, worker pode deixar estados inconsistentes

---

## Sprint 4 - Compliance, Humanizacao e Testes

### Objetivo

Adicionar as camadas de seguranca operacional e refinamento do envio depois que o core estiver confiavel.

### Itens

- Integrar `patient_consent` ao fluxo de claim/envio
- Integrar `message_blocks` ao fluxo de bloqueio por opt-out
- Definir regra para resposta `SAIR` e futuras respostas de bloqueio
- Adicionar masking nos logs e dados sensiveis
- Implementar delays por instancia com base em cadencia segura
- Evoluir `automation/src/utils/helpers.ts` para politica real de delay
- Adicionar text spinning opcional e controlado
- Adicionar split de mensagens longas, se necessario
- Criar testes para:
  - claim concorrente
  - retry
  - lock expirado
  - consentimento negado
  - numero bloqueado
  - instancia desconectada
  - envio bem-sucedido

### Entregaveis

- Fluxo com consentimento e opt-out
- Humanizacao basica integrada ao worker
- Suite minima de testes da automacao

### Criterios de Aceite

- Contato bloqueado nao recebe mensagem
- Contato sem consentimento valido nao entra no envio
- Delays respeitam a politica definida por instancia
- Fluxo principal continua estavel com humanizacao ativada
- Casos criticos possuem cobertura automatizada minima

### Riscos

- Implementar humanizacao antes da confiabilidade do core dificulta depuracao
- Sem regra clara de compliance, o worker pode enviar para contatos indevidos
- Text spinning mal controlado pode piorar consistencia da comunicacao

---

## Backlog Tecnico por Area

### Banco

- Criar migrations da automacao
- Corrigir inconsistencias de colunas e views
- Validar indices e performance basica

### Worker

- Criar estrutura real em `/automation/src/engine/`
- Implementar `WorkerEngine`
- Implementar `QueueManager`
- Implementar `InstanceSelector`

### Integracao Evolution

- Padronizar payloads e respostas
- Definir estrategia de retry
- Definir timeouts
- Definir health checks por instancia

### Observabilidade

- Estruturar logs
- Criar trilha de auditoria em `message_logs`
- Expor metricas minimas para dashboard

### Compliance

- Verificar consentimento antes do envio
- Bloquear por opt-out
- Mascarar dados sensiveis em logs

### Dashboard

- Ajustar UI para refletir heartbeats, locks expirados e status operacional
- Revisar dependencia de campos nao mapeados no schema gerado

---

## Definicoes Importantes

### Fonte da Verdade

- Evolution API = estado real de conexao da instancia
- Supabase = estado transacional da fila, auditoria, heartbeat e cache operacional

### Regra de Prioridade

- Confiabilidade primeiro
- Observabilidade segundo
- Humanizacao depois

### Fora do Escopo Imediato

- Otimizacoes visuais no dashboard
- Features avancadas de IA no texto
- Regras sofisticadas de template antes do core estabilizar

---

## Checklist Executivo

### Sprint 1

- [ ] Revisar SQL planejado
- [ ] Criar migrations
- [ ] Aplicar migrations
- [ ] Validar funcoes SQL
- [ ] Alinhar tipos

### Sprint 2

- [ ] Refatorar driver Supabase do worker
- [ ] Endurecer driver Evolution
- [ ] Implementar Queue Manager
- [ ] Implementar Instance Selector

### Sprint 3

- [ ] Implementar Worker Engine
- [ ] Implementar heartbeat
- [ ] Implementar cleanup de locks
- [ ] Adicionar logs estruturados

### Sprint 4

- [ ] Integrar consentimento
- [ ] Integrar opt-out
- [ ] Adicionar delays reais
- [ ] Criar testes
- [ ] Validar fluxo ponta a ponta

---

## Proximo Passo Recomendado

Comecar pela Sprint 1, criando os arquivos SQL em `supabase/migrations/` e corrigindo as inconsistencias do plano antes da execucao.
