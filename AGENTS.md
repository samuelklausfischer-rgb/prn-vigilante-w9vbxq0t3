# 🤖 AGENTS.md - Instruções para Sub-Agentes

**Versão:** 1.1  
**Última atualização:** 18/03/2026

Este documento contém todas as instruções **OBRIGATÓRIAS** que devem ser seguidas por sub-agentes (task tool) quando lançados para trabalhar no projeto PRN-Vigilante.

---

## ⚠️ INSTRUÇÃO CRÍTICA - LEIA PRIMEIRO

**ANTES de começar qualquer implementação, você DEVE:**

1. **LER este documento AGENTS.md inteiro**
2. **VERIFICAR se a funcionalidade necessária já existe em `packages/shared/`**
3. **USAR as otimizações existentes** em vez de criar código duplicado
4. **CONSULTAR `TOKEN_OPTIMIZATION_PHASE_1.md`** para entender todas as otimizações

---

## 📦 OBRIGATÓRIO: Usar Otimizações de Código

### Por que é CRÍTICO?

- **Economia real:** ~2,630 tokens por request LLM
- **Custo real:** Redução de ~30-40% nos custos de LLM
- **Escalabilidade:** Permite processar mais pacientes com o mesmo orçamento
- **Manutenibilidade:** Código centralizado é mais fácil de atualizar

### Regra de Ouro

**NUNCA recrie código que já existe em `packages/shared/`.**

---

## 1. Template SARA - buildSaraMessage()

### Localização
`packages/shared/templates/sara-message.ts`

### ❌ NÃO FAÇA

```typescript
// ❌ Isso cria redundância de ~2,400 tokens
const message = `Olá! Aqui é Sara, representante do *Hospital São Benedito* - localizado no endereço: *Av. São Sebastião, 3300 - Quilombo, Cuiabá - MT, 78015-808*

Estamos entrando em contato para regular e informar qual horário específico ficou agendado seu exame! 

Quando pega o pedido no posto de saúde, já está agendado para as 7 horas da manhã, 13 horas da tarde e as 19 horas da noite *automaticamente e por ordem de chegada*. Porém, foi optado ter um *horário específico* para *cada paciente* para evitar aglomero, superlotação e muita espera!

*PEDIMOS QUE PARA SEU ATENDIMENTO SIGA AS INSTRUÇÕES E HORÁRIO MARCADO DESTA ORIENTAÇÃO*

*Qualquer exame com contraste ou sedação estará escrito isto na frente do exame* e procedimento que irá realizar, descrito no pedido médico.

(Pedido médico indispensável para atendimento)

Exames *que não tem* contraste ou sedação *NÃO PRECISAM DE JEJUM*
Exames *com contraste* precisam apenas de *2 horas de jejum*
Exames *com sedação* precisam de *8 horas de jejum*

*DOCUMENTAÇÃO NECESSÁRIA PARA ATENDIMENTO:*
- Cartão do SUS
- Pedido médico
- Documento de regulação
- Laudos de exames anteriores 

*SENHOR OU SENHORA:*
*SEU EXAME ESTÁ AGENDADO PARA O DIA: ${dataBr} E HORÁRIO: ${horario}*

*POSSO CONFIRMAR O AGENDAMENTO?*

*~~~~ ATENÇÃO AO PREPARO ~~~~*
• Trazer pedido médico;
• Chegar 15 minutos antes;
• No momento do exame deverão ser retirados brincos e piercings.

-----------------------------------------------------------------------------------------------------------------
*REGRAS ESPECÍFICAS DE JEJUM:*
- Ressonância *Pelve e vias biliares*: 6h de jejum.
- Ressonância *de coração e mama*: 2h de jejum.
- Ressonância *com contraste*: 2h de jejum.
- Ressonância *com sedação*: 8h de jejum.`
```

### ✅ FAÇA

```typescript
// ✅ Importar e usar a função otimizada
import { buildSaraMessage } from '@/../../packages/shared/templates/sara-message'

const message = buildSaraMessage({
  data_exame_iso: '2026-03-18',
  dataBr: '18/03/2026',  // opcional
  horario: '14:30–15:00'
})

// Resultado: Template completo com 0 tokens adicionais
```

### Quando Usar

- ✅ Criar mensagem de confirmação de agendamento
- ✅ Gerar mensagem para novo paciente
- ✅ Criar qualquer mensagem SARA padrão
- ✅ Criar lembretes ou avisos usando template SARA

---

## 2. Durações de Exames - getExamDuration()

### Localização
`packages/shared/config/exam-durations.ts`

### ❌ NÃO FAÇA

```typescript
// ❌ Isso cria redundância de ~200 tokens
const durations = `
Tabela de tempos (keywords):
- coluna cervical: 8 min
- coluna torácica: 8 min
- coluna lombo sacra/lombossacra: 8 min
- crânio: 20 min
- pé: 20 min
- perna: 20 min
- braço: 20 min
- membro superior: 15 min
- membro inferior: 15 min
- pelve: 40 min
- abdômen: 40 min
- vias biliares: 40 min
- mamas: 40 min
- coração: 1 hora
`
```

### ✅ FAÇA

```typescript
// ✅ Importar e usar as funções otimizadas
import { getExamDuration, getExamDurationsTable, EXAM_DURATIONS } from '@/../../packages/shared/config/exam-durations'

// Para duração individual:
const duration = getExamDuration('Ressonância Magnética de Crânio')
// Output: '20 min'

// Para tabela completa (array de strings):
const table = getExamDurationsTable()
// Output: ['- coluna cervical: 8 min', '- coluna torácica: 8 min', ...]

// Para acesso direto ao objeto:
const cervicalDuration = EXAM_DURATIONS['coluna cervical']
// Output: '8 min'
```

### Quando Usar

- ✅ Consultar duração de exame específico
- ✅ Gerar tabela de tempos para LLM
- ✅ Validar se procedimento tem tempo definido
- ✅ Calcular tempo total de exames de um paciente

---

## 3. Formatação de Data - formatBrFromIso()

### Localização
`packages/shared/templates/sara-message.ts`

### ✅ FAÇA

```typescript
import { formatBrFromIso } from '@/../../packages/shared/templates/sara-message'

const dataBr = formatBrFromIso('2026-03-18')
// Output: '18/03/2026'
```

### Quando Usar

- ✅ Converter data ISO para formato brasileiro
- ✅ Exibir data para usuário
- ✅ Usar em templates de mensagem

---

## 📁 Estrutura de Pastas do Projeto

### Mapa Completo para Localizar Arquivos

```
prn-vigilante/
├── src/                                    # ⭐ Frontend (Dashboard React)
│   ├── components/                         # Componentes React
│   ├── pages/                              # Páginas do dashboard
│   ├── services/                           # Serviços de dados
│   ├── lib/                                # Utilitários
│   └── hooks/                              # Hooks personalizados
│
├── automation/                             # ⭐ Motor de Automação (Worker)
│   ├── src/
│   │   ├── core/                           # Motor principal
│   │   ├── services/                       # Integrações (Supabase, Evolution)
│   │   ├── utils/                          # Helpers
│   │   └── types/                          # Tipos da automação
│   └── package.json                        # Dependências do worker
│
├── supabase/                               # ⭐ Backend (Banco + Edge Functions)
│   ├── migrations/                         # Migrations SQL
│   ├── functions/                          # Edge Functions Deno
│   │   └── organize-patient-list/          # ⭐ Edge Function com LLM
│   └── _shared/                            # Código compartilhado do Supabase
│
├── packages/shared/                        # ⭐⭐⭐ CÓDIGO COMPARTILHADO (USE ESTE!)
│   ├── templates/
│   │   └── sara-message.ts                 # buildSaraMessage(), formatBrFromIso()
│   ├── config/
│   │   └── exam-durations.ts               # getExamDuration(), getExamDurationsTable()
│   ├── types.ts                            # Tipos compartilhados
│   ├── validators.ts                       # Validadores compartilhados
│   └── index.ts                            # Exports consolidados
│
├── docs/                                   # Documentação técnica
│   ├── MAPA_DO_PROJETO.md                  # Arquitetura tri-modular
│   └── README.md                           # Documento geral
│
├── .agents/                                # ⭐ Workflows e prompts para agentes
│   ├── workflows/
│   │   ├── setup-automacao.md              # Workflow de setup
│   │   └── use-optimizations.md            # Workflow de otimizações
│   └── prompts/
│       └── agent-starter.md                # Template de prompt para lançar sub-agentes
│
├── AGENTS.md                               # ⭐ ESTE ARQUIVO (instruções)
├── TOKEN_OPTIMIZATION_PHASE_1.md           # Detalhes das otimizações implementadas
├── resumo_contexto.md                      # Contexto geral do projeto
└── ANALISE_SUBAGENTES.md                   # Análise técnica das otimizações
```

---

## 🎯 Regras de Ouro

### 1. Verificação Obrigatória
**ANTES de criar qualquer código:**
1. Verifique se a funcionalidade existe em `packages/shared/`
2. Se existir, importe e use a função existente
3. Se não existir, considere adicionar ao `packages/shared/` antes de criar duplicata

### 2. Prioridade de Economia
- **ALTA:** Reutilizar templates SARA (~2,400 tokens)
- **MÉDIA:** Reutilizar tabelas de configuração (~200 tokens)
- **BAIXA:** Criar pequenos helpers (< 50 tokens)

### 3. Padrão de Importação

**Para Frontend (src/) - Usando alias @shared (RECOMENDADO):**
```typescript
// Via alias @shared (mais limpo e consistente)
import { buildSaraMessage } from '@shared/templates/sara-message'
import { getExamDuration } from '@shared/config/exam-durations'
import { formatBrFromIso } from '@shared/templates/sara-message'

// Via index.ts consolidado (mais simples)
import { buildSaraMessage, getExamDuration, formatBrFromIso } from '@shared'
```

**Para Frontend (src/) - Via caminho relativo (alternativa):**
```typescript
import { buildSaraMessage } from '../../../packages/shared/templates/sara-message'
```

**Para Edge Function (supabase/):**
```typescript
import { buildSaraMessage, getExamDurationsTable } from '../../packages/shared/templates/sara-message.ts'
```

**Para Automation (automation/):**
```typescript
import { buildSaraMessage } from '../../../packages/shared/templates/sara-message'
```

### 4. Manutenção de Código
- Quando atualizar template SARA, atualize apenas `packages/shared/templates/sara-message.ts`
- Não atualize múltiplos arquivos com o mesmo código
- Documente mudanças em `TOKEN_OPTIMIZATION_PHASE_1.md`

---

## 📚 Documentação Adicional

### Obrigatória para Ler
- ✅ `TOKEN_OPTIMIZATION_PHASE_1.md` - Detalhes completos das otimizações implementadas
- ✅ `resumo_contexto.md` - Contexto geral do projeto
- ✅ `ANALISE_SUBAGENTES.md` - Análise técnica de como sub-agentes funcionam

### Complementar
- `docs/architecture/MAPA_DO_PROJETO.md` - Arquitetura tri-modular
- `.agents/workflows/setup-automacao.md` - Exemplo de workflow
- `.agents/workflows/use-optimizations.md` - Workflow de verificação de otimizações
- `.agents/prompts/agent-starter.md` - Template de prompt para lançar sub-agentes

---

## 🚀 Checklist de Verificação

### Antes de Implementar
- [ ] Li este documento AGENTS.md inteiro
- [ ] Li TOKEN_OPTIMIZATION_PHASE_1.md
- [ ] Verifiquei se a funcionalidade existe em packages/shared/
- [ ] Se existia, importei e usei a função existente
- [ ] Se não existia, considerei adicionar ao packages/shared/

### Durante Implementação
- [ ] Estou usando buildSaraMessage() para templates SARA
- [ ] Estou usando getExamDuration() para consultas de duração
- [ ] Estou usando formatBrFromIso() para formatação de data
- [ ] Não criei código duplicado

### Após Implementação
- [ ] Verifiquei se economizei tokens
- [ ] Documentei mudanças se necessário
- [ ] Testei o código

---

## ❓ Dúvidas Frequentes

### Q: Posso modificar o template SARA?
**A:** Sim, mas **SOMENTE** em `packages/shared/templates/sara-message.ts`. Modificar o template em múltiplos lugares criará redundância.

### Q: Posso adicionar novos exames à tabela?
**A:** Sim, adicione em `packages/shared/config/exam-durations.ts`. Não crie uma tabela separada.

### Q: Como sei se uma funcionalidade já existe?
**A:** 
1. Verifique `packages/shared/` primeiro
2. Consulte `TOKEN_OPTIMIZATION_PHASE_1.md` para lista completa
3. Use `grep` ou `glob` para buscar por palavras-chave

### Q: O que fazer se preciso criar uma nova funcionalidade reutilizável?
**A:** 
1. Crie em `packages/shared/` no local apropriado
2. Exporte em `packages/shared/index.ts`
3. Documente em `TOKEN_OPTIMIZATION_PHASE_1.md`
4. Atualize este arquivo AGENTS.md se necessário

---

## 🔄 Versão e Histórico

### v1.1 (18/03/2026)
- Adicionado alias `@shared` para frontend
- Atualizado padrão de importação com `@shared`
- Corrigido erro de import em AddPatientModal.tsx
- Instruções adicionais para uso de alias

### v1.0 (18/03/2026)
- Documentação inicial completa
- Instruções para buildSaraMessage()
- Instruções para getExamDuration()
- Instruções para formatBrFromIso()
- Regras de ouro
- Checklist de verificação
- FAQ
- Mapa completo de estrutura de pastas

---

## 📞 Suporte

Se tiver dúvidas sobre como usar as otimizações:
1. Consulte `TOKEN_OPTIMIZATION_PHASE_1.md`
2. Verifique os arquivos em `packages/shared/`
3. Consulte `ANALISE_SUBAGENTES.md` para análise técnica

---

**LEMBRETE:** Economia de tokens é CRÍTICA. Cada request LLM custa dinheiro. Reutilizar código é a melhor forma de economizar.
