# Pendencias Atuais

## P0 - Confirmar runtime correto no EasyPanel
- Verificar branch configurada no servico.
- Verificar commit efetivo em execucao.
- Garantir rebuild sem cache antigo.

## P0 - Investigar `retry_phone2`
- Erro observado repetidamente: `Erro ao enfileirar retry_phone2: erro desconhecido`.
- Impacto: escada de telefones encontra numero valido, mas nao cria nova tentativa.
- Necessario identificar erro real (SQL/RPC/constraint/retorno nulo).

## P1 - Confirmar paralelismo real
- Validar distribuicao entre instancias conectadas.
- Confirmar que nenhuma instancia monopoliza claims sem necessidade.
- Medir throughput antes/depois da mudanca.

## P1 - Estabilizar fluxo de deploy
- Mitigar `429` no download de source.
- Definir estrategia padrao: branch estavel ou imagem de registry.

## P2 - Consolidacao para `main`
- Apos validacao completa em ambiente alvo, decidir merge da branch de trabalho para `main`.
