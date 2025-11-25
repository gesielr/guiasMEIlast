// Script de diagnóstico para verificar telefones no banco
import { createSupabaseClients } from "../../src/services/supabase";

async function diagnosticarTelefones() {
  const { admin } = createSupabaseClients();
  
  console.log("=== DIAGNÓSTICO DE TELEFONES NO BANCO ===\n");
  
  // 1. Verificar se a coluna existe
  console.log("1. Verificando se a coluna whatsapp_phone existe...");
  try {
    const { data: testQuery, error: testError } = await admin
      .from("profiles")
      .select("whatsapp_phone")
      .limit(1);
    
    if (testError) {
      if (testError.code === '42703' || testError.message?.includes('does not exist')) {
        console.error("❌ ERRO: A coluna whatsapp_phone NÃO EXISTE no banco!");
        console.error("   Execute a migration: supabase/migrations/20250104000001_ensure_whatsapp_phone_column.sql");
        return;
      } else {
        console.error("❌ Erro ao verificar coluna:", testError);
        return;
      }
    }
    console.log("✅ Coluna whatsapp_phone existe\n");
  } catch (err: any) {
    console.error("❌ Erro ao verificar coluna:", err);
    return;
  }
  
  // 2. Contar perfis com telefone
  console.log("2. Contando perfis com telefone...");
  const { data: profilesWithPhone, error: countError } = await admin
    .from("profiles")
    .select("id, whatsapp_phone", { count: 'exact' })
    .not("whatsapp_phone", "is", null);
  
  if (countError) {
    console.error("❌ Erro ao contar:", countError);
  } else {
    console.log(`✅ Encontrados ${profilesWithPhone?.length || 0} perfis com telefone\n`);
  }
  
  // 3. Listar alguns exemplos de telefones salvos
  console.log("3. Exemplos de telefones salvos (primeiros 10):");
  const { data: exemplos, error: exemplosError } = await admin
    .from("profiles")
    .select("id, name, whatsapp_phone, created_at")
    .not("whatsapp_phone", "is", null)
    .limit(10);
  
  if (exemplosError) {
    console.error("❌ Erro ao buscar exemplos:", exemplosError);
  } else if (exemplos && exemplos.length > 0) {
    exemplos.forEach((p: any, i: number) => {
      console.log(`   ${i + 1}. ID: ${p.id.substring(0, 8)}... | Nome: ${p.name || 'N/A'} | Telefone: ${p.whatsapp_phone} | Criado: ${p.created_at}`);
    });
  } else {
    console.log("   ⚠️ Nenhum perfil com telefone encontrado");
  }
  
  console.log("\n4. Testando busca para telefone específico: 554891589495");
  const telefoneTeste = "554891589495";
  const telefoneNormalizado = telefoneTeste.replace(/\D+/g, "");
  const telefoneComPrefixo = telefoneNormalizado.startsWith("55") 
    ? telefoneNormalizado 
    : `55${telefoneNormalizado}`;
  
  const { data: perfilTeste, error: testeError } = await admin
    .from("profiles")
    .select("id, name, whatsapp_phone, user_type, created_at")
    .or(`whatsapp_phone.eq.${telefoneComPrefixo},whatsapp_phone.eq.${telefoneNormalizado}`)
    .maybeSingle();
  
  if (testeError) {
    console.error("❌ Erro na busca de teste:", testeError);
  } else if (perfilTeste) {
    console.log("✅ Perfil encontrado!");
    console.log(`   ID: ${perfilTeste.id}`);
    console.log(`   Nome: ${perfilTeste.name}`);
    console.log(`   Telefone salvo: ${perfilTeste.whatsapp_phone}`);
    console.log(`   Tipo: ${perfilTeste.user_type}`);
    console.log(`   Criado: ${perfilTeste.created_at}`);
  } else {
    console.log("❌ Nenhum perfil encontrado para este telefone");
    console.log(`   Telefone buscado (com prefixo): ${telefoneComPrefixo}`);
    console.log(`   Telefone buscado (normalizado): ${telefoneNormalizado}`);
  }
  
  console.log("\n=== FIM DO DIAGNÓSTICO ===");
}

diagnosticarTelefones().catch(console.error);

