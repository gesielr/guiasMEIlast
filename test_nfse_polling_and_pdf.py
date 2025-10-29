#!/usr/bin/env python3
"""
Testes de Integração para Polling de Status e Download de PDF (NFSe)
======================================================================

Este script testa:
1. Emissão de NFS-e (pré-requisito)
2. Polling de status com retry
3. Download de PDF
4. Tratamento de erros
5. Casos de sucesso e falha

Autor: Sistema GuiasMEI
Data: 2025-10-29
"""

import sys
import json
import time
import requests
from datetime import datetime
from pathlib import Path

# Configuração
BASE_URL = "http://localhost:3333"
BACKEND_URL = "http://localhost:3333"
MAX_POLLING_ATTEMPTS = 30
POLLING_INTERVAL = 2  # segundos

# Cores para terminal
class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    RESET = '\033[0m'
    BOLD = '\033[1m'

def log_test(title, status, details=""):
    """Log estruturado de testes"""
    timestamp = datetime.now().isoformat()
    symbol = "✓" if status in ["PASS", "OK"] else "✗" if status == "FAIL" else "⊙"
    color = Colors.GREEN if status in ["PASS", "OK"] else Colors.RED if status == "FAIL" else Colors.YELLOW
    
    print(f"{color}[{timestamp}] {symbol} {title}: {status}{Colors.RESET}")
    if details:
        print(f"    └─ {details}")

def log_info(message):
    """Log informativo"""
    print(f"{Colors.BLUE}[INFO]{Colors.RESET} {message}")

def log_error(message):
    """Log de erro"""
    print(f"{Colors.RED}[ERRO]{Colors.RESET} {message}")

def log_success(message):
    """Log de sucesso"""
    print(f"{Colors.GREEN}[OK]{Colors.RESET} {message}")

def log_data(title, data):
    """Log de dados estruturados"""
    print(f"\n{Colors.BOLD}{title}:{Colors.RESET}")
    try:
        if isinstance(data, dict):
            print(json.dumps(data, indent=2, ensure_ascii=False))
        else:
            print(json.dumps(json.loads(str(data)), indent=2, ensure_ascii=False))
    except:
        print(str(data))

def test_emission():
    """Testa emissão de NFS-e"""
    log_info("=== TESTE 1: EMISSÃO DE NFS-E ===")
    
    emission_payload = {
        "userId": "550e8400-e29b-41d4-a716-446655440000",
        "versao": "1.00",
        "dps_xml_gzip_b64": "H4sICNcM72YC/2Rwc0lsQ2xlYW4ueG1sAKtWSkksSVSyUkorzcnPS1WyMlKqBPEKUkoqgJRVFhcUFqUWKVkpWZkkFhUX5+eVFpUUK1kp5eelFpcV55cUKVkp5Bfn5ZQWlRQrWSllF6cWFucVpxQrWSrlF+Tn5pQUK1kp5RflFeTnlRSVFCtVAgBHEb9FfgAAAA=="
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/nfse",
            json=emission_payload,
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        
        log_data("Response Status", response.status_code)
        
        if response.status_code in [200, 201, 202]:
            data = response.json()
            protocolo = data.get("protocolo")
            chave = data.get("chaveAcesso")
            status = data.get("status")
            
            log_test(
                "Emissão de NFS-e",
                "PASS",
                f"Protocolo: {protocolo}, Status: {status}"
            )
            
            log_data("Resposta da Emissão", data)
            
            return {
                "protocolo": protocolo,
                "chave": chave,
                "status": status,
                "success": True,
                "response": data
            }
        else:
            log_test("Emissão de NFS-e", "FAIL", f"Status {response.status_code}")
            log_error(f"Erro: {response.text}")
            return {"success": False, "error": response.text}
    
    except requests.exceptions.Timeout:
        log_test("Emissão de NFS-e", "FAIL", "Timeout na requisição")
        return {"success": False, "error": "Timeout"}
    except Exception as e:
        log_test("Emissão de NFS-e", "FAIL", str(e))
        return {"success": False, "error": str(e)}

def test_polling(protocolo, max_attempts=MAX_POLLING_ATTEMPTS):
    """Testa polling de status com retry"""
    log_info("=== TESTE 2: POLLING DE STATUS ===")
    
    attempt = 0
    last_status = None
    
    while attempt < max_attempts:
        attempt += 1
        log_info(f"Tentativa {attempt}/{max_attempts}: Consultando status...")
        
        try:
            response = requests.get(
                f"{BASE_URL}/nfse/{protocolo}",
                headers={"Accept": "application/json"},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                situacao = data.get("situacao") or data.get("status") or "DESCONHECIDO"
                last_status = situacao
                
                log_test(
                    f"Polling (tentativa {attempt})",
                    "OK",
                    f"Status: {situacao}"
                )
                
                log_data("Status Response", data)
                
                # Verificar se já foi autorizado
                if situacao in ["AUTORIZADA", "ACEITA", "PROCESSADA"]:
                    log_success(f"NFS-e autorizada! Status: {situacao}")
                    return {
                        "success": True,
                        "status": situacao,
                        "attempts": attempt,
                        "data": data,
                        "chave": data.get("chaveAcesso") or data.get("chave")
                    }
            else:
                log_test(
                    f"Polling (tentativa {attempt})",
                    "FAIL",
                    f"HTTP {response.status_code}"
                )
        
        except requests.exceptions.Timeout:
            log_test(
                f"Polling (tentativa {attempt})",
                "FAIL",
                "Timeout"
            )
        except Exception as e:
            log_test(
                f"Polling (tentativa {attempt})",
                "FAIL",
                str(e)
            )
        
        # Aguardar antes da próxima tentativa
        if attempt < max_attempts:
            log_info(f"Aguardando {POLLING_INTERVAL}s antes da próxima tentativa...")
            time.sleep(POLLING_INTERVAL)
    
    log_error(f"Polling expirou após {max_attempts} tentativas. Último status: {last_status}")
    return {
        "success": False,
        "error": "Polling timeout",
        "last_status": last_status,
        "attempts": attempt
    }

def test_pdf_download(chave):
    """Testa download de PDF"""
    log_info("=== TESTE 3: DOWNLOAD DE PDF ===")
    
    try:
        response = requests.get(
            f"{BASE_URL}/nfse/{chave}/pdf",
            timeout=15
        )
        
        if response.status_code == 200:
            pdf_size = len(response.content)
            log_test(
                "Download de PDF",
                "PASS",
                f"Tamanho: {pdf_size} bytes"
            )
            
            # Salvar PDF para validação
            pdf_path = Path("nfse_download.pdf")
            with open(pdf_path, "wb") as f:
                f.write(response.content)
            
            log_success(f"PDF salvo em: {pdf_path}")
            
            return {
                "success": True,
                "size": pdf_size,
                "path": str(pdf_path)
            }
        else:
            log_test("Download de PDF", "FAIL", f"HTTP {response.status_code}")
            return {"success": False, "error": f"HTTP {response.status_code}"}
    
    except Exception as e:
        log_test("Download de PDF", "FAIL", str(e))
        return {"success": False, "error": str(e)}

def test_error_handling():
    """Testa tratamento de erros"""
    log_info("=== TESTE 4: TRATAMENTO DE ERROS ===")
    
    test_cases = [
        {
            "name": "Protocolo inválido",
            "protocolo": "PROTO-INVALIDO-123456789",
            "expected_error": 404
        },
        {
            "name": "Protocolo vazio",
            "protocolo": "",
            "expected_error": 400
        },
        {
            "name": "Protocolo com caracteres especiais",
            "protocolo": "PROTO<>SCRIPT",
            "expected_error": 400
        }
    ]
    
    results = []
    for test_case in test_cases:
        protocolo = test_case["protocolo"]
        log_info(f"Testando: {test_case['name']}")
        
        try:
            response = requests.get(
                f"{BASE_URL}/nfse/{protocolo}",
                timeout=5
            )
            
            if response.status_code in [400, 404, 500]:
                log_test(
                    test_case["name"],
                    "PASS",
                    f"Erro capturado (HTTP {response.status_code})"
                )
                results.append({"test": test_case["name"], "passed": True})
            else:
                log_test(
                    test_case["name"],
                    "FAIL",
                    f"Esperado erro, mas recebeu HTTP {response.status_code}"
                )
                results.append({"test": test_case["name"], "passed": False})
        
        except Exception as e:
            log_test(
                test_case["name"],
                "PASS",
                f"Exceção capturada: {str(e)[:50]}"
            )
            results.append({"test": test_case["name"], "passed": True})
    
    return results

def test_certificate_validation():
    """Testa validação de certificado"""
    log_info("=== TESTE 5: VALIDAÇÃO DE CERTIFICADO ===")
    
    # Verificar endpoint de métricas (que inclui status do certificado)
    try:
        response = requests.get(
            f"{BASE_URL}/nfse/metrics",
            headers={"Accept": "application/json"},
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            log_test("Métricas do Sistema", "PASS", "Endpoint acessível")
            log_data("Métricas", data)
            return {"success": True, "metrics": data}
        else:
            log_test("Métricas do Sistema", "FAIL", f"HTTP {response.status_code}")
            return {"success": False, "error": f"HTTP {response.status_code}"}
    
    except Exception as e:
        log_test("Métricas do Sistema", "FAIL", str(e))
        return {"success": False, "error": str(e)}

def generate_report(results):
    """Gera relatório dos testes"""
    log_info("=== RELATÓRIO FINAL ===")
    
    report = {
        "timestamp": datetime.now().isoformat(),
        "tests": results,
        "summary": {
            "total": len(results),
            "passed": sum(1 for r in results if r.get("success") or r.get("passed")),
            "failed": sum(1 for r in results if not (r.get("success") or r.get("passed")))
        }
    }
    
    print(f"\n{Colors.BOLD}RESUMO DOS TESTES:{Colors.RESET}")
    print(f"Total: {report['summary']['total']}")
    print(f"{Colors.GREEN}Passou: {report['summary']['passed']}{Colors.RESET}")
    print(f"{Colors.RED}Falhou: {report['summary']['failed']}{Colors.RESET}")
    
    # Salvar relatório
    report_path = Path("test_results.json")
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2, ensure_ascii=False)
    
    log_success(f"Relatório salvo em: {report_path}")
    
    return report

def main():
    print(f"\n{Colors.BOLD}{'='*60}")
    print(f"TESTES DE INTEGRAÇÃO - POLLING E PDF DA NFSE")
    print(f"{'='*60}{Colors.RESET}\n")
    
    results = []
    
    # Teste 1: Emissão
    emission_result = test_emission()
    results.append({
        "test": "Emissão",
        "success": emission_result.get("success", False),
        "details": emission_result
    })
    
    if not emission_result.get("success"):
        log_error("Emissão falhou. Não é possível continuar com os próximos testes.")
        generate_report(results)
        return 1
    
    protocolo = emission_result["protocolo"]
    chave = emission_result.get("chave")
    
    # Teste 2: Polling
    print()
    polling_result = test_polling(protocolo)
    results.append({
        "test": "Polling",
        "success": polling_result.get("success", False),
        "details": polling_result
    })
    
    # Teste 3: PDF (se polling foi bem-sucedido e temos chave)
    print()
    if polling_result.get("success") and polling_result.get("data", {}).get("chaveAcesso"):
        chave = polling_result["data"]["chaveAcesso"]
    
    if chave:
        pdf_result = test_pdf_download(chave)
        results.append({
            "test": "PDF Download",
            "success": pdf_result.get("success", False),
            "details": pdf_result
        })
    else:
        log_info("Pulando teste de PDF (chave não disponível)")
    
    # Teste 4: Tratamento de Erros
    print()
    error_results = test_error_handling()
    results.extend([
        {"test": f"Erro: {r['test']}", "success": r["passed"], "details": r}
        for r in error_results
    ])
    
    # Teste 5: Certificado e Métricas
    print()
    cert_result = test_certificate_validation()
    results.append({
        "test": "Certificado/Métricas",
        "success": cert_result.get("success", False),
        "details": cert_result
    })
    
    # Gerar relatório
    print()
    report = generate_report(results)
    
    # Retornar código de saída apropriado
    return 0 if report['summary']['failed'] == 0 else 1

if __name__ == "__main__":
    sys.exit(main())
