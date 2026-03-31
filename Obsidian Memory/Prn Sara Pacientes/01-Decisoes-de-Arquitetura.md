# Decisoes de Arquitetura

## Diretrizes aprovadas
- Frontend nao deve chamar Evolution API diretamente em producao.
- Integracoes com Evolution devem passar pela camada server-side (Supabase Edge Functions).
- Secrets/chaves da Evolution ficam apenas no servidor, nao no frontend.
- Worker de automacao roda 24/7 em container no EasyPanel.
- Solucao deve ser portavel para troca futura de VPS sem reescrever fluxo.

## Decisoes aplicadas
- Criado fluxo por `evolution-proxy` em Supabase Functions para operacoes de Evolution.
- Ajustadas funcoes relacionadas (`create-instance`, `sync-webhook`, helper `_shared/evolution-api`).
- Webhook da Evolution atualizado para aceitar `x-webhook-secret` e fallback `?secret=`.
- Variaveis locais de frontend para Evolution direta removidas do `.env` raiz.

## Decisao de operacao de worker
- Mantido lease global para garantir um worker ativo por vez (seguranca operacional).
- Introduzida estrategia de lanes por instancia dentro do worker ativo.
- Claim por instancia feito por nova RPC no banco para permitir distribuicao.

## Implicacoes
- Reduz risco de exposicao de API key no cliente.
- Melhora controle de autenticacao e auditoria de chamadas externas.
- Prepara escalabilidade de envio sem perder afinidade por numero.
