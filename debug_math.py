import sys
import os

sys.path.append(os.getcwd())

from apps.backend.inss.app.services.codigo_barras_gps import CodigoBarrasGPS

def calc_inline(code):
    seq = [2, 3, 4, 5, 6, 7, 8, 9]
    soma = 0
    details = []
    for i, d in enumerate(reversed(code)):
        mult = seq[i % 8]
        prod = int(d) * mult
        soma += prod
        details.append(f"{d}*{mult}={prod}")
    
    resto = soma % 11
    dv = 11 - resto
    if dv >= 10: dv_str = "1"
    else: dv_str = str(dv)
    
    return dv_str, soma, details

# User Data Construction
nit = "27317621955"
valor = 303.60
codigo_pagamento = "1007"
competencia = "11/2025"

# Generate via Class
resultado = CodigoBarrasGPS.gerar(codigo_pagamento, competencia, valor, nit)
code_class = resultado['codigo_barras']
dv_class = code_class[3]
code_sem_dv_class = code_class[:3] + code_class[4:]

print(f"Class Generated Barcode: {code_class}")
print(f"Class Generated DV: {dv_class}")
print(f"Class Code Sem DV: {code_sem_dv_class}")

# Calculate Inline
dv_inline, soma_inline, details = calc_inline(code_sem_dv_class)
print(f"Inline Calculated DV: {dv_inline}")
print(f"Inline Soma: {soma_inline}")
# print(f"Details: {details}")

if dv_class != dv_inline:
    print("DISCREPANCY DETECTED!")
else:
    print("MATCH!")
