# Plano de Extracao da Automacao para Repositorio Separado

## Objetivo

Mover `automation/` para um repositorio GitHub dedicado, com build de imagem em CI, publicacao no GHCR e deploy no EasyPanel, sem quebrar integracao com Supabase e Evolution API.

---

## 1. Escopo da Extracao

Entram no novo repositorio:

- codigo da automacao (`src/`)
- configuracoes de runtime (`package.json`, `.env.example`)
- artefatos de operacao (`Dockerfile`, `.dockerignore`, README)
- pipeline CI/CD para imagem Docker

Nao entram no novo repositorio:

- frontend (`src/` da raiz principal)
- `supabase/` do projeto principal
- docs nao relacionadas ao worker

---

## 2. Dependencias Criticas a Resolver

Hoje a automacao referencia utilitarios compartilhados do monorepo. Antes da extracao, escolher e executar uma estrategia:

1. Copiar um modulo `shared/` minimo para dentro do novo repo (recomendado curto prazo).
2. Publicar `packages/shared` como pacote versionado e consumir por versao.

Diretriz:

- curto prazo: `shared` minimo interno para acelerar migracao
- medio prazo: evoluir para pacote versionado

---

## 3. Estrutura Alvo do Novo Repositorio

```text
automation-worker/
├── src/
├── shared/                    # opcional no curto prazo
├── package.json
├── tsconfig.json              # se aplicavel
├── .env.example
├── .gitignore
├── .dockerignore
├── Dockerfile
├── README.md
└── .github/
    └── workflows/
        └── docker-publish.yml
```

---

## 4. Padrao de Envs do Worker

Obrigatorias:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `EVOLUTION_API_URL`
- `EVOLUTION_API_KEY`

Operacionais:

- `WORKER_NAME`
- `WORKER_POLL_INTERVAL_MS`
- `WORKER_HEARTBEAT_INTERVAL_MS`
- `WORKER_LOCK_TIMEOUT_MINUTES`
- `WORKER_MAX_ATTEMPTS`
- `WORKER_LEASE_SECONDS`
- `WORKER_STALE_HEARTBEAT_MINUTES`
- `WORKER_FOLLOWUP_INTERVAL_MS`
- `EVOLUTION_TIMEOUT_MS`
- `EVOLUTION_HISTORY_ENDPOINTS`
- `DRY_RUN`

Teste controlado (opcional):

- `BYPASS_HUMANIZER_TEST_PHONE`
- `BYPASS_HUMANIZER_TEST_TAG`

---

## 5. Dockerizacao

## 5.1 Diretriz

Gerar imagem Linux para execucao no EasyPanel, com inicializacao simples do worker.

## 5.2 Requisitos

- build reproduzivel
- imagem pequena
- logs em stdout/stderr
- sem dependencia de arquivos locais temporarios

## 5.3 Healthcheck

Definir healthcheck sem efeito colateral (nao pode claimar fila para testar vida).

---

## 6. CI/CD no GitHub (GHCR)

Pipeline minima:

1. Checkout do repositorio
2. Install/build/lint basico
3. Build da imagem Docker
4. Push no GHCR com tags:
   - `latest` (branch principal)
   - tag semantica (`vX.Y.Z`)

Permissoes minimas:

- `packages: write`
- `contents: read`

---

## 7. Deploy no EasyPanel

## 7.1 Fonte de imagem

- `ghcr.io/<org-ou-usuario>/<nome-imagem>:<tag>`

## 7.2 Configuracoes obrigatorias

- variaveis de ambiente do worker
- restart policy ativa
- limite de recursos adequado
- logs habilitados

## 7.3 Regra de escala

- manter 1 replica ativa por padrao (lease no banco controla exclusao mutua)

---

## 8. Plano de Execucao (Passo a Passo)

## Fase A - Preparacao

1. Congelar alteracoes paralelas na automacao atual.
2. Escolher estrategia de `shared`.
3. Validar envs obrigatorias em `.env.example`.

## Fase B - Criacao do novo repositorio

1. Criar repo `automation-worker` no GitHub.
2. Migrar arquivos da automacao.
3. Ajustar imports e caminhos.
4. Garantir start local sem dependencias quebradas.

## Fase C - Container e CI

1. Adicionar `Dockerfile` e `.dockerignore`.
2. Adicionar workflow de publish para GHCR.
3. Publicar primeira imagem (`v0.1.0`).

## Fase D - Homologacao no EasyPanel

1. Criar servico worker no EasyPanel.
2. Configurar envs apontando para Supabase e Evolution da VPS.
3. Rodar smoke test de envio e webhook.

## Fase E - Cutover

1. Desativar worker antigo.
2. Ativar worker novo (repo separado).
3. Monitorar 24h com foco em fila, erros e heartbeat.

---

## 9. Riscos e Mitigacoes

### Risco 1: Quebra de imports compartilhados

- Mitigacao: resolver `shared` antes de publicar imagem.

### Risco 2: Divergencia de env entre local e VPS

- Mitigacao: usar `docs/planning/MATRIZ_ENVS_E_SERVICOS.md` como fonte unica.

### Risco 3: Healthcheck com efeito colateral

- Mitigacao: healthcheck apenas de conectividade e bootstrap.

### Risco 4: Escala indevida no EasyPanel

- Mitigacao: iniciar com 1 replica e monitorar lease.

---

## 10. Criterio de Conclusao

Este plano esta concluido quando:

1. repositorio novo esta operacional
2. imagem Docker publica no GHCR
3. worker rodando no EasyPanel com envs finais
4. envio e webhook validados em smoke test
5. operacao estavel apos janela de monitoramento

---

## 11. Relacao com os demais documentos

- Arquitetura alvo: `docs/architecture/ARQUITETURA_VPS_FINAL.md`
- Matriz de envs: `docs/planning/MATRIZ_ENVS_E_SERVICOS.md`
- Cutover: `docs/operations/CHECKLIST_CUTOVER_VPS.md`
- Plano geral: `docs/planning/PLANO_MIGRACAO_VPS_EASYPANEL.md`
