#!/usr/bin/env python3
"""
TESTE 7B: REQUISIÇÕES HTTP COM DETALHAMENTO DE ERRO
"""

import sys
import time
import requests
import json
from pathlib import Path

API_URL = "http://localhost:8000"

def test_simple():
    """Testa endpoint simples"""
    
    print("\n" + "=" * 80)
    print("TESTE 7B: TESTE SIMPLES DE ENDPOINT")
    print("=" * 80 + "\n")
    
    # Aguardar API iniciar
    print("Aguardando API iniciar...")
    for i in range(10):
        try:
            response = requests.get(f"{API_URL}/", timeout=2)
            print(f"✓ API respondendo\n")
            break
        except:
            print(f"  Tentativa {i+1}/10...")
            time.sleep(1)
    
    # Teste GET /
    print("[1] GET / - Raiz")
    print("-" * 80)
    try:
        response = requests.get(f"{API_URL}/", timeout=5)
        print(f"Status: {response.status_code}")
        print(f"Resposta: {response.json()}\n")
    except Exception as e:
        print(f"Erro: {e}\n")
    
    # Teste simples POST
    print("[2] POST /api/v1/guias/emitir - Teste simples")
    print("-" * 80)
    try:
        payload = {
            "nome_segurado": "João",
            "cpf": "12345678901",
            "tipo_contribuinte": "autonomo",
            "valor_base": 2000.00,
            "mes_competencia": "janeiro",
            "ano_competencia": 2025,
            "plano": "normal",
            "whatsapp": "5548991117268"
        }
        
        print("Enviando...")
        response = requests.post(
            f"{API_URL}/api/v1/guias/emitir",
            json=payload,
            timeout=10
        )
        
        print(f"Status: {response.status_code}")
        print(f"Headers: {dict(response.headers)}")
        print(f"Body: {response.text[:500]}")
        
    except Exception as e:
        print(f"Erro: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_simple()
