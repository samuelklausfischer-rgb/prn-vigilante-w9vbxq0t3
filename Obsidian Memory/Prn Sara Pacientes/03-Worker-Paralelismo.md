# Worker Paralelismo

## Problema original
- Sintoma: uma instancia ativa (ex.: Whats 65/47) parecia bloquear outras.
- Causa provavel inicial: loop serial global com claim unico por ciclo e delays no mesmo fluxo.

## Solucao implementada

### Banco (RPC nova)
- Funcao nova: `public.claim_next_message_for_instance(...)`.
- Prioriza mensagens com `locked_instance_id` da propria instancia.
- Fallback para mensagens sem vinculo de instancia.
- Usa `FOR UPDATE SKIP LOCKED` para concorrencia segura.

### Worker
- `worker-engine.ts`:
  - busca instancias conectadas;
  - cria lanes por instancia (limitadas por `WORKER_MAX_PARALLEL_LANES`);
  - processa lanes com `Promise.allSettled`.
- `queue-manager.ts`: novo metodo `claimForInstance(...)`.
- `supabase.ts`: novos metodos `listConnectedInstances()` e `claimNextMessageForInstance(...)`.
- `.env.example`: adicionada `WORKER_MAX_PARALLEL_LANES=12`.

## Ajuste pos-erro de tipo
- O schema real tinha `patients_queue.locked_instance_id` como `text`.
- A primeira versao da funcao usou `uuid` e falhou em teste SQL.
- Foi criada migration de correcao para usar `text` na assinatura e retorno da funcao.

## Estado de validacao
- Validacao no Supabase: funcao existe e teste transacional de claim funcionou.
- Validacao no EasyPanel: ainda inconclusiva, logs aparentam comportamento antigo.

## Riscos atuais
- Runtime possivelmente sem commit correto (imagem antiga/cache).
- Erro paralelo no fluxo de escada: `retry_phone2` nao enfileira em varios casos.
