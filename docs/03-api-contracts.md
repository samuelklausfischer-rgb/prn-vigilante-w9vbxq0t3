# API Contracts & Endpoints

## Evolution API (WhatsApp)

### Authentication

```
Base URL: http://localhost:8080
Header: apikey: YOUR_EVOLUTION_API_KEY
```

### Endpoints

#### 1. Send Text Message

**Endpoint**: `POST /message/sendText/{instanceName}`

**Request Body**:

```json
{
  "number": "5531987654321",
  "text": "Olá! Seu exame está agendado...",
  "delay": 1200,
  "linkPreview": true
}
```

**Response**:

```json
{
  "key": {
    "id": "BAE5A1D...",
    "remoteJid": "5531987654321@s.whatsapp.net"
  },
  "message": {
    "conversation": "Olá! Seu exame..."
  },
  "messageTimestamp": "123456789"
}
```

**Error Handling**:

- `429`: Rate limit (retry after)
- `408`: Request timeout
- `500`: Server error

#### 2. Check Connection State

**Endpoint**: `GET /instance/connectionState/{instanceName}`

**Response**:

```json
{
  "instance": {
    "state": "open" | "connected" | "disconnected"
  }
}
```

#### 3. Fetch Message History

**Endpoint**: `GET /message/history/{instanceName}?limit=10`

**Response**: Array of messages with delivery status (pending, delivered, read)

## Supabase Database (RPCs)

### 1. Claim Next Message

**Function**: `claim_next_message(p_worker_id TEXT, p_max_attempts INT)`

**Description**: Atomic claim with SKIP LOCKED and instance selection via round-robin.

**Returns**:

```sql
TABLE (id UUID, patient_name TEXT, phone_number TEXT, message_body TEXT, instance_id UUID, instance_name TEXT, attempt_count INT)
```

**Usage**:

```typescript
const message = await supabase.rpc('claim_next_message', {
  p_worker_id: 'worker-1',
  p_max_attempts: 3,
})
```

**SQL Implementation**:

```sql
SELECT * FROM patients_queue
WHERE status = 'queued'
   AND send_after <= NOW()
   AND instance_id IN (SELECT id FROM whatsapp_instances WHERE status = 'connected')
ORDER BY queue_order
LIMIT 1
FOR UPDATE SKIP LOCKED;
```

### 2. Enqueue Patient

**Function**: `enqueue_patient(p_patient_name, p_phone_number, ..., p_data_exame)` (15 params)

**Description**: Inserts patient with deduplication logic based on canonical_phone + data_exame + horario within 2h window.

**Returns**:

```sql
TABLE (id UUID, status TEXT, error_message TEXT)
```

**Status**:

- `success`: Patient queued
- `duplicate_recent`: Already queued within 2h
- `second_call`: Retry alternate phone

**Deduplication Logic**:

```sql
-- Pseudo-code
SELECT FROM patients_queue
WHERE canonical_phone = p_canonical_phone
  AND data_exame = p_data_exame
  AND horario_inicio = p_horario_inicio
  AND created_at > NOW() - INTERVAL '2 hours';
```

### 3. Release Expired Locks

**Function**: `release_expired_locks(p_lock_timeout_minutes INT DEFAULT 5)`

**Description**: Removes locks older than timeout and marks messages as failed after max attempts.

**Returns**:

```sql
TABLE (released_id UUID, was_failed BOOLEAN)
```

### 4. Acquire Worker Lease

**Function**: `acquire_worker_lease(p_worker_id TEXT, p_lease_seconds INT)`

**Description**: Implements distributed lock to ensure single active worker.

**Returns**: `BOOLEAN` (true if acquired)

**Implementation**:

```sql
INSERT INTO automation_runtime_control (active_worker_id, lease_expires_at)
VALUES (p_worker_id, NOW() + p_lease_seconds * interval '1 second')
ON CONFLICT (id) DO UPDATE
SET active_worker_id = p_worker_id, lease_expires_at = NOW() + p_lease_seconds * interval '1 second'
WHERE lease_expires_at < NOW() OR active_worker_id = p_worker_id;
```

## Webhook Events

### Inbound (Evolution → Supabase)

**Endpoint**: `POST /webhook/evolution`

**Payload**:

```json
{
  "event": "messages.upsert",
  "data": {
    "key": { "id": "...", "remoteJid": "..." },
    "message": { "conversation": "1" }
  }
}
```

**Processing**: Updates `replied_at` and triggers follow-up cancellation.

## Rate Limits

- **Evolution API**: 100 req/min por instância (configurável)
- **Supabase RPC**: 1.000 calls/min (Free), 10.000 (Pro)
- **OpenAI**: Rate limit by plan

## Error Handling

### Evolution Errors

```typescript
// Timeout → retry (up to 3)
// 429 → exponential backoff
// Network → retry with jitter
```

### Database Errors

```typescript
// Lock timeout → retry
// Duplicate key → skip
// Connection loss → requeue
```

## Authentication

### Supabase

```
Service Role Key: sb_service_... (server only)
Anon Key: sb_anon_... (public, RLS protected)
```

### Evolution

```
API Key: evolution_api_key_... (in .env)
```

Created: 2026-03-20
