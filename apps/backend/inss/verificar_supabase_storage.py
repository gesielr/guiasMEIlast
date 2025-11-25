"""
Script para verificar conexão com Supabase e Storage
Execute: python verificar_supabase_storage.py
"""

import os
import sys
from pathlib import Path

# Adicionar o diretório raiz ao path
sys.path.insert(0, str(Path(__file__).parent))

from app.config import get_settings
from app.services.supabase_service import SupabaseService


def verificar_supabase():
    """Verifica conexão com Supabase e Storage."""
    print("=" * 80)
    print("VERIFICAÇÃO DE SUPABASE E STORAGE")
    print("=" * 80)
    
    try:
        settings = get_settings()
        print(f"\n[CONFIG] Configurações carregadas:")
        print(f"  URL: {settings.supabase_url}")
        if settings.supabase_service_role_key:
            print(f"  Service Role Key: {settings.supabase_service_role_key[:20]}...{settings.supabase_service_role_key[-10:]}")
            print(f"  ✅ Usando Service Role Key (recomendado para Storage)")
        else:
            print(f"  Anon Key: {settings.supabase_key[:20]}...{settings.supabase_key[-10:]}")
            print(f"  ⚠️  Usando Anon Key (pode ter problemas com RLS)")
        
        # Criar serviço
        service = SupabaseService()
        
        # Verificar cliente
        print(f"\n[TESTE 1] Verificando cliente Supabase...")
        client = service.client
        if not client:
            print("  ❌ Cliente Supabase NÃO está disponível")
            print("  Verifique SUPABASE_URL e SUPABASE_KEY no .env")
            return False
        
        print("  ✅ Cliente Supabase conectado")
        
        # Verificar bucket "guias"
        print(f"\n[TESTE 2] Verificando bucket 'guias'...")
        try:
            # Tentar acessar o bucket diretamente (mais confiável que listar)
            try:
                # Tentar listar arquivos do bucket (se existir, funciona)
                test_list = client.storage.from_("guias").list()
                print("  ✅ Bucket 'guias' existe e está acessível")
            except Exception as e:
                # Se falhar, tentar listar todos os buckets
                try:
                    buckets = client.storage.list_buckets()
                    bucket_names = [b.name for b in buckets] if buckets else []
                    
                    print(f"  Buckets disponíveis: {bucket_names}")
                    
                    if "guias" not in bucket_names:
                        print("  ⚠️  Bucket 'guias' não encontrado na lista")
                        print("  Tentando acesso direto...")
                        # Tentar acesso direto mesmo assim
                        test_list = client.storage.from_("guias").list()
                        print("  ✅ Bucket 'guias' existe (acesso direto funcionou)")
                    else:
                        print("  ✅ Bucket 'guias' existe na lista")
                except Exception as e2:
                    print(f"  ⚠️  Erro ao verificar bucket: {e2}")
                    print(f"  Tipo: {type(e2).__name__}")
                    # Mesmo assim, tentar o teste de upload
                    print("  Continuando com teste de upload...")
            
            # Verificar políticas do bucket
            print(f"\n[TESTE 3] Verificando políticas do bucket...")
            try:
                policies = client.storage.from_("guias").list()
                print(f"  ✅ Bucket 'guias' está acessível")
            except Exception as e:
                print(f"  ⚠️  Aviso ao acessar bucket: {e}")
            
            # Teste de upload
            print(f"\n[TESTE 4] Testando upload de arquivo...")
            test_content = b"Test PDF Content"
            test_path = "test/test_file.pdf"
            
            try:
                # Upload
                result = client.storage.from_("guias").upload(
                    test_path, 
                    test_content, 
                    {"content-type": "application/pdf", "upsert": "true"}
                )
                print(f"  ✅ Upload bem-sucedido: {result}")
                
                # Obter URL pública
                public_url = client.storage.from_("guias").get_public_url(test_path)
                print(f"  ✅ URL pública: {public_url}")
                
                # Limpar arquivo de teste
                try:
                    client.storage.from_("guias").remove([test_path])
                    print(f"  ✅ Arquivo de teste removido")
                except:
                    pass
                
                return True
                
            except Exception as e:
                print(f"  ❌ Erro no upload: {e}")
                import traceback
                print(traceback.format_exc())
                return False
                
        except Exception as e:
            print(f"  ❌ Erro ao verificar buckets: {e}")
            import traceback
            print(traceback.format_exc())
            return False
            
    except Exception as e:
        print(f"\n❌ ERRO GERAL: {e}")
        import traceback
        print(traceback.format_exc())
        return False


if __name__ == "__main__":
    sucesso = verificar_supabase()
    
    print("\n" + "=" * 80)
    if sucesso:
        print("✅ TODOS OS TESTES PASSARAM")
    else:
        print("❌ ALGUNS TESTES FALHARAM")
        print("\nPRÓXIMOS PASSOS:")
        print("1. Verifique SUPABASE_URL e SUPABASE_KEY no arquivo .env")
        print("2. Crie o bucket 'guias' no Supabase Storage (se não existir)")
        print("3. Configure políticas públicas para o bucket 'guias'")
        print("4. Execute este script novamente")
    print("=" * 80)

