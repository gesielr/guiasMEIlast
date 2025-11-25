"""
Script para criar o bucket 'guias' no Supabase Storage
Execute: python criar_bucket_guias.py
"""

import os
import sys
from pathlib import Path

# Adicionar o diretório raiz ao path
sys.path.insert(0, str(Path(__file__).parent))

from app.config import get_settings
from app.services.supabase_service import SupabaseService


def criar_bucket_guias():
    """Cria o bucket 'guias' no Supabase Storage."""
    print("=" * 80)
    print("CRIAÇÃO DO BUCKET 'guias' NO SUPABASE STORAGE")
    print("=" * 80)
    
    try:
        settings = get_settings()
        print(f"\n[CONFIG] Conectando ao Supabase...")
        print(f"  URL: {settings.supabase_url}")
        
        # Criar serviço
        service = SupabaseService()
        client = service.client
        
        if not client:
            print("  ❌ Não foi possível conectar ao Supabase")
            return False
        
        print("  ✅ Conectado ao Supabase")
        
        # Verificar se bucket já existe
        print(f"\n[VERIFICAÇÃO] Verificando se bucket 'guias' já existe...")
        try:
            buckets = client.storage.list_buckets()
            bucket_names = [b.name for b in buckets]
            
            if "guias" in bucket_names:
                print("  ✅ Bucket 'guias' já existe!")
                print("  Nenhuma ação necessária.")
                return True
            
            print("  ⚠️  Bucket 'guias' não existe. Criando...")
        except Exception as e:
            print(f"  ⚠️  Erro ao listar buckets: {e}")
            print("  Tentando criar mesmo assim...")
        
        # Criar bucket
        print(f"\n[CRIAÇÃO] Criando bucket 'guias'...")
        try:
            # Criar bucket com configurações públicas
            # Formato correto: create_bucket(id, options)
            result = client.storage.create_bucket(
                id="guias",
                name="guias",
                options={
                    "public": True,  # Bucket público para acesso direto aos PDFs
                    "file_size_limit": 10485760,  # 10MB limite
                    "allowed_mime_types": ["application/pdf"]  # Apenas PDFs
                }
            )
            print(f"  ✅ Bucket criado com sucesso!")
            print(f"  Resultado: {result}")
            
            # Verificar se foi criado
            buckets = client.storage.list_buckets()
            bucket_names = [b.name for b in buckets]
            
            if "guias" in bucket_names:
                print(f"\n  ✅ Confirmação: Bucket 'guias' está na lista de buckets")
                print(f"\n[PRÓXIMOS PASSOS]")
                print(f"  1. Acesse o Supabase Dashboard > Storage")
                print(f"  2. Verifique se o bucket 'guias' está visível")
                print(f"  3. Configure políticas RLS se necessário")
                print(f"  4. Execute verificar_supabase_storage.py para testar")
                return True
            else:
                print(f"  ⚠️  Bucket criado mas não aparece na lista")
                return False
                
        except Exception as e:
            print(f"  ❌ Erro ao criar bucket: {e}")
            import traceback
            print(traceback.format_exc())
            
            # Tentar método alternativo
            print(f"\n[TENTATIVA ALTERNATIVA] Tentando criar via API direta...")
            try:
                # Usar método alternativo se disponível
                from supabase import create_client
                # Algumas versões do cliente podem ter métodos diferentes
                print("  ⚠️  Método alternativo não disponível")
                print("  Por favor, crie o bucket manualmente no Supabase Dashboard")
                print("  Dashboard > Storage > Create Bucket")
                print("  Nome: guias")
                print("  Public: Sim")
            except:
                pass
            
            return False
            
    except Exception as e:
        print(f"\n❌ ERRO GERAL: {e}")
        import traceback
        print(traceback.format_exc())
        return False


if __name__ == "__main__":
    sucesso = criar_bucket_guias()
    
    print("\n" + "=" * 80)
    if sucesso:
        print("✅ BUCKET 'guias' CRIADO COM SUCESSO")
    else:
        print("❌ FALHA AO CRIAR BUCKET")
        print("\nSOLUÇÃO MANUAL:")
        print("1. Acesse: https://supabase.com/dashboard")
        print("2. Selecione seu projeto")
        print("3. Vá em: Storage > Create Bucket")
        print("4. Nome: guias")
        print("5. Marque: Public bucket")
        print("6. Clique em: Create bucket")
        print("7. Execute verificar_supabase_storage.py novamente")
    print("=" * 80)

