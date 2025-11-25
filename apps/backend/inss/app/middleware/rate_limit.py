"""
Middleware de rate limiting para endpoints GPS.
Usa slowapi para limitar requisições por IP/usuário.
"""
from __future__ import annotations

import os
from typing import Callable
from fastapi import Request, Response
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded


def get_rate_limit_key(request: Request) -> str:
    """
    Obtém chave para rate limiting.
    
    Prioridade:
    1. API Key (se presente)
    2. User ID do JWT (se presente)
    3. IP do cliente
    
    Args:
        request: Request do FastAPI
    
    Returns:
        Chave para rate limiting
    """
    # Tentar obter API Key do header
    api_key = request.headers.get("X-API-Key")
    if api_key:
        # Usar hash da API key (não expor a key completa)
        import hashlib
        return f"api_key:{hashlib.sha256(api_key.encode()).hexdigest()[:16]}"
    
    # Tentar obter User ID do JWT (se autenticação JWT estiver ativa)
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.replace("Bearer ", "").strip()
        try:
            import jwt
            jwt_secret = os.getenv("GPS_JWT_SECRET", os.getenv("JWT_SECRET"))
            if jwt_secret:
                payload = jwt.decode(token, jwt_secret, algorithms=["HS256"])
                user_id = payload.get("sub") or payload.get("user_id")
                if user_id:
                    return f"user:{user_id}"
        except Exception:
            pass  # Se falhar, usar IP
    
    # Fallback: usar IP do cliente
    return get_remote_address(request)


# Criar instância do limiter
limiter = Limiter(
    key_func=get_rate_limit_key,
    default_limits=["100/hour"],  # Limite padrão: 100 requisições por hora
    storage_uri="memory://"  # Usar memória (pode mudar para Redis em produção)
)


def configurar_rate_limiting(app):
    """
    Configura rate limiting na aplicação FastAPI.
    
    Args:
        app: Instância do FastAPI
    """
    # Adicionar limiter ao estado da app
    app.state.limiter = limiter
    
    # Adicionar exception handler para RateLimitExceeded
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
    
    print("[RATE LIMIT] [OK] Rate limiting configurado")
    print(f"[RATE LIMIT] Limite padrão: 100 requisições/hora por IP/API Key")
    
    # Log de limites customizados se configurados
    custom_limit = os.getenv("GPS_RATE_LIMIT", None)
    if custom_limit:
        print(f"[RATE LIMIT] Limite customizado via GPS_RATE_LIMIT: {custom_limit}")


def obter_limite_personalizado() -> str:
    """
    Obtém limite personalizado da variável de ambiente.
    
    Returns:
        String com limite no formato "X/Y" (ex: "10/minute")
    """
    return os.getenv("GPS_RATE_LIMIT", "100/hour")

