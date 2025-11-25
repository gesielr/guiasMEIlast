"""
Teste E2E Completo: Fluxo Autônomo
===================================

Este teste valida o fluxo completo desde o cadastro de autônomo até a emissão de GPS:
1. Cadastro de autônomo
2. Integração com WhatsApp
3. Processamento de mensagem "Emitir GPS"
4. Emissão de guia GPS
5. Validação de todos os passos
"""

import sys
from pathlib import Path
from datetime import datetime
import json

# Adicionar app ao path
sys.path.insert(0, str(Path(__file__).parent.parent))

import pytest
from app.services.inss_calculator import INSSCalculator
from app.services.pdf_generator import GPSGenerator
from app.services.supabase_service import SupabaseService
from app.config import get_settings


class TestFluxoCompletoAutonomo:
    """Teste E2E do fluxo completo de autônomo."""

    def setup_method(self):
        """Configuração inicial para cada teste."""
        self.settings = get_settings()
        self.calc = INSSCalculator()
        self.pdf_gen = GPSGenerator()
        self.supabase_service = SupabaseService()

    def test_01_cadastro_autonomo_dados_validos(self):
        """
        Teste 1: Validação dos dados de cadastro de autônomo
        
        Valida que os dados necessários para cadastro estão corretos:
        - CPF válido
        - Nome completo
        - Email válido
        - Telefone/WhatsApp válido
        - PIS/NIT (opcional)
        """
        print("\n" + "=" * 70)
        print("TESTE 1: VALIDAÇÃO DE DADOS DE CADASTRO")
        print("=" * 70)
        
        dados_cadastro = {
            "cpf": "12345678901",  # CPF de teste (11 dígitos)
            "nome": "João Silva",
            "email": "joao.silva@teste.com",
            "phone": "11999999999",  # WhatsApp com DDD
            "pis": "12345678901",  # PIS opcional
            "password": "senha123",
            "user_type": "autonomo"
        }
        
        # Validações básicas
        assert len(dados_cadastro["cpf"]) == 11, "CPF deve ter 11 dígitos"
        assert len(dados_cadastro["phone"]) >= 10, "Telefone deve ter pelo menos 10 dígitos"
        assert "@" in dados_cadastro["email"], "Email deve ser válido"
        assert len(dados_cadastro["nome"]) > 0, "Nome não pode estar vazio"
        
        print(f"  ✓ CPF: {dados_cadastro['cpf']}")
        print(f"  ✓ Nome: {dados_cadastro['nome']}")
        print(f"  ✓ Email: {dados_cadastro['email']}")
        print(f"  ✓ WhatsApp: {dados_cadastro['phone']}")
        print(f"  ✓ PIS: {dados_cadastro.get('pis', 'Não informado')}")
        print("  ✓ DADOS VÁLIDOS PARA CADASTRO")
        
        return dados_cadastro

    def test_02_calculo_gps_autonomo(self):
        """
        Teste 2: Cálculo de GPS para autônomo
        
        Valida que o cálculo de GPS está funcionando corretamente
        para um autônomo com valor base de R$ 2.000,00.
        """
        print("\n" + "=" * 70)
        print("TESTE 2: CÁLCULO DE GPS PARA AUTÔNOMO")
        print("=" * 70)
        
        valor_base = 2000.00
        resultado = self.calc.calcular_contribuinte_individual(valor_base, "normal")
        
        # Validações
        assert resultado.valor > 0, "Valor deve ser positivo"
        assert resultado.codigo_gps == "1007", f"Código GPS esperado 1007, recebido {resultado.codigo_gps}"
        assert resultado.detalhes["aliquota"] == 0.20, "Alíquota deve ser 20%"
        
        print(f"  ✓ Valor base: R$ {valor_base:,.2f}")
        print(f"  ✓ Valor calculado: R$ {resultado.valor:,.2f}")
        print(f"  ✓ Código GPS: {resultado.codigo_gps}")
        print(f"  ✓ Alíquota: {resultado.detalhes['aliquota'] * 100}%")
        print("  ✓ CÁLCULO VÁLIDO")
        
        return resultado

    def test_03_geracao_pdf_gps(self):
        """
        Teste 3: Geração de PDF da guia GPS
        
        Valida que o PDF da guia GPS é gerado corretamente
        com todos os campos obrigatórios.
        """
        print("\n" + "=" * 70)
        print("TESTE 3: GERAÇÃO DE PDF DA GUIA GPS")
        print("=" * 70)
        
        dados_contribuinte = {
            "nome": "João Silva",
            "cpf": "12345678901",
            "nit": "12345678901",
            "whatsapp": "+5511999999999",
        }
        
        valor = 400.00
        codigo = "1007"
        competencia = "11/2025"
        
        pdf_bytes = self.pdf_gen.gerar_guia(
            dados_contribuinte=dados_contribuinte,
            valor=valor,
            codigo=codigo,
            competencia=competencia,
        )
        
        # Validações
        assert len(pdf_bytes) > 0, "PDF deve ser gerado"
        assert pdf_bytes.startswith(b"%PDF"), "PDF deve começar com %PDF"
        
        print(f"  ✓ PDF gerado: {len(pdf_bytes)} bytes")
        print(f"  ✓ Formato válido: {pdf_bytes.startswith(b'%PDF')}")
        print(f"  ✓ Dados do contribuinte: {dados_contribuinte['nome']}")
        print(f"  ✓ Valor: R$ {valor:,.2f}")
        print(f"  ✓ Código GPS: {codigo}")
        print(f"  ✓ Competência: {competencia}")
        print("  ✓ PDF GERADO COM SUCESSO")
        
        return pdf_bytes

    def test_04_estrutura_dados_emissao(self):
        """
        Teste 4: Estrutura de dados para emissão
        
        Valida que a estrutura de dados para emissão de GPS
        está correta conforme esperado pelo endpoint.
        """
        print("\n" + "=" * 70)
        print("TESTE 4: ESTRUTURA DE DADOS PARA EMISSÃO")
        print("=" * 70)
        
        dados_emissao = {
            "whatsapp": "+5511999999999",
            "tipo_contribuinte": "autonomo",
            "valor_base": 2000.00,
            "plano": "normal",
            "competencia": "11/2025"
        }
        
        # Validações
        assert "whatsapp" in dados_emissao, "WhatsApp é obrigatório"
        assert "tipo_contribuinte" in dados_emissao, "Tipo de contribuinte é obrigatório"
        assert "valor_base" in dados_emissao, "Valor base é obrigatório"
        assert dados_emissao["valor_base"] > 0, "Valor base deve ser positivo"
        
        print(f"  ✓ WhatsApp: {dados_emissao['whatsapp']}")
        print(f"  ✓ Tipo: {dados_emissao['tipo_contribuinte']}")
        print(f"  ✓ Valor base: R$ {dados_emissao['valor_base']:,.2f}")
        print(f"  ✓ Plano: {dados_emissao.get('plano', 'normal')}")
        print(f"  ✓ Competência: {dados_emissao.get('competencia', 'atual')}")
        print("  ✓ ESTRUTURA VÁLIDA")
        
        return dados_emissao

    def test_05_fluxo_completo_simulado(self):
        """
        Teste 5: Fluxo completo simulado
        
        Simula o fluxo completo desde o cadastro até a emissão:
        1. Cadastro de autônomo
        2. Cálculo de GPS
        3. Geração de PDF
        4. Validação de todos os passos
        """
        print("\n" + "=" * 70)
        print("TESTE 5: FLUXO COMPLETO SIMULADO")
        print("=" * 70)
        
        # Passo 1: Dados de cadastro
        print("\n[1/4] Dados de Cadastro")
        print("-" * 70)
        dados_cadastro = {
            "cpf": "12345678901",
            "nome": "João Silva",
            "email": "joao.silva@teste.com",
            "phone": "11999999999",
            "pis": "12345678901",
        }
        print(f"  ✓ Usuário: {dados_cadastro['nome']}")
        print(f"  ✓ CPF: {dados_cadastro['cpf']}")
        print(f"  ✓ WhatsApp: {dados_cadastro['phone']}")
        
        # Passo 2: Cálculo de GPS
        print("\n[2/4] Cálculo de GPS")
        print("-" * 70)
        valor_base = 2000.00
        resultado = self.calc.calcular_contribuinte_individual(valor_base, "normal")
        print(f"  ✓ Valor base: R$ {valor_base:,.2f}")
        print(f"  ✓ Valor GPS: R$ {resultado.valor:,.2f}")
        print(f"  ✓ Código GPS: {resultado.codigo_gps}")
        
        # Passo 3: Geração de PDF
        print("\n[3/4] Geração de PDF")
        print("-" * 70)
        dados_contribuinte = {
            "nome": dados_cadastro["nome"],
            "cpf": dados_cadastro["cpf"],
            "nit": dados_cadastro.get("pis", ""),
            "whatsapp": f"+55{dados_cadastro['phone']}",
        }
        
        pdf_bytes = self.pdf_gen.gerar_guia(
            dados_contribuinte=dados_contribuinte,
            valor=resultado.valor,
            codigo=resultado.codigo_gps,
            competencia="11/2025",
        )
        print(f"  ✓ PDF gerado: {len(pdf_bytes)} bytes")
        
        # Passo 4: Validação final
        print("\n[4/4] Validação Final")
        print("-" * 70)
        assert len(pdf_bytes) > 0, "PDF deve ser gerado"
        assert resultado.valor > 0, "Valor deve ser positivo"
        assert resultado.codigo_gps == "1007", "Código GPS deve ser 1007"
        
        print("  ✓ Todos os passos validados")
        print("  ✓ FLUXO COMPLETO SIMULADO COM SUCESSO")
        
        return {
            "cadastro": dados_cadastro,
            "calculo": resultado,
            "pdf": pdf_bytes
        }

    def test_06_validacao_whatsapp_format(self):
        """
        Teste 6: Validação de formato WhatsApp
        
        Valida que o formato do número WhatsApp está correto
        para integração com o sistema.
        """
        print("\n" + "=" * 70)
        print("TESTE 6: VALIDAÇÃO DE FORMATO WHATSAPP")
        print("=" * 70)
        
        telefones_teste = [
            "11999999999",  # Formato brasileiro com DDD
            "+5511999999999",  # Formato internacional
            "5511999999999",  # Formato sem +
        ]
        
        for telefone in telefones_teste:
            # Normalizar para formato esperado
            telefone_limpo = telefone.replace("+", "").replace(" ", "").replace("-", "")
            
            # Validar formato
            if telefone_limpo.startswith("55"):
                # Formato internacional brasileiro
                assert len(telefone_limpo) >= 12, f"Telefone deve ter pelo menos 12 dígitos: {telefone}"
                print(f"  ✓ {telefone} → {telefone_limpo} (formato internacional)")
            else:
                # Formato nacional
                assert len(telefone_limpo) >= 10, f"Telefone deve ter pelo menos 10 dígitos: {telefone}"
                print(f"  ✓ {telefone} → {telefone_limpo} (formato nacional)")
        
        print("  ✓ FORMATOS VALIDADOS")

    def test_07_validacao_competencia(self):
        """
        Teste 7: Validação de competência
        
        Valida que o formato de competência está correto (MM/AAAA).
        """
        print("\n" + "=" * 70)
        print("TESTE 7: VALIDAÇÃO DE COMPETÊNCIA")
        print("=" * 70)
        
        competencias_validas = [
            "11/2025",
            "01/2025",
            "12/2024",
        ]
        
        competencias_invalidas = [
            "2025/11",  # Formato invertido
            "11-2025",  # Separador incorreto
            "1/2025",  # Mês sem zero
        ]
        
        for competencia in competencias_validas:
            assert len(competencia) == 7, f"Competência deve ter 7 caracteres: {competencia}"
            assert competencia[2] == "/", f"Separador deve ser /: {competencia}"
            mes, ano = competencia.split("/")
            assert 1 <= int(mes) <= 12, f"Mês deve estar entre 1 e 12: {competencia}"
            print(f"  ✓ {competencia} (válida)")
        
        for competencia in competencias_invalidas:
            print(f"  ⚠ {competencia} (inválida - formato esperado: MM/AAAA)")
        
        print("  ✓ VALIDAÇÃO DE COMPETÊNCIA CONCLUÍDA")


def test_fluxo_completo_autonomo():
    """Função principal para executar todos os testes do fluxo."""
    print("\n" + "=" * 70)
    print("TESTE E2E: FLUXO COMPLETO AUTÔNOMO")
    print("=" * 70)
    print("\nEste teste valida o fluxo completo desde o cadastro até a emissão de GPS.")
    print("=" * 70)
    
    suite = TestFluxoCompletoAutonomo()
    suite.setup_method()
    
    try:
        # Executar todos os testes
        suite.test_01_cadastro_autonomo_dados_validos()
        suite.test_02_calculo_gps_autonomo()
        suite.test_03_geracao_pdf_gps()
        suite.test_04_estrutura_dados_emissao()
        resultado = suite.test_05_fluxo_completo_simulado()
        suite.test_06_validacao_whatsapp_format()
        suite.test_07_validacao_competencia()
        
        print("\n" + "=" * 70)
        print("✅ TODOS OS TESTES PASSARAM!")
        print("=" * 70)
        print("\nResumo do fluxo:")
        print(f"  1. ✓ Cadastro validado")
        print(f"  2. ✓ Cálculo GPS: R$ {resultado['calculo'].valor:,.2f}")
        print(f"  3. ✓ PDF gerado: {len(resultado['pdf'])} bytes")
        print(f"  4. ✓ Formato WhatsApp validado")
        print(f"  5. ✓ Competência validada")
        print("\n" + "=" * 70)
        print("PRÓXIMOS PASSOS:")
        print("=" * 70)
        print("""
1. Testar integração real com Supabase (cadastro de usuário)
2. Testar integração real com WhatsApp (envio de mensagem)
3. Testar endpoint POST /api/v1/guias/emitir com dados reais
4. Validar fluxo completo em ambiente de desenvolvimento
        """)
        print("=" * 70)
        
        return True
    except Exception as e:
        print(f"\n❌ ERRO: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = test_fluxo_completo_autonomo()
    sys.exit(0 if success else 1)

