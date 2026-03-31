# EasyPanel e Deploy

## Problemas ja vistos
- Build path inconsistente (ex.: `automation/automation/Dockerfile`) em etapa anterior.
- Runtime com import quebrado da automacao para `packages/shared` (ja corrigido no codigo).
- Falha recente no download do repositorio por GitHub archive:
  - erro: `Response code 429 (Too Many Requests)`.

## Leitura do erro 429
- Nao indica erro de branch por si so.
- Indica limite de requests/autenticacao no download do archive do GitHub.
- Pode ocorrer tanto em `recover-local-state` quanto em `main` se condicoes forem as mesmas.

## Possiveis causas operacionais
- Muitos redeploys/rebuilds em curto intervalo.
- Integracao GitHub do EasyPanel sem token/app adequado para repo privado.
- Cache ou fila de build repetindo tentativas.

## Acoes recomendadas
- Aguardar janela curta e tentar 1 deploy limpo.
- Confirmar integracao GitHub autenticada no EasyPanel.
- Evitar rodadas seguidas de rebuild.
- Preferir deploy por imagem de registry para reduzir dependencia de archive GitHub.

## Sinais dos logs de runtime
- Logs recentes ainda mostram formato antigo de claim serial.
- Indicio de que o runtime pode nao estar com o commit esperado.

## MCP local para operacao (novo)
- Criado scaffold local em `supabase/mcp-ops/` para observabilidade operacional no PC.
- Camadas implementadas:
  - EasyPanel adapter: projeto, servicos, status e logs.
  - Evolution adapter: chamadas via `supabase/functions/evolution-proxy`.
  - Diagnostico unificado: `ops_full_diagnosis`.
- Estrategia de autenticacao EasyPanel com fallback:
  1. `Authorization: Bearer <token>`
  2. `X-API-Key: <token>`
  3. `apikey: <token>`
- Endpoints EasyPanel ainda dependem de validacao em ambiente real (rota/contrato pode variar por versao).

## Proximo checkpoint do MCP
- Coletar 1 requisicao real autenticada (Network -> Copy as cURL) para confirmar header e path corretos.
- Ajustar o adapter para os endpoints reais encontrados.
- Rodar MCP em modo `readonly` e validar retorno para servicos `worker` e `evolution api`.

## Frontend no EasyPanel (novo)
- Infra de deploy frontend adicionada na raiz do repo:
  - `Dockerfile` (build Vite + runtime Nginx)
  - `nginx.conf` (fallback SPA via `try_files ... /index.html`)
  - `.dockerignore` (contexto de build reduzido)
- Guia de operacao criado em `docs/operations/EASYPANEL_FRONTEND_SETUP.md`.
- Build local validado (`npm run build`) antes do deploy remoto.

## Proximo checkpoint frontend
- Criar servico `prn-frontend` no EasyPanel com source GitHub e Dockerfile da raiz.
- Preencher `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` em Build Args (e env runtime, se necessario).
- Publicar com URL temporaria do EasyPanel e validar refresh em `/whatsapp` sem 404.
