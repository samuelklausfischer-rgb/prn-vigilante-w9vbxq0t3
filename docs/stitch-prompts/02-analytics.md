# Prompt Stitch - Analytics

## Contexto

Painel de desempenho com filtro por intervalo de datas, KPIs, graficos de tendencia e tabela por procedimento.

## Estrutura obrigatoria

- Header com titulo, descricao e seletor de periodo (`DateRangePicker`).
- Estados de carregamento, erro e sucesso.
- 4 cards de resumo (`SummaryCard`).
- Dois paineis graficos: volume diario e taxa diaria de sucesso.
- Tabela de performance por procedimento.

## Prompt final para Stitch

Redesenhe a pagina de Analytics sem remover componentes existentes: seletor de periodo, cards de resumo, graficos, tabela, e estados de loading/erro/sucesso. Mantenha a mesma logica funcional.

Objetivo visual: painel executivo acolhedor e facil de interpretar, com hierarquia forte entre resumo (topo), tendencia (meio) e detalhe analitico (base). Use a identidade "Saude acolhedora" com contraste equilibrado, tipografia legivel e espacamento respiravel.

Melhore a legibilidade dos graficos (rotulos, legenda, area de plotagem) e a escaneabilidade da tabela por procedimento. Em estados vazios/erro, usar mensagens claras e orientadas a acao.

Responsividade: em mobile, cards em coluna, graficos com proporcao preservada e tabela com comportamento usavel.
