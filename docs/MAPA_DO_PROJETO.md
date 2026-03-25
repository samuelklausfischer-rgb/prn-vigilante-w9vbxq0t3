# 🗺️ Mapa do Projeto PRN-Vigilante

Este documento descreve a organização profissional do ecossistema e como a Automação se integra ao Dashboard e ao Banco de Dados.

## 🏗️ Estrutura Global

O projeto é dividido em três grandes pilares, cada um com sua responsabilidade bem definida:

### 1. 🖥️ Frontend Dashboard (`/src`)
Onde o usuário interage. 
- **Funcionalidade**: Gestão de instâncias, visualização de métricas, configuração de mensagens.
- **Responsabilidade**: Interface do Usuário (UI), Experiência do Usuário (UX) e sincronização visual com o DB.
- **Tecnologia**: React, Vite, Tailwind.

### 2. 🦾 Automation Engine (`/automation`)
Onde o trabalho pesado acontece em "silêncio".
- **Funcionalidade**: Monitoramento da fila de mensagens, envio inteligente, proteção anti-ban.
- **Responsabilidade**: Execução de tarefas de fundo (background), lógica de cadência e integração direta com a Evolution API.
- **Tecnologia**: Node.js/TypeScript (Worker).

### 3. ☁️ Infraestrutura Backend (`/supabase`)
A ponte que conecta os dois pilares.
- **Funcionalidade**: Armazenamento persistente, funções de borda (Edge Functions) e Webhooks.
- **Responsabilidade**: Persistência de dados, autenticação e comunicação assíncrona.
- **Tecnologia**: Supabase, PostgreSQL, Deno.

---

## 🔗 Como eles se conectam?

O fluxo de dados segue uma hierarquia de **Cérebro (Dashboard)** e **Membro (Automação)**:

1. **Dashboard** (`/src`): O usuário agenda uma mensagem. O Dashboard escreve no **Supabase**.
2. **Supabase** (`/supabase`): Atua como o sistema nervoso, guardando a tarefa e notificando (via fila).
3. **Automação** (`/automation`): O Worker "lê" a tarefa do Supabase, processa a inteligência anti-ban e envia via **Evolution API**.

## 📁 Organização de Pastas do Projeto

```text
prn-vigilante/
├── src/                # Pilastra 1: Visual (Dashboard)
├── automation/         # Pilastra 2: Execução (Automação/Worker v2)
│   ├── src/            # Código-fonte do motor
│   └── docs/           # Documentação interna da automação
├── supabase/           # Pilastra 3: Sustentação (DB/Edge Functions)
├── docs/               # Manuais gerais e Ideias do Projeto
├── worker/             # [LEGADO] Será migrado para /automation
└── README.md           # Guia de entrada do desenvolvedor
```

---
> [!TIP]
> Esta separação garante que o Dashboard continue funcionando mesmo se a Automação parar para manutenção, e vice-versa. É o padrão de mercado para sistemas profissionais de alta escala.
