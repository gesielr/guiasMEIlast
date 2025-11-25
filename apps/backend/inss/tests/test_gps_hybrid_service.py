"""
Testes para o serviço híbrido de GPS.
"""
import pytest
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, MagicMock, patch

from app.services.gps_hybrid_service import GPSHybridService, MetodoEmissao
from app.services.supabase_service import SupabaseService


@pytest.fixture
def mock_supabase():
    """Mock do serviço Supabase."""
    supabase = MagicMock(spec=SupabaseService)
    supabase.get_records = AsyncMock(return_value=[])
    supabase.create_record = AsyncMock(return_value={"id": "test-id"})
    supabase.upload_file = AsyncMock(return_value="https://storage.supabase.co/test.pdf")
    supabase.salvar_guia = AsyncMock(return_value={"id": "test-id", "pdf_url": "https://storage.supabase.co/test.pdf"})
    return supabase


@pytest.fixture
def gps_service(mock_supabase):
    """Instância do serviço GPS híbrido."""
    return GPSHybridService(mock_supabase)


class TestGPSHybridService:
    """Testes para GPSHybridService."""
    
    def test_gps_vencida(self, gps_service):
        """Testa detecção de GPS vencida."""
        # Competência anterior ao mês atual
        mes_passado = datetime.now() - timedelta(days=32)
        competencia_vencida = mes_passado.strftime("%m/%Y")
        
        assert gps_service._gps_vencida(competencia_vencida) is True
        
        # Competência atual
        hoje = datetime.now()
        competencia_atual = hoje.strftime("%m/%Y")
        
        assert gps_service._gps_vencida(competencia_atual) is False
    
    @pytest.mark.asyncio
    async def test_decidir_metodo_gps_vencida(self, gps_service):
        """Testa decisão de método para GPS vencida."""
        mes_passado = datetime.now() - timedelta(days=32)
        competencia_vencida = mes_passado.strftime("%m/%Y")
        
        metodo = await gps_service._decidir_metodo(competencia_vencida)
        
        assert metodo == MetodoEmissao.SAL_OFICIAL
    
    @pytest.mark.asyncio
    async def test_decidir_metodo_local(self, gps_service):
        """Testa decisão de método padrão (local)."""
        hoje = datetime.now()
        competencia_atual = hoje.strftime("%m/%Y")
        
        # Forçar não usar SAL (mockar random)
        with patch('random.random', return_value=0.5):  # > 0.01
            metodo = await gps_service._decidir_metodo(competencia_atual)
            
            assert metodo == MetodoEmissao.LOCAL
    
    @pytest.mark.asyncio
    async def test_decidir_metodo_forcado(self, gps_service):
        """Testa método forçado pelo usuário."""
        hoje = datetime.now()
        competencia_atual = hoje.strftime("%m/%Y")
        
        metodo = await gps_service._decidir_metodo(
            competencia_atual,
            metodo_forcado=MetodoEmissao.SAL_OFICIAL
        )
        
        assert metodo == MetodoEmissao.SAL_OFICIAL
    
    @pytest.mark.asyncio
    async def test_emitir_local(self, gps_service, mock_supabase):
        """Testa emissão local de GPS."""
        dados_usuario = {
            "nome": "Teste Usuario",
            "cpf": "12345678901",
            "nit": "12345678901",
            "endereco": "Rua Teste, 123",
            "telefone": "48999999999"
        }
        
        resultado = await gps_service._emitir_local(
            user_id="test-user-id",
            competencia="11/2025",
            valor=400.00,
            codigo_pagamento="1007",
            dados_usuario=dados_usuario
        )
        
        assert resultado['id'] == "test-id"
        assert resultado['pdf_url'] == "https://storage.supabase.co/test.pdf"
        assert len(resultado['codigo_barras']) == 48
        assert resultado['metodo_emissao'] == MetodoEmissao.LOCAL.value
        assert resultado['validado_sal'] is False
    
    @pytest.mark.asyncio
    async def test_emitir_gps_completo(self, gps_service, mock_supabase):
        """Testa fluxo completo de emissão."""
        dados_usuario = {
            "nome": "Teste Usuario",
            "cpf": "12345678901",
            "nit": "12345678901",
            "endereco": "Rua Teste, 123",
            "telefone": "48999999999"
        }
        
        # Mockar decisão de método
        with patch.object(gps_service, '_decidir_metodo', return_value=MetodoEmissao.LOCAL):
            resultado = await gps_service.emitir_gps(
                user_id="test-user-id",
                competencia="11/2025",
                valor=400.00,
                codigo_pagamento="1007",
                dados_usuario=dados_usuario
            )
            
            assert resultado['id'] is not None
            assert resultado['pdf_url'] is not None
            assert resultado['codigo_barras'] is not None
            assert resultado['metodo_emissao'] == MetodoEmissao.LOCAL.value
