import requests

with open("decoded_payload_valid.xml", "r", encoding="utf-8") as f:
    xml = f.read()

resp = requests.post(
    "http://127.0.0.1:3333/nfse/test-sim",
    json={"dpsXml": xml}
)

print("Status:", resp.status_code)
print("Resposta:")
print(resp.text)