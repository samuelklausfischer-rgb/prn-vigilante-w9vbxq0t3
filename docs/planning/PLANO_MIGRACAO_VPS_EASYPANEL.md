# Plano de Migracao para VPS e EasyPanel

## Objetivo

Organizar o PRN-Vigilante para operar de forma profissional em VPS, com separacao clara entre frontend, automacao, Supabase e Evolution API, reduzindo acoplamentos locais e preparando o ambiente para deploy, manutencao e escala controlada.

---

## 1. Resumo Executivo

Hoje o projeto funciona, mas ainda carrega decisoes de arquitetura pensadas para ambiente local. O principal ponto de atencao e que o frontend conversa diretamente com a Evolution API e usa configuracoes publicas que nao devem permanecer assim em producao.

Para subir com seguranca na VPS, o plano recomendado e:

1. Manter o frontend como painel administrativo.
2. Manter o Supabase como backend de dados, auth, edge functions e webhooks.
3. Separar a automacao em repositorio proprio, com imagem Docker publicada no GitHub Container Registry.
4. Rodar a automacao no EasyPanel como worker privado.
5. Rodar a Evolution API na VPS, preferencialmente na mesma rede privada da automacao.
6. Remover o acesso direto do navegador para a Evolution API.

---

## 2. Estado Atual por Modulo

### Frontend (`src/`)

- Responsavel pelo dashboard, operacao da fila, configuracao de canais, analytics e telas operacionais.
- Usa Supabase diretamente no cliente para auth, leitura de dados, RPCs e edge functions.
- Hoje tambem acessa a Evolution API diretamente pelo navegador em `src/services/evolution.ts`.
- Esse modelo funciona localmente, mas nao e adequado para producao por expor URL e chave da Evolution no ambiente do frontend.

### Automacao (`automation/`)

- Ja possui estrutura de worker e logica de processamento de fila, envio, follow-up, lease e heartbeat.
- Depende fortemente do Supabase e da Evolution API.
- Esta mais proxima de um servico de producao, mas ainda nao esta empacotada para Docker/EasyPanel.
- Ainda carrega rastros de execucao local/Bun/Windows e nao tem pipeline formal de imagem.

### Backend/Infra (`supabase/`)

- O Supabase ja e o centro correto da operacao: fila, instancias, jornadas, eventos, analytics e webhook.
- Existem edge functions criticas para organizacao de lista, classificacao e recebimento de webhook.
- Ha pontos que precisam endurecimento para producao, especialmente autenticacao do webhook e revisao de fluxos legados.

### Evolution API

- Esta em processo de migracao para a VPS.
- A mudanca e estrutural, porque hoje parte importante do sistema ainda assume acesso local ou acesso direto do navegador.
- Na arquitetura nova, ela tera URL publica, mas sera consumida apenas por camadas server-side (Edge Functions e automacao), nunca diretamente pelo frontend.

---

## 3. Problemas que Precisam Ser Corrigidos Antes da Subida Profissional

### Alta prioridade

1. **Frontend acessando Evolution diretamente**
   - Risco de seguranca.
   - Exposicao de chave em `VITE_*`.
   - Dependencia de CORS, TLS e acesso publico desnecessario.

2. **Sincronizacao de instancias depende da UI**
   - Hoje o dashboard ajuda a manter `whatsapp_instances` coerente com o estado real.
   - Em producao, isso precisa ser server-side e independente de tela aberta.

3. **Automacao ainda nao esta pronta para repositorio isolado + container**
   - Falta `Dockerfile`.
   - Falta pipeline de build/publicacao de imagem.
   - Falta healthcheck operacional.
   - Falta ajuste de dependencia com `packages/shared`.

4. **Webhook inbound precisa endurecimento**
   - Validacao de segredo deve ser obrigatoria.
   - URL final precisa ser publica e estavel.
   - Fluxo de classificacao precisa ser revisado para nao depender de autenticacao inadequada.

5. **Existem caminhos legados misturados com arquitetura nova**
   - Funcoes antigas e referencias a tunel/localhost precisam ser removidas ou isoladas.

### Media prioridade

1. Revisar RLS e permissoes do Supabase para producao.
2. Melhorar observabilidade de worker, webhook e integracoes.
3. Revisar inconsistencias entre migrations novas e logica operacional de afinidade/claim.
4. Padronizar envs publicos e privados por modulo.

---

## 4. Arquitetura Alvo Recomendada

### Visao geral

```text
Usuario/Admin
   |
   v
Frontend (Vite/React)
   |
   +--> Supabase (Auth, DB, RPC, Edge Functions)
   +--> Nao acessa Evolution diretamente

Automation Worker (Docker no EasyPanel)
   |
   +--> Supabase
   +--> Evolution API (URL publica)

Evolution API (na VPS)
   |
   +--> Webhook publico do Supabase
```

### Principios da arquitetura alvo

- Frontend nao deve conhecer segredos da Evolution.
- Evolution pode estar em URL publica, mas com consumo restrito a servicos server-side.
- Automacao deve ser tratada como servico privado de background.
- Supabase permanece como centro da verdade persistente.
- Webhook da Evolution deve apontar para endpoint publico estavel e autenticado.

---

## 5. Estrategia de Repositorios

### Recomendacao

- Manter o repositorio atual para:
  - `src/`
  - `supabase/`
  - `packages/shared/`
- Criar um repositorio separado para:
  - `automation/`

### Ponto critico antes da separacao

A automacao usa utilitarios compartilhados. Antes de separar, escolher uma destas abordagens:

1. **Levar um pacote `shared` junto para o novo repo da automacao**
2. **Transformar `packages/shared` em pacote versionado reutilizavel**
3. **Duplicar apenas o minimo necessario, se realmente for estavel e controlado**

### Recomendacao mais segura

No curto prazo, mover a automacao com um modulo `shared` minimo dentro do novo repositorio. Depois, se fizer sentido, transformar isso em pacote versionado.

---

## 6. Plano de Migracao por Fases

## Fase 0 - Levantamento e congelamento tecnico

### Objetivo

Parar de operar por suposicao e definir o estado real do sistema.

### Entregas

- Inventario completo de envs por modulo.
- Lista de URLs locais, hardcodes e dependencias de `localhost`.
- Lista de funcoes/fluxos legados que ainda estao ativos ou obsoletos.
- Mapa de integracoes: frontend -> supabase, frontend -> evolution, worker -> supabase, worker -> evolution, evolution -> webhook.

### Resultado esperado

Base segura para fazer mudancas sem quebrar producao.

---

## Fase 1 - Redeseno da integracao com Evolution

### Objetivo

Eliminar o acesso direto do navegador para a Evolution.

### Acoes

- Criar uma camada backend/proxy para operacoes administrativas da Evolution:
  - listar instancias
  - criar instancia
  - obter QR
  - desconectar
  - deletar instancia
  - consultar status real
- Remover `VITE_EVOLUTION_API_KEY` do frontend.
- Remover dependencias de `localhost` no cliente.
- Definir URL publica base da Evolution para worker e Edge Functions (sem usar rota de painel `/manager/`).

### Resultado esperado

Frontend passa a operar de forma segura, sem falar diretamente com a Evolution.

---

## Fase 2 - Sincronizacao server-side das instancias

### Objetivo

Garantir que `whatsapp_instances` continue coerente sem depender do navegador.

### Acoes

- Criar rotina server-side de sincronizacao com a Evolution.
- Atualizar `whatsapp_instances` a partir de fonte confiavel.
- Revisar onde o worker depende de status `connected` para claim/processamento.
- Criar reconciliacao periodica de instancias.

### Resultado esperado

O estado das instancias fica confiavel para worker e dashboard, mesmo sem operador com a tela aberta.

---

## Fase 3 - Profissionalizacao da automacao

### Objetivo

Transformar a automacao em servico containerizado e publicavel.

### Acoes

- Extrair `automation/` para repositorio proprio.
- Resolver dependencia com `packages/shared`.
- Adicionar:
  - `Dockerfile`
  - `.dockerignore`
  - `.env.example`
  - README operacional
  - healthcheck real
  - logs estruturados
- Revisar runtime final:
  - Bun em Linux, se quiser caminho mais curto
  - ou build para Node, se quiser stack mais convencional
- Criar testes minimos de bootstrap e conectividade mockada.

### Resultado esperado

Automacao pronta para ser buildada por CI e executada no EasyPanel.

---

## Fase 4 - CI/CD da automacao

### Objetivo

Garantir publicacao de imagem versionada e reproduzivel.

### Acoes

- Criar workflow GitHub Actions para:
  - lint/typecheck
  - build da imagem
  - push para GHCR
  - versionamento por tag
- Padronizar nome da imagem.
- Definir politica de branches e releases.

### Resultado esperado

EasyPanel passa a consumir uma imagem confiavel, versionada e rastreavel.

---

## Fase 5 - Subida em VPS/EasyPanel

### Objetivo

Montar ambiente homologavel e depois produtivo.

### Acoes

- Subir Evolution API na VPS.
- Subir automacao no EasyPanel usando imagem do GHCR.
- Configurar variaveis privadas:
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `EVOLUTION_API_URL`
  - `EVOLUTION_API_KEY`
  - demais envs operacionais do worker
- Configurar restart policy.
- Configurar healthcheck.
- Configurar logs.
- Configurar regras de acesso e monitoramento da Evolution em URL publica.

### Resultado esperado

Ambiente funcional e com operacao minimamente profissional.

---

## Fase 6 - Validacao funcional e cutover

### Objetivo

Virar para producao com previsibilidade.

### Cenarios de teste obrigatorios

1. Criacao de instancia
2. Geracao e leitura de QR
3. Conexao da instancia
4. Atualizacao de status em `whatsapp_instances`
5. Enfileiramento de paciente
6. Claim da fila pela automacao
7. Envio de mensagem
8. Recebimento de webhook inbound
9. Classificacao da resposta
10. Follow-up e retomada apos restart da automacao
11. Recuperacao de falha da Evolution
12. Recuperacao de lease/heartbeat travado

### Resultado esperado

Sistema pronto para producao com evidencias de funcionamento.

---

## 7. Checklist Tecnico por Frente

### Frontend

- [ ] Remover acesso direto a Evolution.
- [ ] Substituir envs sensiveis publicas por integracao segura.
- [ ] Revisar fallback de `localhost`.
- [ ] Garantir deploy SPA com fallback de rota.
- [ ] Validar auth, realtime, RPCs e edge functions em ambiente remoto.

### Automacao

- [ ] Separar para repositorio proprio.
- [ ] Resolver dependencia de shared.
- [ ] Criar Dockerfile.
- [ ] Criar pipeline GitHub Actions.
- [ ] Criar healthcheck seguro.
- [ ] Melhorar logs e observabilidade.
- [ ] Revisar env example com todas as variaveis reais.

### Supabase

- [ ] Revisar migrations obrigatorias para producao.
- [ ] Revisar RLS e permissoes.
- [ ] Endurecer webhook inbound.
- [ ] Revisar fluxo de classificacao automatica.
- [ ] Remover ou isolar funcoes legadas.

### Evolution API

- [ ] Definir URL definitiva.
- [ ] Garantir persistencia de sessao.
- [ ] Garantir webhook apontando para endpoint publico correto.
- [ ] Garantir acesso restrito por rede/segredo.
- [ ] Validar comportamento apos restart.

---

## 8. Riscos de Projeto

### Risco 1 - Migrar sem desacoplar frontend da Evolution

Consequencia: exposicao de chave, dependencia de CORS, fragilidade operacional e superficie de ataque desnecessaria.

### Risco 2 - Separar automacao sem resolver shared

Consequencia: quebra de build, divergencia de codigo e manutencao ruim.

### Risco 3 - Subir worker sem healthcheck e logs adequados

Consequencia: falhas silenciosas, fila parada e dificuldade de suporte.

### Risco 4 - Confiar no dashboard para sincronizar instancias

Consequencia: status incorreto no banco, worker sem visao real do canal e falhas no claim.

### Risco 5 - Publicar webhook sem validacao forte

Consequencia: endpoint exposto, eventos falsos ou uso indevido.

---

## 9. Ordem Recomendada de Execucao

1. Levantar envs, URLs e fluxos reais.
2. Definir arquitetura final da integracao com Evolution.
3. Criar camada segura para operacoes da Evolution.
4. Implementar sincronizacao server-side das instancias.
5. Extrair e profissionalizar a automacao.
6. Criar CI/CD e imagem Docker da automacao.
7. Subir Evolution e automacao na VPS/EasyPanel.
8. Validar webhook, fila, envio e classificacao.
9. Ajustar frontend para consumir somente a arquitetura nova.
10. Executar cutover controlado.

---

## 10. Recomendacao Final

O caminho mais profissional nao e simplesmente "subir como esta". O caminho correto e fazer uma pequena reestruturacao antes do deploy final.

### Decisao recomendada

- **Sim**: separar a automacao em repositorio GitHub proprio e publicar imagem para o EasyPanel.
- **Sim**: manter frontend e Supabase no repositorio principal por enquanto.
- **Sim**: mover a Evolution para a VPS.
- **Sim**: usar Supabase Edge Functions como camada oficial para operacoes da Evolution.
- **Sim**: usar a mesma Evolution API da VPS para Edge Functions e automacao.
- **Nao**: manter o frontend falando diretamente com a Evolution em producao.
- **Nao**: fazer cutover antes de ter sincronizacao server-side de instancias e webhook validado.

### Resultado esperado apos execucao do plano

- Melhor seguranca
- Melhor manutenibilidade
- Deploy reproduzivel
- Operacao mais profissional
- Menor dependencia de ambiente local
- Base correta para escalar a automacao

---

## 11. Proximos Documentos Recomendados

Depois deste plano, os proximos artefatos ideais sao:

1. `docs/planning/MATRIZ_ENVS_E_SERVICOS.md`
   - modulo
   - variavel
   - finalidade
   - publica ou privada
   - ambiente
   - status: criado

2. `docs/architecture/ARQUITETURA_VPS_FINAL.md`
   - dominios
   - portas
   - redes
   - servicos
   - responsabilidades
   - status: criado

3. `docs/operations/CHECKLIST_CUTOVER_VPS.md`
   - pre-deploy
   - deploy
   - pos-deploy
   - rollback
   - status: criado

4. `docs/planning/PLANO_EXTRAIR_AUTOMACAO_REPO.md`
   - estrutura alvo do novo repositorio
   - shared
   - Docker
   - GHCR
   - EasyPanel
   - status: criado

5. `docs/operations/EASYPANEL_AUTOMATION_SETUP.md`
   - imagem GHCR
   - envs obrigatorias
   - healthcheck
   - validacao inicial
   - rollback rapido
   - status: criado

6. `docs/planning/QUADRO_EXECUCAO_MIGRACAO.md`
   - fazer agora
   - fazer depois
   - bloqueadores
   - dependencias
   - status: criado

7. `docs/operations/CHECKLIST_EASYPANEL_CAMPO_A_CAMPO.md`
   - setup campo a campo no EasyPanel
   - envs obrigatorias
   - healthcheck
   - deploy e validacao
   - status: criado

---

## 12. Decisoes Arquiteturais Validadas (Atual)

As decisoes abaixo ja foram validadas para este ciclo de migracao:

1. A Evolution API da VPS sera a unica Evolution oficial do ambiente.
2. Frontend nao acessa Evolution diretamente.
3. Supabase Edge Functions e a camada oficial para operacoes administrativas da Evolution.
4. Automacao passa a usar a Evolution da VPS (nao usa mais Evolution local).
5. Edge Functions e automacao usam a mesma Evolution API.
6. A VPS atual e temporaria e pode ser trocada futuramente (ex.: Hostinger) sem mudar a arquitetura.

---

## 13. Matriz de Segredos e Configuracao

### Regra base

Segredo nunca vai para `VITE_*` nem para codigo client-side.

### Onde cada segredo deve ficar

- `Supabase Secrets` (Edge Functions):
  - `EVOLUTION_API_URL`
  - `EVOLUTION_API_KEY`
  - `EVOLUTION_WEBHOOK_SECRET`
  - Demais segredos de integracao server-side (ex.: `GLM_*`)

- `EasyPanel - Automation`:
  - `EVOLUTION_API_URL`
  - `EVOLUTION_API_KEY`
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - Variaveis operacionais do worker

- `EasyPanel - Evolution API`:
  - Todo o `.env` da Evolution (incluindo `AUTHENTICATION_API_KEY`, banco e redis)

- `Frontend`:
  - Somente variaveis publicas do Supabase (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`)

---

## 14. Portabilidade da Evolution API (Troca de VPS Futura)

### Objetivo

Permitir troca da VPS atual para outra infraestrutura com o menor impacto possivel.

### Principio

A Evolution deve ser tratada como dependencia externa configuravel por ambiente, nunca como URL fixa hardcoded.

### O que muda quando trocar de VPS

1. Atualizar `EVOLUTION_API_URL` no Supabase Secrets.
2. Atualizar `EVOLUTION_API_URL` no servico de automacao no EasyPanel.
3. Validar `EVOLUTION_API_KEY` (manter ou rotacionar).
4. Reconfigurar webhook da Evolution para o endpoint publico do Supabase.
5. Validar conectividade Edge Functions -> Evolution.
6. Validar conectividade Automacao -> Evolution.
7. Executar checklist de smoke test antes de desativar a VPS antiga.

### Smoke test obrigatorio apos troca de VPS

1. Listar instancias via Edge Function.
2. Gerar QR e confirmar conexao.
3. Sincronizar `whatsapp_instances` no Supabase.
4. Enfileirar paciente e processar envio pela automacao.
5. Confirmar recebimento de webhook inbound.
6. Validar classificacao/processamento pos-resposta.

### Regra de rollback

Se qualquer teste critico falhar, reverter `EVOLUTION_API_URL` para a VPS anterior ate concluir a correcao.
