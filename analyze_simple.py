def calc_mod11_rl(code):
    seq = [2, 3, 4, 5, 6, 7, 8, 9]
    soma = 0
    for i, d in enumerate(reversed(code)):
        soma += int(d) * seq[i % 8]
    resto = soma % 11
    dv = 11 - resto
    if dv >= 10: return "1"
    return str(dv)

# Official Data
# Barcode without DV: 858 + 00000030360 + 0270 + 1007 + 0001 + 2800186722 + 2025113
code_official = "858" + "00000030360" + "0270" + "1007" + "0001" + "2800186722" + "2025113"

# User Data
# Barcode without DV: 858 + 00000030360 + 0270 + 1007 + 0001 + 7317621955 + 2025113
code_user = "858" + "00000030360" + "0270" + "1007" + "0001" + "7317621955" + "2025113"

print("--- OFFICIAL ---")
print(f"Code: {code_official}")
print(f"Mod11RL: {calc_mod11_rl(code_official)}")

print("\n--- USER ---")
print(f"Code: {code_user}")
print(f"Mod11RL: {calc_mod11_rl(code_user)}")
