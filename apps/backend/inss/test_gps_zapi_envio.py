#!/usr/bin/env python3
"""
TESTE: Envio de Guia GPS via Z-API WhatsApp
Testa o envio de PDF de GPS usando Z-API com Base64 e validações completas.

Objetivo: Validar que o sistema consegue enviar guias GPS em PDF pelo WhatsApp
usando Z-API, seguindo as especificações da documentação oficial.

Variáveis de ambiente necessárias:
- ZAPI_BASE_URL (ou ZAPI_BASE)
- ZAPI_INSTANCE_ID (ou ZAPI_INSTANCE)
- ZAPI_TOKEN
- ZAPI_CLIENT_TOKEN
- TEST_PHONE (formato: 55DDDNNNNNNNN, ex: 5548991117268)
"""

import sys
import os
import base64
import hashlib
import json
import time
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, Optional

# Adicionar app ao path
sys.path.insert(0, str(Path(__file__).parent / "app"))

try:
    import httpx
    import requests
except ImportError:
    print("⚠ ERRO: Bibliotecas necessárias não instaladas")
    print("  Execute: pip install httpx requests")
    sys.exit(1)


# ============================================================================
# CONFIGURAÇÃO E UTILITÁRIOS
# ============================================================================

def print_header(text: str):
    """Imprime cabeçalho formatado"""
    print("\n" + "=" * 80)
    print(f"  {text}")
    print("=" * 80 + "\n")


def print_subheader(text: str):
    """Imprime subcabeçalho formatado"""
    print("\n" + "-" * 80)
    print(f"  {text}")
    print("-" * 80 + "\n")


def print_success(text: str):
    """Imprime mensagem de sucesso"""
    print(f"  ✓ {text}")


def print_error(text: str):
    """Imprime mensagem de erro"""
    print(f"  ✗ {text}")


def print_warning(text: str):
    """Imprime mensagem de aviso"""
    print(f"  ⚠ {text}")


def print_info(text: str):
    """Imprime mensagem informativa"""
    print(f"  ℹ {text}")


def carregar_variaveis_ambiente() -> Dict[str, Optional[str]]:
    """Carrega e valida variáveis de ambiente necessárias"""
    print_subheader("[1/7] Carregando Variáveis de Ambiente")
    
    # Tentar carregar do .env via config
    try:
        from app.config import get_settings
        settings = get_settings()
        
        # Z-API pode estar em variáveis diferentes
        zapi_base = (
            os.getenv("ZAPI_BASE_URL") or 
            os.getenv("ZAPI_BASE") or 
            "https://api.z-api.io"
        )
        
        zapi_instance = (
            os.getenv("ZAPI_INSTANCE_ID") or 
            os.getenv("ZAPI_INSTANCE") or 
            None
        )
        
        zapi_token = (
            os.getenv("ZAPI_TOKEN") or 
            None
        )
        
        zapi_client_token = (
            os.getenv("ZAPI_CLIENT_TOKEN") or 
            None
        )
        
        test_phone = os.getenv("TEST_PHONE") or "5548991117268"
        
    except Exception as e:
        print_warning(f"Erro ao carregar config: {e}")
        zapi_base = os.getenv("ZAPI_BASE_URL") or os.getenv("ZAPI_BASE") or "https://api.z-api.io"
        zapi_instance = os.getenv("ZAPI_INSTANCE_ID") or os.getenv("ZAPI_INSTANCE")
        zapi_token = os.getenv("ZAPI_TOKEN")
        zapi_client_token = os.getenv("ZAPI_CLIENT_TOKEN")
        test_phone = os.getenv("TEST_PHONE") or "5548991117268"
    
    vars_env = {
        "ZAPI_BASE": zapi_base,
        "ZAPI_INSTANCE": zapi_instance,
        "ZAPI_TOKEN": zapi_token,
        "ZAPI_CLIENT_TOKEN": zapi_client_token,
        "TEST_PHONE": test_phone
    }
    
    # Validar variáveis obrigatórias
    faltando = []
    if not zapi_instance:
        faltando.append("ZAPI_INSTANCE_ID ou ZAPI_INSTANCE")
    if not zapi_token:
        faltando.append("ZAPI_TOKEN")
    if not zapi_client_token:
        faltando.append("ZAPI_CLIENT_TOKEN")
    
    if faltando:
        print_error(f"Variáveis de ambiente faltando: {', '.join(faltando)}")
        print_info("Configure no arquivo .env ou exporte no terminal:")
        print_info("  export ZAPI_INSTANCE_ID=seu_instance_id")
        print_info("  export ZAPI_TOKEN=seu_token")
        print_info("  export ZAPI_CLIENT_TOKEN=seu_client_token")
        print_info("  export TEST_PHONE=5548991117268")
        return None
    
    # Mostrar configurações (sem expor tokens completos)
    print_success(f"ZAPI_BASE: {zapi_base}")
    print_success(f"ZAPI_INSTANCE: {zapi_instance[:8]}...{zapi_instance[-4:] if len(zapi_instance) > 12 else '***'}")
    print_success(f"ZAPI_TOKEN: {'***' + zapi_token[-4:] if zapi_token and len(zapi_token) > 4 else '***'}")
    print_success(f"ZAPI_CLIENT_TOKEN: {'***' + zapi_client_token[-4:] if zapi_client_token and len(zapi_client_token) > 4 else '***'}")
    print_success(f"TEST_PHONE: {test_phone}")
    
    return vars_env


def construir_url_zapi(base: str, instance: str, token: str) -> str:
    """Constrói URL do endpoint send-document da Z-API"""
    base_clean = base.rstrip("/")
    
    # Se base já inclui /instances/{id}/token/{token}
    if "/instances/" in base_clean and "/token/" in base_clean:
        # Verificar se já tem /send-document ou /send-document/pdf
        if "/send-document" in base_clean:
            return base_clean
        return f"{base_clean}/send-document"
    
    # Caso contrário, montar URL completa
    # Z-API aceita tanto /send-document quanto /send-document/pdf
    # Vamos usar /send-document que é mais genérico
    return f"{base_clean}/instances/{instance}/token/{token}/send-document"


# ============================================================================
# CARREGAMENTO E CONVERSÃO DO PDF
# ============================================================================

def carregar_pdf_local(caminho_pdf: str) -> tuple[bytes, Dict[str, Any]]:
    """Carrega PDF local e retorna bytes + metadados"""
    print_subheader("[2/7] Carregando PDF Local")
    
    pdf_path = Path(caminho_pdf)
    
    if not pdf_path.exists():
        print_error(f"Arquivo não encontrado: {caminho_pdf}")
        return None, {}
    
    try:
        with open(pdf_path, "rb") as f:
            pdf_bytes = f.read()
        
        tamanho_kb = len(pdf_bytes) / 1024
        checksum = hashlib.sha256(pdf_bytes).hexdigest()
        
        print_success(f"PDF carregado: {pdf_path.name}")
        print_success(f"Tamanho: {tamanho_kb:.2f} KB ({len(pdf_bytes)} bytes)")
        print_success(f"SHA256: {checksum[:16]}...{checksum[-16:]}")
        
        # Verificar limite do WhatsApp (geralmente 16MB para documentos)
        limite_mb = 16
        limite_bytes = limite_mb * 1024 * 1024
        if len(pdf_bytes) > limite_bytes:
            print_warning(f"PDF excede limite do WhatsApp ({limite_mb}MB)")
            print_warning(f"Tamanho atual: {len(pdf_bytes) / (1024*1024):.2f} MB")
        else:
            print_success(f"PDF dentro do limite ({limite_mb}MB)")
        
        return pdf_bytes, {
            "tamanho_bytes": len(pdf_bytes),
            "tamanho_kb": tamanho_kb,
            "checksum_sha256": checksum,
            "nome_arquivo": pdf_path.name
        }
        
    except Exception as e:
        print_error(f"Erro ao carregar PDF: {str(e)}")
        return None, {}


def converter_pdf_para_base64(pdf_bytes: bytes) -> str:
    """Converte PDF para Base64 com prefixo data URI"""
    print_subheader("[3/7] Convertendo PDF para Base64")
    
    try:
        # Converter para Base64
        base64_content = base64.b64encode(pdf_bytes).decode("utf-8")
        
        # Adicionar prefixo data URI (formato aceito pela Z-API)
        data_uri = f"data:application/pdf;base64,{base64_content}"
        
        print_success(f"Base64 gerado: {len(base64_content)} caracteres")
        print_success(f"Data URI prefixado: {len(data_uri)} caracteres totais")
        print_info(f"Preview: {data_uri[:80]}...")
        
        return data_uri
        
    except Exception as e:
        print_error(f"Erro ao converter para Base64: {str(e)}")
        return None


# ============================================================================
# ENVIO VIA Z-API
# ============================================================================

def enviar_pdf_zapi(
    url: str,
    phone: str,
    pdf_base64: str,
    filename: str,
    client_token: str
) -> tuple[Optional[Dict[str, Any]], Optional[int], Optional[str]]:
    """Envia PDF via Z-API e retorna resposta, status HTTP e erro"""
    print_subheader("[4/7] Enviando PDF via Z-API")
    
    # Z-API aceita document como Base64 com prefixo data URI ou URL
    # Vamos usar Base64 conforme documentação
    payload = {
        "phone": phone,
        "document": pdf_base64,  # Base64 com prefixo data:application/pdf;base64,
        "fileName": filename,
        "caption": "📄 Guia GPS - Teste de envio"  # Caption opcional
    }
    
    headers = {
        "Content-Type": "application/json",
        "Client-Token": client_token
    }
    
    print_info(f"URL: {url}")
    print_info(f"Telefone destino: {phone}")
    print_info(f"Filename: {filename}")
    print_info(f"Headers: Content-Type: application/json, Client-Token: ***")
    
    try:
        response = requests.post(
            url,
            json=payload,
            headers=headers,
            timeout=30
        )
        
        status_http = response.status_code
        
        print_info(f"Status HTTP: {status_http}")
        
        if status_http == 200:
            try:
                data = response.json()
                zaap_id = data.get("zaapId") or data.get("zaap_id") or data.get("id")
                message_id = data.get("messageId") or data.get("message_id") or data.get("msg_id")
                
                print_success(f"PDF enviado com sucesso!")
                print_success(f"zaapId: {zaap_id}")
                print_success(f"messageId: {message_id}")
                
                return {
                    "zaapId": zaap_id,
                    "messageId": message_id,
                    "status": "sent",
                    "raw_response": data
                }, status_http, None
                
            except Exception as e:
                print_warning(f"Resposta não é JSON válido: {e}")
                print_info(f"Resposta: {response.text[:200]}")
                return {"raw_response": response.text}, status_http, None
                
        elif status_http == 415:
            print_error("Status 415: Content-Type incorreto ou não suportado")
            print_error(f"Resposta: {response.text[:200]}")
            return None, status_http, "Content-Type incorreto"
            
        elif status_http == 405:
            print_error("Status 405: Método HTTP incorreto (deve ser POST)")
            print_error(f"Resposta: {response.text[:200]}")
            return None, status_http, "Método HTTP incorreto"
            
        elif status_http in (401, 403):
            print_error(f"Status {status_http}: Token inválido ou não autorizado")
            print_error(f"Resposta: {response.text[:200]}")
            return None, status_http, "Token inválido"
            
        elif status_http == 400:
            print_error("Status 400: Requisição inválida")
            try:
                error_data = response.json()
                error_msg = error_data.get("error") or error_data.get("message") or str(error_data)
                print_error(f"Erro: {error_msg}")
            except:
                print_error(f"Resposta: {response.text[:200]}")
            return None, status_http, "Requisição inválida"
            
        else:
            print_error(f"Status {status_http}: Erro inesperado")
            print_error(f"Resposta: {response.text[:200]}")
            return None, status_http, f"Erro HTTP {status_http}"
            
    except requests.exceptions.Timeout:
        print_error("Timeout ao enviar PDF (30s)")
        return None, None, "Timeout"
        
    except requests.exceptions.ConnectionError:
        print_error("Erro de conexão com Z-API")
        return None, None, "Erro de conexão"
        
    except Exception as e:
        print_error(f"Erro inesperado: {str(e)}")
        import traceback
        traceback.print_exc()
        return None, None, str(e)


# ============================================================================
# TESTES NEGATIVOS
# ============================================================================

def testar_token_invalido(url: str, phone: str, pdf_base64: str, filename: str) -> bool:
    """Testa envio com token inválido (espera 401/403)"""
    print_subheader("[5/7] Teste Negativo: Token Inválido")
    
    payload = {
        "phone": phone,
        "document": pdf_base64,
        "fileName": filename
    }
    
    headers = {
        "Content-Type": "application/json",
        "Client-Token": "TOKEN_INVALIDO_TESTE"
    }
    
    try:
        response = requests.post(url, json=payload, headers=headers, timeout=10)
        
        if response.status_code in (401, 403):
            print_success(f"Teste passou: Token inválido rejeitado (status {response.status_code})")
            return True
        else:
            print_warning(f"Teste inesperado: Status {response.status_code} (esperava 401/403)")
            return False
            
    except Exception as e:
        print_warning(f"Erro no teste: {str(e)}")
        return False


def testar_telefone_mal_formatado(url: str, pdf_base64: str, filename: str, client_token: str) -> bool:
    """Testa envio com telefone mal formatado (espera 4xx)"""
    print_subheader("[6/7] Teste Negativo: Telefone Mal Formatado")
    
    telefones_invalidos = [
        "48991117268",  # Sem DDI
        "1191117268",   # Sem DDI e DDD incompleto
        "abc123",       # Caracteres inválidos
    ]
    
    resultados = []
    
    for telefone in telefones_invalidos:
        payload = {
            "phone": telefone,
            "document": pdf_base64,
            "fileName": filename
        }
        
        headers = {
            "Content-Type": "application/json",
            "Client-Token": client_token
        }
        
        try:
            response = requests.post(url, json=payload, headers=headers, timeout=10)
            
            if 400 <= response.status_code < 500:
                print_success(f"Telefone '{telefone}' rejeitado corretamente (status {response.status_code})")
                resultados.append(True)
            else:
                print_warning(f"Telefone '{telefone}' não foi rejeitado (status {response.status_code})")
                resultados.append(False)
                
        except Exception as e:
            print_warning(f"Erro ao testar telefone '{telefone}': {str(e)}")
            resultados.append(False)
    
    return all(resultados)


# ============================================================================
# LOGS E EVIDÊNCIAS
# ============================================================================

def salvar_log(
    resultado: Dict[str, Any],
    pdf_metadata: Dict[str, Any],
    telefone: str,
    status_http: Optional[int],
    erro: Optional[str]
) -> str:
    """Salva log completo com evidências do teste"""
    print_subheader("[7/7] Salvando Log e Evidências")
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    log_dir = Path(__file__).parent / "test_output" / "logs"
    log_dir.mkdir(parents=True, exist_ok=True)
    
    log_data = {
        "teste": "envio_gps_zapi",
        "timestamp": datetime.now().isoformat(),
        "status_http": status_http,
        "sucesso": status_http == 200 and erro is None,
        "telefone_destino": telefone,
        "pdf_metadata": pdf_metadata,
        "resposta_zapi": resultado,
        "erro": erro,
        "saidas_esperadas": {
            "status_http": status_http,
            "zaapId": resultado.get("zaapId") if resultado else None,
            "messageId": resultado.get("messageId") if resultado else None,
            "pdf_bytes": pdf_metadata.get("tamanho_bytes"),
            "checksum_sha256": pdf_metadata.get("checksum_sha256"),
            "telefone_destino": telefone,
            "timestamp_envio": datetime.now().isoformat()
        }
    }
    
    log_file = log_dir / f"gps_envio_{timestamp}.json"
    
    try:
        with open(log_file, "w", encoding="utf-8") as f:
            json.dump(log_data, f, indent=2, ensure_ascii=False)
        
        print_success(f"Log salvo: {log_file}")
        return str(log_file)
        
    except Exception as e:
        print_error(f"Erro ao salvar log: {str(e)}")
        return None


def imprimir_saidas_esperadas(
    status_http: Optional[int],
    zaap_id: Optional[str],
    message_id: Optional[str],
    pdf_metadata: Dict[str, Any],
    telefone: str,
    log_file: Optional[str]
):
    """Imprime saídas esperadas do teste"""
    print_header("SAÍDAS ESPERADAS")
    
    print(f"  status_http: {status_http}")
    print(f"  zaapId: {zaap_id}")
    print(f"  messageId: {message_id}")
    print(f"  pdf_bytes: {pdf_metadata.get('tamanho_bytes', 'N/A')}")
    print(f"  checksum_sha256: {pdf_metadata.get('checksum_sha256', 'N/A')}")
    print(f"  telefone_destino: {telefone}")
    print(f"  timestamp_envio: {datetime.now().isoformat()}")
    
    if log_file:
        print(f"\n  Link do log local: {log_file}")
    else:
        print(f"\n  ⚠ Log não foi salvo")


# ============================================================================
# TESTE PRINCIPAL
# ============================================================================

def main():
    """Executa teste completo de envio de GPS via Z-API"""
    print_header("TESTE: ENVIO DE GUIA GPS VIA Z-API WHATSAPP")
    
    # 1. Carregar variáveis de ambiente
    vars_env = carregar_variaveis_ambiente()
    if not vars_env:
        print_error("Não foi possível carregar variáveis de ambiente")
        return False
    
    # 2. Carregar PDF local
    caminho_pdf = Path(__file__).parent / "test_output" / "Modelo de GPS.pdf"
    pdf_bytes, pdf_metadata = carregar_pdf_local(str(caminho_pdf))
    
    if not pdf_bytes:
        print_error("Não foi possível carregar PDF")
        return False
    
    # 3. Converter para Base64
    pdf_base64 = converter_pdf_para_base64(pdf_bytes)
    if not pdf_base64:
        print_error("Não foi possível converter PDF para Base64")
        return False
    
    # 4. Construir URL do endpoint
    url = construir_url_zapi(
        vars_env["ZAPI_BASE"],
        vars_env["ZAPI_INSTANCE"],
        vars_env["ZAPI_TOKEN"]
    )
    
    # 5. Enviar PDF via Z-API
    resultado, status_http, erro = enviar_pdf_zapi(
        url=url,
        phone=vars_env["TEST_PHONE"],
        pdf_base64=pdf_base64,
        filename="GPS-teste.pdf",
        client_token=vars_env["ZAPI_CLIENT_TOKEN"]
    )
    
    # 6. Testes negativos (apenas se envio principal foi bem-sucedido)
    if status_http == 200:
        print("\n")
        testar_token_invalido(url, vars_env["TEST_PHONE"], pdf_base64, "GPS-teste.pdf")
        testar_telefone_mal_formatado(url, pdf_base64, "GPS-teste.pdf", vars_env["ZAPI_CLIENT_TOKEN"])
    
    # 7. Salvar log
    log_file = salvar_log(
        resultado or {},
        pdf_metadata,
        vars_env["TEST_PHONE"],
        status_http,
        erro
    )
    
    # 8. Imprimir saídas esperadas
    zaap_id = resultado.get("zaapId") if resultado else None
    message_id = resultado.get("messageId") if resultado else None
    
    imprimir_saidas_esperadas(
        status_http,
        zaap_id,
        message_id,
        pdf_metadata,
        vars_env["TEST_PHONE"],
        log_file
    )
    
    # 9. Confirmação visual
    if status_http == 200:
        print_header("CONFIRMAÇÃO VISUAL")
        print_info("Aguarde 5-10 segundos e verifique no WhatsApp se o PDF foi recebido")
        print_info(f"Telefone: {vars_env['TEST_PHONE']}")
        print_info("O PDF deve abrir normalmente no WhatsApp")
    
    # 10. Resultado final
    print_header("RESULTADO FINAL")
    
    if status_http == 200 and not erro:
        print_success("✓ TESTE COMPLETO COM SUCESSO!")
        print_success(f"  - Status HTTP: {status_http}")
        print_success(f"  - zaapId: {zaap_id}")
        print_success(f"  - messageId: {message_id}")
        print_success(f"  - PDF enviado: {pdf_metadata.get('nome_arquivo')}")
        return True
    else:
        print_error("✗ TESTE FALHOU")
        print_error(f"  - Status HTTP: {status_http}")
        if erro:
            print_error(f"  - Erro: {erro}")
        return False


if __name__ == "__main__":
    try:
        sucesso = main()
        sys.exit(0 if sucesso else 1)
    except KeyboardInterrupt:
        print("\n\n⚠ Teste interrompido pelo usuário")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n✗ Erro fatal: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

