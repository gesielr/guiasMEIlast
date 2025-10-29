import asyncio
import os
import base64
from nfse_adn_service import NFSeADNService
from dotenv import load_dotenv

# Carrega variáveis do .env da raiz do backend
load_dotenv(dotenv_path=os.path.abspath(os.path.join(os.path.dirname(__file__), '../../../.env')))

class TestSettings:
    nfse_environment = os.getenv("NFSE_ENVIRONMENT", "homologation")
    nfse_base_url = os.getenv("NFSE_BASE_URL", "https://sefin.nfse.gov.br/sefinnacional")
    nfse_credential_secret = os.getenv("NFSE_CREDENTIAL_SECRET", None)
    nfse_cert_pfx_base64 = os.getenv("NFSE_CERT_PFX_BASE64", None)
    nfse_cert_pfx_pass = os.getenv("NFSE_CERT_PFX_PASS", None)

async def main():
    settings = TestSettings()
    service = NFSeADNService(settings)
    print("Testando emissão de NFSe (payload corrigido)...")
    resultado = await service.emitir_nfse(tipo_payload="corrigido")
    print("Resultado:", resultado)

if __name__ == "__main__":
    asyncio.run(main())
