"""
Testes obrigatórios conforme PROMPT COMPLETO PARA VALIDAÇÃO GUIAS GPS.txt
Seção 2.4 - Casos de Teste Obrigatórios
"""
import pytest
from app.services.codigo_barras_gps import CodigoBarrasGPS


class TestCasosObrigatoriosPrompt:
    """Testes obrigatórios do prompt de validação."""
    
    def test_valor_pequeno_r100(self):
        """Teste com valor pequeno (R$ 100,00) - Obrigatório do prompt."""
        codigo = CodigoBarrasGPS.gerar(
            codigo_pagamento='1007',
            competencia='11/2025',
            valor=100.00,
            identificador='12345678900'
        )
        
        assert len(codigo) == 48
        assert CodigoBarrasGPS.validar(codigo) is True
        
        # Validar extração
        valor_extraido = CodigoBarrasGPS.extrair_valor(codigo)
        assert abs(valor_extraido - 100.00) < 0.01
    
    def test_valor_medio_r1000(self):
        """Teste com valor médio (R$ 1.000,00) - Obrigatório do prompt."""
        codigo = CodigoBarrasGPS.gerar(
            codigo_pagamento='1007',
            competencia='12/2025',
            valor=1000.00,
            identificador='98765432100'
        )
        
        assert len(codigo) == 48
        assert CodigoBarrasGPS.validar(codigo) is True
        
        # Validar extração
        valor_extraido = CodigoBarrasGPS.extrair_valor(codigo)
        assert abs(valor_extraido - 1000.00) < 0.01
    
    def test_valor_grande_r7507_49(self):
        """Teste com valor grande (R$ 7.507,49 - teto INSS) - Obrigatório do prompt."""
        codigo = CodigoBarrasGPS.gerar(
            codigo_pagamento='1007',
            competencia='01/2026',
            valor=7507.49,
            identificador='11122233344'
        )
        
        assert len(codigo) == 48
        assert CodigoBarrasGPS.validar(codigo) is True
        
        # Validar extração
        valor_extraido = CodigoBarrasGPS.extrair_valor(codigo)
        assert abs(valor_extraido - 7507.49) < 0.01
    
    def test_virada_ano(self):
        """Teste virada de ano - Obrigatório do prompt."""
        codigo = CodigoBarrasGPS.gerar(
            codigo_pagamento='1007',
            competencia='12/2025',
            valor=400.00,
            identificador='12345678900'
        )
        
        # Verificar que competência está correta no código
        competencia_extraida = CodigoBarrasGPS.extrair_competencia(codigo)
        assert competencia_extraida == '12/2025'
        
        # Verificar que '122025' está no código (formato MMAAAA)
        assert '122025' in codigo
    
    def test_cpf_vs_nit_diferentes(self):
        """Teste com CPF e NIT diferentes - Obrigatório do prompt."""
        codigo_cpf = CodigoBarrasGPS.gerar(
            codigo_pagamento='1007',
            competencia='11/2025',
            valor=400.00,
            identificador='12345678900'
        )
        
        codigo_nit = CodigoBarrasGPS.gerar(
            codigo_pagamento='1007',
            competencia='11/2025',
            valor=400.00,
            identificador='12800186722'
        )
        
        # Devem ser diferentes
        assert codigo_cpf != codigo_nit
        
        # Validar que ambos são válidos
        assert CodigoBarrasGPS.validar(codigo_cpf) is True
        assert CodigoBarrasGPS.validar(codigo_nit) is True
        
        # Validar que identificadores extraídos são diferentes
        id_cpf = CodigoBarrasGPS.extrair_identificador(codigo_cpf)
        id_nit = CodigoBarrasGPS.extrair_identificador(codigo_nit)
        assert id_cpf != id_nit
        assert id_cpf == '12345678900'
        assert id_nit == '12800186722'


class TestValidacao10Codigos:
    """Teste 1 obrigatório: Validação de 10 códigos de barras."""
    
    def test_validar_10_codigos_barras(self):
        """
        Teste obrigatório do prompt:
        - Gere 10 códigos de barras locais
        - Valide cada um com o método validar()
        - RESULTADO ESPERADO: 100% válidos
        """
        valores = [100.00, 200.00, 400.00, 500.00, 1000.00, 1500.00, 2000.00, 3000.00, 5000.00, 7507.49]
        competencias = ['01/2025', '02/2025', '03/2025', '04/2025', '05/2025', 
                       '06/2025', '07/2025', '08/2025', '09/2025', '10/2025']
        identificadores = ['12345678900', '98765432100', '11122233344', '55566677788', '99988877766',
                          '12312312312', '45645645645', '78978978978', '14714714714', '25825825825']
        
        codigos_validos = 0
        codigos_invalidos = 0
        
        for i in range(10):
            codigo = CodigoBarrasGPS.gerar(
                codigo_pagamento='1007',
                competencia=competencias[i],
                valor=valores[i],
                identificador=identificadores[i]
            )
            
            if CodigoBarrasGPS.validar(codigo):
                codigos_validos += 1
            else:
                codigos_invalidos += 1
        
        # RESULTADO ESPERADO: 100% válidos
        assert codigos_invalidos == 0, f"Encontrados {codigos_invalidos} códigos inválidos de 10 gerados"
        assert codigos_validos == 10, f"Apenas {codigos_validos} de 10 códigos são válidos"
        
        print(f"\n[TESTE OBRIGATÓRIO] Validação de 10 códigos:")
        print(f"  Códigos válidos: {codigos_validos}/10")
        print(f"  Códigos inválidos: {codigos_invalidos}/10")
        print(f"  Taxa de sucesso: {codigos_validos * 10}%")

