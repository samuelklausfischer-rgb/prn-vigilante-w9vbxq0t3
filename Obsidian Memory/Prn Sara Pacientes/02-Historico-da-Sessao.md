# Historico da Sessao

## Linha do tempo resumida

### 1) Planejamento de migracao e arquitetura
- Definido plano profissional de migracao para VPS/EasyPanel.
- Definida separacao de responsabilidades entre frontend, Supabase Functions e worker.
- Reforco de seguranca: sem chamadas Evolution no frontend.

### 2) Ajustes em Supabase Functions e integracao Evolution
- Criada function `supabase/functions/evolution-proxy/index.ts`.
- Atualizadas `create-instance` e `sync-webhook` para fluxo centralizado.
- Atualizado `evolution-webhook` para aceitar segredo por header e query.
- Deploy das funcoes realizado durante a sessao.

### 3) Containerizacao e build da automacao
- Criado/ajustado `automation/Dockerfile`, `.dockerignore`, `healthcheck` e scripts.
- Corrigido problema de import de `packages/shared` no container da automacao.
- Criadas copias locais em `automation/shared` e importacoes ajustadas.

### 4) Organizacao de repositorio e docs
- Reorganizacao ampla de `docs/` por categorias.
- Criada pasta `lixo/` para quarentena de arquivos locais/sensiveis/temporarios.
- Atualizacao de referencias internas em documentacao.

### 5) Problema de estado local e recuperacao
- Houve conflito de direcao Git (risco de sobrescrever local por remoto).
- Fluxo corrigido para priorizar diretorio local -> GitHub.
- Branch de trabalho ativa usada para envio: `recover-local-state`.

### 6) Worker: paralelismo por instancia
- Criada migration de claim por instancia.
- Implementado fluxo no worker para processar lanes por instancia conectada.
- Adicionado `WORKER_MAX_PARALLEL_LANES` no `.env.example`.
- Migrations aplicadas no Supabase remoto.

### 7) Validacao e novos problemas
- Teste SQL inicial da RPC falhou por drift de tipo (`locked_instance_id` era `text`).
- Criada migration de correcao de assinatura/tipos e reaplicada com sucesso.
- EasyPanel apresentou `429 Too Many Requests` no download de archive GitHub.
- Logs mostraram padrao que aparenta runtime antigo e erro `retry_phone2` recorrente.

### 8) Scaffold MCP operacional local (EasyPanel + Evolution)
- Criado pacote local `supabase/mcp-ops/` com Node + TypeScript para uso no PC operador.
- Implementados adapters para EasyPanel (infra) e `evolution-proxy` (camada app).
- Ferramentas MCP criadas para leitura de servicos/status/logs e diagnostico consolidado (`ops_full_diagnosis`).
- Mutacoes (restart/redeploy/create/delete) foram codificadas, mas protegidas por `MCP_MODE=operator` e `ALLOW_MUTATIONS=true`.
- Build TypeScript validado com sucesso (`npm run build` em `supabase/mcp-ops`).

### 9) Frontend pronto para deploy no EasyPanel
- Criado `Dockerfile` na raiz para build do Vite e runtime em Nginx.
- Criado `nginx.conf` com fallback SPA (`try_files ... /index.html`) para suportar `BrowserRouter`.
- Criado `.dockerignore` raiz para reduzir contexto de build.
- Criado guia operacional `docs/operations/EASYPANEL_FRONTEND_SETUP.md` com campos e validacao.
- Build local validado com sucesso (`npm run build`).

## Commit relevante
- `88994e9` - `feat: habilitar processamento paralelo por instancia`.

## Branch e remoto
- Branch local/remota de trabalho: `recover-local-state`.
- Push realizado com sucesso para `origin/recover-local-state`.
