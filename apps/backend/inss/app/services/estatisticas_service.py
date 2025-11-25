"""
Serviço para gerenciar estatísticas GPS.
Popula tabela gps_estatisticas diariamente.
"""
from __future__ import annotations

from datetime import datetime, date
from typing import Dict, Any, Optional
from ..services.supabase_service import SupabaseService


class EstatisticasService:
    """
    Serviço para calcular e armazenar estatísticas GPS.
    """
    
    def __init__(self, supabase_service: SupabaseService):
        """
        Inicializa o serviço de estatísticas.
        
        Args:
            supabase_service: Serviço do Supabase
        """
        self.supabase = supabase_service
    
    async def popular_estatisticas_dia(self, data_ref: Optional[date] = None) -> Dict[str, Any]:
        """
        Popula estatísticas para um dia específico.
        
        Args:
            data_ref: Data para popular (padrão: hoje)
        
        Returns:
            Dicionário com estatísticas populadas
        """
        if data_ref is None:
            data_ref = date.today()
        
        try:
            # Chamar função SQL que calcula tudo
            # Nota: Isso requer que a função SQL esteja criada no Supabase
            resultado = await self.supabase.execute_rpc(
                "popular_estatisticas_gps",
                {"data_ref": data_ref.isoformat()}
            )
            
            print(f"[ESTATISTICAS] [OK] Estatísticas populadas para {data_ref}")
            return {"success": True, "data": data_ref.isoformat()}
        
        except Exception as e:
            print(f"[ESTATISTICAS] [ERROR] Erro ao popular estatísticas: {e}")
            # Fallback: calcular manualmente
            return await self._calcular_estatisticas_manual(data_ref)
    
    async def _calcular_estatisticas_manual(self, data_ref: date) -> Dict[str, Any]:
        """
        Calcula estatísticas manualmente (fallback se função SQL não disponível).
        
        Args:
            data_ref: Data para calcular
        
        Returns:
            Dicionário com estatísticas
        """
        try:
            # Buscar GPS do dia
            data_str = data_ref.isoformat()
            guias = await self.supabase.get_records("gps_emissions", {})
            
            # Filtrar por data (em memória)
            guias_do_dia = [
                g for g in (guias or [])
                if g.get("created_at", "").startswith(data_str)
            ]
            
            total = len(guias_do_dia)
            emitidas_local = sum(1 for g in guias_do_dia if g.get("metodo_emissao") == "local")
            emitidas_sal_validado = sum(1 for g in guias_do_dia if g.get("metodo_emissao") == "sal_validado")
            emitidas_sal_oficial = sum(1 for g in guias_do_dia if g.get("metodo_emissao") == "sal_oficial")
            validacoes_sal = sum(1 for g in guias_do_dia if g.get("validado_sal") is True)
            
            # Buscar divergências do dia
            divergencias = await self.supabase.get_records("gps_divergencias", {})
            divergencias_do_dia = [
                d for d in (divergencias or [])
                if d.get("created_at", "").startswith(data_str)
            ]
            
            divergencias_count = sum(1 for d in divergencias_do_dia if not d.get("resolvido"))
            divergencias_resolvidas_count = sum(1 for d in divergencias_do_dia if d.get("resolvido"))
            
            # Salvar estatísticas
            estatisticas_data = {
                "data": data_str,
                "total_emitidas": total,
                "emitidas_local": emitidas_local,
                "emitidas_sal_validado": emitidas_sal_validado,
                "emitidas_sal_oficial": emitidas_sal_oficial,
                "validacoes_sal": validacoes_sal,
                "divergencias": divergencias_count,
                "divergencias_resolvidas": divergencias_resolvidas_count
            }
            
            await self.supabase.create_record("gps_estatisticas", estatisticas_data)
            
            print(f"[ESTATISTICAS] [OK] Estatísticas calculadas manualmente para {data_ref}")
            return {"success": True, "data": data_str, "estatisticas": estatisticas_data}
        
        except Exception as e:
            print(f"[ESTATISTICAS] [ERROR] Erro ao calcular estatísticas manualmente: {e}")
            import traceback
            print(traceback.format_exc())
            return {"success": False, "error": str(e)}
    
    async def obter_estatisticas_periodo(
        self,
        data_inicio: date,
        data_fim: date
    ) -> Dict[str, Any]:
        """
        Obtém estatísticas de um período.
        
        Args:
            data_inicio: Data inicial
            data_fim: Data final
        
        Returns:
            Dicionário com estatísticas agregadas
        """
        try:
            # Buscar estatísticas do período
            estatisticas = await self.supabase.get_records("gps_estatisticas", {})
            
            if not estatisticas:
                return {
                    "periodo": {
                        "inicio": data_inicio.isoformat(),
                        "fim": data_fim.isoformat()
                    },
                    "total_emitidas": 0,
                    "por_metodo": {},
                    "validacoes_sal": 0,
                    "divergencias": 0
                }
            
            # Filtrar por período
            estatisticas_periodo = [
                e for e in estatisticas
                if data_inicio <= datetime.fromisoformat(e["data"]).date() <= data_fim
            ]
            
            # Agregar
            total_emitidas = sum(e.get("total_emitidas", 0) for e in estatisticas_periodo)
            emitidas_local = sum(e.get("emitidas_local", 0) for e in estatisticas_periodo)
            emitidas_sal_validado = sum(e.get("emitidas_sal_validado", 0) for e in estatisticas_periodo)
            emitidas_sal_oficial = sum(e.get("emitidas_sal_oficial", 0) for e in estatisticas_periodo)
            validacoes_sal = sum(e.get("validacoes_sal", 0) for e in estatisticas_periodo)
            divergencias = sum(e.get("divergencias", 0) for e in estatisticas_periodo)
            
            return {
                "periodo": {
                    "inicio": data_inicio.isoformat(),
                    "fim": data_fim.isoformat()
                },
                "total_emitidas": total_emitidas,
                "por_metodo": {
                    "local": emitidas_local,
                    "sal_validado": emitidas_sal_validado,
                    "sal_oficial": emitidas_sal_oficial
                },
                "validacoes_sal": validacoes_sal,
                "divergencias": divergencias,
                "dias": len(estatisticas_periodo)
            }
        
        except Exception as e:
            print(f"[ESTATISTICAS] [ERROR] Erro ao obter estatísticas do período: {e}")
            import traceback
            print(traceback.format_exc())
            return {"error": str(e)}

