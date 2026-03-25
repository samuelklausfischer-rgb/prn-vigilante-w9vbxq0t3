# 📋 Análise: Instruções para Sub-Agentes Usarem Otimizações

**Data:** 18/03/2026  
**Objetivo:** Determinar como instruir sub-agentes (task tool) a usarem as otimizações de código implementadas

---

## 🔍 1. Estado Atual da Documentação para Agentes

### Documentação Existente

| Arquivo | Localização | Tipo | Conteúdo |
|---------|-------------|------|----------|
| `resumo_contexto.md` | Raiz do projeto | Contexto geral | Seção "Orientações para a IA (OpenCode)" com 3 regras básicas |
| `setup-automacao.md` | `.agents/workflows/` | Workflow | Exemplo de workflow com instruções passo-a-passo |
| `TOKEN_OPTIMIZATION_PHASE_1.md` | Raiz do projeto | Documentação técnica | Otimizações implementadas e como usá-las |

### O que NÃO Existe

❌ Arquivo `AGENTS.md` específico  
❌ Arquivo `MAINTENANCE_RULES.md` (mencionado em `resumo_contexto.md` mas não existe)  
❌ Documentação de como lançar sub-agentes  
❌ Padrões de instrução reutilizáveis para sub-agentes  

---

## 📊 2. Otimizações Criadas que Precisam Ser Usadas

### Otimizações Implementadas (Fase 1)

```typescript
// packages/shared/templates/sara-message.ts
import { buildSaraMessage } from '@/../../packages/shared/templates/sara-message'

// Uso:
const message = buildSaraMessage({
  data_exame_iso: '2026-03-18',
  horario: '14:30–15:00'
})
```

```typescript
// packages/shared/config/exam-durations.ts
import { getExamDuration, EXAM_DURATIONS } from '@/../../packages/shared/config/exam-durations'

// Uso:
const duration = getExamDuration('Ressonância Magnética de Crânio')
// Output: '20 min'
```

### Localização dos Arquivos

```
packages/shared/
├── templates/
│   └── sara-message.ts          # Função buildSaraMessage()
├── config/
│   └── exam-durations.ts        # Função getExamDuration()
├── types.ts                     # Tipos compartilhados
├── validators.ts                # Validadores
└── index.ts                      # Exports consolidados
```

### Arquivos que Já Usam as Otimizações

- `src/components/AddPatientModal.tsx` - ✅ Usa `buildSaraMessage()`
- `supabase/functions/organize-patient-list/index.ts` - ✅ Usa `buildSaraMessage()` e `getExamDurationsTable()`

---

## 🎯 3. Padrões Encontrados para Instrução de Agentes

### Workflow Existe: `.agents/workflows/setup-automacao.md`

```markdown
---
description: Setup automático da base de dados, tipos e build da automação.
---

1. Criar e aplicar a migration SQL estruturada para a automação na pasta `supabase/migrations/`.
// turbo
2. Executar o comando `supabase-mcp-server apply_migration` usando o conteúdo do arquivo criado.
// turbo
3. Executar `supabase-mcp-server generate_typescript_types` para sincronizar o Worker com o novo banco.
4. Validar o build da automação executando `cd automation && npm run build`.
```

**Padrões identificados:**
- Frontmatter com `description`
- Número nos passos
- Comentários `// turbo` para indicar comandos
- Instruções diretas e específicas
- Caminhos de arquivos absolutos

### Orientações para IA em `resumo_contexto.md`

```markdown
## 📌 4. Orientações para a IA (OpenCode)

1. **Localização do Código**:
   - UI/Site: `/src`
   - Lógica de Automação: `/automation/src`
   - Banco de Dados: `/supabase`
2. **Fonte da Verdade**: Sempre consulte a **Evolution API** (`evolutionApi.syncWithWebhook()`) para saber o estado real das instâncias. O banco de dados Supabase é um cache para o Worker.
3. **Padrão Legislativo**: Seguir as regras de `docs/MAINTENANCE_RULES.md` (Sincronia de Código e Doc).
```

---

## 💡 4. Recomendações: Como Instruir Sub-Agentes

### Opção 1: Criar Arquivo AGENTS.md (RECOMENDADO)

**Localização:** Raiz do projeto (`C:\Users\OPERACIONAL\Desktop\IA\prn-vigilante-a1bd0\AGENTS.md`)

**Vantagens:**
- Fácil de encontrar (nome padrão)
- Centraliza todas as instruções para agentes
- Pode ser importado automaticamente quando lançar sub-agentes

**Estrutura proposta:**

```markdown
# 🤖 AGENTS.md - Instruções para Sub-Agentes

Este documento contém todas as instruções padrão que devem ser seguidas por sub-agentes quando lançados para trabalhar neste projeto.

---

## 📦 OBRIGATÓRIO: Usar Otimizações de Código

Quando implementar código que precisa de templates SARA ou consultas de duração de exames, **SEMPRE** use as funções otimizadas do pacote `packages/shared/`.

### 1. Template SARA - buildSaraMessage()

**NÃO FAÇA:**
```typescript
// ❌ Isso cria redundância de ~2,400 tokens
const message = `Olá! Aqui é Sara, representante do *Hospital São Benedito*...`
```

**FAÇA:**
```typescript
// ✅ Importar e usar a função otimizada
import { buildSaraMessage } from '@/../../packages/shared/templates/sara-message'

const message = buildSaraMessage({
  data_exame_iso: '2026-03-18',
  horario: '14:30–15:00'
})
```

### 2. Durações de Exames - getExamDuration()

**NÃO FAÇA:**
```typescript
// ❌ Isso cria redundância de ~200 tokens
const durations = `
- coluna cervical: 8 min
- coluna torácica: 8 min
- crânio: 20 min
...
`
```

**FAÇA:**
```typescript
// ✅ Importar e usar a função otimizada
import { getExamDuration, getExamDurationsTable } from '@/../../packages/shared/config/exam-durations'

// Para duração individual:
const duration = getExamDuration('Ressonância Magnética de Crânio')
// Output: '20 min'

// Para tabela completa:
const table = getExamDurationsTable()
// Output: ['- coluna cervical: 8 min', '- coluna torácica: 8 min', ...]
```

---

## 📁 Estrutura de Pastas do Projeto

### Importante para localizar arquivos

```
prn-vigilante/
├── src/                      # Frontend (Dashboard React)
├── automation/               # Motor de Automação (Worker)
├── supabase/                 # Banco de Dados e Edge Functions
├── packages/shared/          # ⭐ CÓDIGO COMPARTILHADO (USE ESTE!)
│   ├── templates/
│   │   └── sara-message.ts   # buildSaraMessage()
│   ├── config/
│   │   └── exam-durations.ts # getExamDuration()
│   ├── types.ts              # Tipos compartilhados
│   └── validators.ts        # Validadores
├── docs/                     # Documentação técnica
├── .agents/                  # Workflows de agentes
└── AGENTS.md                 # ESTE ARQUIVO
```

---

## 🎯 Regras de Ouro

1. **ANTES de criar qualquer template SARA, verifique se existe em `packages/shared/templates/sara-message.ts`**
2. **ANTES de criar qualquer tabela de duração de exames, use `packages/shared/config/exam-durations.ts`**
3. **ANTES de criar tipos duplicados, verifique `packages/shared/types.ts`**
4. **Economia de tokens é crítica - cada request LLM custa dinheiro**

---

## 📚 Documentação Adicional

- `TOKEN_OPTIMIZATION_PHASE_1.md` - Detalhes das otimizações implementadas
- `resumo_contexto.md` - Contexto geral do projeto
- `docs/MAPA_DO_PROJETO.md` - Arquitetura tri-modular
- `.agents/workflows/setup-automacao.md` - Exemplo de workflow
```

---

### Opção 2: Criar Workflow Padrão para Sub-Agentes

**Localização:** `.agents/workflows/use-optimizations.md`

```markdown
---
description: Workflow padrão para sub-agentes - sempre usar otimizações de código existentes
---

## Pré-Verificação Obrigatória

1. Verificar se a funcionalidade necessária já existe em `packages/shared/`:
   - Templates: `packages/shared/templates/sara-message.ts`
   - Configurações: `packages/shared/config/exam-durations.ts`
   - Tipos: `packages/shared/types.ts`
   - Validadores: `packages/shared/validators.ts`

2. Se existir, IMPORTAR E USAR a função existente
3. Se NÃO existir, considerar adicionar ao `packages/shared/` antes de criar duplicata

## Quando Usar buildSaraMessage()

✅ Usar quando precisar gerar a mensagem SARA padrão
✅ Importar de: `@/../../packages/shared/templates/sara-message`

❌ NÃO recriar o template do zero (economia: ~2,400 tokens)

## Quando Usar getExamDuration()

✅ Usar quando precisar da duração de um exame específico
✅ Usar quando precisar da tabela completa de durações
✅ Importar de: `@/../../packages/shared/config/exam-durations`

❌ NÃO recriar a tabela de durações (economia: ~200 tokens)

## Checkpoint

Antes de entregar código:
- [ ] Verifiquei se a funcionalidade existe em `packages/shared/`
- [ ] Se existia, importei e usei a função otimizada
- [ ] Se não existia, c
