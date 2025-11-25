-- scripts/mock-agendamento.sql
-- Script SQL para mockar apenas o agendamento (passo intermediário)
-- Substitua <USER_ID> pelo ID do usuário

-- 1. Atualizar enrollment para SCHEDULED
UPDATE cert_enrollments
SET
  status = 'SCHEDULED',
  scheduled_at = NOW() + INTERVAL '2 days',
  external_enrollment_id = 'MOCK_ENROLL_' || NOW()::text,
  updated_at = NOW()
WHERE user_id = '<USER_ID>' -- SUBSTITUA AQUI
  AND status = 'PENDING';

-- 2. Verificar resultado
SELECT 
  ce.id,
  ce.user_id,
  ce.status,
  ce.scheduled_at,
  ce.external_enrollment_id,
  pr.nome
FROM cert_enrollments ce
JOIN profiles pr ON pr.id = ce.user_id
WHERE ce.user_id = '<USER_ID>' -- SUBSTITUA AQUI
ORDER BY ce.created_at DESC
LIMIT 1;



