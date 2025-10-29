#!/usr/bin/env python3
"""
TESTE 2: GERAÇÃO DE PDF (SIMPLES)
Testa diretamente se ReportLab consegue gerar PDFs válidos
"""

import sys
from pathlib import Path
from io import BytesIO
from datetime import datetime, timedelta

# Importar ReportLab
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas

def gerar_pdf_simples(nome: str, valor: float, codigo_gps: str) -> bytes:
    """Gera um PDF simples para teste"""
    
    buffer = BytesIO()
    c = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4
    
    # Cabeçalho
    c.setFont("Helvetica-Bold", 14)
    c.drawString(50, height - 50, "GUIA DA PREVIDÊNCIA SOCIAL - GPS")
    
    # Dados
    c.setFont("Helvetica", 10)
    c.drawString(50, height - 80, f"Contribuinte: {nome}")
    c.drawString(50, height - 100, f"Código GPS: {codigo_gps}")
    c.drawString(50, height - 120, f"Valor: R$ {valor:.2f}")
    c.drawString(50, height - 140, f"Data: {datetime.now().strftime('%d/%m/%Y')}")
    
    # Rodapé
    c.setFont("Helvetica-Oblique", 8)
    c.drawString(50, 50, "Este é um PDF de teste gerado por ReportLab")
    
    c.save()
    return buffer.getvalue()

def test_pdf_generation():
    """Testa geração de PDF"""
    
    print("\n" + "=" * 70)
    print("TESTE 2: GERAÇÃO DE PDF (SIMPLES) - VALIDAÇÃO COM REPORTLAB")
    print("=" * 70 + "\n")
    
    test_cases = [
        {
            "numero": 1,
            "tipo": "AUTÔNOMO",
            "nome": "João da Silva",
            "valor": 400.00,
            "codigo_gps": "1007",
        },
        {
            "numero": 2,
            "tipo": "DOMÉSTICO",
            "nome": "Maria Oliveira",
            "valor": 113.82,
            "codigo_gps": "1503",
        },
        {
            "numero": 3,
            "tipo": "PRODUTOR RURAL",
            "nome": "Pedro Santos",
            "valor": 1500.00,
            "codigo_gps": "1120",
        },
    ]
    
    passed = 0
    failed = 0
    
    # Criar diretório de output
    output_dir = Path(__file__).parent / "test_output"
    output_dir.mkdir(exist_ok=True)
    
    for test_case in test_cases:
        try:
            print(f"[{test_case['numero']}/3] {test_case['tipo']}")
            print("-" * 70)
            
            # Gerar PDF
            pdf_bytes = gerar_pdf_simples(
                test_case['nome'],
                test_case['valor'],
                test_case['codigo_gps']
            )
            
            # Validações
            if not pdf_bytes:
                print(f"  ✗ FALHOU: PDF vazio")
                failed += 1
                continue
            
            if not pdf_bytes.startswith(b"%PDF"):
                print(f"  ✗ FALHOU: Não é PDF válido (magic bytes incorretos)")
                failed += 1
                continue
            
            if len(pdf_bytes) < 500:
                print(f"  ✗ FALHOU: PDF muito pequeno ({len(pdf_bytes)} bytes)")
                failed += 1
                continue
            
            # Salvar arquivo
            filename = f"GPS_{test_case['codigo_gps']}_{test_case['tipo']}.pdf"
            filepath = output_dir / filename
            
            with open(filepath, 'wb') as f:
                f.write(pdf_bytes)
            
            print(f"  Nome: {test_case['nome']}")
            print(f"  Valor: R$ {test_case['valor']:.2f}")
            print(f"  Código GPS: {test_case['codigo_gps']}")
            print(f"  Tamanho: {len(pdf_bytes)} bytes")
            print(f"  Arquivo: {filepath}")
            print(f"  ✓ PASSOU\n")
            
            passed += 1
            
        except Exception as e:
            print(f"  ✗ FALHOU: {str(e)}\n")
            failed += 1
    
    # Resultado final
    print("=" * 70)
    print(f"RESULTADO: {passed} PASSOU(S), {failed} FALHOU(S)")
    print("=" * 70)
    
    if failed == 0:
        print("✓ TESTE 2 COMPLETO - SUCESSO!")
        return True
    else:
        print("✗ TESTE 2 COM FALHAS")
        return False

if __name__ == "__main__":
    success = test_pdf_generation()
    sys.exit(0 if success else 1)
