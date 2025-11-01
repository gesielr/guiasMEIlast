#!/usr/bin/env python3
"""
TESTE 2: GERAÇÃO DE PDF
Valida geração de PDFs com dados reais via API
"""

import sys
import os
import requests
from pathlib import Path
from datetime import datetime, timedelta

API_URL = os.getenv("INSS_API_URL", "http://localhost:8000")

def test_pdf_generation():
    """Testa geração de PDF para diferentes tipos de guias"""
    
    print("\n" + "=" * 70)
    print("TESTE 2: GERAÇÃO DE PDF - VALIDAÇÃO DE PDFS")
    print("=" * 70 + "\n")
    
    # Primeiro, verifica se API está rodando
    try:
        response = requests.get(f"{API_URL}/health", timeout=2)
    except requests.exceptions.ConnectionError:
        print("✗ ERRO: API não está rodando em http://localhost:8000")
        print("  Para rodar este teste, execute em outro terminal:")
        # Usar barras duplas para evitar escapes no Windows
        print("  cd apps/backend/inss && .\\.venv\\Scripts\\uvicorn app.main:app --reload")
        return False
    
    # Dados de teste
    test_cases = [
        {
            "numero": 1,
            "tipo": "AUTÔNOMO NORMAL",
            "data": {
                "nome": "João da Silva",
                "cpf": "12345678900",
                "valor_base": 2000.00,
                "tipo_contribuinte": "autonomo",
            }
        },
        {
            "numero": 2,
            "tipo": "DOMÉSTICO",
            "data": {
                "nome": "Maria Oliveira",
                "cpf": "98765432100",
                "valor_base": 1500.00,
                "tipo_contribuinte": "domestico",
            }
        },
        {
            "numero": 3,
            "tipo": "PRODUTOR RURAL",
            "data": {
                "nome": "Pedro Santos da Roça",
                "cpf": "55566677700",
                "valor_base": 100000.00,
                "tipo_contribuinte": "produtor_rural",
            }
        },
    ]
    
    passed = 0
    failed = 0
    
    for test_case in test_cases:
        try:
            print(f"[{test_case['numero']}/3] {test_case['tipo']}")
            print("-" * 70)
            
            data = test_case["data"]
            
            # Enviar requisição para API gerar PDF
            payload = {
                "nome_segurado": data["nome"],
                "cpf": data["cpf"],
                "valor_base": data["valor_base"],
                "tipo_contribuinte": data["tipo_contribuinte"],
            }
            
            response = requests.post(
                f"{API_URL}/api/v1/guias/gerar-pdf",
                json=payload,
                timeout=10
            )
            
            # Validar resposta
            if response.status_code != 200:
                print(f"  ✗ FALHOU: API retornou {response.status_code}")
                print(f"  Resposta: {response.text}")
                failed += 1
                continue
            
            pdf_bytes = response.content
            
            if not pdf_bytes or len(pdf_bytes) < 1000:
                print(f"  ✗ FALHOU: PDF vazio ou muito pequeno ({len(pdf_bytes)} bytes)")
                failed += 1
                continue
            
            if not pdf_bytes.startswith(b"%PDF"):
                print(f"  ✗ FALHOU: Não é PDF válido")
                failed += 1
                continue
            
            # Salvar cópia de teste
            output_dir = Path(__file__).parent / "test_output"
            output_dir.mkdir(exist_ok=True)
            
            filename = f"GPS_{test_case['tipo'].replace(' ', '_')}.pdf"
            output_path = output_dir / filename
            
            with open(output_path, "wb") as f:
                f.write(pdf_bytes)
            
            print(f"  Nome: {data['nome']}")
            print(f"  CPF: {data['cpf']}")
            print(f"  Tipo: {data['tipo_contribuinte']}")
            print(f"  Tamanho PDF: {len(pdf_bytes)} bytes")
            print(f"  Salvo em: {output_path}")
            print(f"  ✓ PASSOU\n")
            
            passed += 1
            
        except requests.exceptions.RequestException as e:
            print(f"  ✗ FALHOU (Erro de conexão): {str(e)}\n")
            failed += 1
        except Exception as e:
            print(f"  ✗ FALHOU: {str(e)}\n")
            failed += 1
    
    # Relatório final
    print("=" * 70)
    print(f"RESULTADO: {passed} PASSOU(S), {failed} FALHOU(S)")
    print("=" * 70)
    
    if failed == 0:
        print("✓ TESTE 2 COMPLETO - SUCESSO!")
        return True
    else:
        print("✗ TESTE 2 COMPLETO - COM FALHAS")
        return False

if __name__ == "__main__":
    success = test_pdf_generation()
    sys.exit(0 if success else 1)
