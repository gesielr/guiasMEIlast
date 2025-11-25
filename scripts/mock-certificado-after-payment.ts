// scripts/mock-certificado-after-payment.ts
// Script para mockar agendamento e certificado após pagamento PIX confirmado
// Uso: ts-node scripts/mock-certificado-after-payment.ts <userId>

import { createSupabaseClients } from '../apps/backend/services/supabase';
import crypto from 'crypto';

const { admin } = createSupabaseClients();

async function mockCertificadoAfterPayment(userId: string) {
  console.log(`[MOCK] Mockando certificado para usuário: ${userId}`);

  try {
    // 1. Verificar se há pagamento confirmado
    const { data: payment, error: paymentError } = await admin
      .from('payment_cert_digital')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'CONFIRMED')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (paymentError || !payment) {
      console.log('[WARN] Pagamento não encontrado ou não confirmado. Criando enrollment diretamente...');
    }

    // 2. Buscar ou criar enrollment
    const { data: existingEnrollment } = await admin
      .from('cert_enrollments')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    let enrollmentId: string;

    if (existingEnrollment) {
      enrollmentId = existingEnrollment.id;
      console.log(`[INFO] Enrollment existente encontrado: ${enrollmentId}`);
    } else {
      // Criar novo enrollment
      const { data: provider } = await admin
        .from('cert_providers')
        .select('id')
        .eq('nome', 'Certisign')
        .eq('ativo', true)
        .single();

      if (!provider) {
        throw new Error('Provider Certisign não encontrado');
      }

      const { data: profile } = await admin
        .from('profiles')
        .select('nome, document')
        .eq('id', userId)
        .single();

      const { data: newEnrollment, error: createError } = await admin
        .from('cert_enrollments')
        .insert({
          user_id: userId,
          provider_id: provider.id,
          external_cert_id: `MOCK_CERT_${Date.now()}`,
          subject: `CN=${profile?.nome || 'Usuario'}:${profile?.document || 'DOC'}`,
          serial_number: `MOCK_SERIAL_${Date.now()}`,
          thumbprint: crypto.randomBytes(20).toString('hex').toUpperCase(),
          valid_from: new Date(),
          valid_until: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 ano
          status: 'PENDING'
        })
        .select()
        .single();

      if (createError) {
        throw new Error(`Erro ao criar enrollment: ${createError.message}`);
      }

      enrollmentId = newEnrollment.id;
      console.log(`[INFO] Novo enrollment criado: ${enrollmentId}`);
    }

    // 3. Simular agendamento (SCHEDULED)
    const scheduledDate = new Date();
    scheduledDate.setDate(scheduledDate.getDate() + 2); // 2 dias a partir de hoje

    const { error: scheduleError } = await admin
      .from('cert_enrollments')
      .update({
        status: 'SCHEDULED',
        scheduled_at: scheduledDate.toISOString(),
        external_enrollment_id: `MOCK_ENROLL_${Date.now()}`
      })
      .eq('id', enrollmentId);

    if (scheduleError) {
      throw new Error(`Erro ao agendar: ${scheduleError.message}`);
    }

    console.log(`[SUCCESS] Agendamento mockado para: ${scheduledDate.toISOString()}`);

    // 4. Simular certificado ativo (ACTIVE)
    const { error: activateError } = await admin
      .from('cert_enrollments')
      .update({
        status: 'ACTIVE',
        external_cert_id: `MOCK_CERT_${Date.now()}`,
        serial_number: `MOCK_SERIAL_${Date.now()}`,
        thumbprint: crypto.randomBytes(20).toString('hex').toUpperCase(),
        valid_from: new Date(),
        valid_until: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 ano
        activated_at: new Date()
      })
      .eq('id', enrollmentId);

    if (activateError) {
      throw new Error(`Erro ao ativar certificado: ${activateError.message}`);
    }

    console.log('[SUCCESS] Certificado mockado e ativado com sucesso!');
    console.log(`[INFO] Enrollment ID: ${enrollmentId}`);
    console.log('[INFO] Status: ACTIVE');
    console.log(`[INFO] Válido até: ${new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()}`);

  } catch (error) {
    console.error('[ERROR] Erro ao mockar certificado:', error);
    process.exit(1);
  }
}

// Executar
const userId = process.argv[2];
if (!userId) {
  console.error('Uso: ts-node scripts/mock-certificado-after-payment.ts <userId>');
  process.exit(1);
}

mockCertificadoAfterPayment(userId)
  .then(() => {
    console.log('[DONE] Processo concluído');
    process.exit(0);
  })
  .catch((error) => {
    console.error('[FATAL] Erro fatal:', error);
    process.exit(1);
  });

