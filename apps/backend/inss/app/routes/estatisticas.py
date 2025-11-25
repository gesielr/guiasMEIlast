"""
Rotas para estatísticas GPS.
Fase 3: Otimizações
"""
from __future__ import annotations

from typing import Optional
from datetime import date, datetime
from fastapi import APIRouter, HTTPException, status, Request, Depends
from fastapi.security import HTTPBearer
from pydantic import BaseModel, Field

from ..services.supabase_service import SupabaseService
from ..services.estatisticas_service import EstatisticasService
from ..services.auth_service import auth_service, security_scheme
from ..middleware.rate_limit import limiter


router = APIRouter(tags=["GPS Estatísticas"])

# Instâncias dos serviços
supabase_service = SupabaseService()
estatisticas_service = EstatisticasService(supabase_service)


@router.post("/estatisticas/popular")
@limiter.limit("10/hour")  # Limite muito restrito (operação pesada)
async def popular_estatisticas(
    request: Request,
    data_ref: Optional[str] = None,
    credentials: Optional[HTTPBearer] = Depends(security_scheme)
):
    """
    Popula estatísticas GPS para uma data específica.
    
    Requer autenticação: API Key (X-API-Key) ou JWT (Authorization: Bearer)
    
    Args:
        data_ref: Data no formato YYYY-MM-DD (padrão: hoje)
    
    Returns:
        Resultado da população de estatísticas
    """
    # Verificar autenticação
    authorization = request.headers.get("Authorization")
    x_api_key = request.headers.get("X-API-Key")
    auth_service.verificar_autenticacao(authorization=authorization, x_api_key=x_api_key)
    
    try:
        # Converter data
        if data_ref:
            data_objeto = datetime.fromisoformat(data_ref).date()
        else:
            data_objeto = date.today()
        
        resultado = await estatisticas_service.popular_estatisticas_dia(data_objeto)
        
        return {
            "success": True,
            "data": data_objeto.isoformat(),
            "resultado": resultado
        }
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Data inválida: {str(e)}"
        )
    except Exception as e:
        import traceback
        print(f"[ESTATISTICAS ROUTE] Erro ao popular estatísticas: {e}")
        print(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao popular estatísticas: {str(e)}"
        )


@router.get("/estatisticas/periodo")
@limiter.limit("30/hour")
async def obter_estatisticas_periodo(
    request: Request,
    data_inicio: str,
    data_fim: str,
    credentials: Optional[HTTPBearer] = Depends(security_scheme)
):
    """
    Obtém estatísticas de um período.
    
    Requer autenticação: API Key (X-API-Key) ou JWT (Authorization: Bearer)
    
    Args:
        data_inicio: Data inicial (formato YYYY-MM-DD)
        data_fim: Data final (formato YYYY-MM-DD)
    
    Returns:
        Estatísticas agregadas do período
    """
    # Verificar autenticação
    authorization = request.headers.get("Authorization")
    x_api_key = request.headers.get("X-API-Key")
    auth_service.verificar_autenticacao(authorization=authorization, x_api_key=x_api_key)
    
    try:
        data_inicio_obj = datetime.fromisoformat(data_inicio).date()
        data_fim_obj = datetime.fromisoformat(data_fim).date()
        
        if data_inicio_obj > data_fim_obj:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Data inicial deve ser anterior à data final"
            )
        
        resultado = await estatisticas_service.obter_estatisticas_periodo(
            data_inicio_obj,
            data_fim_obj
        )
        
        return resultado
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Data inválida: {str(e)}"
        )
    except Exception as e:
        import traceback
        print(f"[ESTATISTICAS ROUTE] Erro ao obter estatísticas do período: {e}")
        print(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao obter estatísticas: {str(e)}"
        )

