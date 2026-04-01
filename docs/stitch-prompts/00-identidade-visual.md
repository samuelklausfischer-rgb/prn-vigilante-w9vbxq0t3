# Prompt inicial de identidade visual (Stitch)

## Objetivo

Criar uma identidade visual nova para o PRN Vigilante com direcao "Saude acolhedora", mantendo o produto com cara profissional, organizado e facil para operadores de diferentes niveis de familiaridade digital.

## Restricoes obrigatorias

- Nao alterar arquitetura de navegacao.
- Nao remover componentes funcionais existentes (cards, botoes, filtros, tabelas, tabs, modais).
- Nao alterar nomes de acoes criticas (ex.: Aprovar, Cancelar, Atualizar, Confirmar).
- Nao alterar regras de negocio, estados e fluxos.

## Direcao visual

- Clima: acolhedor, confiavel, claro e humano.
- Sensacao: "painel que guia o operador", nao "painel tecnico confuso".
- Prioridade: legibilidade, hierarquia, clareza de acao e baixo atrito cognitivo.

## Paleta A (principal, recomendada)

- Primary 50-900: azul hospitalar suave (#eff6ff -> #1d4ed8)
- Secondary 50-900: verde cuidado (#ecfdf5 -> #047857)
- Accent 50-900: aqua calmo (#ecfeff -> #0e7490)
- Neutros: cinza quente (#fafaf9, #f5f5f4, #e7e5e4, #a8a29e, #57534e, #292524)
- Feedback:
  - Sucesso: #16a34a
  - Aviso: #d97706
  - Erro: #dc2626
  - Info: #0284c7

## Paleta B (variacao)

- Primary: azul marinho suave (#e6f0ff -> #1e3a8a)
- Secondary: verde menta (#e9fbf3 -> #0f766e)
- Accent: coral leve para chamadas secundarias (#fff1ed -> #ea580c)
- Neutros levemente frios para dashboards densos.

## Tipografia

- Titulos: familia humanista sem serifa com personalidade amigavel.
- Corpo: sans clean de alta legibilidade.
- Labels e microcopy: tamanho menor, contraste alto, sem excesso de uppercase.
- Numeros de KPI: variante tabular para leitura rapida.
- Escala sugerida:
  - H1 32/38
  - H2 24/30
  - H3 20/26
  - Body 16/24
  - Small 14/20
  - Caption 12/16

## Tokens visuais

- Radius: 10, 14, 18 (uso predominante em 14)
- Sombra: suave por elevacao (sm, md, lg), sem glow agressivo.
- Borda: 1px com contraste baixo/moderado.
- Espacamento base: 4, 8, 12, 16, 24, 32.
- Animacao: transicoes curtas (120-220ms), entrada suave em blocos.

## Componentes base

- Cards: titulo claro, subtitulo util, conteudo separado por secoes visuais.
- Botoes:
  - Primario: destaque limpo
  - Secundario: contorno leve
  - Critico: vermelho legivel e sem exagero
- Inputs/Filtros: estado de foco claro, placeholder legivel.
- Badges/Status: cores semanticamente consistentes.
- Tabelas/Listas: densidade media, linhas bem separadas, header sempre claro.
- Modais: foco em leitura da decisao e acao principal evidente.

## UX operacional e linguagem

- Trocar microcopy ambigua por linguagem direta e amigavel.
- Manter tom objetivo, sem jargoes excessivos.
- Priorizar "o que fazer agora" em cada bloco.
- Explicar estados vazios com orientacao pratica.

## Acessibilidade e responsividade

- Contraste minimo AA em texto principal e controles.
- Area clicavel confortavel (>= 40px).
- Indicador de foco visivel para teclado.
- Layout fluido para desktop e mobile, sem perder acoes.
- Em mobile: reorganizar em pilhas, manter CTA principal sempre acessivel.

## Prompt final para Stitch (copiar e colar)

Voce vai redefinir a identidade visual completa do sistema PRN Vigilante com direcao "Saude acolhedora". Nao altere a estrutura funcional: mantenha todos os botoes, cards, filtros, tabs, modais, listas, tabelas e acoes existentes. Nao mude regras de negocio. O objetivo e somente melhorar visual, organizacao e legibilidade.

Adote uma linguagem visual acolhedora e profissional com paleta baseada em azuis e verdes suaves, neutros claros, feedback semantico consistente (sucesso, aviso, erro, info), tipografia de alta legibilidade, hierarquia forte de titulos e KPIs, espacamento respiravel e componentes padronizados.

Crie um design system aplicavel a todas as paginas: tokens de cor, tipografia, espacamento, raio, sombra, estados (hover/focus/disabled/loading), padrao de cards, formularios, badges e modais. Evite visual tecnico agressivo e excesso de ruido. A interface deve parecer mais "mastigada", amigavel para uso diario e orientada a acao.

Garanta responsividade real desktop/mobile sem perder nenhuma acao, e mantenha foco em clareza operacional: o usuario precisa entender rapidamente o estado do sistema e o proximo passo em cada tela.
