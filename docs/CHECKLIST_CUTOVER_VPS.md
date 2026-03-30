# Checklist de Cutover VPS

## Objetivo

Executar a virada para VPS com controle, validação e rollback claro, sem depender de memória operacional.

---

## 1) Pre-Deploy

### 1.1 Congelamento e janela

- [ ] Definir janela de deploy com inicio/fim.
- [ ] Definir responsavel tecnico e backup responsavel.
- [ ] Congelar mudancas nao relacionadas durante a janela.

### 1.2 Segredos e variaveis

- [ ] Confirmar `EVOLUTION_API_URL` final da VPS.
- [ ] Confirmar `EVOLUTION_API_KEY` final.
- [ ] Confirmar `EVOLUTION_WEBHOOK_SECRET`.
- [ ] Confirmar `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` da automacao.
- [ ] Confirmar que frontend nao possui `VITE_EVOLUTION_API_*`.

### 1.3 Infra Evolution

- [ ] Evolution em execucao com `SERVER_URL` correto.
- [ ] Postgres e Redis da Evolution saudaveis.
- [ ] Endpoint base da API testado (nao usar `/manager/` como base de API).
- [ ] Health/manual request de autenticacao validado com API key.

### 1.4 Supabase

- [ ] Secrets das Edge Functions atualizados (`EVOLUTION_API_URL`, `EVOLUTION_API_KEY`, `EVOLUTION_WEBHOOK_SECRET`, `GLM_*` quando aplicavel).
- [ ] Functions de integracao com Evolution implantadas/atualizadas.
- [ ] Migrations obrigatorias aplicadas.
- [ ] Politicas RLS revisadas para producao.

### 1.5 Automacao

- [ ] Imagem da automacao disponivel no registry (tag definida).
- [ ] EasyPanel configurado para usar a tag correta.
- [ ] Env da automacao apontando para Evolution da VPS.
- [ ] Restart policy e logs habilitados.

---

## 2) Deploy (ordem de execucao)

1. [ ] Atualizar secrets no Supabase.
2. [ ] Publicar/atualizar Edge Functions de proxy/control plane da Evolution.
3. [ ] Configurar webhook da Evolution apontando para o endpoint publico do Supabase.
4. [ ] Deploy da automacao no EasyPanel com envs finais.
5. [ ] Reiniciar automacao e confirmar boot sem erro.
6. [ ] Deploy do frontend sem acesso direto a Evolution.

---

## 3) Validacao Pos-Deploy (smoke)

### 3.1 Integracao Evolution <-> Supabase

- [ ] Edge Function lista instancias com sucesso.
- [ ] Edge Function cria instancia com sucesso.
- [ ] QR e status de conexao retornam corretamente.
- [ ] `whatsapp_instances` sincroniza com estado real da Evolution.

### 3.2 Integracao Automacao <-> Evolution

- [ ] Worker inicia e mantem heartbeat.
- [ ] Worker consegue claimar fila.
- [ ] Worker envia mensagem com sucesso via Evolution.
- [ ] Worker processa falha e retentativa sem travar loop.

### 3.3 Integracao Inbound (Webhook)

- [ ] Webhook da Evolution chega no Supabase.
- [ ] Eventos de mensagem/conexao sao persistidos.
- [ ] Fluxo de classificacao/processamento pos-resposta executa.

### 3.4 Operacao de negocio

- [ ] Fluxo completo de paciente testado: fila -> envio -> resposta -> classificacao.
- [ ] Dashboard reflete estado operacional sem inconsistencias.

---

## 4) Criterios de Go/No-Go

## Go

- [ ] Todos os testes criticos de envio e webhook passaram.
- [ ] Sem erro bloqueante nos logs de automacao/edge functions.
- [ ] Time confirma estabilidade por janela minima observada.

## No-Go

- [ ] Falha em envio critico.
- [ ] Webhook nao chega ou nao autentica.
- [ ] Divergencia persistente entre Evolution e `whatsapp_instances`.

Se qualquer item de No-Go ocorrer, executar rollback imediatamente.

---

## 5) Rollback

1. [ ] Reverter `EVOLUTION_API_URL` no Supabase para endpoint anterior.
2. [ ] Reverter `EVOLUTION_API_URL` na automacao para endpoint anterior.
3. [ ] Reapontar webhook da Evolution para configuracao anterior (se aplicavel).
4. [ ] Reiniciar automacao com configuracao anterior.
5. [ ] Validar envio e webhook no ambiente antigo.
6. [ ] Registrar causa raiz e plano de nova tentativa.

---

## 6) Pos-Cutover (24h-72h)

- [ ] Monitorar taxa de envio, erro e retentativa.
- [ ] Monitorar estabilidade de heartbeat/lease.
- [ ] Monitorar volume de eventos de webhook.
- [ ] Verificar custos e latencia da Evolution na VPS.
- [ ] Confirmar que nenhum cliente/frontend chama Evolution diretamente.

---

## 7) Registro de Execucao

- Data/hora inicio:
- Data/hora fim:
- Responsavel tecnico:
- Resultado final: `GO` ou `ROLLBACK`
- Observacoes:
- Proximas acoes:
