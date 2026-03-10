-- Create types and tables
CREATE TYPE queue_status AS ENUM ('queued', 'sending', 'delivered', 'failed', 'cancelled');

CREATE TABLE public.patients_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_name TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  message_body TEXT NOT NULL,
  status queue_status NOT NULL DEFAULT 'queued',
  is_approved BOOLEAN NOT NULL DEFAULT false,
  send_after TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.system_config (
  id INT PRIMARY KEY CHECK (id = 1),
  is_paused BOOLEAN NOT NULL DEFAULT false,
  safe_cadence_delay INT NOT NULL DEFAULT 30,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS Setup
ALTER TABLE public.patients_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all authenticated operations on patients_queue" 
  ON public.patients_queue FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow all authenticated operations on system_config" 
  ON public.system_config FOR ALL TO authenticated USING (true);

-- Seed configuration
INSERT INTO public.system_config (id, is_paused, safe_cadence_delay) VALUES (1, false, 45);

-- Seed Auth Users safely
DO $do$
DECLARE
  new_user_id uuid;
BEGIN
  new_user_id := gen_random_uuid();
  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at,
    created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
    is_super_admin, role, aud,
    confirmation_token, recovery_token, email_change_token_new,
    email_change, email_change_token_current,
    phone, phone_change, phone_change_token, reauthentication_token
  ) VALUES (
    new_user_id,
    '00000000-0000-0000-0000-000000000000',
    'admin@prndiagnosticos.com.br',
    crypt('Admin123!', gen_salt('bf')),
    NOW(), NOW(), NOW(),
    '{"provider": "email", "providers": ["email"]}',
    '{"name": "Admin PRN"}',
    false, 'authenticated', 'authenticated',
    '', '', '', '', '',
    NULL,
    '', '', ''
  );

  -- Seed some initial queue items
  INSERT INTO public.patients_queue (id, patient_name, phone_number, message_body, status, is_approved, send_after, notes)
  VALUES 
    (gen_random_uuid(), 'João Silva', '11999999999', 'Olá João, seu exame de ressonância está agendado para amanhã às 14h.', 'queued', false, NOW() + INTERVAL '10 minutes', 'Paciente idoso, enviar lembrete com antecedência'),
    (gen_random_uuid(), 'Maria Santos', '11988888888', 'Maria, os resultados do seu hemograma já estão disponíveis no portal.', 'queued', true, NOW() + INTERVAL '2 minutes', ''),
    (gen_random_uuid(), 'Carlos Oliveira', '11977777777', 'Carlos, por favor, confirme sua presença para a tomografia.', 'sending', true, NOW() - INTERVAL '1 minute', 'Aguardando API'),
    (gen_random_uuid(), 'Ana Costa', '11966666666', 'Ana, lembramos do jejum de 8h para seu exame de amanhã.', 'delivered', true, NOW() - INTERVAL '1 day', 'Entregue com sucesso'),
    (gen_random_uuid(), 'Pedro Souza', '11955555555', 'Pedro, não conseguimos contato por telefone. Retorne assim que possível.', 'failed', true, NOW() - INTERVAL '2 hours', 'Número bloqueado ou inexistente');
END $do$;
