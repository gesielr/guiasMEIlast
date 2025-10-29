import requests
import json

# Carrega o payload final
with open("payload_final.json", "r", encoding="utf-8") as f:
    payload = json.load(f)

# Endpoint de emissão real (ajuste se necessário)
url = "http://127.0.0.1:3333/nfse"  # Endpoint correto do backend Fastify

resp = requests.post(url, json=payload)

print("Status:", resp.status_code)
print("Resposta:")
print(resp.text)
