"""
Serviço de cache simples para estatísticas e dados frequentes.
Usa cache em memória (pode migrar para Redis em produção).
"""
from __future__ import annotations

import time
from typing import Any, Optional, Dict
from datetime import datetime, timedelta


class CacheService:
    """
    Serviço de cache em memória com TTL (Time To Live).
    """
    
    def __init__(self):
        """Inicializa o serviço de cache."""
        self._cache: Dict[str, Dict[str, Any]] = {}
        self._default_ttl = 300  # 5 minutos padrão
    
    def get(self, key: str) -> Optional[Any]:
        """
        Obtém valor do cache.
        
        Args:
            key: Chave do cache
        
        Returns:
            Valor armazenado ou None se expirado/não existe
        """
        if key not in self._cache:
            return None
        
        entry = self._cache[key]
        expires_at = entry.get("expires_at")
        
        # Verificar se expirou
        if expires_at and datetime.now() > expires_at:
            del self._cache[key]
            return None
        
        return entry.get("value")
    
    def set(self, key: str, value: Any, ttl: Optional[int] = None):
        """
        Armazena valor no cache.
        
        Args:
            key: Chave do cache
            value: Valor a armazenar
            ttl: Time to live em segundos (padrão: 5 minutos)
        """
        if ttl is None:
            ttl = self._default_ttl
        
        expires_at = datetime.now() + timedelta(seconds=ttl)
        
        self._cache[key] = {
            "value": value,
            "expires_at": expires_at,
            "created_at": datetime.now()
        }
    
    def delete(self, key: str):
        """
        Remove valor do cache.
        
        Args:
            key: Chave do cache
        """
        if key in self._cache:
            del self._cache[key]
    
    def clear(self):
        """Limpa todo o cache."""
        self._cache.clear()
    
    def get_stats(self) -> Dict[str, Any]:
        """
        Retorna estatísticas do cache.
        
        Returns:
            Dicionário com estatísticas
        """
        now = datetime.now()
        total_entries = len(self._cache)
        expired_entries = sum(
            1 for entry in self._cache.values()
            if entry.get("expires_at") and entry["expires_at"] < now
        )
        valid_entries = total_entries - expired_entries
        
        return {
            "total_entries": total_entries,
            "valid_entries": valid_entries,
            "expired_entries": expired_entries
        }


# Instância global do cache
cache_service = CacheService()

