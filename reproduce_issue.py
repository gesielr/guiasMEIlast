import sys
import os

# Add the project root to sys.path
sys.path.append(os.getcwd())

try:
    from apps.backend.inss.app.services.codigo_barras_gps import CodigoBarrasGPS
except ImportError as e:
    print(f"Import Error: {e}")
    sys.exit(1)

# Test Data
# 858[DV]00000030360...
# 858 + 00000030360 + 0270 + 1007 + 0001 + 1280018672 + 2025113
codigo_sem_dv = "858" + "00000030360" + "0270" + "1007" + "0001" + "1280018672" + "2025113"

print(f"Código sem DV: {codigo_sem_dv}")
print(f"Length: {len(codigo_sem_dv)}")

try:
    dv_calculated = CodigoBarrasGPS.calcular_dv_modulo11(codigo_sem_dv)
    print(f"DV Calculated by Fixed Code: {dv_calculated}")

    codigo_completo = codigo_sem_dv[:3] + dv_calculated + codigo_sem_dv[3:]
    print(f"Barcode Fixed: {codigo_completo}")

    if dv_calculated == "8":
        print("SUCCESS: DV is 8 as expected.")
    else:
        print(f"FAILURE: DV is {dv_calculated}, expected 8.")

except Exception as e:
    print(f"Error during calculation: {e}")
