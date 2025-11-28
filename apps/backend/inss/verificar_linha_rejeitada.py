#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Verifica a linha digitavel rejeitada pelo banco
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

from app.services.codigo_barras_gps import CodigoBarrasGPS

def analisar_linha_rejeitada():
    """
    Analisa a linha digitavel: 85800000003-8 03600270100-7 70001731762-7 19552025113-2
    """
    print("=" * 100)
    print("ANALISE DA LINHA DIGITAVEL REJEITADA PELO BANCO")
    print("=" * 100)

    linha_rejeitada = "85800000003-8 03600270100-7 70001731762-7 19552025113-2"
    print(f"\nLinha rejeitada: {linha_rejeitada}")

    # Separar campos
    campos_str = linha_rejeitada.split()
    print(f"\nCampos separados:")
    for i, campo in enumerate(campos_str, 1):
        campo_limpo = campo.replace('-', '')
        dados = campo_limpo[:-1]  # Sem DV
        dv = campo_limpo[-1]       # DV
        print(f"  Campo {i}: {dados} | DV: {dv} | Completo: {campo}")

    # Reconstituir codigo de barras (sem os DVs de campo)
    codigo_barras_sem_dvs = ""
    for campo in campos_str:
        campo_limpo = campo.replace('-', '')
        dados = campo_limpo[:-1]  # Pegar só os dados, sem o DV do campo
        codigo_barras_sem_dvs += dados

    print(f"\nCodigo de barras reconstituido (sem DVs de campo): {codigo_barras_sem_dvs}")
    print(f"Tamanho: {len(codigo_barras_sem_dvs)} digitos")

    # Verificar ID de Valor
    if len(codigo_barras_sem_dvs) >= 3:
        id_valor = codigo_barras_sem_dvs[2]
        print(f"\nID de Valor (pos 3): {id_valor}")

        if id_valor == '8':
            print("  Tipo: Arrecadacao (R$ 100,00 - R$ 999,99)")
            print("  Metodo DV correto: Modulo 11")
        elif id_valor == '9':
            print("  Tipo: Arrecadacao (R$ 1.000,00+)")
            print("  Metodo DV correto: Modulo 11")
        elif id_valor == '7':
            print("  Tipo: Convenio (R$ 10,00 - R$ 99,99)")
            print("  Metodo DV correto: Modulo 10")
        elif id_valor == '6':
            print("  Tipo: Convenio (R$ 0,01 - R$ 9,99)")
            print("  Metodo DV correto: Modulo 10")

    # Verificar DVs de cada campo com Modulo 11
    print(f"\n{'-' * 100}")
    print("VERIFICACAO DOS DVS - MODULO 11")
    print(f"{'-' * 100}")

    campos_limpos = []
    for campo in campos_str:
        campo_limpo = campo.replace('-', '')
        campos_limpos.append(campo_limpo)

    erros = []
    for i, campo_completo in enumerate(campos_limpos, 1):
        dados = campo_completo[:-1]  # 11 digitos
        dv_informado = campo_completo[-1]

        # Calcular DV Modulo 11
        dv_calculado_mod11 = CodigoBarrasGPS.calcular_dv_modulo11_bloco(dados)

        # Calcular DV Modulo 10 para comparacao
        dv_calculado_mod10 = CodigoBarrasGPS.calcular_dv_modulo10(dados)

        match_mod11 = "OK" if dv_informado == dv_calculado_mod11 else "ERRO"
        match_mod10 = "OK" if dv_informado == dv_calculado_mod10 else "ERRO"

        print(f"\nCampo {i}: {dados}")
        print(f"  DV informado:      {dv_informado}")
        print(f"  DV Modulo 11:      {dv_calculado_mod11} ({match_mod11})")
        print(f"  DV Modulo 10:      {dv_calculado_mod10} ({match_mod10})")

        if dv_informado != dv_calculado_mod11:
            erros.append(f"Campo {i}: Esperado Mod11={dv_calculado_mod11}, Recebido={dv_informado}")

    # Extrair informacoes do codigo
    print(f"\n{'-' * 100}")
    print("DECOMPOSICAO DO CODIGO")
    print(f"{'-' * 100}")

    if len(codigo_barras_sem_dvs) >= 44:
        print(f"\nProduto:     {codigo_barras_sem_dvs[0]} (pos 1)")
        print(f"Segmento:    {codigo_barras_sem_dvs[1]} (pos 2)")
        print(f"ID Valor:    {codigo_barras_sem_dvs[2]} (pos 3)")
        print(f"DV Geral:    {codigo_barras_sem_dvs[3]} (pos 4)")
        print(f"Valor:       {codigo_barras_sem_dvs[4:15]} (pos 5-15) = R$ {int(codigo_barras_sem_dvs[4:15])/100:.2f}")
        print(f"GPS fixo:    {codigo_barras_sem_dvs[15:19]} (pos 16-19)")
        print(f"Codigo pag:  {codigo_barras_sem_dvs[19:23]} (pos 20-23)")
        print(f"GPS fixo:    {codigo_barras_sem_dvs[23:27]} (pos 24-27)")
        print(f"NIT (10):    {codigo_barras_sem_dvs[27:37]} (pos 28-37)")
        print(f"Competencia: {codigo_barras_sem_dvs[37:44]} (pos 38-44)")

    # Resultado
    print(f"\n{'=' * 100}")
    print("RESULTADO DA ANALISE")
    print(f"{'=' * 100}")

    if erros:
        print(f"\nERROS ENCONTRADOS ({len(erros)}):")
        for erro in erros:
            print(f"  - {erro}")
        print(f"\nCONCLUSAO: Os DVs NAO estao corretos para Modulo 11!")
    else:
        print(f"\nTodos os DVs estao CORRETOS para Modulo 11!")
        print(f"\nPOSSIVEIS MOTIVOS DE REJEICAO PELO BANCO:")
        print(f"  1. Codigo de barras I2of5 nao esta sendo gerado corretamente no PDF")
        print(f"  2. Banco esperando estrutura diferente (YYYYMM em vez de YYYYMM3)")
        print(f"  3. NIT nao esta registrado no sistema INSS/Receita Federal")
        print(f"  4. Competencia ainda nao disponivel para pagamento")
        print(f"  5. Codigo de pagamento invalido ou incompativel com o NIT")


def gerar_codigo_correto():
    """
    Gera o codigo correto para comparacao
    """
    print(f"\n\n{'=' * 100}")
    print("GERANDO CODIGO CORRETO PARA COMPARACAO")
    print(f"{'=' * 100}")

    # Baseado nos dados da linha rejeitada:
    # Valor: 00000000360 = R$ 3.60
    # Codigo: 1007
    # NIT: 7317621955
    # Competencia: 2025113

    print(f"\nDados extraidos da linha rejeitada:")
    print(f"  Valor: R$ 3.60")
    print(f"  Codigo: 1007")
    print(f"  NIT: 27317621955 (10 dig = 7317621955)")
    print(f"  Competencia: 11/2025")

    resultado = CodigoBarrasGPS.gerar(
        codigo_pagamento="1007",
        competencia="11/2025",
        valor=3.60,
        nit="27317621955"
    )

    print(f"\n{'-' * 100}")
    print("CODIGO GERADO PELO SISTEMA:")
    print(f"{'-' * 100}")
    print(f"Codigo de barras: {resultado['codigo_barras']}")
    print(f"Linha digitavel:  {resultado['linha_digitavel']}")

    print(f"\n{'-' * 100}")
    print("COMPARACAO:")
    print(f"{'-' * 100}")
    print(f"Linha rejeitada: 85800000003-8 03600270100-7 70001731762-7 19552025113-2")
    print(f"Linha gerada:    {resultado['linha_digitavel']}")

    if resultado['linha_digitavel'] == "85800000003-8 03600270100-7 70001731762-7 19552025113-2":
        print(f"\nAS LINHAS SAO IDENTICAS!")
    else:
        print(f"\nAS LINHAS SAO DIFERENTES!")


if __name__ == "__main__":
    try:
        analisar_linha_rejeitada()
        print("\n")
        gerar_codigo_correto()

        print(f"\n{'=' * 100}")
        print("ANALISE CONCLUIDA")
        print(f"{'=' * 100}")

    except Exception as e:
        print(f"\nERRO: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
