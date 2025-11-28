import sys
import os
import asyncio

# Add the project root to sys.path
sys.path.append(os.getcwd())

try:
    from apps.backend.inss.app.services.codigo_barras_gps import CodigoBarrasGPS
    from apps.backend.inss.app.services.gps_pdf_generator_oficial import GPSPDFGeneratorOficial
except ImportError as e:
    print(f"Import Error: {e}")
    sys.exit(1)

async def main():
    # Data from Log
    # [INSS] Usuario identificado: id=..., pis=27317621955
    # Valor: 303.60 (Calculated from 1518 * 0.20)
    # Code: 1007
    # Competence: 11/2025
    
    nit = "27317621955"
    valor = 303.60
    codigo_pagamento = "1007"
    competencia = "11/2025"
    
    print(f"--- Generating GPS ---")
    print(f"NIT: {nit}")
    print(f"Valor: {valor}")
    print(f"Codigo: {codigo_pagamento}")
    print(f"Competencia: {competencia}")
    
    try:
        # Generate Barcode/Digitizable Line
        resultado = CodigoBarrasGPS.gerar(codigo_pagamento, competencia, valor, nit)
        
        print("\n--- RESULTADO ---")
        print(f"Codigo Barras (44 dig): {resultado['codigo_barras']}")
        print(f"Linha Digitavel: {resultado['linha_digitavel']}")
        
        # Validate DV (Position 4, Index 3)
        dv = resultado['codigo_barras'][3]
        print(f"DV Gerado: {dv}")
        
        if dv == "8":
            print("SUCCESS: DV is 8 (Correct)")
        else:
            print(f"FAILURE: DV is {dv} (Expected 8)")
            
        # Generate PDF
        print("\n--- Generating PDF ---")
        dados_pdf = {
            "nome": "TESTE VERIFICACAO",
            "cpf": "000.000.000-00",
            "nit": nit,
            "codigo_pagamento": codigo_pagamento,
            "competencia": competencia,
            "valor_inss": valor,
            "vencimento": "15/12/2025",
            "codigo_barras": resultado['codigo_barras'],
            "linha_digitavel": resultado['linha_digitavel']
        }
        
        generator = GPSPDFGeneratorOficial()
        buffer = generator.gerar(dados_pdf)
        
        output_filename = "apps/backend/inss/test_output/gps_fixed_verification.pdf"
        with open(output_filename, "wb") as f:
            f.write(buffer.getvalue())
            
        print(f"PDF saved to: {output_filename}")
        
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
