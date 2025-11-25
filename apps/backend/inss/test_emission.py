import requests
import json

url = "http://localhost:8000/api/v1/guias/emitir"

payload = {
    "whatsapp": "5548991589495",
    "valor_base": 1518.00,
    "competencia": "11/2025",
    "tipo_contribuinte": "autonomo_simplificado",
    "vencimento": "15/12/2025"
}

print(f"Enviando requisição para {url}...")
print(f"Payload: {json.dumps(payload, indent=2)}")

try:
    response = requests.post(url, json=payload)
    print(f"Status Code: {response.status_code}")
    print("Response:")
    try:
        print(json.dumps(response.json(), indent=2))
    except:
        print(response.text)
except Exception as e:
    print(f"Erro: {e}")
