# EasyPanel - Setup da Automacao (GHCR)

## 1) Imagem

- Registry: `ghcr.io`
- Image: `ghcr.io/<owner-lowercase>/prn-automation-worker`
- Tag recomendada:
  - homolog: `sha-<commit>`
  - producao: versao fixa (`1.0.0`, `1.1.0`)

Evite `latest` em producao para facilitar rollback.

---

## 2) Credenciais do Registry no EasyPanel

No EasyPanel, configure o acesso ao GHCR com:

- Username: seu usuario GitHub (ou org bot)
- Password: GitHub PAT com escopo `read:packages`

Se o pacote estiver privado, sem esse PAT o pull da imagem falha.

---

## 3) Tipo de servico

- Service type: Worker / Background
- Replicas: `1`
- Restart policy: `Always`

---

## 4) Command

Use o comando padrao da imagem (nao precisa sobrescrever):

- `bun run start`

Se quiser sobrescrever manualmente, use exatamente esse comando.

---

## 5) Healthcheck

Configurar healthcheck por comando:

- Command: `bun run healthcheck`
- Interval: `30s`
- Timeout: `10s`
- Retries: `3`
- Start period: `20s`

---

## 6) Variaveis de ambiente (obrigatorias)

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

Notas:

- `EVOLUTION_API_URL` deve ser a base da API, nao a rota `/manager/`.
- `SUPABASE_SERVICE_ROLE_KEY` nunca deve ir para frontend.

---

## 7) Primeira validacao apos subir

1. Conferir status do container: `healthy`.
2. Conferir logs de boot sem erro de env.
3. Validar heartbeat do worker no Supabase.
4. Enfileirar 1 paciente de teste e confirmar envio.
5. Validar chegada de webhook inbound no Supabase.

---

## 8) Rollback rapido

Se houver falha:

1. Voltar tag da imagem para versao anterior.
2. Reiniciar servico.
3. Confirmar `healthy` + envio de teste.
