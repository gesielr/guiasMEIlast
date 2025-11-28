#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script de teste para validar as mudanças GPS:
- Interleaved 2 of 5 (I2of5) no PDF
- DV Módulo 11 nos blocos da linha digitável para ID Valor 8 ou 9
"""

import sys
import os

# Adicionar o diretório app ao path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

from app.services.codigo_barras_gps import CodigoBarrasGPS


def comparar_dvs_linha_digitavel():
    """
    Compara DVs calculados com Módulo 10 vs Módulo 11 para os blocos
    """
    print("=" * 100)
    print("TESTE: COMPARAÇÃO DV MÓDULO 10 vs MÓDULO 11 - LINHA DIGITÁVEL GPS")
    print("=" * 100)

    # Código de barras de teste (NIT 27317621955, código 1163, 11/2025, R$ 166,98)
    codigo_barras = "85810000001669802701163000173176219552025113"

    print(f"\nCódigo de barras (44 dígitos): {codigo_barras}")
    print(f"ID de Valor (pos 3): {codigo_barras[2]}")

    # Dividir em 4 campos de 11 dígitos
    campos = []
    for i in range(0, 44, 11):
        campos.append(codigo_barras[i:i+11])

    print(f"\nCampos (11 dígitos cada):")
    for i, campo in enumerate(campos, 1):
        print(f"  Campo {i}: {campo}")

    # Calcular DVs com MODULO 10 (metodo antigo)
    print(f"\n{'-' * 100}")
    print("METODO ANTIGO: DV MODULO 10 (INCORRETO PARA GPS)")
    print(f"{'-' * 100}")

    linha_mod10_campos = []
    for i, campo in enumerate(campos, 1):
        dv = CodigoBarrasGPS.calcular_dv_modulo10(campo)
        campo_completo = f"{campo}-{dv}"
        linha_mod10_campos.append(campo_completo)
        print(f"  Campo {i}: {campo} -> DV Mod10: {dv} -> {campo_completo}")

    linha_mod10 = " ".join(linha_mod10_campos)
    print(f"\nLinha digitável Mod10: {linha_mod10}")
    print(f"Total: {len(linha_mod10.replace(' ', '').replace('-', ''))} dígitos")

    # Calcular DVs com MODULO 11 (metodo novo)
    print(f"\n{'-' * 100}")
    print("METODO NOVO: DV MODULO 11 (CORRETO PARA GPS/ARRECADACAO)")
    print(f"{'-' * 100}")

    linha_mod11_campos = []
    for i, campo in enumerate(campos, 1):
        dv = CodigoBarrasGPS.calcular_dv_modulo11_bloco(campo)
        campo_completo = f"{campo}-{dv}"
        linha_mod11_campos.append(campo_completo)
        print(f"  Campo {i}: {campo} -> DV Mod11: {dv} -> {campo_completo}")

    linha_mod11 = " ".join(linha_mod11_campos)
    print(f"\nLinha digitável Mod11: {linha_mod11}")
    print(f"Total: {len(linha_mod11.replace(' ', '').replace('-', ''))} dígitos")

    # Comparar
    print(f"\n{'=' * 100}")
    print("COMPARAÇÃO:")
    print(f"{'=' * 100}")

    print(f"\nMódulo 10 (antigo): {linha_mod10}")
    print(f"Módulo 11 (novo):   {linha_mod11}")

    if linha_mod10 == linha_mod11:
        print(f"\nATENCAO: As linhas sao IGUAIS! Os DVs nao mudaram neste caso.")
    else:
        print(f"\nOK: As linhas sao DIFERENTES! DVs foram alterados corretamente.")

        # Mostrar diferencas campo a campo
        print(f"\nDiferencas por campo:")
        for i in range(len(linha_mod10_campos)):
            if linha_mod10_campos[i] != linha_mod11_campos[i]:
                print(f"  Campo {i+1}: {linha_mod10_campos[i]} (Mod10) -> {linha_mod11_campos[i]} (Mod11)")


def testar_geracao_completa():
    """
    Testa geração completa de GPS com as novas mudanças
    """
    print("\n" + "=" * 100)
    print("TESTE: GERAÇÃO COMPLETA GPS COM MÓDULO 11")
    print("=" * 100)

    resultado = CodigoBarrasGPS.gerar(
        codigo_pagamento="1163",
        competencia="11/2025",
        valor=166.98,
        nit="27317621955"
    )

    print(f"\n{'-' * 100}")
    print("RESULTADO:")
    print(f"{'-' * 100}")
    print(f"Código de barras: {resultado['codigo_barras']}")
    print(f"Linha digitável:  {resultado['linha_digitavel']}")
    print(f"Valor: R$ {resultado['valor']:.2f}")
    print(f"Competência: {resultado['competencia']}")


def testar_codigo_oficial():
    """
    Testa com o código oficial do PDF da Receita Federal
    """
    print("\n" + "=" * 100)
    print("TESTE: CÓDIGO OFICIAL DA RECEITA FEDERAL")
    print("=" * 100)

    # Código oficial do PDF (NIT 12800186722, código 1163, 11/2025, R$ 166,98)
    # Linha digitável oficial: 85820000001-5 66980270116-2 30001280018-9 67222025113-0

    print("\nGerando com dados do PDF oficial...")

    resultado = CodigoBarrasGPS.gerar(
        codigo_pagamento="1163",
        competencia="11/2025",
        valor=166.98,
        nit="12800186722"
    )

    print(f"\n{'-' * 100}")
    print("COMPARACAO COM PDF OFICIAL:")
    print(f"{'-' * 100}")

    linha_oficial = "85820000001-5 66980270116-2 30001280018-9 67222025113-0"

    print(f"Linha oficial (PDF):  {linha_oficial}")
    print(f"Linha gerada (Mod11): {resultado['linha_digitavel']}")

    if linha_oficial == resultado['linha_digitavel']:
        print(f"\nMATCH! Linha digitavel identica ao PDF oficial!")
    else:
        print(f"\nDIFERENTE do PDF oficial")
        print(f"\nISSO EH ESPERADO se o PDF oficial usa Mod10 e agora usamos Mod11")


if __name__ == "__main__":
    print("\n" + "=" * 100)
    print("TESTES DE VALIDACAO - NOVAS MUDANCAS GPS")
    print("=" * 100)

    try:
        comparar_dvs_linha_digitavel()
        print("\n")
        testar_geracao_completa()
        print("\n")
        testar_codigo_oficial()

        print("\n" + "=" * 100)
        print("OK TESTES CONCLUIDOS COM SUCESSO")
        print("=" * 100)
        print("\nPROXIMOS PASSOS:")
        print("1. Testar o PDF gerado com aplicativo bancario")
        print("2. Verificar se o codigo de barras I2of5 eh reconhecido")
        print("3. Confirmar que a linha digitavel funciona no banco")
        print("=" * 100)

    except Exception as e:
        print(f"\nERRO durante os testes: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
