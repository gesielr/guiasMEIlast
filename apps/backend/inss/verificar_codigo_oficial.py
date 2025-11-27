#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Verificacao do codigo oficial do PDF da Receita Federal
"""

def calcular_dv_modulo11(codigo_sem_dv: str) -> str:
    """Calcula DV Modulo 11"""
    if len(codigo_sem_dv) != 43:
        raise ValueError(f"Codigo sem DV deve ter 43 digitos, tem {len(codigo_sem_dv)}")

    sequencia = [2, 3, 4, 5, 6, 7, 8, 9] * 6
    soma = sum(int(d) * sequencia[i] for i, d in enumerate(codigo_sem_dv))
    resto = soma % 11

    if resto == 0:
        return "0"
    elif resto == 1:
        return "1"
    else:
        return str(11 - resto)


# Codigo oficial do PDF
codigo_oficial = "858200000016698027011630001280018672220251113"

print("=" * 80)
print("VERIFICACAO CODIGO OFICIAL - GPS 1163")
print("NIT: 128.00186.72-2 | Codigo: 1163 | Competencia: 11/2025 | Valor: R$ 166,98")
print("=" * 80)
print(f"\nCodigo completo: {codigo_oficial}")
print(f"Tamanho: {len(codigo_oficial)} digitos")

# Remover DV (posicao 4)
codigo_sem_dv = codigo_oficial[:3] + codigo_oficial[4:]
print(f"\nCodigo sem DV: {codigo_sem_dv}")
print(f"Tamanho: {len(codigo_sem_dv)} digitos")

# Calcular DV
dv_informado = codigo_oficial[3]
dv_calculado = calcular_dv_modulo11(codigo_sem_dv)

print(f"\nDV informado:  {dv_informado}")
print(f"DV calculado:  {dv_calculado}")

if dv_informado == dv_calculado:
    print("\nOK! Codigo oficial tambem esta correto!")
else:
    print(f"\nERRO! DV incorreto no codigo oficial!")

print("=" * 80)
