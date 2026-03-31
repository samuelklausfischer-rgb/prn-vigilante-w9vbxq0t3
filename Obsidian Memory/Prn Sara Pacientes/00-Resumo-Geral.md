# Resumo Geral

## Projeto
- Projeto: PRN-Vigilante (frontend + Supabase + automacao worker + Evolution API).
- Objetivo da fase: migrar operacao para VPS/EasyPanel com padrao profissional, seguranca e observabilidade.

## Estado atual
- Codigo principal atualizado e enviado para GitHub na branch `recover-local-state`.
- Commit de referencia: `88994e9` (`feat: habilitar processamento paralelo por instancia`).
- Migrations de claim por instancia criadas no repo e aplicadas no Supabase remoto.
- EasyPanel ainda apresenta sinais de runtime com fluxo antigo e teve erro de download GitHub `429`.
- Estrutura local de MCP operacional criada em `supabase/mcp-ops/` para diagnostico de EasyPanel + Evolution.
- Frontend preparado para deploy no EasyPanel com arquivos de infra adicionados (`Dockerfile`, `nginx.conf`, `.dockerignore`).
- Build local do frontend validado com sucesso (`npm run build`).

## Entregas principais realizadas
- Planejamento e documentacao de migracao para VPS/EasyPanel.
- Remocao de dependencia de Evolution direto no frontend (uso via Supabase Edge Functions).
- Ajuste de autenticacao de webhook da Evolution (header + fallback por query).
- Isolamento da automacao para build/deploy em container.
- Implementacao inicial de paralelismo por instancia no worker.

## Alertas atuais
- Erro recorrente de runtime: `Erro ao enfileirar retry_phone2: erro desconhecido`.
- Logs do EasyPanel ainda mostram padrao de claim serial (`Mensagem claimada: ... -> Whats 47`).
- Falha de deploy por GitHub archive com `429 Too Many Requests` (rate limit/autenticacao).

## Objetivo imediato
- Garantir que EasyPanel rode exatamente o commit novo.
- Confirmar paralelismo real entre instancias no runtime.
- Corrigir a causa do erro de enfileiramento `retry_phone2`.
- Validar autenticacao e endpoints reais da API do EasyPanel para ativar ferramentas MCP de leitura em producao local.
- Subir novo servico `prn-frontend` no EasyPanel usando URL temporaria e validar rotas SPA com refresh.
