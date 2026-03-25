# 📄 Resumo de Contexto — PRN-Vigilante

Este documento fornece o contexto completo do projeto para agentes de IA (como OpenCode) e desenvolvedores, garantindo continuidade e coerência no trabalho.

---

## 🚀 1. O Que Foi Feito (Concluído)

### **Infraestrutura e Conectividade**
- **Liberdade de Conexão**: Removemos a dependência de túneis Cloudflare instáveis. O frontend agora se comunica diretamente com a **Evolution API local** (`http://localhost:8080`).
- **Padrão de Variáveis**: Centralizamos as chaves no `.env` com prefixal `VITE_` para o frontend e no `automation/.env` para o motor de envio.
- **Limpeza de Banco**: Eliminamos dados legados, instâncias de "teste" e slots fixos do Supabase.

### **Dashboard Web (Frontend)**
- **UI Dinâmica (API-First)**: O painel de WhatsApp não tem mais limites de "5 slots". Ele renderiza dinamicamente 1, 10 ou 100 instâncias baseando-se no que existe na Evolution API.
- **Conexão Inteligente**: Implementamos loop de auto-atualização do QR Code e detecção automática de conexão (o modal fecha sozinho ao parear).
- **Analytics Real-time**: Os cards agora exibem contagem real de mensagens enviadas e total de conversas (chats) ativas, buscadas via API.
- **Status Visual**: Unificamos os estados para `Conectado` (Verde), `Desconectado` (Laranja) e `Lendo QR`.

### **Arquitetura Profissional**
- **Divisão Tri-Modular**: O projeto foi organizado em três pilares:
  1. `/src`: O Cérebro (Dashboard Web).
  2. `/automation`: Os Músculos (Motor de envio/Worker v2).
  3. `/supabase`: O Coração (Banco de Dados e Infra).
- **Limpeza**: A pasta antiga `/worker` e arquivos raiz desnecessários foram removidos.

---

## 🛠️ 2. O Que Estamos Fazendo Agora

- **Estruturação da Automação**: Acabamos de criar a pasta `/automation` com uma arquitetura profissional (SOLID/Clean Architecture).
- **Drivers Prontos**: Já temos os drivers para Supabase e Evolution API configurados na nova estrutura.
- **Documentação Visual**: Criamos o `MAPA_DO_PROJETO.md` e a `apresentacao_projeto.html` para explicar o ecossistema a leigos.

---

## 🎯 3. O Que Queremos Fazer (Futuro Próximo)

### **O Motor de Envio (Engine)**
- **Lógica de Fila**: Implementar o motor que lê mensagens da tabela `patients_queue` e faz o disparo automático.
- **Motor Anti-Ban**: Criar a inteligência que:
  - Simula digitação antes de enviar.
  - Usa delays aleatórios (cadência humana).
  - Faz pausas programadas para evitar detecção pelo WhatsApp.
- **Gestão de Erros**: Sistema de retentativa inteligente se a Evolution API falhar.

### **Melhorias de Gestão**
- **Rodízio de Canais**: Se uma instância estiver sobrecarregada ou for desconectada, o motor deve usar outro canal disponível automaticamente.
- **Logs Profissionais**: Sistema de monitoramento para que o Admin saiba exatamente por que um envio falhou.

---

## 📌 4. Orientações para a IA (OpenCode) 

1. **Localização do Código**:
   - UI/Site: `/src`
   - Lógica de Automação: `/automation/src`
   - Banco de Dados: `/supabase`
2. **Fonte da Verdade**: Sempre consulte a **Evolution API** (`evolutionApi.syncWithWebhook()`) para saber o estado real das instâncias. O banco de dados Supabase é um cache para o Worker.
3. **Obrigações de Sub-Agentes**: Todos os sub-agentes (task tool) **DEVEM** ler `AGENTS.md` antes de implementar qualquer código. Este arquivo contém instruções obrigatórias sobre como usar as otimizações de código em `packages/shared/` para economizar tokens (~2,630 tokens/request).
4. **Padrão Legislativo**: Seguir as regras de `docs/MAINTENANCE_RULES.md` (Sincronia de Código e Doc).

---
> [!NOTE]
> O projeto está em um estado de transição de uma prova de conceito para um sistema industrial escalável. A prioridade agora é a **confiabilidade do envio**.
