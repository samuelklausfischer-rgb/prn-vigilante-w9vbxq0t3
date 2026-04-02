# Contexto do Projeto PRN Sara - Estabilização do Worker e Dashboard de Validação (Raio-X)

## 📅 Data: 2026-04-01-16:30
## 🛠️ O que foi feito recentemente:

### 1. Estabilização do Worker de Automação
- **Correção de RPC:** O sistema estava falhando ao enfileirar registros de "escada de telefones" (retry_phone2/retry_phone3) devido a um erro de tipo de dado (`time` sem fuso vs `text`). Corrigimos a função `enqueue_patient_v2` no Supabase para tratar os campos `horario_inicio` e `horario_final` com casts explícitos de `time` e tratar strings vazias como `NULL`.
- **Restauração de Funções Críticas:** Durante uma limpeza anterior, funções essenciais como `markMessageFailed` e `isNumberBlocked` foram removidas. Elas foram restauradas no arquivo `automation/src/services/supabase.ts`, o que parou o loop infinito de registros duplicados na fila.

### 2. Implementação do Raio-X (Pré-Validação em Lote)
- **Funcionalidade:** Criamos o `runBatchPreValidation` que verifica o banco por pacientes que ainda não tiveram o WhatsApp validado (`whatsapp_checked_at IS NULL`).
- **Execução em Segundo Plano:** Ajustamos o loop do worker para que esta validação ocorra **mesmo quando o sistema está PAUSADO**. Isso permite que o Dashboard de Validação mostre os ícones de ✔️ (WhatsApp existe) ou ❌ (Número fixo/inválido) sem precisar que as mensagens sejam enviadas.

### 3. Proteção Contra Duplicatas (Double Lock)
- **Fato:** O robô antigo criava tentativas novas sem finalizar as antigas.
- **Ação 1 (Limpeza):** Removi todas as duplicatas. Agora a Maria Roberto Alves tem apenas 1 registro.
- **Ação 2 (Bloqueio Físico):** Criei um **Índice Único (UNIQUE INDEX)** no Banco de Dados. Mesmo que o robô tente duplicar, o Banco de Dados vai travar o comando.

---
**Status Final:** Sistema Blindado contra duplicatas, Raio-X ativo e banco limpo.

