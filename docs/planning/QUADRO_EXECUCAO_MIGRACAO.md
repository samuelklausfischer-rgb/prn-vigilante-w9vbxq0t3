# Quadro de Execucao da Migracao

## Objetivo

Organizar a execucao em ordem pratica, com foco no que deve ser feito agora para tirar a migracao do papel.

---

## Fazer Agora

1. Confirmar URL base da Evolution para integracao server-side (sem `/manager/`).
2. Cadastrar no Supabase Secrets: `EVOLUTION_API_URL`, `EVOLUTION_API_KEY`, `EVOLUTION_WEBHOOK_SECRET`.
3. Remover/planejar remocao de `VITE_EVOLUTION_API_URL` e `VITE_EVOLUTION_API_KEY` do frontend.
4. Mapear todas as operacoes de Evolution no frontend e listar as Edge Functions equivalentes.
5. Definir pacote minimo de Edge Functions da Evolution (listar, criar, QR, status, desconectar/remover, sync).
6. Configurar webhook da Evolution para endpoint publico do Supabase com segredo validado.
7. Subir automacao no EasyPanel usando imagem GHCR e envs da VPS.
8. Rodar smoke test ponta a ponta (fila -> envio -> webhook -> classificacao).

---

## Fazer Depois

1. Extrair automacao para repositorio dedicado (se ainda estiver no monorepo).
2. Evoluir estrategia de `shared` para pacote versionado.
3. Endurecer RLS e autorizacao por perfil nas Edge Functions administrativas.
4. Melhorar observabilidade (dashboards, alertas e metricas de fila/webhook/worker).
5. Revisar niveis de log da Evolution para producao.
6. Formalizar runbook de incidentes e operacao diaria.

---

## Bloqueadores

1. Frontend ainda possuir chamadas diretas para Evolution.
2. Falta de secrets server-side no Supabase para integracao com Evolution.
3. Webhook inbound sem validacao de segredo ativa.
4. Divergencia entre estado real da Evolution e `whatsapp_instances` no Supabase.
5. `EVOLUTION_API_URL` configurada com rota de painel em vez de base da API.

---

## Dependencias

1. Edge Functions da Evolution dependem de `EVOLUTION_API_URL` e `EVOLUTION_API_KEY` no Supabase.
2. Automacao depende de `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `EVOLUTION_API_URL`, `EVOLUTION_API_KEY`.
3. Cutover depende de webhook funcional e sync de instancias server-side.
4. Troca futura de VPS depende de manter URL/chave apenas em envs (sem hardcode).

---

## Definicao de Pronto (Sprint Atual)

1. Nenhuma chave da Evolution em variavel `VITE_*`.
2. Frontend opera Evolution via Edge Functions.
3. Automacao envia usando Evolution da VPS com estabilidade.
4. Webhook inbound chega no Supabase e processa sem erro critico.
5. Smoke test completo aprovado.

---

## Referencias

- `docs/planning/PLANO_MIGRACAO_VPS_EASYPANEL.md`
- `docs/architecture/ARQUITETURA_VPS_FINAL.md`
- `docs/planning/MATRIZ_ENVS_E_SERVICOS.md`
- `docs/operations/CHECKLIST_CUTOVER_VPS.md`
- `docs/operations/EASYPANEL_AUTOMATION_SETUP.md`
