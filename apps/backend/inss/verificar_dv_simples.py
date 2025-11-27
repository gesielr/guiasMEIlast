#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script de Verificacao do Digito Verificador (DV) - GPS
Verifica manualmente se o DV calculado esta correto
"""

def calcular_dv_modulo11(codigo_sem_dv: str) -> str:
    """
    Calcula DV Modulo 11 para GPS (posicao 4 do codigo de barras)
    GPS tem 44 digitos: 43 sem DV + 1 DV na posicao 4
    """
    if len(codigo_sem_dv) != 43:
        raise ValueError(f"ERRO: Codigo sem DV deve ter 43 digitos, tem {len(codigo_sem_dv)}")

    # Multiplicadores: 2, 3, 4, 5, 6, 7, 8, 9 (repetindo)
    sequencia = [2, 3, 4, 5, 6, 7, 8, 9] * 6

    print(f"\nCALCULO DO DV MODULO 11")
    print(f"=" * 80)
    print(f"Codigo sem DV ({len(codigo_sem_dv)} digitos):")
    print(f"{codigo_sem_dv}\n")

    print(f"{'Pos':<5} | {'Digito':<7} | {'Mult':<5} | {'Produto':<8}")
    print(f"-" * 40)

    soma = 0
    for i, digito in enumerate(codigo_sem_dv):
        mult = sequencia[i]
        produto = int(digito) * mult
        soma += produto
        print(f"{i+1:<5} | {digito:<7} | {mult:<5} | {produto:<8}")

    print(f"-" * 40)
    print(f"SOMA TOTAL: {soma}")

    resto = soma % 11
    print(f"RESTO (soma % 11): {resto}")

    if resto == 0:
        dv = "0"
        print(f"Resto = 0 -> DV = 0")
    elif resto == 1:
        dv = "1"
        print(f"Resto = 1 -> DV = 1")
    else:
        dv = str(11 - resto)
        print(f"Resto = {resto} -> DV = 11 - {resto} = {dv}")

    print(f"\nDIGITO VERIFICADOR CALCULADO: {dv}")
    print(f"=" * 80)

    return dv


def verificar_codigo_completo(codigo_completo: str):
    """
    Verifica se o codigo completo tem o DV correto
    """
    if len(codigo_completo) != 44:
        raise ValueError(f"ERRO: Codigo completo deve ter 44 digitos, tem {len(codigo_completo)}")

    print(f"\nVERIFICACAO DO CODIGO COMPLETO")
    print(f"=" * 80)
    print(f"Codigo completo ({len(codigo_completo)} digitos):")
    print(f"{codigo_completo}")
    print()

    # Decompor o codigo
    produto = codigo_completo[0]
    segmento = codigo_completo[1]
    id_valor = codigo_completo[2]
    dv_informado = codigo_completo[3]
    valor = codigo_completo[4:15]
    gps1 = codigo_completo[15:19]
    codigo = codigo_completo[19:23]
    gps2 = codigo_completo[23:27]
    nit = codigo_completo[27:37]
    competencia = codigo_completo[37:44]

    print(f"DECOMPOSICAO:")
    print(f"  Produto:     {produto} (pos 1)")
    print(f"  Segmento:    {segmento} (pos 2)")
    print(f"  ID Valor:    {id_valor} (pos 3)")
    print(f"  DV:          {dv_informado} (pos 4) <- VERIFICAR")
    print(f"  Valor:       {valor} (pos 5-15, {len(valor)} digitos)")
    print(f"  GPS fixo:    {gps1} (pos 16-19)")
    print(f"  Codigo:      {codigo} (pos 20-23)")
    print(f"  GPS fixo:    {gps2} (pos 24-27)")
    print(f"  NIT (10):    {nit} (pos 28-37, {len(nit)} digitos)")
    print(f"  Competencia: {competencia} (pos 38-44, {len(competencia)} digitos)")
    print()

    # Remover DV (posicao 4)
    codigo_sem_dv = codigo_completo[:3] + codigo_completo[4:]

    print(f"Codigo SEM DV (removendo posicao 4):")
    print(f"{codigo_sem_dv} ({len(codigo_sem_dv)} digitos)")

    # Calcular DV
    dv_calculado = calcular_dv_modulo11(codigo_sem_dv)

    # Comparar
    print(f"\nRESULTADO:")
    print(f"  DV informado:  {dv_informado}")
    print(f"  DV calculado:  {dv_calculado}")

    if dv_informado == dv_calculado:
        print(f"\nOK! DV CORRETO! O codigo esta matematicamente valido.")
    else:
        print(f"\nERRO! DV INCORRETO! Esperado: {dv_calculado}, Recebido: {dv_informado}")

    print(f"=" * 80)

    return dv_informado == dv_calculado


if __name__ == "__main__":
    # Codigo gerado para NIT 27317621955
    print("\n" + "=" * 80)
    print("VERIFICACAO DO CODIGO GPS GERADO")
    print("NIT: 27317621955 | Codigo: 1163 | Competencia: 11/2025 | Valor: R$ 166,98")
    print("=" * 80)

    codigo_gerado = "85810000001669802701163000173176219552025113"

    if verificar_codigo_completo(codigo_gerado):
        print("\nCONCLUSAO: O codigo esta correto!")
        print("   Se o banco nao reconhece, pode ser:")
        print("   1. NIT nao registrado no sistema INSS")
        print("   2. Competencia ainda nao disponivel para pagamento")
        print("   3. Banco nao aceita pagamento de GPS por este canal")
    else:
        print("\nCONCLUSAO: O codigo tem erro no DV!")
        print("   Necessario corrigir o algoritmo de calculo do DV.")

    print()

    # Comparar com codigo oficial
    print("\n" + "=" * 80)
    print("VERIFICACAO DO CODIGO OFICIAL (PARA COMPARACAO)")
    print("NIT: 128.00186.72-2 | Codigo: 1163 | Competencia: 11/2025 | Valor: R$ 166,98")
    print("=" * 80)

    codigo_oficial = "858200000016698027011630001280018672220251113"
    verificar_codigo_completo(codigo_oficial)
    print()
