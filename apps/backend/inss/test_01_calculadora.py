#!/usr/bin/env python3
"""Teste 1: Validar calculadora INSS"""

import sys
sys.path.insert(0, '.')

from app.services.inss_calculator import INSSCalculator
from app.utils.constants import SAL_CLASSES

print("=" * 70)
print("TESTE 1: CALCULADORA INSS - VALIDAÇÃO DE CÁLCULOS")
print("=" * 70)

calc = INSSCalculator()
testes_passaram = 0
testes_falharam = 0

# Teste 1a: Autônomo Normal
print("\n[1/6] AUTÔNOMO NORMAL (20%)")
print("-" * 70)
try:
    resultado = calc.calcular_contribuinte_individual(2000, "normal")
    print(f"  Valor base: R$ 2.000,00")
    print(f"  Valor calculado: R$ {resultado.valor:,.2f}")
    print(f"  Código GPS: {resultado.codigo_gps}")
    assert resultado.codigo_gps == '1007', f"Código esperado 1007, recebeu {resultado.codigo_gps}"
    assert resultado.valor == 400.0, f"Valor esperado 400.0, recebeu {resultado.valor}"
    print("  ✓ PASSOU")
    testes_passaram += 1
except Exception as e:
    print(f"  ✗ FALHOU: {e}")
    testes_falharam += 1

# Teste 1b: Simplificado
print("\n[2/6] AUTÔNOMO SIMPLIFICADO (11%)")
print("-" * 70)
try:
    resultado = calc.calcular_contribuinte_individual(5000, "simplificado")
    print(f"  Base: Salário Mínimo 2025 = R$ {calc.salario_minimo_2025:,.2f}")
    print(f"  Alíquota: 11%")
    print(f"  Valor calculado: R$ {resultado.valor:,.2f}")
    print(f"  Código GPS: {resultado.codigo_gps}")
    assert resultado.codigo_gps == '1163', f"Código esperado 1163, recebeu {resultado.codigo_gps}"
    valor_esperado = calc.salario_minimo_2025 * 0.11
    assert abs(resultado.valor - valor_esperado) < 0.01, f"Valor esperado {valor_esperado}, recebeu {resultado.valor}"
    print("  ✓ PASSOU")
    testes_passaram += 1
except Exception as e:
    print(f"  ✗ FALHOU: {e}")
    testes_falharam += 1

# Teste 1c: Doméstico
print("\n[3/6] DOMÉSTICO (Tabela Progressiva)")
print("-" * 70)
try:
    resultado = calc.calcular_domestico(1500)
    print(f"  Salário: R$ 1.500,00")
    print(f"  Valor calculado: R$ {resultado.valor:,.2f}")
    print(f"  Código GPS: {resultado.codigo_gps}")
    print(f"  Faixas: {resultado.detalhes['faixas']}")
    assert resultado.codigo_gps == '1503', f"Código esperado 1503, recebeu {resultado.codigo_gps}"
    assert resultado.valor > 0, "Valor deve ser positivo"
    print("  ✓ PASSOU")
    testes_passaram += 1
except Exception as e:
    print(f"  ✗ FALHOU: {e}")
    testes_falharam += 1

# Teste 1d: Complementação
print("\n[4/6] COMPLEMENTAÇÃO (11% → 20% com juros)")
print("-" * 70)
try:
    resultado = calc.calcular_complementacao(["01/2024", "02/2024", "03/2024"], 1000)
    print(f"  Competências: jan, fev, mar 2024")
    print(f"  Valor base: R$ 1.000,00")
    print(f"  Diferença (9%): R$ {resultado.detalhes['diferenca']:,.2f}")
    print(f"  Juros SELIC: R$ {resultado.detalhes['juros']:,.2f}")
    print(f"  Total: R$ {resultado.valor:,.2f}")
    print(f"  Código GPS: {resultado.codigo_gps}")
    assert resultado.codigo_gps == '2010', f"Código esperado 2010, recebeu {resultado.codigo_gps}"
    assert resultado.valor >= 90.0, "Valor deve incluir juros"
    print("  ✓ PASSOU")
    testes_passaram += 1
except Exception as e:
    print(f"  ✗ FALHOU: {e}")
    testes_falharam += 1

# Teste 1e: Produtor Rural
print("\n[5/6] PRODUTOR RURAL (1,5%)")
print("-" * 70)
try:
    resultado = calc.calcular_produtor_rural(100000, segurado_especial=False)
    print(f"  Receita bruta: R$ 100.000,00")
    print(f"  Alíquota: 1,5%")
    print(f"  Valor calculado: R$ {resultado.valor:,.2f}")
    print(f"  Código GPS: {resultado.codigo_gps}")
    assert resultado.codigo_gps == '1120', f"Código esperado 1120, recebeu {resultado.codigo_gps}"
    assert resultado.valor == 1500.0, f"Valor esperado 1500.0, recebeu {resultado.valor}"
    print("  ✓ PASSOU")
    testes_passaram += 1
except Exception as e:
    print(f"  ✗ FALHOU: {e}")
    testes_falharam += 1

# Teste 1f: Facultativo
print("\n[6/6] FACULTATIVO (20%)")
print("-" * 70)
try:
    base = calc.salario_minimo_2025
    valor_esperado = base * 0.20
    codigo = SAL_CLASSES['facultativo']['codigo_gps']
    print(f"  Base: Salário Mínimo 2025 = R$ {base:,.2f}")
    print(f"  Alíquota: 20%")
    print(f"  Valor esperado: R$ {valor_esperado:,.2f}")
    print(f"  Código GPS: {codigo}")
    assert codigo == '1295', f"Código esperado 1295, recebeu {codigo}"
    print("  ✓ PASSOU")
    testes_passaram += 1
except Exception as e:
    print(f"  ✗ FALHOU: {e}")
    testes_falharam += 1

print("\n" + "=" * 70)
print(f"RESULTADO: {testes_passaram} PASSOU(S), {testes_falharam} FALHOU(S)")
print("=" * 70)

if testes_falharam == 0:
    print("✓ TESTE 1 COMPLETO - SUCESSO!")
    sys.exit(0)
else:
    print("✗ TESTE 1 - FALHOU")
    sys.exit(1)
