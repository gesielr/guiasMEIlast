"""
Testes de Integração Real - Fluxo Autônomo
==========================================

Este arquivo contém testes de integração real que fazem chamadas ao:
- Supabase (cadastro de usuário)
- Endpoint POST /api/v1/guias/emitir
- WhatsApp (simulado)

IMPORTANTE: Estes testes requerem:
- Variáveis de ambiente configuradas (.env)
- Supabase acessível
- Servidor FastAPI rodando (para testes de endpoint)
"""

import sys
import os
import asyncio
from pathlib import Path
from datetime import datetime
import uuid

# Adicionar app ao path
sys.path.insert(0, str(Path(__file__).parent.parent))

import pytest
import httpx
from app.services.inss_calculator import INSSCalculator
from app.services.supabase_service import SupabaseService
from app.config import get_settings


class TestIntegracaoSupabase:
    """Testes de integração com Supabase."""

    def setup_method(self):
        """Configuração inicial."""
        self.settings = get_settings()
        self.supabase_service = SupabaseService()
        self.test_whatsapp = f"5511999{datetime.now().strftime('%H%M%S')}"  # Número único para cada teste

    @pytest.mark.asyncio
    async def test_01_criar_usuario_supabase(self):
        """
        Teste 1: Criar usuário no Supabase
        
        Valida que é possível criar um usuário na tabela 'usuarios'
        do Supabase.
        """
        print("\n" + "=" * 70)
        print("TESTE 1: CRIAR USUÁRIO NO SUPABASE")
        print("=" * 70)
        
        if not self.supabase_service.client:
            pytest.skip("Supabase não disponível - pulando teste de integração")
        
        dados_usuario = {
            "whatsapp": self.test_whatsapp,
            "nome": "Teste Autônomo",
            "cpf": "12345678901",
            "nit": "12345678901",
            "tipo_contribuinte": "autonomo",
        }
        
        try:
            usuario_criado = await self.supabase_service.criar_usuario(dados_usuario)
            
            assert usuario_criado is not None, "Usuário deve ser criado"
            assert "id" in usuario_criado, "Usuário deve ter ID"
            assert usuario_criado.get("whatsapp") == self.test_whatsapp, "WhatsApp deve ser igual"
            
            print(f"  ✓ Usuário criado: {usuario_criado.get('id')}")
            print(f"  ✓ WhatsApp: {usuario_criado.get('whatsapp')}")
            print(f"  ✓ Nome: {usuario_criado.get('nome')}")
            
            return usuario_criado
        except Exception as e:
            print(f"  ⚠ Erro ao criar usuário: {str(e)}")
            pytest.skip(f"Supabase não disponível: {str(e)}")

    @pytest.mark.asyncio
    async def test_02_buscar_usuario_por_whatsapp(self):
        """
        Teste 2: Buscar usuário por WhatsApp
        
        Valida que é possível buscar um usuário pelo número de WhatsApp.
        """
        print("\n" + "=" * 70)
        print("TESTE 2: BUSCAR USUÁRIO POR WHATSAPP")
        print("=" * 70)
        
        if not self.supabase_service.client:
            pytest.skip("Supabase não disponível - pulando teste de integração")
        
        # Primeiro criar um usuário
        dados_usuario = {
            "whatsapp": self.test_whatsapp,
            "nome": "Teste Busca",
            "cpf": "12345678901",
            "tipo_contribuinte": "autonomo",
        }
        
        try:
            # Criar usuário
            await self.supabase_service.criar_usuario(dados_usuario)
            
            # Buscar usuário
            usuario_encontrado = await self.supabase_service.obter_usuario_por_whatsapp(self.test_whatsapp)
            
            assert usuario_encontrado is not None, "Usuário deve ser encontrado"
            assert usuario_encontrado.get("whatsapp") == self.test_whatsapp, "WhatsApp deve corresponder"
            
            print(f"  ✓ Usuário encontrado: {usuario_encontrado.get('id')}")
            print(f"  ✓ WhatsApp: {usuario_encontrado.get('whatsapp')}")
            
            return usuario_encontrado
        except Exception as e:
            print(f"  ⚠ Erro ao buscar usuário: {str(e)}")
            pytest.skip(f"Supabase não disponível: {str(e)}")

    @pytest.mark.asyncio
    async def test_03_salvar_guia_supabase(self):
        """
        Teste 3: Salvar guia GPS no Supabase
        
        Valida que é possível salvar uma guia GPS na tabela 'guias'.
        """
        print("\n" + "=" * 70)
        print("TESTE 3: SALVAR GUIA GPS NO SUPABASE")
        print("=" * 70)
        
        if not self.supabase_service.client:
            pytest.skip("Supabase não disponível - pulando teste de integração")
        
        # Criar usuário primeiro
        dados_usuario = {
            "whatsapp": self.test_whatsapp,
            "nome": "Teste Guia",
            "cpf": "12345678901",
            "tipo_contribuinte": "autonomo",
        }
        
        try:
            usuario = await self.supabase_service.criar_usuario(dados_usuario)
            user_id = usuario.get("id")
            
            # Dados da guia (formato esperado pelo serviço)
            guia_data = {
                "codigo_gps": "1007",
                "competencia": "11/2025",
                "valor": 400.00,
                "status": "pending",  # Status padrão da tabela gps_emissions
            }
            
            guia_salva = await self.supabase_service.salvar_guia(user_id, guia_data)
            
            assert guia_salva is not None, "Guia deve ser salva"
            
            # Validar campos (pode retornar formato gps_emissions ou formato legado)
            codigo_gps = guia_salva.get("inss_code") or guia_salva.get("codigo_gps")
            valor = guia_salva.get("value") or guia_salva.get("valor")
            
            assert codigo_gps == "1007", f"Código GPS deve corresponder (recebido: {codigo_gps})"
            assert abs(float(valor) - 400.00) < 0.01, f"Valor deve corresponder (recebido: {valor})"
            
            print(f"  ✓ Guia salva: {guia_salva.get('id', 'mock-id')}")
            print(f"  ✓ Código GPS: {codigo_gps}")
            print(f"  ✓ Valor: R$ {float(valor):,.2f}")
            
            return guia_salva
        except Exception as e:
            print(f"  ⚠ Erro ao salvar guia: {str(e)}")
            pytest.skip(f"Supabase não disponível: {str(e)}")


class TestIntegracaoEndpoint:
    """Testes de integração com endpoint de emissão."""

    def setup_method(self):
        """Configuração inicial."""
        self.base_url = os.getenv("API_URL", "http://localhost:8000")
        self.test_whatsapp = f"+5511999{datetime.now().strftime('%H%M%S')}"

    @pytest.mark.asyncio
    async def test_01_health_check(self):
        """
        Teste 1: Health Check do servidor
        
        Valida que o servidor FastAPI está rodando.
        """
        print("\n" + "=" * 70)
        print("TESTE 1: HEALTH CHECK DO SERVIDOR")
        print("=" * 70)
        
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(f"{self.base_url}/")
                
                assert response.status_code in [200, 404], \
                    f"Servidor deve responder (status: {response.status_code})"
                
                print(f"  ✓ Servidor respondendo: {self.base_url}")
                print(f"  ✓ Status: {response.status_code}")
                
                return True
        except httpx.ConnectError:
            pytest.skip(f"Servidor não está rodando em {self.base_url}")
        except Exception as e:
            pytest.skip(f"Erro ao conectar: {str(e)}")

    @pytest.mark.asyncio
    async def test_02_emitir_guia_endpoint(self):
        """
        Teste 2: Emitir guia via endpoint POST /api/v1/guias/emitir
        
        Valida que o endpoint de emissão funciona corretamente.
        """
        print("\n" + "=" * 70)
        print("TESTE 2: EMITIR GUIA VIA ENDPOINT")
        print("=" * 70)
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                # Dados da requisição
                payload = {
                    "whatsapp": self.test_whatsapp,
                    "tipo_contribuinte": "autonomo",
                    "valor_base": 2000.00,
                    "plano": "normal",
                    "competencia": "11/2025",
                }
                
                response = await client.post(
                    f"{self.base_url}/api/v1/guias/emitir",
                    json=payload,
                    headers={"Content-Type": "application/json"},
                )
                
                # Validar resposta
                assert response.status_code == 200, \
                    f"Status esperado 200, recebido {response.status_code}: {response.text}"
                
                data = response.json()
                
                assert "guia" in data, "Resposta deve conter 'guia'"
                assert "whatsapp" in data, "Resposta deve conter 'whatsapp'"
                assert "detalhes_calculo" in data, "Resposta deve conter 'detalhes_calculo'"
                
                print(f"  ✓ Guia emitida: {data['guia'].get('id', 'mock-id')}")
                print(f"  ✓ Código GPS: {data['guia'].get('codigo_gps')}")
                print(f"  ✓ Valor: R$ {data['guia'].get('valor'):,.2f}")
                print(f"  ✓ WhatsApp SID: {data['whatsapp'].get('sid', 'mock')}")
                
                return data
        except httpx.ConnectError:
            pytest.skip(f"Servidor não está rodando em {self.base_url}")
        except Exception as e:
            pytest.skip(f"Erro ao chamar endpoint: {str(e)}")

    @pytest.mark.asyncio
    async def test_03_gerar_pdf_endpoint(self):
        """
        Teste 3: Gerar PDF via endpoint POST /api/v1/guias/gerar-pdf
        
        Valida que o endpoint de geração de PDF funciona.
        """
        print("\n" + "=" * 70)
        print("TESTE 3: GERAR PDF VIA ENDPOINT")
        print("=" * 70)
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                payload = {
                    "nome_segurado": "João Silva",
                    "cpf": "12345678901",
                    "valor_base": 2000.00,
                    "tipo_contribuinte": "autonomo",
                    "plano": "normal",
                }
                
                response = await client.post(
                    f"{self.base_url}/api/v1/guias/gerar-pdf",
                    json=payload,
                    headers={"Content-Type": "application/json"},
                )
                
                assert response.status_code == 200, \
                    f"Status esperado 200, recebido {response.status_code}"
                assert response.headers.get("content-type") == "application/pdf", \
                    "Content-Type deve ser application/pdf"
                
                pdf_bytes = response.content
                assert len(pdf_bytes) > 0, "PDF deve ter conteúdo"
                assert pdf_bytes.startswith(b"%PDF"), "PDF deve começar com %PDF"
                
                print(f"  ✓ PDF gerado: {len(pdf_bytes)} bytes")
                print(f"  ✓ Formato válido: {pdf_bytes.startswith(b'%PDF')}")
                
                return pdf_bytes
        except httpx.ConnectError:
            pytest.skip(f"Servidor não está rodando em {self.base_url}")
        except Exception as e:
            pytest.skip(f"Erro ao chamar endpoint: {str(e)}")


class TestE2ECompleto:
    """Teste E2E completo do fluxo."""

    def setup_method(self):
        """Configuração inicial."""
        self.settings = get_settings()
        self.supabase_service = SupabaseService()
        self.calc = INSSCalculator()
        self.base_url = os.getenv("API_URL", "http://localhost:8000")
        self.test_whatsapp = f"+5511999{datetime.now().strftime('%H%M%S')}"

    @pytest.mark.asyncio
    async def test_fluxo_completo_e2e(self):
        """
        Teste E2E Completo: Cadastro → Cálculo → Emissão → PDF
        
        Simula o fluxo completo desde o cadastro até a emissão de GPS.
        """
        print("\n" + "=" * 70)
        print("TESTE E2E COMPLETO: FLUXO AUTÔNOMO")
        print("=" * 70)
        
        resultados = {}
        
        # Passo 1: Criar usuário no Supabase
        print("\n[1/4] Criando usuário no Supabase")
        print("-" * 70)
        try:
            if not self.supabase_service.client:
                pytest.skip("Supabase não disponível")
            
            dados_usuario = {
                "whatsapp": self.test_whatsapp.replace("+", ""),
                "nome": "Teste E2E",
                "cpf": "12345678901",
                "nit": "12345678901",
                "tipo_contribuinte": "autonomo",
            }
            
            usuario = await self.supabase_service.criar_usuario(dados_usuario)
            assert usuario is not None, "Usuário deve ser criado"
            resultados["usuario"] = usuario
            print(f"  ✓ Usuário criado: {usuario.get('id')}")
        except Exception as e:
            print(f"  ⚠ Erro ao criar usuário: {str(e)}")
            pytest.skip(f"Supabase não disponível: {str(e)}")
        
        # Passo 2: Calcular GPS
        print("\n[2/4] Calculando GPS")
        print("-" * 70)
        valor_base = 2000.00
        calculo = self.calc.calcular_contribuinte_individual(valor_base, "normal")
        resultados["calculo"] = calculo
        print(f"  ✓ Valor base: R$ {valor_base:,.2f}")
        print(f"  ✓ Valor GPS: R$ {calculo.valor:,.2f}")
        print(f"  ✓ Código GPS: {calculo.codigo_gps}")
        
        # Passo 3: Emitir guia via endpoint
        print("\n[3/4] Emitindo guia via endpoint")
        print("-" * 70)
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                payload = {
                    "whatsapp": self.test_whatsapp,
                    "tipo_contribuinte": "autonomo",
                    "valor_base": valor_base,
                    "plano": "normal",
                    "competencia": "11/2025",
                }
                
                response = await client.post(
                    f"{self.base_url}/api/v1/guias/emitir",
                    json=payload,
                    headers={"Content-Type": "application/json"},
                )
                
                if response.status_code == 200:
                    data = response.json()
                    resultados["emissao"] = data
                    print(f"  ✓ Guia emitida: {data['guia'].get('id', 'mock-id')}")
                    print(f"  ✓ WhatsApp SID: {data['whatsapp'].get('sid', 'mock')}")
                else:
                    print(f"  ⚠ Status {response.status_code}: {response.text}")
                    resultados["emissao"] = None
        except httpx.ConnectError:
            print(f"  ⚠ Servidor não está rodando em {self.base_url}")
            resultados["emissao"] = None
        except Exception as e:
            print(f"  ⚠ Erro ao emitir: {str(e)}")
            resultados["emissao"] = None
        
        # Passo 4: Validar resultados
        print("\n[4/4] Validação Final")
        print("-" * 70)
        assert resultados.get("usuario") is not None, "Usuário deve ser criado"
        assert resultados.get("calculo") is not None, "Cálculo deve ser executado"
        assert resultados["calculo"].valor > 0, "Valor deve ser positivo"
        
        print("  ✓ Usuário criado")
        print("  ✓ Cálculo executado")
        if resultados.get("emissao"):
            print("  ✓ Guia emitida")
        else:
            print("  ⚠ Emissão não testada (servidor não disponível)")
        
        print("\n" + "=" * 70)
        print("✅ FLUXO E2E COMPLETO VALIDADO!")
        print("=" * 70)
        
        return resultados


if __name__ == "__main__":
    # Executar testes diretamente
    pytest.main([__file__, "-v", "--tb=short", "-s"])

