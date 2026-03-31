# Supabase Migrations

## Migrations novas desta fase

### `20260331100000_claim_next_message_for_instance.sql`
- Objetivo: introduzir claim por instancia para lanes paralelas no worker.
- Conteudo principal:
  - indice parcial `idx_patients_queue_instance_claim`;
  - funcao `public.claim_next_message_for_instance`.

### `20260331103000_fix_claim_next_message_for_instance_text.sql`
- Objetivo: corrigir assinatura da funcao para tipo real do schema.
- Motivo: `locked_instance_id` em `patients_queue` esta como `text`.
- Acao:
  - remove assinatura com `uuid`;
  - recria funcao com `p_instance_id text` e retorno alinhado.

## Status de aplicacao
- Ambas aplicadas no Supabase remoto com sucesso.

## Validacoes executadas
- Confirmacao de existencia da funcao em `pg_proc`.
- Smoke test SQL transacional (`BEGIN ... ROLLBACK`) com retorno valido de claim.
- Contagem de instancias conectadas no banco confirmada durante testes.

## Observacao importante de drift
- Diferenca entre expectativa de tipo (`uuid`) e schema real (`text`) em `locked_instance_id`.
- Necessario considerar esse legado em qualquer nova alteracao de fila/afinidade.
