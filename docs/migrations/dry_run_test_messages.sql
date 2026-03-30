-- ========================================
-- INSERIR MENSAGENS DE TESTE PARA DRY RUN
-- Propósito: Testar round-robin e lógica do worker sem enviar mensagens reais
-- ========================================

-- Zerar contadores para teste limpo
UPDATE public.whatsapp_instances
SET 
  rotation_index = 0,
  messages_sent_count = 0,
  last_message_at = NULL,
  updated_at = NOW()
WHERE status = 'connected';

-- Inserir 10 mensagens de teste
INSERT INTO public.patients_queue (
  id,
  patient_name,
  phone_number,
  message_body,
  status,
  is_approved,
  send_after,
  queue_order,
  notes,
  created_at,
  updated_at
) 
SELECT 
  gen_random_uuid(),
  'Paciente Teste ' || n,
  '11999999999', -- número fictício
  '🧪 Mensagem de teste ' || n || ' - DRY RUN - Não responda',
  'queued',
  true,
  NOW(),
  n,
  'Mensagem de teste para dry run - não enviar',
  NOW(),
  NOW()
FROM generate_series(1, 10) AS n;

-- Verificar mensagens inseridas
SELECT 
  id,
  patient_name,
  phone_number,
  status,
  is_approved,
  queue_order
FROM public.patients_queue
WHERE patient_name LIKE '%Paciente Teste%'
ORDER BY queue_order ASC;

-- Verificar estado inicial das instâncias
SELECT 
  id,
  instance_name,
  status,
  rotation_index,
  messages_sent_count
FROM public.whatsapp_instances
WHERE status = 'connected'
ORDER BY rotation_index ASC;

-- Resumo do teste
SELECT '=== TESTE DRY RUN PREPARADO ===' as status;
SELECT 'Mensagens de teste: 10' as info;
SELECT 'Instâncias conectadas: ' || COUNT(*) as info
FROM public.whatsapp_instances
WHERE status = 'connected';
