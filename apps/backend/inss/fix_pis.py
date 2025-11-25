import sys
import os
import asyncio
import traceback

# Adicionar diretório atual ao path para importar app
sys.path.append(os.getcwd())

try:
    from app.services.supabase_service import SupabaseService
except ImportError:
    # Tentar importar assumindo que estamos dentro de apps/backend/inss
    sys.path.append(os.path.join(os.getcwd(), 'app'))
    from app.services.supabase_service import SupabaseService

async def main():
    print("=" * 80)
    print("SCRIPT DE CORREÇÃO DE PIS")
    print("=" * 80)
    
    service = SupabaseService()
    
    # ID do perfil MEI da Silezia (obtido do log do usuário)
    profile_id = '6af03a0d-78bd-4584-87d9-8bf74e75f5c8'
    pis_correto = '27317621955'
    
    print(f"Atualizando PIS para perfil {profile_id}...")
    print(f"Novo PIS: {pis_correto}")
    
    try:
        # Verificar valor atual
        current = await service.get_records("profiles", {"id": profile_id})
        if current:
            print(f"Valor atual: {current[0].get('pis')}")
        
        # Update record usando client diretamente
        print(f"[INFO] Executando update via client direto...")
        
        def _update():
            return service.client.table("profiles").update({"pis": pis_correto}).eq("id", profile_id).execute()
            
        result = await asyncio.to_thread(_update)
        print(f"Update executado. Data: {result.data}")
        
        # Verificar se atualizou
        updated = await service.get_records("profiles", {"id": profile_id})
        if updated:
            print(f"Valor após update: {updated[0].get('pis')}")
            
        if updated and updated[0].get('pis') == pis_correto:
            print("✅ SUCESSO! PIS atualizado corretamente.")
        else:
            print("❌ FALHA! PIS não foi atualizado.")
            
    except Exception as e:
        print(f"❌ ERRO: {e}")
        print(traceback.format_exc())

if __name__ == "__main__":
    asyncio.run(main())
