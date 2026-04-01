# Prompt Stitch - Segunda Chamada

## Contexto

Tela de tratamento manual por categorias (respondido, pendente, falha, critico, fixo, concluido, historico) com selecao multipla e acoes em lote.

## Estrutura obrigatoria

- Header com titulo e filtros (data + busca).
- Tabs com contadores por categoria.
- Conteudo por aba com lista de pacientes.
- Seletor "selecionar tudo" por aba.
- Barra de acoes em lote (`BulkActionsBar`).
- Modal de conversacao (`ConversationModal`).
- Estados de loading, vazio e overlay de processamento.

## Prompt final para Stitch

Redesenhe a tela "Segunda Chamada" mantendo toda a estrutura funcional: filtros, tabs com contadores, cards de paciente com selecao, acoes em lote, modal de conversa e estados de carregamento.

Objetivo: reduzir complexidade percebida e facilitar triagem por prioridade. A visualizacao deve deixar claro "onde estou", "quantos casos ha" e "qual acao executar".

Aplique identidade "Saude acolhedora" com cores semanticas por categoria sem excesso de saturacao. Destaque selecao ativa e feedback de acao em lote. Melhore legibilidade da grade de pacientes e consistencia de espacamento.

No mobile, tabs devem continuar usaveis, filtros compactos, e barra de acoes acessivel.
