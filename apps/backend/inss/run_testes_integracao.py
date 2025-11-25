#!/usr/bin/env python3
"""
Script para executar testes de integração real
==============================================

Este script executa os testes de integração que fazem chamadas reais ao:
- Supabase
- Endpoint de emissão (se servidor estiver rodando)
- WhatsApp (simulado)

Uso:
    python run_testes_integracao.py

Requisitos:
    - Variáveis de ambiente configuradas (.env)
    - Supabase acessível
    - Servidor FastAPI rodando (opcional, para testes de endpoint)
"""

import sys
import os
from pathlib import Path

# Adicionar app ao path
sys.path.insert(0, str(Path(__file__).parent))

import pytest


def main():
    """Executa os testes de integração."""
    print("=" * 70)
    print("TESTES DE INTEGRAÇÃO REAL - FLUXO AUTÔNOMO")
    print("=" * 70)
    print("\nEste script executa testes que fazem chamadas reais ao Supabase")
    print("e ao endpoint de emissão (se disponível).")
    print("\nRequisitos:")
    print("  - Variáveis de ambiente configuradas (.env)")
    print("  - Supabase acessível")
    print("  - Servidor FastAPI rodando (opcional)")
    print("\n" + "=" * 70 + "\n")
    
    # Verificar variáveis de ambiente
    from app.config import get_settings
    settings = get_settings()
    
    print("Configurações:")
    print(f"  - Supabase URL: {str(settings.supabase_url)[:50]}...")
    print(f"  - Supabase Key: {'✓ Configurado' if settings.supabase_key else '✗ Não configurado'}")
    print(f"  - WhatsApp: {settings.twilio_whatsapp_number or 'Não configurado'}")
    print()
    
    # Executar testes
    exit_code = pytest.main([
        "tests/test_integracao_real.py",
        "-v",
        "--tb=short",
        "-s",  # Mostrar prints
        "--asyncio-mode=auto",  # Modo assíncrono automático
    ])
    
    print("\n" + "=" * 70)
    if exit_code == 0:
        print("✅ TODOS OS TESTES PASSARAM!")
    else:
        print("⚠ ALGUNS TESTES FALHARAM OU FORAM PULADOS")
    print("=" * 70)
    
    return exit_code


if __name__ == "__main__":
    sys.exit(main())

