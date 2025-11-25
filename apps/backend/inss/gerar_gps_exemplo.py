"""
Script para gerar uma GPS de exemplo usando o gerador completo.
Execute: python gerar_gps_exemplo.py
"""

import sys
from pathlib import Path

# Adicionar o diretório raiz ao path
sys.path.insert(0, str(Path(__file__).parent))

from app.services.pdf_generator_completo import GPSGeneratorCompleto
from datetime import datetime, timedelta


def gerar_gps_exemplo():
    """Gera uma GPS de exemplo com dados fictícios."""
    
    print("=" * 80)
    print("GERAÇÃO DE GPS DE EXEMPLO")
    print("=" * 80)
    
    # Dados do usuário (exemplo)
    dados_usuario = {
        "nome": "Carlos Gesiel Rebelo",
        "cpf": "12345678901",
        "nit": "12345678901",
        "telefone": "+55 48 91589-9495",
        "endereco": "Rua Exemplo, 123 - Centro - Florianópolis/SC - CEP 88000-000",
    }
    
    # Dados da contribuição (exemplo)
    competencia = "11/2025"
    vencimento = datetime.now() + timedelta(days=15)
    
    dados_contribuicao = {
        "codigo_gps": "1007",  # Autônomo Normal
        "competencia": competencia,
        "valor": 400.00,
        "valor_outras_entidades": 0.0,
        "valor_multa_juros": 0.0,
        "vencimento": vencimento,
    }
    
    print("\n[DADOS DO USUÁRIO]")
    print(f"  Nome: {dados_usuario['nome']}")
    print(f"  CPF: {dados_usuario['cpf']}")
    print(f"  NIT: {dados_usuario['nit']}")
    print(f"  Telefone: {dados_usuario['telefone']}")
    print(f"  Endereço: {dados_usuario['endereco']}")
    
    print("\n[DADOS DA CONTRIBUIÇÃO]")
    print(f"  Código GPS: {dados_contribuicao['codigo_gps']}")
    print(f"  Competência: {dados_contribuicao['competencia']}")
    print(f"  Valor: R$ {dados_contribuicao['valor']:.2f}")
    print(f"  Vencimento: {vencimento.strftime('%d/%m/%Y')}")
    
    # Gerar GPS
    print("\n[GERAÇÃO] Gerando PDF da GPS...")
    try:
        gerador = GPSGeneratorCompleto()
        pdf_bytes = gerador.criar_gps_completa(dados_usuario, dados_contribuicao)
        
        # Salvar arquivo
        output_path = Path(__file__).parent / "GPS_EXEMPLO.pdf"
        with open(output_path, "wb") as f:
            f.write(pdf_bytes)
        
        print(f"  ✅ GPS gerada com sucesso!")
        print(f"  📄 Arquivo salvo em: {output_path}")
        print(f"  📊 Tamanho: {len(pdf_bytes)} bytes")
        
        # Calcular código de barras
        codigo_barras = gerador.calcular_codigo_barras(
            dados_contribuicao["codigo_gps"],
            dados_contribuicao["competencia"],
            dados_contribuicao["valor"]
        )
        print(f"\n[CÓDIGO DE BARRAS]")
        print(f"  Código completo: {codigo_barras}")
        print(f"  Formato: {codigo_barras[:4]} {codigo_barras[4:10]} {codigo_barras[10:]}")
        
        return True
        
    except Exception as e:
        print(f"  ❌ Erro ao gerar GPS: {e}")
        import traceback
        print(traceback.format_exc())
        return False


if __name__ == "__main__":
    sucesso = gerar_gps_exemplo()
    
    print("\n" + "=" * 80)
    if sucesso:
        print("✅ GPS DE EXEMPLO GERADA COM SUCESSO")
        print("\nPróximos passos:")
        print("1. Abra o arquivo GPS_EXEMPLO.pdf")
        print("2. Verifique se todos os campos estão preenchidos corretamente")
        print("3. Compare com o modelo oficial em app/models/Modelo de GPS.pdf")
    else:
        print("❌ FALHA AO GERAR GPS DE EXEMPLO")
    print("=" * 80)

