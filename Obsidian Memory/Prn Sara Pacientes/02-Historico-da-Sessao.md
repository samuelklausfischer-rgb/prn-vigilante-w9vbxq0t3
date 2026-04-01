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

### 10) Implementacao da aba separada `Listas`
- Criada migration `20260331121500_create_send_lists_and_link_queue.sql` para:
  - criar tabela `public.send_lists`;
  - adicionar `send_list_id` em `patients_queue`;
  - indices e politica RLS para operacao autenticada.
- Criado service `src/services/send-lists.ts` com operacoes de listagem, detalhe, edicao, reatribuicao de canal, cancelamento e exclusao segura.
- Criada pagina `src/pages/Listas.tsx` com:
  - filtros;
  - listagem de listas;
  - detalhe com pacientes vinculados;
  - acoes operacionais (editar, trocar canal, cancelar, excluir).
- Fluxo `src/pages/EnviarLista.tsx` atualizado para:
  - capturar nome/observacao da lista;
  - criar `send_list` no momento da aprovacao;
  - vincular registros inseridos via `send_list_id`.
- Navegacao atualizada em `src/App.tsx` e `src/components/Layout.tsx` com rota/menu `/listas`.

### 11) Visualizacao de listas legadas sem alterar dados antigos
- Ajustada `src/pages/Listas.tsx` para modelo hibrido:
  - secao `Listas cadastradas` (entidade real em `send_lists`);
  - secao `Listas legadas` (agrupamento visual somente leitura).
- Implementado agrupamento legado em `src/services/send-lists.ts` por `locked_instance_id + data_exame` para pacientes com `send_list_id is null`.
- Cards legados agora exibem resumo por status e detalhes com nome do paciente, horario e status de disparo, sem editar historico.

### 12) UX de edicao movida para popup na aba `Listas`
- Criado componente `src/components/send-lists/EditSendListDialog.tsx` com campos de nome, canal responsavel, status e observacoes.
- Popup implementado com botoes `Salvar`, `Cancelar` e fechamento por `X` nativo do `DialogContent`.
- `src/pages/Listas.tsx` foi simplificado: removida edicao inline e adicionado botao `Editar` para listas cadastradas.
- Fluxo de persistencia centralizado em `handleSaveEditDialog` usando `updateSendList` e `reassignSendListInstance` quando o canal muda.

### 13) Ajuste de visibilidade do botao `Editar` nos cards
- Botao `Editar` mantido dentro de cada card de `Listas cadastradas` e estilizado com destaque (`bg-blue-600`) para reduzir risco de baixa visibilidade.

### 14) Interacao por clique no card cadastrado
- Ajustado `src/pages/Listas.tsx` para abrir o popup de edicao ao clicar no card de `Listas cadastradas`.
- Fluxo operacional: selecionar card cadastrado -> abrir modal de edicao diretamente.
- Cards legados permanecem com comportamento de detalhe somente leitura.

### 15) Conversao de card legado para lista cadastrada
- Implementado `convertLegacyGroupToSendList` em `src/services/send-lists.ts`.
- Clique no card de `Listas legadas` agora abre confirmacao para conversao.
- Ao confirmar:
  - cria `send_list`;
  - vincula pacientes do grupo via `send_list_id`;
  - recarrega a tela;
  - abre o popup de edicao automaticamente.

### 15) Limpeza operacional de agenda por data no banco
- Executada remocao de dados para `2026-04-04` e `2026-04-05` conforme solicitacao operacional.
- Escopo removido: `patients_queue` (43), `message_events` (76), `message_logs` (1) e `webhook_events_raw` relacionado por `provider_message_id` (16).
- Validacao pos-execucao: nenhuma linha restante para essas datas na fila e sem residuos vinculados em logs/eventos.

### 16) Kit de prompts Stitch para redesign guiado
- Criada pasta `docs/stitch-prompts/` para suportar recriacao visual do frontend no Stitch sem alterar regras de negocio.
- Entregue `00-identidade-visual.md` com direcao "Saude acolhedora", paletas A/B, tipografia, tokens e padrao de componentes.
- Entregues prompts detalhados por pagina (`01` a `12`) cobrindo: Index, Analytics, Enviar Lista, Listas, Segunda Chamada, Estrategico, CRM, Arquivar por Data, Arquivo Morto, WhatsApp, Auth e 404.
- Criado `docs/stitch-prompts/README.md` com ordem de uso e checklist de validacao para preservar estrutura (botoes, cards, tabs, modais, filtros e acoes).

## Commit relevante
- `88994e9` - `feat: habilitar processamento paralelo por instancia`.

## Branch e remoto
- Branch local/remota de trabalho: `recover-local-state`.
- Push realizado com sucesso para `origin/recover-local-state`.
