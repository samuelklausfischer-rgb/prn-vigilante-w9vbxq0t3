# Log de Atualizacoes

## Modelo de entrada
- Data/Hora:
- Contexto:
- Acao executada:
- Resultado:
- Risco/Impacto:
- Proximo passo:

---

## 31/03/2026 10:44
- Contexto: consolidacao da memoria auxiliar no Obsidian para manter historico continuo.
- Acao executada: criada estrutura por arquivos e convertido `Memoria-Operacional-PRN.md` para indice.
- Resultado: contexto da migracao/worker/deploy registrado em 8 arquivos tematicos.
- Risco/Impacto: nenhum impacto funcional no sistema; apenas organizacao de conhecimento.
- Proximo passo: manter este log atualizado a cada bloco de trabalho relevante.

## 31/03/2026 10:50
- Contexto: deploy EasyPanel falhando no download de source por GitHub.
- Acao executada: diagnostico do erro `429 Too Many Requests` e definicao de mitigacoes operacionais.
- Resultado: identificado que o erro nao indica branch invalida; foco em rate limit/autenticacao/cache.
- Risco/Impacto: atrasos de deploy se repetir tentativas em sequencia.
- Proximo passo: realizar deploy limpo unico apos janela de espera e confirmar branch/commit em runtime.

## 31/03/2026 10:55
- Contexto: validacao do worker com claim por instancia e observacao dos logs de producao.
- Acao executada: registrada pendencia de validar se runtime esta no commit novo e investigar erro `retry_phone2`.
- Resultado: plano de verificacao priorizado em `06-Pendencias-Atuais.md` e `07-Proximos-Passos.md`.
- Risco/Impacto: sem validacao final, pode permanecer comportamento serial em runtime.
- Proximo passo: confirmar runtime no EasyPanel e coletar logs de 10-15 min.

## 31/03/2026 11:35
- Contexto: solicitacao para estruturar MCP local no PC para operar EasyPanel + Evolution com foco em diagnostico.
- Acao executada: criado scaffold `supabase/mcp-ops/` (Node + TypeScript) com adapters EasyPanel/Evolution e tool de diagnostico `ops_full_diagnosis`.
- Resultado: build validado (`npm run build`), modo padrao seguro (`readonly`) e mutacoes protegidas por flags.
- Risco/Impacto: endpoints reais da API EasyPanel podem divergir dos candidatos; precisa confirmar contrato com chamada autenticada real.
- Proximo passo: coletar `Copy as cURL` do EasyPanel, ajustar endpoints definitivos e validar leitura de `worker` e `evolution api` no projeto `9999`.

## 31/03/2026 14:47
- Contexto: solicitacao para colocar o frontend para rodar no EasyPanel e obter link de acesso.
- Acao executada: adicionados `Dockerfile`, `nginx.conf` e `.dockerignore` na raiz; criado guia `docs/operations/EASYPANEL_FRONTEND_SETUP.md` com campos de configuracao e validacao.
- Resultado: frontend preparado para deploy web com fallback SPA e build local validado via `npm run build`.
- Risco/Impacto: deploy remoto depende de preencher `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` como Build Args no EasyPanel.
- Proximo passo: criar servico `prn-frontend` no EasyPanel, publicar URL temporaria e validar refresh em rotas internas.

## 31/03/2026 16:20
- Contexto: execucao da fase build para criar aba separada `Listas` e vincular pacientes por bloco de cadastro.
- Acao executada: criada migration `20260331121500_create_send_lists_and_link_queue.sql`; implementados `src/services/send-lists.ts` e `src/pages/Listas.tsx`; atualizado `src/pages/EnviarLista.tsx` para criar lista e vincular `send_list_id`; adicionada rota/menu `/listas`.
- Resultado: frontend compila com sucesso (`npm run build`); funcionalidade de listas cadastradas pronta no codigo para validacao em ambiente com migration aplicada.
- Risco/Impacto: sem aplicar migration no Supabase remoto, tela/fluxo novo nao opera totalmente; lint local falhou por dependencia ausente em `vite.config.ts` (`vite-plugin-react-uid`) e nao por regressao de codigo da feature.
- Proximo passo: aplicar migration no banco remoto, validar fluxo ponta a ponta e ajustar politica final de exclusao se necessario.

## 31/03/2026 16:36
- Contexto: solicitacao para aplicar imediatamente a migration da nova feature de listas.
- Acao executada: migration aplicada via `supabase_apply_migration` com nome `create_send_lists_and_link_queue`; validacoes SQL realizadas para tabela `send_lists`, coluna `patients_queue.send_list_id` e FK `patients_queue_send_list_id_fkey`.
- Resultado: estrutura de banco ativa em ambiente remoto para suportar a aba `Listas` e vinculo por bloco de cadastro.
- Risco/Impacto: ainda requer smoke test funcional no frontend para confirmar fluxo completo (`Enviar lista` -> `Listas`).
- Proximo passo: executar teste operacional ponta a ponta com criacao real de lista e reatribuicao/cancelamento.

## 31/03/2026 17:05
- Contexto: solicitacao para exibir listas antigas na aba `Listas` sem alterar horarios/status dos pacientes.
- Acao executada: implementada visualizacao hibrida em `src/pages/Listas.tsx` com duas secoes (`cadastradas` e `legadas`); criado agrupamento legado em `src/services/send-lists.ts` para pacientes sem `send_list_id` por `locked_instance_id + data_exame`; adicionados tipos `LegacyListGroup` e `LegacyListPatient` em `packages/shared/types.ts`.
- Resultado: cards legados aparecem com nome da instancia + data, contadores por status e detalhe somente leitura com nome do paciente, horario e status de disparo.
- Risco/Impacto: agrupamento legado e visual (nao cria entidade real no banco); lotes historicos do mesmo canal/data podem aparecer no mesmo card legado por design.
- Proximo passo: validar UX em producao e, se necessario, evoluir para subagrupamento legado por janela de criacao.

## 31/03/2026 17:28
- Contexto: solicitacao de UX para editar lista via popup dedicado em vez de campos inline.
- Acao executada: criado `src/components/send-lists/EditSendListDialog.tsx`; em `src/pages/Listas.tsx` adicionados botao `Editar` e fluxo `handleSaveEditDialog`; removida edicao inline de nome/status/observacoes/canal.
- Resultado: listas cadastradas agora abrem modal com `Salvar`, `Cancelar` e fechamento por `X`; detalhe da lista ficou mais limpo e focado em leitura.
- Risco/Impacto: nenhum impacto em listas legadas (continuam somente leitura).
- Proximo passo: validar manualmente na interface o fluxo completo de edicao e troca de canal via popup.

## 31/03/2026 17:41
- Contexto: usuario reportou dificuldade para localizar o botao `Editar` dentro dos cards.
- Acao executada: reforcada visibilidade do botao `Editar` em `src/pages/Listas.tsx` com estilo primario destacado (`bg-blue-600`).
- Resultado: botao ficou visualmente mais evidente nos cards de `Listas cadastradas`.
- Risco/Impacto: impacto apenas visual; sem alteracao de regra de negocio.
- Proximo passo: validar em UI se o operador consegue localizar e abrir o popup sem ambiguidade.

## 31/03/2026 17:53
- Contexto: decisao operacional de remover dependencia do botao `Editar` no card por baixa descoberta visual.
- Acao executada: alterado `src/pages/Listas.tsx` para abrir modal de edicao ao clicar no card de lista cadastrada.
- Resultado: clique no card cadastrado agora abre diretamente o popup (Salvar/Cancelar/X).
- Risco/Impacto: minimo; cards legados continuam em modo leitura.
- Proximo passo: validar no fluxo real se o novo comportamento ficou mais intuitivo para a operacao.

## 31/03/2026 18:12
- Contexto: solicitacao para permitir edicao tambem a partir de `Listas legadas`.
- Acao executada: implementada conversao controlada de grupo legado para `send_list` real em `src/services/send-lists.ts` (`convertLegacyGroupToSendList`) + dialog de confirmacao em `src/pages/Listas.tsx`.
- Resultado: ao clicar no card legado e confirmar, o grupo e convertido para lista cadastrada, pacientes recebem `send_list_id` e o popup de edicao abre automaticamente.
- Risco/Impacto: conversao e irreversivel no sentido de classificacao visual (legado -> cadastrado), mas nao altera horarios/status/procedimentos dos pacientes.
- Proximo passo: validar em producao com 1 card legado real e confirmar se fluxo esta aderente para operacao diaria.

## 31/03/2026 20:45
- Contexto: solicitacao operacional para remover do banco os procedimentos das datas `2026-04-04` e `2026-04-05`, incluindo fila de envio e rastros relacionados.
- Acao executada: mapeadas dependencias e executada limpeza SQL com remocao em cascata logica de `message_events`, `message_logs`, `webhook_events_raw` (por `provider_message_id`) e `patients_queue` para as datas alvo.
- Resultado: removidos `43` registros da fila (`patients_queue`), `76` eventos (`message_events`), `1` log (`message_logs`) e `16` webhooks brutos (`webhook_events_raw`); validacao final retornou zero itens restantes para essas datas.
- Risco/Impacto: operacao irreversivel para os registros apagados; nao desfaz mensagens ja aceitas/entregues externamente no WhatsApp.
- Proximo passo: monitorar dashboard e worker para confirmar ausencia de reentrada desses pacientes e, se necessario, recadastrar apenas os casos corretos.
