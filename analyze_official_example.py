def calc_mod11_rl(code):
    seq = [2, 3, 4, 5, 6, 7, 8, 9]
    soma = 0
    for i, d in enumerate(reversed(code)):
        soma += int(d) * seq[i % 8]
    resto = soma % 11
    dv = 11 - resto
    if dv >= 10: return "1" # Or 0?
    return str(dv)

def calc_mod11_lr(code):
    seq = [2, 3, 4, 5, 6, 7, 8, 9] * 6
    soma = sum(int(d) * seq[i] for i, d in enumerate(code))
    resto = soma % 11
    if resto == 0: return "0"
    elif resto == 1: return "1"
    else: return str(11 - resto)

def calc_mod10_rl(code):
    soma = 0
    mult = 2
    for d in reversed(code):
        prod = int(d) * mult
        if prod >= 10: prod = (prod // 10) + (prod % 10)
        soma += prod
        mult = 1 if mult == 2 else 2
    resto = soma % 10
    return "0" if resto == 0 else str(10 - resto)

# Official Example Data
# Barcode: 85810000003036002701007000128001867222025113
# Without DV (Pos 4 removed):
# 858 + 0000003036002701007000128001867222025113
code_official = "858" + "0000003036002701007000128001867222025113"
expected_dv = "1"

print(f"Testing Official Code: {code_official}")
print(f"Expected DV: {expected_dv}")

print(f"Mod 11 R-L: {calc_mod11_rl(code_official)}")
print(f"Mod 11 L-R: {calc_mod11_lr(code_official)}")
print(f"Mod 10 R-L: {calc_mod10_rl(code_official)}")

# User's Rejected Data (reconstructed)
# 858 + 00000030360 + 0270 + 1007 + 0001 + 19552025113... wait
# User's NIT: 19552025113-2 ? No, that's the block.
# User's NIT from logs: 27317621955
# Barcode NIT part (10 digits, skipping first): 7317621955
# Competence: 2025113
# Code: 858 + ...
# 858 + 00000030360 + 0270 + 1007 + 0001 + 7317621955 + 2025113
code_user = "858" + "00000030360" + "0270" + "1007" + "0001" + "7317621955" + "2025113"
print(f"\nTesting User Code: {code_user}")
print(f"Mod 11 R-L: {calc_mod11_rl(code_user)}")
print(f"Mod 11 L-R: {calc_mod11_lr(code_user)}")
print(f"Mod 10 R-L: {calc_mod10_rl(code_user)}")
