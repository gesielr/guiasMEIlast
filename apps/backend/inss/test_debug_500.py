#!/usr/bin/env python3
import requests
import time

time.sleep(2)

payload = {
    "whatsapp": "5548991117268",
    "tipo_contribuinte": "autonomo",
    "valor_base": 2000.00,
    "competencia": "01/2025",
    "plano": "normal"
}

print("Enviando requisição...")
print(f"Payload: {payload}")
print()

try:
    response = requests.post(
        "http://localhost:8000/api/v1/guias/emitir",
        json=payload,
        timeout=5
    )
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Erro: {e}")
