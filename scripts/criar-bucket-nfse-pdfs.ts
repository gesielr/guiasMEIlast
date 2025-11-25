/**
 * Script para criar o bucket nfse-pdfs no Supabase Storage
 * Execute: npx tsx scripts/criar-bucket-nfse-pdfs.ts
 */

import { createSupabaseClients } from '../apps/backend/services/supabase';

const PDF_BUCKET = 'nfse-pdfs';

async function criarBucket() {
  console.log('🔧 Criando bucket no Supabase Storage...\n');
  
  try {
    const { admin } = createSupabaseClients();
    
    // Verificar se o bucket já existe
    const { data: buckets, error: listError } = await admin.storage.listBuckets();
    
    if (listError) {
      console.error('❌ Erro ao listar buckets:', listError);
      process.exit(1);
    }
    
    const bucketExiste = buckets?.some((b: any) => b.name === PDF_BUCKET);
    
    if (bucketExiste) {
      console.log(`✅ Bucket "${PDF_BUCKET}" já existe!`);
      console.log('💡 Não é necessário criar novamente.');
      return;
    }
    
    console.log(`📦 Criando bucket "${PDF_BUCKET}"...`);
    
    // Criar bucket (privado)
    const { data: bucket, error: createError } = await admin.storage.createBucket(PDF_BUCKET, {
      public: false, // Bucket privado
      fileSizeLimit: 10485760, // 10MB limite por arquivo
      allowedMimeTypes: ['application/pdf'] // Apenas PDFs
    });
    
    if (createError) {
      console.error('❌ Erro ao criar bucket:', createError);
      
      // Se o erro for de permissão, dar instruções
      if (createError.message?.includes('permission') || createError.message?.includes('403')) {
        console.log('\n💡 Erro de permissão!');
        console.log('   O bucket precisa ser criado via Dashboard do Supabase:');
        console.log('   1. Acesse: https://app.supabase.com');
        console.log('   2. Selecione seu projeto');
        console.log('   3. Vá em "Storage" > "New bucket"');
        console.log(`   4. Nome: ${PDF_BUCKET}`);
        console.log('   5. Tipo: Private');
      }
      
      process.exit(1);
    }
    
    console.log(`✅ Bucket "${PDF_BUCKET}" criado com sucesso!`);
    console.log('\n📋 Configurações aplicadas:');
    console.log('   - Tipo: Privado');
    console.log('   - Limite de arquivo: 10MB');
    console.log('   - Tipos permitidos: application/pdf');
    
    console.log('\n⚠️  IMPORTANTE: Configure as políticas RLS no dashboard do Supabase:');
    console.log('   1. Vá em Storage > Buckets > nfse-pdfs > Policies');
    console.log('   2. Crie uma política para permitir upload/download do backend');
    console.log('   3. Use o service_role_key do Supabase no backend');
    
    console.log('\n🎉 Bucket criado! Agora você pode testar a emissão de notas fiscais.');
    
  } catch (error: any) {
    console.error('❌ Erro ao criar bucket:', error.message);
    console.error('\nStack:', error.stack);
    process.exit(1);
  }
}

criarBucket();

