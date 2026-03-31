# EasyPanel e Deploy

## Problemas ja vistos
- Build path inconsistente (ex.: `automation/automation/Dockerfile`) em etapa anterior.
- Runtime com import quebrado da automacao para `packages/shared` (ja corrigido no codigo).
- Falha recente no download do repositorio por GitHub archive:
  - erro: `Response code 429 (Too Many Requests)`.

## Leitura do erro 429
- Nao indica erro de branch por si so.
- Indica limite de requests/autenticacao no download do archive do GitHub.
- Pode ocorrer tanto em `recover-local-state` quanto em `main` se condicoes forem as mesmas.

## Possiveis causas operacionais
- Muitos redeploys/rebuilds em curto intervalo.
- Integracao GitHub do EasyPanel sem token/app adequado para repo privado.
- Cache ou fila de build repetindo tentativas.

## Acoes recomendadas
- Aguardar janela curta e tentar 1 deploy limpo.
- Confirmar integracao GitHub autenticada no EasyPanel.
- Evitar rodadas seguidas de rebuild.
- Preferir deploy por imagem de registry para reduzir dependencia de archive GitHub.

## Sinais dos logs de runtime
- Logs recentes ainda mostram formato antigo de claim serial.
- Indicio de que o runtime pode nao estar com o commit esperado.
