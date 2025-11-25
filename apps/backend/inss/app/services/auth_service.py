"""
Serviço de autenticação para endpoints GPS.
Suporta API Key e JWT (opcional).
"""
from __future__ import annotations

import os
import jwt
from typing import Optional, Dict, Any
from fastapi import HTTPException, status, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials


class AuthService:
    """
    Serviço de autenticação para proteger endpoints GPS.
    
    Suporta:
    - API Key (simples, via header X-API-Key ou Authorization Bearer)
    - JWT (opcional, se JWT_SECRET configurado)
    """
    
    def __init__(self):
        """Inicializa o serviço de autenticação."""
        # API Key simples (recomendado para começar)
        self.api_key = os.getenv("GPS_API_KEY", os.getenv("API_KEY"))
        
        # JWT (opcional)
        self.jwt_secret = os.getenv("GPS_JWT_SECRET", os.getenv("JWT_SECRET"))
        self.jwt_algorithm = os.getenv("GPS_JWT_ALGORITHM", "HS256")
        
        # Verificar se algum método está configurado
        self.has_api_key = bool(self.api_key)
        self.has_jwt = bool(self.jwt_secret)
        
        if not (self.has_api_key or self.has_jwt):
            print("[AUTH SERVICE] [WARN] Nenhum metodo de autenticacao configurado!")
            print("[AUTH SERVICE] Configure GPS_API_KEY ou GPS_JWT_SECRET")
            print("[AUTH SERVICE] [WARN] Endpoints estarao DESPROTEGIDOS!")
        else:
            metodos = []
            if self.has_api_key:
                metodos.append("API Key")
            if self.has_jwt:
                metodos.append("JWT")
            print(f"[AUTH SERVICE] [OK] Metodos de autenticacao configurados: {', '.join(metodos)}")
    
    def verificar_api_key(self, api_key: Optional[str]) -> bool:
        """
        Verifica se a API key é válida.
        
        Args:
            api_key: API key fornecida
        
        Returns:
            True se válida, False caso contrário
        """
        if not self.has_api_key:
            return False
        
        if not api_key:
            return False
        
        # Comparação timing-safe para evitar timing attacks
        import hmac
        return hmac.compare_digest(api_key, self.api_key)
    
    def verificar_jwt(self, token: str) -> Optional[Dict[str, Any]]:
        """
        Verifica e decodifica token JWT.
        
        Args:
            token: Token JWT
        
        Returns:
            Payload do token se válido, None caso contrário
        """
        if not self.has_jwt:
            return None
        
        try:
            payload = jwt.decode(
                token,
                self.jwt_secret,
                algorithms=[self.jwt_algorithm]
            )
            return payload
        except jwt.ExpiredSignatureError:
            print("[AUTH SERVICE] Token JWT expirado")
            return None
        except jwt.InvalidTokenError as e:
            print(f"[AUTH SERVICE] Token JWT inválido: {e}")
            return None
    
    def verificar_autenticacao(
        self,
        authorization: Optional[str] = None,
        x_api_key: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Verifica autenticação usando qualquer método disponível.
        
        Args:
            authorization: Header Authorization (Bearer token ou API key)
            x_api_key: Header X-API-Key
        
        Returns:
            Dicionário com informações de autenticação
        
        Raises:
            HTTPException: Se autenticação falhar
        """
        # Se nenhum método está configurado, permitir acesso (modo desenvolvimento)
        if not (self.has_api_key or self.has_jwt):
            print("[AUTH SERVICE] [WARN] Modo desenvolvimento: autenticação desabilitada")
            return {"method": "none", "authenticated": True}
        
        # Tentar API Key primeiro (mais simples)
        if self.has_api_key:
            # Tentar X-API-Key header
            if x_api_key and self.verificar_api_key(x_api_key):
                return {"method": "api_key", "authenticated": True}
            
            # Tentar Authorization header com API key
            if authorization:
                # Remover "Bearer " se presente
                token = authorization.replace("Bearer ", "").strip()
                if self.verificar_api_key(token):
                    return {"method": "api_key", "authenticated": True}
        
        # Tentar JWT
        if self.has_jwt and authorization:
            token = authorization.replace("Bearer ", "").strip()
            payload = self.verificar_jwt(token)
            if payload:
                return {
                    "method": "jwt",
                    "authenticated": True,
                    "payload": payload
                }
        
        # Se chegou aqui, autenticação falhou
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Autenticação necessária. Forneça API Key (X-API-Key) ou Token JWT (Authorization: Bearer)",
            headers={"WWW-Authenticate": "Bearer"},
        )


# Instância global do serviço de autenticação
auth_service = AuthService()

# Security scheme para FastAPI
security_scheme = HTTPBearer(auto_error=False)


async def verificar_autenticacao_dependencia(
    credentials: Optional[HTTPAuthorizationCredentials] = Security(security_scheme),
    x_api_key: Optional[str] = None
) -> Dict[str, Any]:
    """
    Dependency para FastAPI que verifica autenticação.
    
    Args:
        credentials: Credenciais do HTTPBearer
        x_api_key: Header X-API-Key (será injetado pelo FastAPI)
    
    Returns:
        Dicionário com informações de autenticação
    
    Raises:
        HTTPException: Se autenticação falhar
    """
    authorization = None
    if credentials:
        authorization = f"Bearer {credentials.credentials}"
    
    # Buscar X-API-Key do header (precisa ser feito manualmente via Request)
    # Por enquanto, vamos usar apenas Authorization
    return auth_service.verificar_autenticacao(
        authorization=authorization,
        x_api_key=x_api_key
    )

