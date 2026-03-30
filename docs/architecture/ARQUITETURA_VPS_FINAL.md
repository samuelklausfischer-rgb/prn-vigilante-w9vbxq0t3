# Arquitetura VPS Final

## Objetivo

Definir a arquitetura operacional final do PRN-Vigilante na VPS, com responsabilidades claras entre `frontend`, `Supabase`, `automacao` e `Evolution API`, incluindo padrao para futuras trocas de VPS.

---

## 1. Decisoes Arquiteturais (Validadas)

1. Existe uma unica Evolution API oficial por ambiente.
2. Frontend nao acessa Evolution diretamente.
3. Supabase Edge Functions e a camada oficial para operacoes administrativas da Evolution.
4. Automacao usa a mesma Evolution API da VPS.
5. Evolution publica webhook para Supabase.
6. Chaves da Evolution nunca vao para `VITE_*`.

---

## 2. Mapa de Servicos

## 2.1 Frontend (Vite/React)

- Tipo: app web publico.
- Papel: dashboard operacional.
- Conexao permitida:
  - Supabase (auth, dados, rpc, edge functions).
- Conexao proibida:
  - chamadas diretas para Evolution API.

## 2.2 Supabase (DB + Edge Functions)

- Tipo: backend gerenciado.
- Papel: persistencia, auth, regras de negocio, integracao server-side.
- Edge Functions fazem:
  - listar/criar/remover instancias
  - obter QR
  - consultar status de conexao
  - receber webhook inbound da Evolution

## 2.3 Automacao (Worker no EasyPanel)

- Tipo: servico privado de background.
- Papel: claim da fila, envio, follow-up, heartbeat, retentativas.
- Conexoes:
  - Supabase
  - Evolution API (URL publica da VPS)

## 2.4 Evolution API (EasyPanel/VPS)

- Tipo: servico de mensageria WhatsApp.
- Papel: canal de envio e eventos.
- Observacao importante:
  - a URL da API para servicos deve ser a base da API.
  - nao usar rota de painel `/manager/` como base de integracao.

---

## 3. Topologia Logica

```text
Usuario/Admin
   |
   v
Frontend (publico)
   |
   +--> Supabase (DB/Auth/RPC/Edge Functions)
                |
                +--> Evolution API (server-side via EVOLUTION_API_URL + EVOLUTION_API_KEY)

Automation Worker (EasyPanel)
   |
   +--> Supabase
   +--> Evolution API (mesma URL da VPS)

Evolution API (VPS)
   |
   +--> Webhook publico do Supabase
```

---

## 4. Dominios e Endpoints

## 4.1 Supabase

- Base: `https://<project-ref>.supabase.co`
- Edge Functions: `https://<project-ref>.functions.supabase.co/<function-name>`

## 4.2 Evolution (atual, temporaria)

- URL publica atual informada: `https://9999-evolution-api-prn.25xe2c.easypanel.host/manager/`
- Regra de integracao:
  - usar a URL base da API (sem `/manager/`) em `EVOLUTION_API_URL`.

## 4.3 Frontend

- Dominio publico do painel.
- Nao precisa de dominio da Evolution no browser.

---

## 5. Variaveis de Ambiente por Servico

Referencia detalhada: `docs/planning/MATRIZ_ENVS_E_SERVICOS.md`.

Resumo minimo:

- Frontend:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_PUBLISHABLE_KEY`

- Supabase Secrets (Edge Functions):
  - `EVOLUTION_API_URL`
  - `EVOLUTION_API_KEY`
  - `EVOLUTION_WEBHOOK_SECRET`
  - `GLM_*` (quando aplicavel)

- Automacao (EasyPanel):
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `EVOLUTION_API_URL`
  - `EVOLUTION_API_KEY`
  - envs operacionais do worker

- Evolution (EasyPanel):
  - env completo da Evolution, incluindo:
    - `SERVER_URL`
    - `DATABASE_*`
    - `CACHE_REDIS_*`
    - `AUTHENTICATION_API_KEY`

---

## 6. Fluxos Criticos

## 6.1 Gestao de instancia e QR

1. Frontend chama Edge Function.
2. Edge Function chama Evolution com `EVOLUTION_API_*`.
3. Edge Function persiste/atualiza estado no Supabase.
4. Frontend mostra estado sincronizado.

## 6.2 Envio de mensagens

1. Frontend/rotina grava fila no Supabase.
2. Automacao claima item da fila.
3. Automacao envia via Evolution.
4. Automacao atualiza status e eventos no Supabase.

## 6.3 Inbound e classificacao

1. Evolution envia webhook para Supabase.
2. Edge Function valida segredo.
3. Evento e persistido/processado.
4. Fluxo de classificacao e atualizado no banco.

---

## 7. Seguranca Operacional

1. Nao expor chaves da Evolution no frontend.
2. Proteger webhook com segredo (`EVOLUTION_WEBHOOK_SECRET`).
3. Revisar CORS da Evolution (evitar `*` em producao quando possivel).
4. Revisar RLS e permissoes no Supabase.
5. Auditar logs de edge functions, webhook e worker.

---

## 8. Observabilidade Minima

1. Worker com heartbeat/lease monitorado.
2. Alertas para falha de envio e fila parada.
3. Monitoramento de volume de webhook.
4. Logs de erro por modulo:
   - Edge Functions
   - Automacao
   - Evolution

---

## 9. Portabilidade (Troca de VPS)

Quando trocar a VPS da Evolution (ex.: Hostinger), nao muda arquitetura, muda configuracao.

Passos minimos:

1. Subir Evolution na nova VPS.
2. Atualizar `EVOLUTION_API_URL` no Supabase Secrets.
3. Atualizar `EVOLUTION_API_URL` na automacao.
4. Validar/rotacionar `EVOLUTION_API_KEY`.
5. Revalidar webhook para Supabase.
6. Executar smoke test completo.

Referencia operacional: `docs/operations/CHECKLIST_CUTOVER_VPS.md`.

---

## 10. Criterio de Arquitetura Correta

Esta arquitetura esta correta quando:

1. Nenhum codigo client-side chama Evolution diretamente.
2. Todas as operacoes administrativas da Evolution passam por Edge Functions.
3. Automacao e Edge Functions usam a mesma Evolution da VPS.
4. Webhook inbound chega e e autenticado no Supabase.
5. Troca de VPS exige apenas update de envs e validacao, sem refatorar codigo.
