"""
Rotas FastAPI para emissão híbrida de GPS.
"""
from __future__ import annotations

from typing import Optional
from fastapi import APIRouter, HTTPException, status, Request, Depends
from fastapi.security import HTTPBearer
from pydantic import BaseModel, Field
from slowapi import Limiter
from slowapi.util import get_remote_address

from ..services.gps_hybrid_service import GPSHybridService, MetodoEmissao
from ..services.supabase_service import SupabaseService
from ..services.auth_service import auth_service, security_scheme
from ..middleware.rate_limit import limiter, obter_limite_personalizado
from ..utils.cache_service import cache_service


router = APIRouter(prefix="/api/v1/gps", tags=["GPS Híbrido"])

# Instâncias dos serviços
supabase_service = SupabaseService()
gps_hybrid_service = GPSHybridService(supabase_service)


class EmitirGPSRequest(BaseModel):
    """Request para emissão de GPS."""
    user_id: str = Field(..., description="ID do usuário")
    competencia: str = Field(..., description="Competência no formato MM/YYYY")
    valor: float = Field(..., gt=0, description="Valor da contribuição")
    codigo_pagamento: str = Field(..., description="Código de pagamento (ex: 1007, 1163)")
    metodo_forcado: Optional[str] = Field(None, description="Método forçado: local, sal_validado, sal_oficial")
    nome: Optional[str] = Field(None, description="Nome do contribuinte")
    cpf: Optional[str] = Field(None, description="CPF do contribuinte")
    nit: Optional[str] = Field(None, description="NIT/PIS/PASEP do contribuinte")
    endereco: Optional[str] = Field(None, description="Endereço completo")
    telefone: Optional[str] = Field(None, description="Telefone/WhatsApp")


class GPSResponse(BaseModel):
    """Response da emissão de GPS."""
    id: str
    pdf_url: str
    codigo_barras: str
    vencimento: str
    valor_total: float
    metodo_emissao: str
    validado_sal: bool
    validacao_pendente: Optional[bool] = None


@router.post("/emitir", response_model=GPSResponse)
@limiter.limit(obter_limite_personalizado())
async def emitir_gps(
    request: Request,
    body: EmitirGPSRequest,
    credentials: Optional[HTTPBearer] = Depends(security_scheme)
):
    """
    Emite GPS usando estratégia híbrida.
    
    A estratégia decide automaticamente:
    - GPS vencida → SAL oficial
    - Preferência do usuário → respeitada
    - 1% amostragem → validação em background
    - Padrão → geração local
    
    Requer autenticação: API Key (X-API-Key) ou JWT (Authorization: Bearer)
    
    Returns:
        GPSResponse com dados da guia emitida
    """
    # [OK] CORREÇÃO: Verificar autenticação
    authorization = request.headers.get("Authorization")
    x_api_key = request.headers.get("X-API-Key")
    auth_service.verificar_autenticacao(authorization=authorization, x_api_key=x_api_key)
    
    try:
        # Converter método forçado para enum
        metodo_forcado = None
        if body.metodo_forcado:
            try:
                metodo_forcado = MetodoEmissao(body.metodo_forcado.lower())
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Método inválido: {body.metodo_forcado}. Use: local, sal_validado, sal_oficial"
                )
        
        # Preparar dados do usuário
        dados_usuario = {
            "nome": body.nome,
            "cpf": body.cpf,
            "nit": body.nit,
            "endereco": body.endereco,
            "telefone": body.telefone
        }
        
        # Emitir GPS
        resultado = await gps_hybrid_service.emitir_gps(
            user_id=body.user_id,
            competencia=body.competencia,
            valor=body.valor,
            codigo_pagamento=body.codigo_pagamento,
            dados_usuario=dados_usuario,
            metodo_forcado=metodo_forcado
        )
        
        if not isinstance(resultado, dict):
            print(f"[GPS HYBRID ROUTE] [WARN] Resultado inválido de emitir_gps: {resultado}")
            resultado = {}

        return GPSResponse(
            id=str(resultado.get('id', '')),
            pdf_url=resultado.get('pdf_url', ''),
            codigo_barras=resultado.get('codigo_barras', ''),
            vencimento=resultado.get('vencimento', ''),
            valor_total=resultado.get('valor_total', 0.0),
            metodo_emissao=resultado.get('metodo_emissao', 'local'),
            validado_sal=resultado.get('validado_sal', False),
            validacao_pendente=resultado.get('validacao_pendente', False)
        )
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        import traceback
        print(f"[GPS HYBRID ROUTE] Erro ao emitir GPS: {e}")
        print(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao emitir GPS: {str(e)} | Tipo: {type(e).__name__}"
        )


@router.get("/estatisticas")
@limiter.limit("30/hour")  # Limite mais restrito para estatísticas
async def obter_estatisticas(
    request: Request,
    credentials: Optional[HTTPBearer] = Depends(security_scheme)
):
    """
    Retorna estatísticas agregadas de emissões de GPS.
    
    Requer autenticação: API Key (X-API-Key) ou JWT (Authorization: Bearer)
    
    [OK] FASE 3: Cache implementado (TTL: 5 minutos)
    
    Returns:
        Dicionário com estatísticas:
        - total_emitidas: Total de GPS emitidas
        - por_metodo: Contagem por método
        - validadas_sal: Total validadas no SAL
        - divergencias: Total de divergências detectadas
    """
    # [OK] CORREÇÃO: Verificar autenticação
    authorization = request.headers.get("Authorization")
    x_api_key = request.headers.get("X-API-Key")
    auth_service.verificar_autenticacao(authorization=authorization, x_api_key=x_api_key)
    
    try:
        # [OK] FASE 3: Verificar cache primeiro
        cache_key = "gps_estatisticas"
        cached_result = cache_service.get(cache_key)
        if cached_result:
            return cached_result
        
        # Buscar todas as GPS emitidas
        guias = await supabase_service.get_records("gps_emissions", {})
        
        total = len(guias) if guias else 0
        
        # Contar por método
        por_metodo = {}
        validadas_sal = 0
        
        if guias:
            for guia in guias:
                metodo = guia.get("metodo_emissao", "local")
                por_metodo[metodo] = por_metodo.get(metodo, 0) + 1
                
                if guia.get("validado_sal"):
                    validadas_sal += 1
        
        # Buscar divergências
        divergencias = await supabase_service.get_records("gps_divergencias", {"resolvido": False})
        total_divergencias = len(divergencias) if divergencias else 0
        
        resultado = {
            "total_emitidas": total,
            "por_metodo": por_metodo,
            "validadas_sal": validadas_sal,
            "divergencias": total_divergencias,
            "taxa_validacao": round(validadas_sal / total * 100, 2) if total > 0 else 0
        }
        
        # [OK] FASE 3: Armazenar no cache (TTL: 5 minutos)
        cache_service.set(cache_key, resultado, ttl=300)
        
        return resultado
    
    except Exception as e:
        import traceback
        print(f"[GPS HYBRID ROUTE] Erro ao obter estatísticas: {e}")
        print(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao obter estatísticas: {str(e)}"
        )


@router.get("/divergencias")
@limiter.limit("30/hour")  # Limite mais restrito para divergências
async def listar_divergencias(
    request: Request,
    resolvido: Optional[bool] = None,
    usuario_id: Optional[str] = None,
    competencia: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    credentials: Optional[HTTPBearer] = Depends(security_scheme)
):
    """
    Lista divergências entre GPS local e SAL.
    
    Requer autenticação: API Key (X-API-Key) ou JWT (Authorization: Bearer)
    
    [OK] FASE 3: Paginação e filtros adicionais implementados
    
    Args:
        resolvido: Filtrar por status de resolução (opcional)
        usuario_id: Filtrar por ID do usuário (opcional)
        competencia: Filtrar por competência (opcional, formato MM/YYYY)
        limit: Número máximo de resultados (padrão: 50, máximo: 100)
        offset: Número de resultados para pular (padrão: 0)
    
    Returns:
        Dicionário com:
        - total: Total de divergências (antes da paginação)
        - limit: Limite usado
        - offset: Offset usado
        - divergencias: Lista de divergências
    """
    # [OK] CORREÇÃO: Verificar autenticação
    authorization = request.headers.get("Authorization")
    x_api_key = request.headers.get("X-API-Key")
    auth_service.verificar_autenticacao(authorization=authorization, x_api_key=x_api_key)
    
    try:
        # [OK] FASE 3: Validar e limitar paginação
        limit = min(max(1, limit), 100)  # Entre 1 e 100
        offset = max(0, offset)
        
        # Construir filtros
        filtros = {}
        if resolvido is not None:
            filtros["resolvido"] = resolvido
        if usuario_id:
            filtros["usuario_id"] = usuario_id
        if competencia:
            filtros["competencia"] = competencia
        
        # Buscar divergências (com paginação)
        # Nota: SupabaseService pode precisar de ajuste para suportar limit/offset
        # Por enquanto, vamos buscar tudo e paginar em memória
        todas_divergencias = await supabase_service.get_records("gps_divergencias", filtros)
        
        total = len(todas_divergencias) if todas_divergencias else 0
        
        # Aplicar paginação
        divergencias_paginadas = []
        if todas_divergencias:
            # Ordenar por data de criação (mais recentes primeiro)
            todas_divergencias.sort(
                key=lambda x: x.get("created_at", ""),
                reverse=True
            )
            divergencias_paginadas = todas_divergencias[offset:offset + limit]
        
        return {
            "total": total,
            "limit": limit,
            "offset": offset,
            "divergencias": divergencias_paginadas
        }
    
    except Exception as e:
        import traceback
        print(f"[GPS HYBRID ROUTE] Erro ao listar divergências: {e}")
        print(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao listar divergências: {str(e)}"
        )
