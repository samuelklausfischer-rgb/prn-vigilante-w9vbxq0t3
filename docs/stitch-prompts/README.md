# Stitch Prompts - PRN Vigilante

Este diretorio contem prompts prontos para usar no Stitch para redesenhar o frontend sem perder a estrutura funcional existente.

## Ordem recomendada

1. Usar `00-identidade-visual.md` para definir o sistema visual base.
2. Em seguida, aplicar o prompt da pagina alvo (`01` a `12`).
3. Revisar checklist de aceite da pagina antes de seguir para a proxima.

## Regra principal

- Nao remover botoes, cards, filtros, tabs, modais, tabelas, listas e fluxos de acao.
- Nao mudar regras de negocio.
- Mudar apenas visual, hierarquia, organizacao e legibilidade.

## Mapeamento de paginas

- `01-index-fila-de-envios.md` -> `src/pages/Index.tsx`
- `02-analytics.md` -> `src/pages/Analytics.tsx`
- `03-enviar-lista.md` -> `src/pages/EnviarLista.tsx`
- `04-listas.md` -> `src/pages/Listas.tsx`
- `05-segunda-chamada.md` -> `src/pages/SegundaChamada.tsx`
- `06-estrategico.md` -> `src/pages/Estrategico.tsx`
- `07-crm-kanban.md` -> `src/pages/CRM.tsx`
- `08-arquivar-por-data.md` -> `src/pages/ArchiveByDate.tsx`
- `09-arquivo-morto.md` -> `src/pages/Archive.tsx`
- `10-whatsapp-settings.md` -> `src/pages/WhatsAppSettings.tsx`
- `11-auth.md` -> `src/pages/Auth.tsx`
- `12-not-found.md` -> `src/pages/NotFound.tsx`

## Metodo de uso rapido no Stitch

1. Cole primeiro o prompt de identidade visual (`00`).
2. No mesmo contexto, cole o prompt da pagina especifica.
3. Gere a versao visual.
4. Valide se todos os elementos funcionais continuam presentes.

## Checklist geral de validacao

- Estrutura e componentes originais preservados.
- CTA principal continua no mesmo objetivo.
- Estados de loading, vazio e erro continuam claros.
- Desktop e mobile com leitura facil.
- Contraste e foco visual adequados para uso operacional diario.
