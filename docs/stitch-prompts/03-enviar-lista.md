# Prompt Stitch - Enviar Lista

## Contexto

Tela critica para colar lista bruta, gerar organizacao via IA, revisar preview e aprovar insercao no banco. Possui muitos campos e estados de validacao/bloqueio.

## Estrutura obrigatoria

- Card de introducao da pagina.
- Layout em duas colunas: entrada da lista (esquerda) e preview/aprovacao (direita).
- Campos: data manual, nome da lista, observacoes, selecao de canal WhatsApp, textarea de lista bruta.
- Acoes: gerar, atualizar canais, recusar, aprovar.
- Alertas de bloqueio (fora da janela, tempo indefinido, data invalida).
- Lista detalhada de pacientes no preview com todos os campos e mensagem WhatsApp.

## Objetivo visual

Transformar uma tela densa em fluxo guiado por etapas visuais: "Preparar", "Gerar", "Revisar", "Aprovar".

## Prompt final para Stitch

Redesenhe a tela "Enviar Lista" mantendo toda a estrutura e funcionalidades existentes, sem remover nenhum campo, botao, alerta ou bloco de preview. Nao altere logica de validacao e bloqueio.

Quero um visual mais organizado e didatico, com cara "family friendly" para operadores. Trate a tela como um fluxo em 4 etapas: 1) preparar dados, 2) gerar agenda, 3) revisar inconsistencias, 4) aprovar insercao. Use destaques visuais para orientar o proximo passo.

Mantenha o layout em duas colunas no desktop, mas com hierarquia forte e secoes claramente delimitadas. No mobile, converter para pilha sem perder contexto de acoes principais. Tornar os alertas mais claros e menos cansativos, e os cards de paciente mais escaneaveis.

Preservar todos os campos de dados e o bloco "Message body (WhatsApp)" para cada paciente. Acoes "Recusar" e "Aprovar" devem continuar evidentes e sem ambiguidades.
