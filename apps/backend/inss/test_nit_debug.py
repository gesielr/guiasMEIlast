"""
Debug do processamento do NIT no código de barras GPS
"""

# Simular a geração
nit = "27317621955"
codigo_pagamento = "1163"
valor = 166.98
competencia = "11/2025"

# 1. Valor
valor_centavos = int(round(valor * 100))
valor_str = str(valor_centavos).zfill(11)
print(f"Valor: {valor_str}")

# 2. ID valor
if valor_centavos < 10000:
    id_valor = "7"
elif valor_centavos < 100000:
    id_valor = "8"
else:
    id_valor = "9"
print(f"ID Valor: {id_valor}")

# 3. NIT
nit_limpo = ''.join(filter(str.isdigit, nit))
nit_10_digitos = nit_limpo[:10]  # Remove último dígito
digito_verificador_nit = nit_limpo[10]
print(f"NIT limpo: {nit_limpo}")
print(f"NIT 10 dígitos: {nit_10_digitos}")
print(f"Dígito verificador: {digito_verificador_nit}")

# 4. Competência
mes, ano = competencia.split('/')
competencia_especial = ano + mes.zfill(2) + "3"
print(f"Competência: {competencia_especial}")

# 5. Campo livre
campo_livre = digito_verificador_nit + "000"
print(f"Campo livre: {campo_livre}")

# 6. Montar código SEM DV
codigo_sem_dv = (
    "8" +                           # Pos 0
    "5" +                           # Pos 1
    id_valor +                      # Pos 2
    valor_str +                     # Pos 3-13 (11 dígitos)
    "0270" +                        # Pos 14-17
    codigo_pagamento.zfill(4) +     # Pos 18-21
    "0001" +                        # Pos 22-25
    nit_10_digitos +                # Pos 26-35 (10 dígitos)
    competencia_especial +          # Pos 36-42 (7 dígitos)
    campo_livre                     # Pos 43-46 (4 dígitos)
)

print(f"\nCódigo SEM DV ({len(codigo_sem_dv)} dígitos):")
print(codigo_sem_dv)
print("\nPosições detalhadas:")
print(f"[0-2]   Produto+Seg+ID: {codigo_sem_dv[0:3]}")
print(f"[3-13]  Valor:          {codigo_sem_dv[3:14]}")
print(f"[14-17] Campo GPS:      {codigo_sem_dv[14:18]}")
print(f"[18-21] Cód Pagamento:  {codigo_sem_dv[18:22]}")
print(f"[22-25] Campo GPS:      {codigo_sem_dv[22:26]}")
print(f"[26-35] NIT:            {codigo_sem_dv[26:36]}")
print(f"[36-42] Competência:    {codigo_sem_dv[36:43]}")
print(f"[43-46] Campo Livre:    {codigo_sem_dv[43:47]}")

# 7. Inserir DV na posição 3 (após "858")
dv = "1"  # Simulado
codigo_completo = codigo_sem_dv[:3] + dv + codigo_sem_dv[3:]
print(f"\nCódigo COMPLETO ({len(codigo_completo)} dígitos):")
print(codigo_completo)

# 8. Linha digitável (primeiros 44)
codigo_44 = codigo_completo[:44]
print(f"\nCódigo 44 para linha digitável:")
print(codigo_44)

# Dividir em 4 campos de 11
print(f"\nCampos da linha digitável:")
for i in range(0, 44, 11):
    campo = codigo_44[i:i+11]
    print(f"Campo {(i//11)+1}: {campo}")

# Verificar onde está o NIT no código completo
print(f"\nVerificando NIT no código completo:")
print(f"Posições 27-37 (após DV): {codigo_completo[27:37]}")
print(f"Esperado: {nit_10_digitos}")
print(f"Match: {codigo_completo[27:37] == nit_10_digitos}")
