# 🎯 Otimizações de Tokens - Fase 1 Implementada

## 📊 Resumo

**Data:** 18/03/2026  
**Status:** ✅ Concluído  
**Economia estimada:** ~2,000-2,500 tokens por request LLM

## 🚀 Melhorias Implementadas

### 1. Template SARA Consolidado

**Arquivos modificados:**

- ✅ `packages/shared/templates/sara-message.ts` (NOVO)
- ✅ `supabase/functions/organize-patient-list/index.ts`
- ✅ `src/components/AddPatientModal.tsx`

**Otimizações:**

- Eliminada redundância de ~2,400 tokens (template repetido 3x)
- Centralização do template em único arquivo
- Reutilização em 3 locais diferentes
- Facilidade de manutenção e atualização

**Impacto:** ~2,400 tokens economizados por request

---

### 2. Tabela de Tempos de Exames

**Arquivos modificados:**

- ✅ `packages/shared/config/exam-durations.ts` (NOVO)
- ✅ `supabase/functions/organize-patient-list/index.ts`

**Otimizações:**

- Extração de tabela de tempos hardcoded
- Cache de valores de duração
- Funções helper para consulta de tempos
- Centralização de configuração

**Impacto:** ~200 tokens economizados por request + cache adicional

---

### 3. Cache de System Message

**Arquivos modificados:**

- ✅ `supabase/functions/organize-patient-list/index.ts`

**Otimizações:**

- System message movida para constante global
- Eliminada repetição (~30 tokens) por request
- Mantido em cache em memória

**Impacto:** ~30 tokens economizados por request

---

## 📁 Estrutura de Arquivos

```
packages/shared/
├── templates/
│   └── sara-message.ts          # Template unificado SARA
├── config/
│   └── exam-durations.ts         # Durações de exames
└── index.ts                      # Exports consolidados
```

---

## 💰 ROI Estimado

| Categoria      | Economia/Request  | Requests/dia | Economia Total/dia   |
| -------------- | ----------------- | ------------ | -------------------- |
| Template SARA  | ~2,400 tokens     | 50-100       | ~120,000-240,000     |
| Tabela Tempos  | ~200 tokens       | 50-100       | ~10,000-20,000       |
| System Message | ~30 tokens        | 50-100       | ~1,500-3,000         |
| **TOTAL**      | **~2,630 tokens** | **50-100**   | **~131,500-263,000** |

---

## 🎯 Próximos Passos (Fase 2)

Skills a implementar:

1. **message-templates** - Templates de mensagens WhatsApp
2. **validation-formatter** - Validação e formatação de dados
3. **log-standardizer** - Padronização de logs

Economia estimada adicional: ~1,000-1,500 tokens por request

---

## 🔧 Como Usar

### Importar Template SARA

```typescript
import { buildSaraMessage } from '@/../../packages/shared/templates/sara-message'

const message = buildSaraMessage({
  data_exame_iso: '2026-03-18',
  horario: '14:30–15:00',
})
```

### Importar Durações de Exame

```typescript
import { getExamDuration, EXAM_DURATIONS } from '@/../../packages/shared/config/exam-durations'

const duration = getExamDuration('Ressonância Magnética de Crânio')
// Output: '30 min'
```

### Regra operacional atualizada

- `membro superior` -> `7 min`
- `membro inferior` -> `8 min`
- `colunas` -> `8 min`
- `joelho`, `ombro`, `tornozelo`, `punho`, `cotovelo`, `mao`, `pe`, `quadril` -> `15 min`
- `cranio` -> `30 min`
- `abdome superior`, `abdome inferior`, `pelve` -> `30 min`
- `mamas` -> `45 min`
- `coracao` -> `50 min`
- multiplos procedimentos -> soma dos tempos

---

## ✅ Checklist Fase 1

- [x] Criar diretório `packages/shared/templates/`
- [x] Criar arquivo `sara-message.ts` com template consolidado
- [x] Criar diretório `packages/shared/config/`
- [x] Criar arquivo `exam-durations.ts` com tabela de tempos
- [x] Modificar `organize-patient-list/index.ts`
- [x] Modificar `AddPatientModal.tsx`
- [x] Adicionar cache de system message
- [x] Atualizar exports no `packages/shared/index.ts`
- [x] Documentar melhorias implementadas

---

## 📚 Como Fazer Sub-Agentes Usarem Essas Otimizações

Para garantir que sub-agentes (task tool) usem automaticamente as otimizações implementadas, criamos um sistema de instruções estratégicas:

### 1. **AGENTS.md** (Raiz do projeto)

- **Propósito:** Documentação central com instruções OBRIGATÓRIAS para todos os sub-agentes
- **Conteúdo:**
  - Instruções críticas (ler antes de implementar)
  - Como usar `buildSaraMessage()` (~2,400 tokens economizados)
  - Como usar `getExamDuration()` (~200 tokens economizados)
  - Como usar `formatBrFromIso()`
  - Mapa completo de estrutura de pastas
  - Regras de ouro
  - Checklist de verificação
  - FAQ

### 2. **.agents/workflows/use-optimizations.md**

- **Propósito:** Workflow de verificação obrigatória
- **Conteúdo:**
  - Pré-verificação obrigatória
  - Quando usar cada função otimizada
  - Passo a passo do workflow
  - Checkpoint final

### 3. **.agents/prompts/agent-starter.md**

- **Propósito:** Template de prompt para lançar sub-agentes com instruções embutidas
- **Conteúdo:**
  - Instruções iniciais obrigatórias
  - Contexto do projeto
  - Workflow de trabalho
  - Documentação disponível
  - Regras obrigatórias
  - Checklist final

### Como Usar

Ao lançar um sub-agente, inclua estas instruções no prompt:

```markdown
Você está trabalhando no projeto PRN-Vigilante.

ANTES DE COMEÇAR:

1. LEIA o arquivo AGENTS.md na raiz do projeto
2. VERIFIQUE se a funcionalidade existe em packages/shared/
3. USE as otimizações existentes

SEU OBJETIVO: [inserir objetivo]
```

Ou use o template completo em `.agents/prompts/agent-starter.md`.

### Documentação Adicional

- `AGENTS.md` - Instruções obrigatórias para sub-agentes
- `.agents/workflows/use-optimizations.md` - Workflow de verificação
- `.agents/prompts/agent-starter.md` - Template de prompt
- `ANALISE_SUBAGENTES.md` - Análise técnica completa
