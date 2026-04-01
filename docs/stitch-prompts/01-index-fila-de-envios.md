# Prompt Stitch - Fila de Envios

## Contexto

Tela principal operacional de monitoramento da fila ativa. O operador controla pausa/retomada, acompanha KPIs de volume, visualiza lotes e executa acoes pontuais (aprovar, editar, cancelar, atualizar, adicionar paciente).

## Estrutura obrigatoria a preservar

- Bloco de controle do motor (`DispatchControl`).
- Grade de 4 cards de estatistica (`StatCard`): volume em espera, proximo disparo, execucao ativa, cadencia.
- Secao "Supervisao de Lotes" com botao de atualizar.
- Lista de fila (`QueueList`) com acoes por item.
- Modal de edicao (`EditModal`).
- Modal de adicionar paciente (`AddPatientModal`).
- Dialogo de confirmacao para cancelamento definitivo.
- Botao flutuante de adicionar paciente.

## Objetivo visual

Deixar a tela mais clara para tomada de decisao rapida: KPI no topo, area de acao no centro, detalhes abaixo. Reduzir ruido visual e destacar prioridades.

## Ajustes de UX visual esperados

- Hierarquia nitida entre status do sistema e lista operacional.
- Cards com leitura instantanea (numero grande, subtitulo curto, icone consistente).
- Botoes com pesos visuais corretos (primario, secundario, critico).
- Feedback visual mais amigavel para loading e atualizacao.
- Melhor separacao entre acoes perigosas (abortar) e acoes comuns.

## Prompt final para Stitch (copiar e colar)

Redesenhe a pagina "Fila de Envios" mantendo exatamente a estrutura funcional atual: controle do motor, 4 cards de KPI, secao de supervisao com botao de atualizar, lista de fila, modal de edicao, modal de adicionar paciente, dialogo de cancelamento e botao flutuante de adicionar paciente. Nao remova nem renomeie acoes.

Aplique identidade "Saude acolhedora" com visual mais organizado e didatico. A pagina deve ficar "family friendly" para operadores: leitura rapida, menos poluicao, maior clareza de prioridade. Destaque o estado do sistema e os proximos passos sem alterar logica.

Melhore composicao dos cards de KPI, contraste de texto, espacamento e consistencia de icones. Reorganize pesos visuais dos CTAs: atualizar e adicionar paciente devem ser claros; abortar envio deve continuar evidente, porem controlado e seguro.

Garanta responsividade: em mobile, cards empilhados, lista legivel, botao flutuante nao cobrindo conteudo e dialogos confortaveis para toque.

## Checklist de aceite

- Todos os blocos funcionais continuam presentes.
- Nenhuma acao foi removida.
- Estado de loading continua visivel.
- A tela esta mais clara e amigavel sem perder densidade operacional.
