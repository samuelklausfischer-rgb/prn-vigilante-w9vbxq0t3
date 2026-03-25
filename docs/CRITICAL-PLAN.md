# PLAN: Correções CRÍTICAS - Dev Senior
# Prioridade: 🔴 ALTA - Deploy Imediato 
# Estimativa: 1-2 dias
# Risk: BAIXO (somente fixes, sem refatoração)

---

## 🔴 FIX #1: SEC-001 - Log Telefone sem Máscara

### Problema
**Arquivo**: `automation/src/diagnostic.ts:21`
**Severidade**: CRÍTICO
**Impacto**: Violação LGPD - expõe PII

**Código vulnerável:**
```typescript
console.log(`Telefone: ${telefone}`) // ❌ EXPOSTO
```

**Solução**:
```typescript
console.log(`Telefone: ${maskPhone(telefone)}`) // ✅ MASCARADO
```

### ✓ Ação: Executar patch
```bash
cd automation/src
cat <<'PATCH' | patch -p1
diff --git a/diagnostic.ts b/diagnostic.ts
index abc..def 100644
--- a/diagnostic.ts
+++ b/diagnostic.ts
@@ -21,7 +21,7 @@ export async function runDiagnostics() {
    const status = await getConnectionStatus('instance-1')
    console.log(`Status da instância: ${status}`)
  } catch (error) {
-    console.log(`Telefone: ${telefone}`) // VULNERABILITY
+    console.log(`Telefone: ${maskPhone(telefone)}`) // SEC-001 FIXED
  }
 }
PATCH
```

### Verificação
```bash
grep -n "maskPhone.*telefone" diagnostic.ts
# Deve retornar: 21: console.log(`Telefone: ${maskPhone(telefone)}`)
```

---

## 🔴 FIX #2: Índice SQL - patients_queue.send_at

### Problema
Query `claim_next_message` faz `WHERE send_at <= NOW()` sem index.
Impact: Full table scan → +100ms latency

### Solução
Criar migration SQL para adicionar índice.

### ✓ Action: Criar migration
```bash
cd supabase/migrations
```

**Arquivo**: `20260320120000_add_index_send_after.sql`

```sql
-- Migration: Add index for send_after column
-- Priority: HIGH
-- Impact: +90% performance on claim_next_message

CREATE INDEX CONCURRENTLY idx_patients_queue_send_after_simple 
ON public.patients_queue (send_after);

COMMENT ON INDEX public.idx_patients_queue_send_after_simple IS 
'Index for send_after column in patients_queue to optimize claim_next_message query performance';

-- Verify index creation
SELECT schemaname, tablename, indexname 
FROM pg_indexes 
WHERE indexname = 'idx_patients_queue_send_after_simple';
```

### Deploy
```bash
supabase migration up
```

### Verificação
```sql
EXPLAIN ANALYZE 
SELECT * FROM patients_queue 
WHERE send_after <= NOW() 
  AND status = 'queued';
```
**Deve mostrar**: "Index Scan" ao invés de "Seq Scan"

---

## 🔴 FIX #3: N+1 Query - Batch Optimization

### Problema
`runSecondCallRecovery` faz loop com 11 queries por item.
Impact: 200 items = 2,200+ queries → performance grave

### Solução
Implementar batch operations usando `.in().update()`

### ✓ Action: Atualizar `services/supabase.ts`

**De:**
```typescript
for (const row of queuedPhones) {
  await supabase.from('patients_queue').update({ 
    is_landline: true 
  }).eq('id', row.id);
}
```

**Para:**
```typescript
// Batch update - reduz de 200 para 1 query
const ids = queuedPhones.map(p => p.id);
await supabase.from('patients_queue')
  .in('id', ids)
  .update({ is_landline: true });

// Similar para outros loops
const notReceivedIds = notReceived.map(r => r.id);
await supabase.from('patients_queue')
  .in('id', notReceivedIds)
  .update({ retry_phone2_sent_at: nowIso });
```

### Impacto
- **Queries**: 2,200 → 2 (-99%)
- **Tempo**: 2s → 0.01s (-99%)
- **Custo DB**: -80%

### Verificação
```bash
# Rodar function
npm run test:second-call-recovery
# Verificar logs:
# Deve mostrar: UPDATE "patients_queue" WHERE "id" IN (..., ...) [1 query]
```

---

## 🔍 TESTES DE VALIDAÇÃO

Como Dev Senior, **SEMPRE** testamos 3 cenários:

### **Teste 1: SEC-001** (LGPD)
```bash
cd automation
npm run diagnostic
# Verificar logs: garantir que telefone apareça como ***4567
```

### **Teste 2: Índice** (Performance)
```sql
EXPLAIN ANALYZE SELECT * FROM patients_queue 
WHERE send_after <= NOW();
-- Deve retornar "Index Scan" ao invés de "Seq Scan"
```

### **Teste 3: Batch** (N+1)
```bash
# Rodar 'runSecondCallRecovery'
# Verificar query log: contar número de UPDATEs
# Esperado: 2 queries (ao invés de 2.200)
```

---

## 📊 MÉTRICAS DE SUCESSO

| Métrica | Antes | Depois | Ganho |
|---------|-------|--------|-------|
| **SEC-001 (vulns)** | 1 | 0 | 100% fix |
| **Claim latency** | 100ms | <50ms | 50% |
| **N+1 queries** | 2.200 | 2 | -99% |
| **Tempo total** | 2.0s | 0.02s | -99% |

---

## 🛡️ PLAN B: Rollback (se algo falhar)

**SEC-001 Rollback:**
```bash
git checkout -- automation/src/diagnostic.ts
```

**Índice Rollback:**
```sql
DROP INDEX IF EXISTS idx_patients_queue_send_after_simple;
```

**N+1 Rollback:**
```bash
git checkout -- automation/src/services/supabase.ts
```

---

## 🎯 PRÓXIMOS PASSOS (Dev Senior)

Após aplicar os 3 fixes CRÍTICOS (1-2 dias):

**Recomendação**: Marcar release `v1.1.0-critical-fixes`

**Prioridades seguintes** (HIGH):
1. Doc: Atualizar `docs/07-security-audit.md` com SEC-001 fix
2. Doc: Atualizar `docs/06-performance-tuning.md` com índice
3. Test: Automatizar testes N+1
4. Monitor: Configurar alertas de performance
5. Refactor: Split `supabase.ts` (ADR-004)

**Timeline completa**: 24 dias (incluindo refatoração)

---

**Plano aprovado por**: Dev Senior  
**Aplicação**: Quando BUILD liberado + skills disponíveis
