import os
import base64

# Caminho do .env
env_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../.env'))

# Carrega variáveis do .env
def get_env_var(var_name):
    with open(env_path, encoding="utf-8") as f:
        for line in f:
            if line.strip().startswith(var_name + "="):
                return line.strip().split("=", 1)[1]
    return None

pfx_b64 = get_env_var("NFSE_CERT_PFX_BASE64")
if not pfx_b64:
    print("NFSE_CERT_PFX_BASE64 não encontrado no .env")
    exit(1)

with open("certificado.pfx", "wb") as f:
    f.write(base64.b64decode(pfx_b64))
print("Arquivo certificado.pfx gerado com sucesso!")