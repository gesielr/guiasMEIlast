-- scripts/mock-certificado.sql
-- Script SQL para mockar certificado após pagamento confirmado
-- Substitua <USER_ID> pelo ID do usuário que fez o pagamento

-- 1. Verificar pagamento confirmado
SELECT 
  p.id as payment_id,
  p.user_id,
  p.txid,
  p.status as payment_status,
  p.valor,
  p.created_at as payment_date,
  pr.nome,
  pr.user_type
FROM payment_cert_digital p
JOIN profiles pr ON pr.id = p.user_id
WHERE p.user_id = '<USER_ID>' -- SUBSTITUA AQUI
  AND p.status = 'CONFIRMED'
ORDER BY p.created_at DESC
LIMIT 1;

-- 2. Verificar enrollment existente
SELECT 
  ce.id,
  ce.user_id,
  ce.status,
  ce.external_cert_id,
  ce.scheduled_at,
  ce.activated_at
FROM cert_enrollments ce
WHERE ce.user_id = '<USER_ID>' -- SUBSTITUA AQUI
ORDER BY ce.created_at DESC
LIMIT 1;

-- 3. Criar ou atualizar enrollment para SCHEDULED (agendamento)
-- Se não existir, criar novo
INSERT INTO cert_enrollments (
  user_id,
  provider_id,
  external_cert_id,
  subject,
  serial_number,
  thumbprint,
  valid_from,
  valid_until,
  status,
  scheduled_at,
  external_enrollment_id
)
SELECT 
  '<USER_ID>'::uuid, -- SUBSTITUA AQUI
  cp.id,
  'MOCK_CERT_' || NOW()::text,
  'CN=MOCK CERTIFICADO TESTE, O=GuiasMEI, C=BR',
  'MOCK_SERIAL_' || NOW()::text,
  UPPER(ENCODE(gen_random_bytes(20), 'hex')),
  NOW(),
  NOW() + INTERVAL '1 year',
  'SCHEDULED',
  NOW() + INTERVAL '2 days',
  'MOCK_ENROLL_' || NOW()::text
FROM cert_providers cp
WHERE cp.nome = 'Certisign' AND cp.ativo = true
LIMIT 1
ON CONFLICT (id) DO UPDATE
SET
  status = 'SCHEDULED',
  scheduled_at = NOW() + INTERVAL '2 days',
  external_enrollment_id = 'MOCK_ENROLL_' || NOW()::text,
  updated_at = NOW();

-- 4. Atualizar para ACTIVE (certificado ativo)
UPDATE cert_enrollments
SET
  status = 'ACTIVE',
  external_cert_id = 'MOCK_CERT_' || NOW()::text,
  serial_number = 'MOCK_SERIAL_' || NOW()::text,
  thumbprint = UPPER(ENCODE(gen_random_bytes(20), 'hex')),
  valid_from = NOW(),
  valid_until = NOW() + INTERVAL '1 year',
  activated_at = NOW(),
  updated_at = NOW()
WHERE user_id = '<USER_ID>' -- SUBSTITUA AQUI
  AND status = 'SCHEDULED';

-- 5. Verificar resultado
SELECT 
  ce.id,
  ce.user_id,
  ce.status,
  ce.external_cert_id,
  ce.serial_number,
  ce.valid_from,
  ce.valid_until,
  ce.activated_at,
  pr.nome,
  pr.user_type
FROM cert_enrollments ce
JOIN profiles pr ON pr.id = ce.user_id
WHERE ce.user_id = '<USER_ID>' -- SUBSTITUA AQUI
ORDER BY ce.created_at DESC
LIMIT 1;



