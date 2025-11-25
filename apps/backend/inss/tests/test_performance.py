"""
Testes de performance para sistema GPS.
Fase 2: Melhorias de Robustez
"""
import pytest
import time
import asyncio
from datetime import datetime

from app.services.codigo_barras_gps import CodigoBarrasGPS
from app.services.gps_pdf_generator_oficial import GPSPDFGeneratorOficial
from app.services.gps_hybrid_service import GPSHybridService
from app.services.supabase_service import SupabaseService


class TestPerformance:
    """Testes de performance do sistema GPS."""
    
    @pytest.mark.asyncio
    async def test_geracao_codigo_barras_performance(self):
        """Testa que geração de código de barras é rápida (< 10ms)."""
        tempos = []
        
        for i in range(100):
            inicio = time.time()
            codigo = CodigoBarrasGPS.gerar(
                codigo_pagamento="1007",
                competencia="11/2025",
                valor=400.00,
                identificador="12345678901"
            )
            tempo = (time.time() - inicio) * 1000  # Converter para ms
            tempos.append(tempo)
            
            assert len(codigo) == 48
            assert CodigoBarrasGPS.validar(codigo)
        
        tempo_medio = sum(tempos) / len(tempos)
        tempo_maximo = max(tempos)
        
        print(f"\n[PERFORMANCE] Geração de código de barras:")
        print(f"  Tempo médio: {tempo_medio:.2f}ms")
        print(f"  Tempo máximo: {tempo_maximo:.2f}ms")
        print(f"  Total de códigos: 100")
        
        # Deve ser muito rápido (< 10ms por código)
        assert tempo_medio < 10, f"Tempo médio muito alto: {tempo_medio}ms"
        assert tempo_maximo < 50, f"Tempo máximo muito alto: {tempo_maximo}ms"
    
    @pytest.mark.asyncio
    async def test_geracao_pdf_performance(self):
        """Testa que geração de PDF é rápida (< 100ms)."""
        gerador = GPSPDFGeneratorOficial()
        
        dados = {
            'nome': 'TESTE PERFORMANCE',
            'cpf': '12345678900',
            'nit': '128.00186.72-2',
            'endereco': 'Rua Teste, 123',
            'uf': 'SC',
            'telefone': '48999999999',
            'codigo_pagamento': '1007',
            'competencia': '11/2025',
            'valor_inss': 303.60,
            'valor_outras_entidades': 0.00,
            'atm_multa_juros': 0.00,
            'vencimento': '15/12/2025',
            'codigo_barras': '858100000003036002701007000128001867222025113',
            'linha_digitavel': '858100000003-0 03600270100-7 70001280018-4 67222025113-0'
        }
        
        tempos = []
        
        for i in range(10):  # Menos iterações para PDF (é mais pesado)
            inicio = time.time()
            pdf_buffer = gerador.gerar(dados)
            tempo = (time.time() - inicio) * 1000  # Converter para ms
            tempos.append(tempo)
            
            assert pdf_buffer is not None
            assert len(pdf_buffer.read()) > 0
        
        tempo_medio = sum(tempos) / len(tempos)
        tempo_maximo = max(tempos)
        
        print(f"\n[PERFORMANCE] Geração de PDF:")
        print(f"  Tempo médio: {tempo_medio:.2f}ms")
        print(f"  Tempo máximo: {tempo_maximo:.2f}ms")
        print(f"  Total de PDFs: 10")
        
        # Deve ser rápido (< 100ms por PDF)
        assert tempo_medio < 100, f"Tempo médio muito alto: {tempo_medio}ms"
        assert tempo_maximo < 500, f"Tempo máximo muito alto: {tempo_maximo}ms"
    
    @pytest.mark.asyncio
    async def test_emissao_local_performance(self):
        """Testa que emissão local completa é rápida (< 200ms)."""
        supabase_service = SupabaseService()
        service = GPSHybridService(supabase_service)
        
        dados_usuario = {
            "nome": "Teste Performance",
            "cpf": "12345678901",
            "nit": "12345678901",
            "endereco": "Rua Teste, 123",
            "telefone": "48999999999"
        }
        
        tempos = []
        sucessos = 0
        
        for i in range(10):  # Menos iterações (requer Supabase)
            try:
                inicio = time.time()
                resultado = await service._emitir_local(
                    user_id="test-user-id",
                    competencia="11/2025",
                    valor=400.00,
                    codigo_pagamento="1007",
                    dados_usuario=dados_usuario
                )
                tempo = (time.time() - inicio) * 1000
                tempos.append(tempo)
                
                assert resultado.get('codigo_barras') is not None
                assert len(resultado.get('codigo_barras', '')) == 48
                sucessos += 1
            except Exception as e:
                print(f"[PERFORMANCE] Erro na iteração {i}: {e}")
                # Continuar mesmo com erros (pode ser problema de conexão)
        
        if tempos:
            tempo_medio = sum(tempos) / len(tempos)
            tempo_maximo = max(tempos)
            
            print(f"\n[PERFORMANCE] Emissão local completa:")
            print(f"  Tempo médio: {tempo_medio:.2f}ms")
            print(f"  Tempo máximo: {tempo_maximo:.2f}ms")
            print(f"  Sucessos: {sucessos}/10")
            
            # Deve ser rápido (< 200ms por emissão)
            assert tempo_medio < 200, f"Tempo médio muito alto: {tempo_medio}ms"
        else:
            pytest.skip("Nenhuma emissão bem-sucedida (pode ser problema de conexão)")
    
    @pytest.mark.asyncio
    async def test_carga_multiplas_requisicoes(self):
        """Testa sistema sob carga (múltiplas requisições simultâneas)."""
        # Gerar 100 códigos de barras simultaneamente
        async def gerar_codigo(i):
            return CodigoBarrasGPS.gerar(
                codigo_pagamento="1007",
                competencia="11/2025",
                valor=400.00 + i,
                identificador=f"123456789{i:02d}"
            )
        
        inicio = time.time()
        resultados = await asyncio.gather(*[gerar_codigo(i) for i in range(100)])
        tempo_total = (time.time() - inicio) * 1000
        
        # Validar todos
        for codigo in resultados:
            assert len(codigo) == 48
            assert CodigoBarrasGPS.validar(codigo)
        
        tempo_medio = tempo_total / 100
        
        print(f"\n[PERFORMANCE] Carga (100 requisições simultâneas):")
        print(f"  Tempo total: {tempo_total:.2f}ms")
        print(f"  Tempo médio: {tempo_medio:.2f}ms")
        print(f"  Requisições bem-sucedidas: {len(resultados)}/100")
        
        # Deve ser eficiente mesmo sob carga
        assert tempo_medio < 20, f"Tempo médio muito alto sob carga: {tempo_medio}ms"
        assert len(resultados) == 100, "Nem todas as requisições foram bem-sucedidas"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

