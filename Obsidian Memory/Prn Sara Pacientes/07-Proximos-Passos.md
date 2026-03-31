# Proximos Passos

## Checklist operacional imediato
1. Confirmar no EasyPanel o commit/branch real em execucao.
2. Fazer 1 redeploy limpo (evitar varias tentativas em sequencia).
3. Coletar logs de 10-15 minutos apos subir o worker.
4. Validar se ha distribuicao de claims entre instancias.
5. Capturar stack/erro detalhado do fluxo `retry_phone2`.

## Checklist tecnico apos logs
1. Se runtime ainda estiver antigo: corrigir fonte de deploy (branch/imagem/cache).
2. Se runtime estiver novo mas sem distribuicao: revisar selecao de instancias conectadas e criterio de claim.
3. Se `retry_phone2` continuar falhando: instrumentar erro no ponto de enqueue e ajustar SQL/retorno.

## Criterios de sucesso desta fase
- Worker em producao rodando commit esperado.
- Claims distribuidos entre instancias conectadas conforme disponibilidade/afinidade.
- Sem erro sistematico de `retry_phone2`.
- Deploy previsivel sem bloqueios frequentes de `429`.

## Plano de rollback (se necessario)
- Reverter servico para imagem/commit anterior estavel.
- Manter migration sem remover funcao nova (nao quebra compatibilidade do fluxo antigo).
- Voltar processamento para claim antigo temporariamente se houver impacto operacional.
