#!/usr/bin/env python3
"""
Script para verificar integrações necessárias:
1. Z-API (WhatsApp)
2. ngrok (túnel público)
3. Variáveis de ambiente

Execute: python verificar_integracoes.py
"""

import os
import sys
import requests
from pathlib import Path
from typing import Dict, Optional, Tuple

# Adicionar app ao path
sys.path.insert(0, str(Path(__file__).parent / "app"))

try:
    from app.config import get_settings
except ImportError:
    print("⚠ ERRO: Não foi possível importar configurações")
    sys.exit(1)


def print_header(text: str):
    """Imprime cabeçalho formatado"""
    print("\n" + "=" * 80)
    print(f"  {text}")
    print("=" * 80 + "\n")


def print_success(text: str):
    """Imprime mensagem de sucesso"""
    print(f"  ✅ {text}")


def print_error(text: str):
    """Imprime mensagem de erro"""
    print(f"  ❌ {text}")


def print_warning(text: str):
    """Imprime mensagem de aviso"""
    print(f"  ⚠️  {text}")


def print_info(text: str):
    """Imprime mensagem informativa"""
    print(f"  ℹ️  {text}")


def verificar_zapi() -> Tuple[bool, Dict[str, str]]:
    """Verifica configuração e conectividade da Z-API"""
    print_header("VERIFICAÇÃO Z-API (WhatsApp)")
    
    config = {}
    faltando = []
    
    # Carregar variáveis de ambiente
    zapi_base = os.getenv("ZAPI_BASE_URL") or os.getenv("ZAPI_BASE") or "https://api.z-api.io"
    zapi_instance = os.getenv("ZAPI_INSTANCE_ID") or os.getenv("ZAPI_INSTANCE")
    zapi_token = os.getenv("ZAPI_TOKEN")
    zapi_client_token = os.getenv("ZAPI_CLIENT_TOKEN")
    
    config["base_url"] = zapi_base
    config["instance_id"] = zapi_instance or "NÃO CONFIGURADO"
    config["token"] = zapi_token or "NÃO CONFIGURADO"
    config["client_token"] = zapi_client_token or "NÃO CONFIGURADO"
    
    # Verificar variáveis obrigatórias
    if not zapi_instance:
        faltando.append("ZAPI_INSTANCE_ID")
    if not zapi_token:
        faltando.append("ZAPI_TOKEN")
    if not zapi_client_token:
        faltando.append("ZAPI_CLIENT_TOKEN (opcional, mas recomendado)")
    
    print_info(f"Base URL: {zapi_base}")
    print_info(f"Instance ID: {zapi_instance[:10] + '...' if zapi_instance and len(zapi_instance) > 10 else 'NÃO CONFIGURADO'}")
    print_info(f"Token: {'***' + zapi_token[-4:] if zapi_token and len(zapi_token) > 4 else 'NÃO CONFIGURADO'}")
    print_info(f"Client Token: {'***' + zapi_client_token[-4:] if zapi_client_token and len(zapi_client_token) > 4 else 'NÃO CONFIGURADO'}")
    
    if faltando:
        print_warning(f"Variáveis faltando: {', '.join(faltando)}")
        print_info("Configure essas variáveis no arquivo .env do backend")
        return False, config
    
    # Testar conectividade
    try:
        # Construir URL de status
        if "/instances/" in zapi_base:
            # URL completa já fornecida
            status_url = f"{zapi_base}/status"
        else:
            # Construir URL
            status_url = f"{zapi_base}/instances/{zapi_instance}/token/{zapi_token}/status"
        
        headers = {}
        if zapi_client_token:
            headers["Client-Token"] = zapi_client_token
        
        print_info("Testando conectividade com Z-API...")
        response = requests.get(status_url, headers=headers, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            print_success(f"Z-API conectada com sucesso!")
            print_info(f"Status da instância: {data.get('status', 'N/A')}")
            print_info(f"Conectado: {data.get('connected', 'N/A')}")
            return True, config
        else:
            print_error(f"Z-API retornou status {response.status_code}")
            print_info(f"Resposta: {response.text[:200]}")
            return False, config
            
    except requests.exceptions.RequestException as e:
        print_error(f"Erro ao conectar com Z-API: {str(e)}")
        return False, config


def verificar_ngrok() -> Tuple[bool, Dict[str, str]]:
    """Verifica se ngrok está rodando e acessível"""
    print_header("VERIFICAÇÃO NGROK")
    
    config = {}
    
    # Verificar variável de ambiente
    backend_url = os.getenv("BACKEND_URL")
    ngrok_url = os.getenv("NGROK_URL")
    
    urls_para_testar = []
    
    if backend_url:
        urls_para_testar.append(("BACKEND_URL", backend_url))
    if ngrok_url:
        urls_para_testar.append(("NGROK_URL", ngrok_url))
    
    # Tentar descobrir ngrok localmente (porta padrão 4040)
    try:
        ngrok_api = requests.get("http://localhost:4040/api/tunnels", timeout=2)
        if ngrok_api.status_code == 200:
            tunnels = ngrok_api.json().get("tunnels", [])
            if tunnels:
                public_url = tunnels[0].get("public_url")
                if public_url:
                    urls_para_testar.append(("ngrok local (porta 4040)", public_url))
    except:
        pass
    
    if not urls_para_testar:
        print_warning("Nenhuma URL de ngrok configurada")
        print_info("Configure BACKEND_URL ou NGROK_URL no .env")
        print_info("Ou inicie o ngrok e ele será detectado automaticamente")
        return False, config
    
    for nome, url in urls_para_testar:
        print_info(f"Testando {nome}: {url}")
        try:
            # Testar se a URL está acessível
            response = requests.get(url, timeout=5)
            if response.status_code in [200, 404, 405]:  # 404/405 são OK, significa que o servidor está respondendo
                print_success(f"{nome} está acessível!")
                config["url"] = url
                config["nome"] = nome
                
                # Verificar se é um túnel ngrok válido
                if "ngrok" in url.lower() or "ngrok-free" in url.lower():
                    print_success("Túnel ngrok detectado e funcionando!")
                    return True, config
                else:
                    print_warning("URL configurada, mas não parece ser ngrok")
                    return True, config
        except requests.exceptions.RequestException as e:
            print_error(f"Erro ao acessar {nome}: {str(e)}")
            continue
    
    return False, config


def verificar_variaveis_ambiente():
    """Verifica variáveis de ambiente essenciais"""
    print_header("VERIFICAÇÃO VARIÁVEIS DE AMBIENTE")
    
    try:
        settings = get_settings()
        
        # Verificar Supabase
        print_info("Supabase:")
        print_info(f"  URL: {settings.supabase_url}")
        print_info(f"  Key: {'***' + str(settings.supabase_key)[-10:] if settings.supabase_key else 'NÃO CONFIGURADO'}")
        
        # Verificar Z-API (já verificado acima, mas mostrar aqui também)
        print_info("\nZ-API:")
        zapi_base = os.getenv("ZAPI_BASE_URL") or os.getenv("ZAPI_BASE")
        zapi_instance = os.getenv("ZAPI_INSTANCE_ID") or os.getenv("ZAPI_INSTANCE")
        print_info(f"  Base URL: {zapi_base or 'NÃO CONFIGURADO'}")
        print_info(f"  Instance ID: {zapi_instance or 'NÃO CONFIGURADO'}")
        
        # Verificar ngrok/backend URL
        print_info("\nBackend/ngrok:")
        backend_url = os.getenv("BACKEND_URL")
        ngrok_url = os.getenv("NGROK_URL")
        print_info(f"  BACKEND_URL: {backend_url or 'NÃO CONFIGURADO'}")
        print_info(f"  NGROK_URL: {ngrok_url or 'NÃO CONFIGURADO'}")
        
        print_success("Variáveis de ambiente carregadas com sucesso!")
        return True
        
    except Exception as e:
        print_error(f"Erro ao carregar variáveis de ambiente: {str(e)}")
        return False


def main():
    """Função principal"""
    print_header("VERIFICAÇÃO DE INTEGRAÇÕES - GUIAS MEI")
    
    resultados = {
        "zapi": False,
        "ngrok": False,
        "variaveis": False
    }
    
    # Verificar variáveis de ambiente
    resultados["variaveis"] = verificar_variaveis_ambiente()
    
    # Verificar Z-API
    resultados["zapi"], _ = verificar_zapi()
    
    # Verificar ngrok
    resultados["ngrok"], _ = verificar_ngrok()
    
    # Resumo final
    print_header("RESUMO DA VERIFICAÇÃO")
    
    print_info("Variáveis de Ambiente:")
    print(f"  {'✅ OK' if resultados['variaveis'] else '❌ FALHOU'}")
    
    print_info("\nZ-API (WhatsApp):")
    print(f"  {'✅ OK' if resultados['zapi'] else '❌ FALHOU'}")
    
    print_info("\nngrok (Túnel Público):")
    print(f"  {'✅ OK' if resultados['ngrok'] else '❌ FALHOU'}")
    
    print("\n" + "=" * 80)
    
    if all(resultados.values()):
        print_success("TODAS AS INTEGRAÇÕES ESTÃO OK! 🎉")
        return 0
    else:
        print_warning("ALGUMAS INTEGRAÇÕES PRECISAM DE ATENÇÃO")
        print_info("Revise as configurações acima e corrija os problemas antes de continuar")
        return 1


if __name__ == "__main__":
    sys.exit(main())

