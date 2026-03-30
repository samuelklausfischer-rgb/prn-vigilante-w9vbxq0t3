# EasyPanel - Checklist Campo a Campo

Checklist direto para criar o servico da automacao 24/7 no EasyPanel usando imagem Docker publicada no GHCR.

---

## 1) Criar servico

- [ ] **Service type:** `Worker` (ou `Background service`)
- [ ] **Service name:** `prn-automation-worker`
- [ ] **Source type:** `Docker Image`

---

## 2) Imagem Docker

- [ ] **Registry:** `ghcr.io`
- [ ] **Image:** `ghcr.io/<owner-lowercase>/prn-automation-worker`
- [ ] **Tag (homolog):** `sha-<commit>`
- [ ] **Tag (producao):** `1.0.0` (ou versao fixa atual)

Observacao:
- Evite `latest` em producao para facilitar rollback.

---

## 3) Credencial do Registry (se privado)

- [ ] **Username:** usuario GitHub (ou bot da org)
- [ ] **Password/Token:** PAT GitHub com `read:packages`

---

## 4) Command e Start

- [ ] **Command override:** vazio (usar CMD da imagem)
- [ ] Se precisar override manual: `bun run start`

---

## 5) Replicas e restart

- [ ] **Replicas:** `1`
- [ ] **Restart policy:** `Always`

---

## 6) Healthcheck

- [ ] **Healthcheck type:** command
- [ ] **Command:** `bun run healthcheck`
- [ ] **Interval:** `30s`
- [ ] **Timeout:** `10s`
- [ ] **Retries:** `3`
- [ ] **Start period:** `20s`

---

## 7) Variaveis de ambiente (copiar e preencher)

```env
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>

EVOLUTION_API_URL=https://<evolution-api-base-url>
EVOLUTION_API_KEY=<evolution-api-key>

WORKER_NAME=automation-worker
WORKER_POLL_INTERVAL_MS=5000
WORKER_HEARTBEAT_INTERVAL_MS=30000
WORKER_LOCK_TIMEOUT_MINUTES=5
WORKER_MAX_ATTEMPTS=3
WORKER_LEASE_SECONDS=90
WORKER_STALE_HEARTBEAT_MINUTES=10
WORKER_FOLLOWUP_INTERVAL_MS=60000
EVOLUTION_TIMEOUT_MS=15000
EVOLUTION_HISTORY_ENDPOINTS=

DRY_RUN=false
BYPASS_HUMANIZER_TEST_PHONE=
BYPASS_HUMANIZER_TEST_TAG=
```

Regras criticas:
- `EVOLUTION_API_URL` deve ser a base da API (nao usar `/manager/`).
- `SUPABASE_SERVICE_ROLE_KEY` e `EVOLUTION_API_KEY` nunca vao para frontend.

---

## 8) Rede e exposicao

- [ ] **Expose port/public route:** desativado (worker nao precisa endpoint publico)

---

## 9) Deploy

- [ ] Salvar servico
- [ ] Deploy inicial
- [ ] Confirmar status: `running`
- [ ] Confirmar health: `healthy`

---

## 10) Validacao pos-deploy

- [ ] Worker iniciou sem erro de env
- [ ] Heartbeat aparece no Supabase
- [ ] Envio de teste executa com sucesso
- [ ] Resposta inbound continua chegando no webhook
- [ ] Fila continua processando apos restart do worker

---

## 11) Rollback rapido

- [ ] Trocar tag para versao anterior conhecida
- [ ] Re-deploy
- [ ] Confirmar `running` + `healthy`
- [ ] Validar envio teste
