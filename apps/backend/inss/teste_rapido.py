"""
Script de teste rápido para o sistema híbrido de GPS.
Execute: python teste_rapido.py
"""
import requests
import json
from datetime import datetime

# Configurações
API_URL = "http://localhost:8000"
# API_URL = "http://localhost:8003"  # Se usar porta diferente

def print_header(text):
    """Imprime cabeçalho formatado."""
    print("\n" + "="*60)
    print(f"  {text}")
    print("="*60)

def print_success(text):
    """Imprime mensagem de sucesso."""
    print(f"✅ {text}")

def print_error(text):
    """Imprime mensagem de erro."""
    print(f"❌ {text}")

def print_info(text):
    """Imprime informação."""
    print(f"ℹ️  {text}")

def test_servidor_rodando():
    """Testa se o servidor está rodando."""
    print_header("TESTE 1: Verificar se servidor está rodando")
    try:
        response = requests.get(f"{API_URL}/docs", timeout=5)
        if response.status_code == 200:
            print_success("Servidor está rodando!")
            return True
        else:
            print_error(f"Servidor retornou status {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print_error("Não foi possível conectar ao servidor!")
        print_info("Verifique se o servidor está rodando na porta correta")
        return False
    except Exception as e:
        print_error(f"Erro: {e}")
        return False

def test_emitir_gps_local():
    """Testa emissão de GPS local."""
    print_header("TESTE 2: Emitir GPS (Método Local)")
    
    # Dados de teste
    payload = {
        "whatsapp": "48999999999",
        "tipo_contribuinte": "autonomo",
        "valor_base": 400.00,
        "plano": "normal",
        "competencia": datetime.now().strftime("%m/%Y")
    }
    
    print_info(f"Enviando requisição para: {API_URL}/api/v1/guias/emitir")
    print_info(f"Payload: {json.dumps(payload, indent=2)}")
    
    try:
        response = requests.post(
            f"{API_URL}/api/v1/guias/emitir",
            json=payload,
            timeout=30
        )
        
        print_info(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print_success("GPS emitida com sucesso!")
            print("\n📋 Resposta:")
            print(json.dumps(data, indent=2, ensure_ascii=False))
            
            # Verificar campos importantes
            guia = data.get("guia", {})
            if guia.get("pdf_url"):
                print_success(f"PDF URL: {guia['pdf_url']}")
            if guia.get("codigo_barras"):
                print_success(f"Código de barras: {guia['codigo_barras'][:20]}...")
            if guia.get("metodo_emissao"):
                print_info(f"Método de emissão: {guia['metodo_emissao']}")
            
            return True
        else:
            print_error(f"Erro na requisição: {response.status_code}")
            print_error(f"Resposta: {response.text}")
            return False
            
    except requests.exceptions.Timeout:
        print_error("Timeout na requisição (pode estar demorando muito)")
        return False
    except Exception as e:
        print_error(f"Erro: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_estatisticas():
    """Testa endpoint de estatísticas."""
    print_header("TESTE 3: Estatísticas (se disponível)")
    
    try:
        # Tentar endpoint híbrido primeiro
        response = requests.get(f"{API_URL}/api/v1/gps/estatisticas", timeout=10)
        if response.status_code == 200:
            data = response.json()
            print_success("Estatísticas obtidas!")
            print(json.dumps(data, indent=2, ensure_ascii=False))
            return True
        else:
            print_info("Endpoint de estatísticas não disponível (normal)")
            return True
    except Exception as e:
        print_info(f"Endpoint não disponível: {e}")
        return True  # Não é crítico

def main():
    """Executa todos os testes."""
    print("\n" + "="*60)
    print("  🧪 TESTE RÁPIDO - Sistema Híbrido GPS")
    print("="*60)
    print(f"\n🔗 API URL: {API_URL}")
    print("📝 Certifique-se de que o servidor está rodando!")
    
    resultados = []
    
    # Teste 1: Servidor rodando
    resultados.append(("Servidor rodando", test_servidor_rodando()))
    
    if not resultados[0][1]:
        print("\n⚠️  Servidor não está rodando. Encerrando testes.")
        return
    
    # Teste 2: Emitir GPS
    resultados.append(("Emitir GPS Local", test_emitir_gps_local()))
    
    # Teste 3: Estatísticas
    resultados.append(("Estatísticas", test_estatisticas()))
    
    # Resumo
    print_header("RESUMO DOS TESTES")
    for nome, sucesso in resultados:
        status = "✅ PASSOU" if sucesso else "❌ FALHOU"
        print(f"{status}: {nome}")
    
    total = len(resultados)
    passou = sum(1 for _, s in resultados if s)
    
    print(f"\n📊 Resultado: {passou}/{total} testes passaram")
    
    if passou == total:
        print_success("Todos os testes passaram! 🎉")
    else:
        print_error("Alguns testes falharam. Verifique os erros acima.")

if __name__ == "__main__":
    main()

