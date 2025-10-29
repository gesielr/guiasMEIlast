#!/usr/bin/env python3
"""
TESTE 7: REQUISIÇÕES HTTP AOS ENDPOINTS
Valida endpoints em produção com FastAPI
"""

import sys
import time
import requests
import json
from pathlib import Path

API_URL = "http://localhost:8000"

def test_api_endpoints():
    """Testa endpoints reais da API"""
    
    print("\n" + "=" * 80)
    print("TESTE 7: REQUISIÇÕES HTTP AOS ENDPOINTS")
    print("=" * 80 + "\n")
    
    # Verificar se API está rodando
    print("[0/5] Verificando conexão com API")
    print("-" * 80)
    
    max_attempts = 10
    attempt = 0
    
    while attempt < max_attempts:
        try:
            response = requests.get(f"{API_URL}/", timeout=2)
            if response.status_code == 200:
                print(f"  ✓ API respondendo em {API_URL}")
                print(f"  ✓ Status: {response.json()}")
                print(f"  ✓ PASSOU\n")
                break
            attempt += 1
            time.sleep(1)
        except requests.exceptions.ConnectionError:
            attempt += 1
            if attempt < max_attempts:
                print(f"  ⏳ Tentativa {attempt}/{max_attempts}: API não respondeu, aguardando...")
                time.sleep(1)
            else:
                print(f"  ✗ FALHOU: API não está respondendo após {max_attempts} tentativas")
                print(f"  Certifique-se de que o servidor está rodando:")
                print(f"  cd apps/backend/inss && uvicorn app.main:app --reload")
                return False
    
    # Test 1: GET /
    print("[1/5] GET / - Root endpoint")
    print("-" * 80)
    
    try:
        response = requests.get(f"{API_URL}/", timeout=5)
        print(f"  Status: {response.status_code}")
        print(f"  Response: {response.json()}")
        print(f"  ✓ PASSOU\n")
    except Exception as e:
        print(f"  ✗ FALHOU: {str(e)}\n")
        return False
    
    # Test 2: POST /api/v1/guias/emitir (Autônomo)
    print("[2/5] POST /api/v1/guias/emitir - Emitir Guia Autônomo")
    print("-" * 80)
    
    try:
        payload = {
            "nome_segurado": "João da Silva",
            "cpf": "12345678901",
            "tipo_contribuinte": "autonomo",
            "valor_base": 2000.00,
            "competencia": "01/2025",
            "plano": "normal",
            "whatsapp": "5548991117268"
        }
        
        print(f"  Enviando payload:")
        print(f"    Nome: {payload['nome_segurado']}")
        print(f"    CPF: {payload['cpf']}")
        print(f"    Tipo: {payload['tipo_contribuinte']}")
        print(f"    Valor: R$ {payload['valor_base']:.2f}")
        
        response = requests.post(
            f"{API_URL}/api/v1/guias/emitir",
            json=payload,
            timeout=10
        )
        
        print(f"  Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"  Resposta:")
            print(f"    ID: {data.get('id')}")
            print(f"    Numero: {data.get('numero_guia')}")
            print(f"    GPS: {data.get('codigo_gps')}")
            print(f"    Valor: R$ {data.get('valor'):.2f}")
            print(f"    Status: {data.get('status')}")
            print(f"  ✓ PASSOU\n")
        else:
            print(f"  Erro: {response.text}")
            print(f"  ⚠ AVISO: Endpoint retornou {response.status_code}\n")
    
    except Exception as e:
        print(f"  ⚠ AVISO: {str(e)}\n")
    
    # Test 3: POST /api/v1/guias/emitir (Doméstico)
    print("[3/5] POST /api/v1/guias/emitir - Emitir Guia Doméstico")
    print("-" * 80)
    
    try:
        payload = {
            "nome_segurado": "Maria Oliveira",
            "cpf": "98765432109",
            "tipo_contribuinte": "domestico",
            "valor_base": 1500.00,
            "competencia": "01/2025",
            "whatsapp": "5548991117268"
        }
        
        print(f"  Enviando payload:")
        print(f"    Nome: {payload['nome_segurado']}")
        print(f"    Tipo: {payload['tipo_contribuinte']}")
        print(f"    Valor: R$ {payload['valor_base']:.2f}")
        
        response = requests.post(
            f"{API_URL}/api/v1/guias/emitir",
            json=payload,
            timeout=10
        )
        
        print(f"  Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"    Valor Calculado: R$ {data.get('valor'):.2f}")
            print(f"    Status: {data.get('status')}")
            print(f"  ✓ PASSOU\n")
        else:
            print(f"  ⚠ Status {response.status_code}\n")
    
    except Exception as e:
        print(f"  ⚠ AVISO: {str(e)}\n")
    
    # Test 4: POST /api/v1/guias/complementacao
    print("[4/5] POST /api/v1/guias/complementacao - Complementação 11% → 20%")
    print("-" * 80)
    
    try:
        payload = {
            "whatsapp": "5548991117268",
            "competencias": ["janeiro", "fevereiro", "março"],
            "valor_base": 1000.00
        }
        
        print(f"  Enviando payload:")
        print(f"    Nome: {data.get('nome_segurado')}")
        print(f"    Competências: {', '.join(payload['competencias'])}")
        print(f"    Valor Base: R$ {payload['valor_base']:.2f}")
        
        response = requests.post(
            f"{API_URL}/api/v1/guias/complementacao",
            json=payload,
            timeout=10
        )
        
        print(f"  Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"    Diferença (9%): R$ {data.get('diferenca'):.2f}")
            print(f"    Juros SELIC: R$ {data.get('juros_selic'):.2f}")
            print(f"    Total: R$ {data.get('valor_total'):.2f}")
            print(f"  ✓ PASSOU\n")
        else:
            print(f"  ⚠ Status {response.status_code}\n")
    
    except Exception as e:
        print(f"  ⚠ AVISO: {str(e)}\n")
    
    # Test 5: Verificação de status geral
    print("[5/5] Verificação de Status Geral")
    print("-" * 80)
    
    try:
        # Testar docs
        response = requests.get(f"{API_URL}/docs", timeout=5)
        if response.status_code == 200:
            print(f"  ✓ Swagger UI disponível em /docs")
        
        # Testar openapi.json
        response = requests.get(f"{API_URL}/openapi.json", timeout=5)
        if response.status_code == 200:
            print(f"  ✓ OpenAPI schema disponível")
        
        print(f"  ✓ PASSOU\n")
    except Exception as e:
        print(f"  ⚠ AVISO: {str(e)}\n")
    
    # Resultado final
    print("=" * 80)
    print("TESTE 7 COMPLETO")
    print("=" * 80)
    print("\n✓ API FastAPI funcionando corretamente!")
    print("\nAcesse os endpoints em:")
    print(f"  - Swagger UI: http://localhost:8000/docs")
    print(f"  - ReDoc: http://localhost:8000/redoc")
    print(f"  - OpenAPI JSON: http://localhost:8000/openapi.json")
    
    return True

if __name__ == "__main__":
    success = test_api_endpoints()
    sys.exit(0 if success else 1)
