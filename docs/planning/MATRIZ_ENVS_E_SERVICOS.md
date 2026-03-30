# Matriz de Envs e Servicos

## Objetivo

Definir, de forma unica e auditavel, onde cada variavel deve ser configurada no ecossistema (`Frontend`, `Supabase Edge Functions`, `Automation`, `Evolution API`) e como proceder em troca futura de VPS.

---

## Premissas Arquiteturais Validadas

1. Existe uma unica Evolution API oficial por ambiente.
2. Frontend nao acessa Evolution diretamente.
3. Supabase Edge Functions e a camada oficial de operacao administrativa da Evolution.
4. Automacao usa a mesma Evolution API da VPS.
5. Segredo nunca vai para `VITE_*`.

---

## 1) Frontend (`.env` da raiz)

### Permitido no frontend (publico)

| Variavel | Onde configurar | Tipo | Obrigatoria | Uso |
|---|---|---|---|---|
| `VITE_SUPABASE_URL` | Deploy do frontend | Publica | Sim | URL do projeto Supabase |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Deploy do frontend | Publica | Sim | Chave publishable/anon do Supabase |

### Proibido no frontend

| Variavel | Motivo |
|---|---|
| `VITE_EVOLUTION_API_URL` | Frontend nao deve consumir Evolution diretamente |
| `VITE_EVOLUTION_API_KEY` | Exposicao de segredo no browser |
| `SUPABASE_SERVICE_ROLE_KEY` | Privilegio administrativo |
| `AUTHENTICATION_API_KEY` (Evolution) | Segredo de backend |

---

## 2) Supabase Edge Functions (Supabase Secrets)

Estas variaveis devem ser configuradas no painel de secrets do Supabase para uso server-side pelas functions.

| Variavel | Obrigatoria | Uso principal | Observacao |
|---|---|---|---|
| `SUPABASE_URL` | Sim | Acesso interno do client server-side | Necessaria em varias functions |
| `SUPABASE_SERVICE_ROLE_KEY` | Sim | Operacoes administrativas no banco | Nunca expor no frontend |
| `SUPABASE_ANON_KEY` | Condicional | Chamadas server-side especificas | Usar somente quando necessario |
| `EVOLUTION_API_URL` | Sim | Base URL da Evolution para proxy/control plane | Usar URL base da API (nao `/manager/`) |
| `EVOLUTION_API_KEY` | Sim | Autenticacao em chamadas server-side para Evolution | Mesmo segredo usado pela automacao |
| `EVOLUTION_WEBHOOK_SECRET` | Sim | Validacao de webhook inbound | Bloqueia eventos nao autenticados |
| `GLM_API_KEY` | Condicional | LLM em `organize-patient-list` e `classify-message` | Segredo de IA |
| `GLM_BASE_URL` | Condicional | Endpoint do provedor LLM | Server-side |
| `GLM_MODEL` | Condicional | Modelo LLM padrao | Server-side |

---

## 3) Automation (EasyPanel - servico worker)

Configurar no servico da automacao no EasyPanel.

| Variavel | Obrigatoria | Uso |
|---|---|---|
| `SUPABASE_URL` | Sim | Conexao com Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Sim | Operacoes server-side no banco |
| `EVOLUTION_API_URL` | Sim | URL publica da Evolution na VPS |
| `EVOLUTION_API_KEY` | Sim | Autenticacao na Evolution |
| `WORKER_NAME` | Sim | Identificador do worker |
| `WORKER_POLL_INTERVAL_MS` | Sim | Intervalo de loop de consumo |
| `WORKER_HEARTBEAT_INTERVAL_MS` | Sim | Pulso operacional |
| `WORKER_LOCK_TIMEOUT_MINUTES` | Sim | Timeout de lock |
| `WORKER_MAX_ATTEMPTS` | Sim | Tentativas maximas de envio |
| `WORKER_LEASE_SECONDS` | Sim | Duracao do lease ativo |
| `WORKER_STALE_HEARTBEAT_MINUTES` | Sim | Janela para detectar worker morto |
| `WORKER_FOLLOWUP_INTERVAL_MS` | Sim | Scheduler de follow-up |
| `EVOLUTION_TIMEOUT_MS` | Recomendado | Timeout HTTP para Evolution |
| `EVOLUTION_HISTORY_ENDPOINTS` | Condicional | Fallback de endpoints de historico |
| `DRY_RUN` | Condicional | Modo simulacao |
| `BYPASS_HUMANIZER_TEST_PHONE` | Condicional | Teste controlado |
| `BYPASS_HUMANIZER_TEST_TAG` | Condicional | Teste controlado |

---

## 4) Evolution API (EasyPanel - servico Evolution)

Configurar no servico da Evolution no EasyPanel. Abaixo esta o bloco de variaveis com prioridade operacional para este projeto.

### 4.1 Nucleo obrigatorio

| Variavel | Obrigatoria | Funcao |
|---|---|---|
| `SERVER_TYPE` | Sim | Tipo de servidor |
| `SERVER_PORT` | Sim | Porta interna da Evolution |
| `SERVER_URL` | Sim | URL publica oficial da Evolution |
| `DATABASE_PROVIDER` | Sim | Banco usado pela Evolution |
| `DATABASE_CONNECTION_URI` | Sim | Conexao Postgres da Evolution |
| `CACHE_REDIS_ENABLED` | Sim | Cache e performance |
| `CACHE_REDIS_URI` | Sim | Conexao Redis da Evolution |
| `AUTHENTICATION_API_KEY` | Sim | Chave de autenticacao da API |

### 4.2 Webhook e eventos

| Variavel | Obrigatoria | Funcao |
|---|---|---|
| `WEBHOOK_GLOBAL_ENABLED` | Recomendado | Habilita webhook global |
| `WEBHOOK_GLOBAL_URL` | Recomendado | URL do webhook server-side (Supabase) |
| `WEBHOOK_EVENTS_MESSAGES_UPSERT` | Sim (fluxo atual) | Evento de mensagem nova/atualizada |
| `WEBHOOK_EVENTS_CONNECTION_UPDATE` | Sim (fluxo atual) | Mudanca de status de conexao |
| `WEBHOOK_EVENTS_QRCODE_UPDATED` | Sim (fluxo atual) | Atualizacao de QR |

### 4.3 Rede, CORS e seguranca

| Variavel | Recomendacao |
|---|---|
| `CORS_ORIGIN` | Evitar `*` em producao; restringir ao necessario |
| `CORS_METHODS` | Manter estritamente o necessario |
| `CORS_CREDENTIALS` | Revisar conforme uso real |
| `LOG_LEVEL` | Reduzir em producao (`ERROR,WARN,INFO`) |

### 4.4 Persistencia operacional

| Prefixo | Diretriz |
|---|---|
| `DATABASE_SAVE_*` | Manter alinhado com necessidade de auditoria e custo |
| `DATABASE_DELETE_*` | Validar impacto em trilha de auditoria |
| `QRCODE_*` | Ajustar para UX e janela de pareamento |

### 4.5 Integracoes nao usadas no fluxo atual

Estas podem ficar desabilitadas ate necessidade real:

- `RABBITMQ_*`
- `SQS_*`
- `PUSHER_*`
- `TYPEBOT_*`
- `CHATWOOT_*`
- `OPENAI_ENABLED`
- `DIFY_ENABLED`
- `S3_*`

---

## 5) Mapa de Consumo por Servico

| Servico | Consome Evolution | Consome Supabase | Exposto ao usuario |
|---|---|---|---|
| Frontend | Nao | Sim (public key) | Sim |
| Supabase Edge Functions | Sim (`EVOLUTION_API_*`) | Sim (service role quando necessario) | Indiretamente |
| Automation Worker | Sim (`EVOLUTION_API_*`) | Sim (`SUPABASE_*`) | Nao |
| Evolution API | N/A | Nao obrigatoriamente (depende de webhook) | Publico controlado |

---

## 6) Procedimento Rapido para Troca de VPS (futura)

Quando migrar da VPS atual para outra (ex.: Hostinger), executar nesta ordem:

1. Subir Evolution na nova VPS com `SERVER_URL` novo.
2. Validar `AUTHENTICATION_API_KEY` na nova Evolution.
3. Atualizar `EVOLUTION_API_URL` nos secrets do Supabase.
4. Atualizar `EVOLUTION_API_URL` na automacao no EasyPanel.
5. Confirmar `EVOLUTION_API_KEY` em Supabase e automacao.
6. Reconfigurar `WEBHOOK_GLOBAL_URL`/webhook de instancia para Supabase.
7. Executar smoke test (secao 7).
8. Somente depois desativar a VPS antiga.

---

## 7) Smoke Test Pos-Troca (obrigatorio)

1. Edge Function consegue listar instancias da Evolution.
2. Edge Function consegue criar instancia.
3. QR e status de conexao atualizam corretamente.
4. `whatsapp_instances` sincroniza no Supabase.
5. Automacao consegue claimar fila e enviar.
6. Webhook inbound chega no Supabase.
7. Classificacao/processamento pos-resposta funciona.
8. Restart da automacao nao perde estabilidade operacional.

---

## 8) Controle de Mudanca

Sempre que houver mudanca em URL/chave/infra da Evolution:

1. Atualizar este arquivo.
2. Atualizar `docs/planning/PLANO_MIGRACAO_VPS_EASYPANEL.md` se houver mudanca arquitetural.
3. Registrar data e motivo da alteracao no PR.
