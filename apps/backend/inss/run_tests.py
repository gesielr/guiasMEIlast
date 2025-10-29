#!/usr/bin/env python
"""Terminal 2: TESTES - Execute este script em outro terminal"""

import requests
import time
import json

print("=" * 60)
print("TESTE DE ENDPOINTS DA API INSS")
print("=" * 60)

# Espera o servidor estar pronto
time.sleep(2)

# Teste 1: GET /
print("\n[TESTE 1] GET / (deve retornar 200)")
print("-" * 60)
try:
    r = requests.get('http://localhost:8000/', timeout=5)
    print(f"Status: {r.status_code}")
    print(f"Response: {r.json()}")
    print("✓ PASSOU" if r.status_code == 200 else "✗ FALHOU")
except Exception as e:
    print(f"✗ ERRO: {e}")

# Teste 2: POST /emitir
print("\n[TESTE 2] POST /api/v1/guias/emitir (deve retornar 200)")
print("-" * 60)
payload = {
    'whatsapp': '5511987654321',
    'tipo_contribuinte': 'autonomo',
    'valor_base': 1000.0,
    'plano': 'normal',
    'competencia': '02/2025'
}
print(f"Payload: {json.dumps(payload, indent=2)}")
try:
    r = requests.post('http://localhost:8000/api/v1/guias/emitir', json=payload, timeout=15)
    print(f"Status: {r.status_code}")
    if r.status_code == 200:
        print(f"Response: PDF com {len(r.content)} bytes recebido")
        print("✓ PASSOU")
    else:
        print(f"Response: {r.text[:500]}")
        print("✗ FALHOU")
except Exception as e:
    print(f"✗ ERRO: {e}")

print("\n" + "=" * 60)
print("TESTES CONCLUIDOS")
print("=" * 60)
