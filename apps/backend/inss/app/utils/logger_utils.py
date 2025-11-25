"""
Utilitários para logging estruturado e mascaramento de dados sensíveis.
"""
from __future__ import annotations

import json
import logging
import os
from typing import Any, Dict, Optional
from datetime import datetime


class StructuredLogger:
    """
    Logger estruturado que gera logs em formato JSON.
    """
    
    def __init__(self, name: str):
        """
        Inicializa logger estruturado.
        
        Args:
            name: Nome do logger
        """
        self.logger = logging.getLogger(name)
        self.use_json = os.getenv("GPS_LOG_JSON", "false").lower() == "true"
    
    def _mask_sensitive_data(self, data: Any) -> Any:
        """
        Mascara dados sensíveis em logs.
        
        Args:
            data: Dados a serem mascarados
        
        Returns:
            Dados com informações sensíveis mascaradas
        """
        if isinstance(data, dict):
            masked = {}
            for key, value in data.items():
                # Mascarar campos sensíveis
                if any(sensitive in key.lower() for sensitive in [
                    'cpf', 'nit', 'pis', 'document', 'password', 'token', 
                    'api_key', 'secret', 'authorization', 'senha'
                ]):
                    if isinstance(value, str) and len(value) > 0:
                        # Manter primeiros 3 e últimos 2 caracteres
                        if len(value) > 5:
                            masked[key] = f"{value[:3]}***{value[-2:]}"
                        else:
                            masked[key] = "***"
                    else:
                        masked[key] = "***"
                else:
                    masked[key] = self._mask_sensitive_data(value)
            return masked
        elif isinstance(data, list):
            return [self._mask_sensitive_data(item) for item in data]
        elif isinstance(data, str):
            # Verificar se parece ser um CPF/NIT/PIS (11 dígitos)
            if data.isdigit() and len(data) == 11:
                return f"{data[:3]}***{data[-2:]}"
            return data
        else:
            return data
    
    def _format_log(self, level: str, message: str, **kwargs) -> str:
        """
        Formata log como JSON ou texto simples.
        
        Args:
            level: Nível do log (INFO, WARNING, ERROR, etc.)
            message: Mensagem do log
            **kwargs: Campos adicionais
        
        Returns:
            String formatada (JSON ou texto)
        """
        log_data = {
            "timestamp": datetime.now().isoformat(),
            "level": level,
            "message": message,
            **kwargs
        }
        
        # Mascarar dados sensíveis
        log_data = self._mask_sensitive_data(log_data)
        
        if self.use_json:
            return json.dumps(log_data, ensure_ascii=False)
        else:
            # Formato legível para desenvolvimento
            parts = [f"[{level}] {message}"]
            for key, value in kwargs.items():
                if key != "message":
                    parts.append(f"{key}={value}")
            return " | ".join(parts)
    
    def info(self, message: str, **kwargs):
        """Log de informação."""
        formatted = self._format_log("INFO", message, **kwargs)
        self.logger.info(formatted)
    
    def warning(self, message: str, **kwargs):
        """Log de aviso."""
        formatted = self._format_log("WARNING", message, **kwargs)
        self.logger.warning(formatted)
    
    def error(self, message: str, **kwargs):
        """Log de erro."""
        formatted = self._format_log("ERROR", message, **kwargs)
        self.logger.error(formatted)
    
    def debug(self, message: str, **kwargs):
        """Log de debug."""
        formatted = self._format_log("DEBUG", message, **kwargs)
        self.logger.debug(formatted)
    
    def critical(self, message: str, **kwargs):
        """Log crítico."""
        formatted = self._format_log("CRITICAL", message, **kwargs)
        self.logger.critical(formatted)


def get_logger(name: str) -> StructuredLogger:
    """
    Obtém instância de logger estruturado.
    
    Args:
        name: Nome do logger
    
    Returns:
        Instância de StructuredLogger
    """
    return StructuredLogger(name)

