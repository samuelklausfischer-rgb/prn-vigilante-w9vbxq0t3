-- Create whatsapp_instances table to persist instance configuration
CREATE TABLE public.whatsapp_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id INT NOT NULL UNIQUE,
  instance_name TEXT,
  phone_number TEXT,
  status TEXT NOT NULL DEFAULT 'empty',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS setup
ALTER TABLE public.whatsapp_instances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all authenticated operations on whatsapp_instances" 
  ON public.whatsapp_instances FOR ALL TO authenticated USING (true);

-- Seed with 3 empty slots by default
INSERT INTO public.whatsapp_instances (slot_id, status) VALUES 
  (1, 'empty'),
  (2, 'empty'),
  (3, 'empty')
ON CONFLICT (slot_id) DO NOTHING;
