"""
Testes unitários para geração e validação de código de barras GPS.
"""
import pytest
from app.services.codigo_barras_gps import CodigoBarrasGPS


class TestCodigoBarrasGPS:
    """Testes para CodigoBarrasGPS."""
    
    def test_gerar_codigo_barras(self):
        """Testa geração de código de barras completo."""
        codigo = CodigoBarrasGPS.gerar(
            codigo_pagamento="1007",
            competencia="11/2025",
            valor=400.00,
            identificador="12345678901"
        )
        
        assert len(codigo) == 48
        assert codigo.isdigit()
        assert codigo[0] == "2"  # Produto GPS
        assert codigo[1] == "7"  # Segmento INSS
    
    def test_validar_codigo_barras(self):
        """Testa validação de código de barras."""
        # Gerar código válido
        codigo = CodigoBarrasGPS.gerar(
            codigo_pagamento="1007",
            competencia="11/2025",
            valor=400.00,
            identificador="12345678901"
        )
        
        # Deve ser válido
        assert CodigoBarrasGPS.validar(codigo) is True
        
        # Código inválido (tamanho errado)
        assert CodigoBarrasGPS.validar("123") is False
        
        # Código inválido (DV errado) - alterar o DV na posição 4
        codigo_invalido = codigo[:3] + "0" + codigo[4:]
        assert CodigoBarrasGPS.validar(codigo_invalido) is False
    
    def test_linha_digitavel(self):
        """Testa conversão para linha digitável."""
        codigo = CodigoBarrasGPS.gerar(
            codigo_pagamento="1007",
            competencia="11/2025",
            valor=400.00,
            identificador="12345678901"
        )
        
        linha = CodigoBarrasGPS.linha_digitavel(codigo)
        
        assert len(linha) > 0
        assert "." in linha  # Deve ter pontos
        assert " " in linha  # Deve ter espaços
    
    def test_calcular_dv_modulo11(self):
        """Testa cálculo de dígito verificador."""
        codigo_sem_dv = "2" * 47  # Código de teste
        
        dv = CodigoBarrasGPS.calcular_dv_modulo11(codigo_sem_dv)
        
        assert len(dv) == 1
        assert dv.isdigit()
        assert dv in "0123456789"
    
    def test_extrair_valor(self):
        """Testa extração de valor do código de barras."""
        valor_esperado = 400.00
        
        codigo = CodigoBarrasGPS.gerar(
            codigo_pagamento="1007",
            competencia="11/2025",
            valor=valor_esperado,
            identificador="12345678901"
        )
        
        valor_extraido = CodigoBarrasGPS.extrair_valor(codigo)
        
        assert abs(valor_extraido - valor_esperado) < 0.01
    
    def test_extrair_competencia(self):
        """Testa extração de competência do código de barras."""
        competencia_esperada = "11/2025"
        
        codigo = CodigoBarrasGPS.gerar(
            codigo_pagamento="1007",
            competencia=competencia_esperada,
            valor=400.00,
            identificador="12345678901"
        )
        
        competencia_extraida = CodigoBarrasGPS.extrair_competencia(codigo)
        
        assert competencia_extraida == competencia_esperada
    
    def test_extrair_codigo_pagamento(self):
        """Testa extração de código de pagamento."""
        codigo_pagamento_esperado = "1007"
        
        codigo = CodigoBarrasGPS.gerar(
            codigo_pagamento=codigo_pagamento_esperado,
            competencia="11/2025",
            valor=400.00,
            identificador="12345678901"
        )
        
        codigo_extraido = CodigoBarrasGPS.extrair_codigo_pagamento(codigo)
        
        assert codigo_extraido == codigo_pagamento_esperado
    
    def test_extrair_identificador(self):
        """Testa extração de identificador (CPF/NIT)."""
        identificador_esperado = "12345678901"
        
        codigo = CodigoBarrasGPS.gerar(
            codigo_pagamento="1007",
            competencia="11/2025",
            valor=400.00,
            identificador=identificador_esperado
        )
        
        identificador_extraido = CodigoBarrasGPS.extrair_identificador(codigo)
        
        assert identificador_extraido == identificador_esperado
    
    def test_formatar_competencia(self):
        """Testa formatação de competência."""
        # MM/YYYY -> MMAAAA
        assert CodigoBarrasGPS.formatar_competencia("11/2025") == "112025"
        assert CodigoBarrasGPS.formatar_competencia("01/2025") == "012025"
        
        # MMAAAA -> MMAAAA (já formatado)
        assert CodigoBarrasGPS.formatar_competencia("112025") == "112025"
    
    def test_formatar_identificador(self):
        """Testa formatação de identificador."""
        # Com formatação
        assert CodigoBarrasGPS.formatar_identificador("123.456.789-01") == "12345678901"
        assert CodigoBarrasGPS.formatar_identificador("123.45678.90-1") == "12345678901"
        
        # Sem formatação
        assert CodigoBarrasGPS.formatar_identificador("12345678901") == "12345678901"
    
    def test_identificar_valor(self):
        """Testa identificação de valor por faixa."""
        # Faixa 1: até R$ 99.999.999,99
        assert CodigoBarrasGPS.identificar_valor(9999999999) == "1"
        
        # Faixa 2: R$ 100.000.000,00 a R$ 999.999.999,99
        assert CodigoBarrasGPS.identificar_valor(10000000000) == "2"
        
        # Faixa 3: R$ 1.000.000.000,00 a R$ 9.999.999.999,99
        assert CodigoBarrasGPS.identificar_valor(100000000000) == "3"
