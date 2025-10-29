from __future__ import annotations
import os
import base64
import json
import httpx
from typing import Literal, Optional
# Ajuste: importação do config do src/nfse
# from ..config import get_settings

class NFSeADNService:
    """Serviço para integração com a API ADN NFSe (homologação e produção)."""

    def __init__(self, settings):
        self.env = getattr(settings, "nfse_environment", "homologation")
        self.base_url = getattr(settings, "nfse_base_url", "https://sefin.nfse.gov.br/sefinnacional")
        self.credential_secret = getattr(settings, "nfse_credential_secret", None)
        self.cert_pfx_b64 = getattr(settings, "nfse_cert_pfx_base64", None)
        self.cert_pfx_pass = getattr(settings, "nfse_cert_pfx_pass", None)

    def get_payload(self, tipo: Literal["original", "corrigido"]) -> dict:
        """Carrega o payload JSON pelo caminho absoluto na raiz do workspace."""
        if tipo == "original":
            path = r"C:\Users\carlo\OneDrive\Área de Trabalho\Curso\Projetos Pessoais\Inss - Guias\guiasMEI\payload.json"
        else:
            path = r"C:\Users\carlo\OneDrive\Área de Trabalho\Curso\Projetos Pessoais\Inss - Guias\guiasMEI\payload-corrigido.json"
        # Corrige erro de BOM usando utf-8-sig
        with open(path, "r", encoding="utf-8-sig") as f:
            return json.load(f)

    async def emitir_nfse(self, tipo_payload: Literal["original", "corrigido"] = "corrigido") -> dict:
        """Envia o payload para a API ADN NFSe e retorna a resposta ou erro detalhado."""
        try:
            payload = self.get_payload(tipo_payload)
            url = f"{self.base_url}/nfse"
            # Caminhos dos arquivos PEM gerados manualmente
            cert_path = os.getenv("NFSE_CERT_PEM_PATH", "certificado.pem")
            key_path = os.getenv("NFSE_KEY_PEM_PATH", "chave.pem")
            if not os.path.exists(cert_path) or not os.path.exists(key_path):
                print(f"[DEBUG] Arquivos PEM não encontrados: {cert_path}, {key_path}")
                return {"error": f"Arquivos PEM não encontrados: {cert_path}, {key_path}"}
            headers = {
                "Content-Type": "application/json",
                "x-credential-secret": self.credential_secret or ""
            }
            async with httpx.AsyncClient(cert=(cert_path, key_path)) as client:
                response = await client.post(url, json=payload, headers=headers)
            return {"status_code": response.status_code, "body": response.text}
        except Exception as e:
            return {"error": str(e)}
