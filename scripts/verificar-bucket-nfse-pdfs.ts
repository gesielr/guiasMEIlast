/**
 * Script para verificar se o bucket nfse-pdfs existe no Supabase Storage
 * Execute: npx tsx scripts/verificar-bucket-nfse-pdfs.ts
 */

import { createSupabaseClients } from '../apps/backend/services/supabase';

const PDF_BUCKET = 'nfse-pdfs';

async function verificarBucket() {
  console.log('🔍 Verificando bucket do Supabase Storage...\n');
  
  try {
    const { admin } = createSupabaseClients();
    
    // Listar todos os buckets disponíveis
    const { data: buckets, error: listError } = await admin.storage.listBuckets();
    
    if (listError) {
      console.error('❌ Erro ao listar buckets:', listError);
      console.log('\n💡 Solução: Verifique se as credenciais do Supabase estão corretas no .env');
      process.exit(1);
    }
    
    console.log('📦 Buckets encontrados no Supabase Storage:');
    console.log('─'.repeat(60));
    
    if (!buckets || buckets.length === 0) {
      console.log('⚠️  Nenhum bucket encontrado!');
    } else {
      buckets.forEach((bucket: any) => {
        const isTarget = bucket.name === PDF_BUCKET;
        const status = isTarget ? '✅' : '  ';
        console.log(`${status} ${bucket.name}${isTarget ? ' ← BUCKET PROCURADO' : ''}`);
        if (bucket.public !== undefined) {
          console.log(`   ${' '.repeat(3)}Tipo: ${bucket.public ? 'Público' : 'Privado'}`);
        }
      });
    }
    
    console.log('─'.repeat(60));
    
    // Verificar se o bucket específico existe
    const bucketExiste = buckets?.some((b: any) => b.name === PDF_BUCKET);
    
    if (bucketExiste) {
      console.log(`\n✅ Bucket "${PDF_BUCKET}" encontrado!`);
      
      // Tentar acessar o bucket para verificar permissões
      try {
        const bucket = admin.storage.from(PDF_BUCKET);
        const { data: files, error: filesError } = await bucket.list('', {
          limit: 1
        });
        
        if (filesError) {
          console.log(`⚠️  Bucket existe mas pode ter problemas de acesso: ${filesError.message}`);
          console.log('💡 Verifique as políticas RLS do bucket no dashboard do Supabase');
        } else {
          console.log('✅ Bucket acessível e funcionando corretamente!');
          console.log(`📊 Total de arquivos no bucket: ${files?.length || 0}`);
        }
      } catch (accessError: any) {
        console.log(`⚠️  Erro ao acessar bucket: ${accessError.message}`);
      }
      
      console.log('\n🎉 Tudo pronto para testar a emissão de notas fiscais!');
    } else {
      console.log(`\n❌ Bucket "${PDF_BUCKET}" NÃO encontrado!`);
      console.log('\n📝 Para criar o bucket, você tem duas opções:\n');
      
      console.log('OPÇÃO 1: Via Dashboard do Supabase (Recomendado)');
      console.log('─'.repeat(60));
      console.log('1. Acesse: https://app.supabase.com');
      console.log('2. Selecione seu projeto');
      console.log('3. Vá em "Storage" no menu lateral');
      console.log('4. Clique em "New bucket"');
      console.log(`5. Nome: ${PDF_BUCKET}`);
      console.log('6. Tipo: Private (Privado)');
      console.log('7. Clique em "Create bucket"');
      console.log('─'.repeat(60));
      
      console.log('\nOPÇÃO 2: Via Código (Script automático)');
      console.log('─'.repeat(60));
      console.log('Execute: npx tsx scripts/criar-bucket-nfse-pdfs.ts');
      console.log('─'.repeat(60));
      
      process.exit(1);
    }
  } catch (error: any) {
    console.error('❌ Erro ao verificar bucket:', error.message);
    console.error('\nStack:', error.stack);
    process.exit(1);
  }
}

verificarBucket();

