# Prompt Stitch - WhatsApp Settings

## Contexto

Tela de gerenciamento de canais WhatsApp com sincronizacao, criacao de novo canal, cards de instancia e modal de configuracao.

## Estrutura obrigatoria

- Header com metricas de conectividade e acoes (novo canal, sincronizar).
- Estado de erro com opcao de tentar novamente.
- Estado vazio orientando criacao/sincronizacao.
- Grid de instancias (`WhatsAppSlotCard`).
- Modal de gerenciamento/criacao (`WhatsAppModal`).

## Prompt final para Stitch

Redesenhe a pagina "WhatsApp Settings" mantendo todos os estados e acoes existentes: novo canal, sincronizar, estado de erro, estado vazio, grid de instancias e modal de configuracao.

Objetivo visual: comunicar saude dos canais com clareza e reduzir incerteza operacional. O usuario deve entender rapidamente quantos canais estao conectados e o que fazer em seguida.

Aplicar identidade "Saude acolhedora" com destaque positivo para conectividade, feedback claro de erros e layout de cards consistente para muitas instancias.

Responsividade: grid adaptativo sem perder legibilidade dos status e sem esconder acoes principais.
