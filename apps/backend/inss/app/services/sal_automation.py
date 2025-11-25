"""
Automação web para interagir com o sistema SAL (Sistema de Acréscimos Legais)
da Receita Federal e emitir GPS oficialmente.

Este serviço usa Playwright para automatizar o fluxo completo de emissão de GPS
no sistema SAL oficial.
"""
from __future__ import annotations

import os
import asyncio
import tempfile
from typing import Optional, Dict, Any
from datetime import datetime
from io import BytesIO

try:
    from playwright.async_api import async_playwright, Browser, Page, BrowserContext, TimeoutError as PlaywrightTimeoutError
    PLAYWRIGHT_AVAILABLE = True
except ImportError:
    PLAYWRIGHT_AVAILABLE = False
    print("[WARN] Playwright não disponível. Instale com: pip install playwright && playwright install chromium")

# URLs do sistema SAL
SAL_BASE_URL = "https://sal.rfb.gov.br"
SAL_HOME_URL = f"{SAL_BASE_URL}/home"
SAL_MODULO_URL = f"{SAL_BASE_URL}/contribuintes-filiados-depois-de-29-11-1999"


class SALAutomation:
    """
    Classe para automação web do sistema SAL usando Playwright.
    
    Implementa o fluxo completo de emissão de GPS:
    1. Acessa sistema SAL
    2. Preenche dados do contribuinte
    3. Adiciona contribuição
    4. Seleciona código de pagamento
    5. Emite GPS
    6. Baixa PDF
    7. Extrai código de barras
    """
    
    def __init__(self):
        """Inicializa o serviço de automação SAL."""
        self.browser: Optional[Browser] = None
        self.playwright = None
        self.headless: bool = True  # Modo headless por padrão
    
    async def initialize(self) -> None:
        """
        Inicializa o navegador Playwright.
        
        Raises:
            RuntimeError: Se Playwright não estiver disponível
        """
        if not PLAYWRIGHT_AVAILABLE:
            raise RuntimeError(
                "Playwright não está disponível. "
                "Instale com: pip install playwright && playwright install chromium"
            )
        
        if self.playwright is None:
            self.playwright = await async_playwright().start()
        
        if self.browser is None:
            self.browser = await self.playwright.chromium.launch(
                headless=self.headless,
                args=['--no-sandbox', '--disable-setuid-sandbox']
            )
    
    async def _criar_contexto(self) -> BrowserContext:
        """
        Cria um novo contexto de navegador.
        
        Returns:
            Contexto do navegador configurado
        """
        if self.browser is None:
            await self.initialize()
        
        # [OK] CORREÇÃO: Remover indicadores de automação e configurar locale pt-BR
        context = await self.browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            locale='pt-BR',
            timezone_id='America/Sao_Paulo'
        )
        
        # [OK] CORREÇÃO: Remover indicador webdriver para evitar detecção
        await context.add_init_script("""
            Object.defineProperty(navigator, 'webdriver', {
                get: () => undefined
            });
            
            // Remover outras propriedades que indicam automação
            delete navigator.__proto__.webdriver;
        """)
        
        print("[SAL] Contexto do navegador configurado (locale pt-BR, webdriver removido)")
        
        return context
    
    async def _aguardar_elemento(
        self,
        page: Page,
        seletor: str,
        timeout: int = 30000,
        multiplos_seletores: Optional[list[str]] = None
    ) -> None:
        """
        Aguarda elemento aparecer na página, tentando múltiplos seletores.
        
        Args:
            page: Página do Playwright
            seletor: Seletor CSS principal
            timeout: Timeout em milissegundos
            multiplos_seletores: Lista de seletores alternativos
        
        Raises:
            PlaywrightTimeoutError: Se nenhum elemento for encontrado
        """
        seletores = [seletor]
        if multiplos_seletores:
            seletores.extend(multiplos_seletores)
        
        for sel in seletores:
            try:
                await page.wait_for_selector(sel, timeout=timeout)
                return
            except PlaywrightTimeoutError:
                continue
        
        # Se nenhum funcionou, tentar o primeiro e lançar erro
        await page.wait_for_selector(seletor, timeout=timeout)
    
    async def emitir_gps(self, dados: Dict[str, Any]) -> Dict[str, Any]:
        """
        Emite GPS através do sistema SAL oficial.
        
        Args:
            dados: Dicionário com dados da GPS:
                - nit_pis_pasep: NIT/PIS/PASEP formatado (XXX.XXXXX.XX-X)
                - competencia: Competência no formato MM/YYYY
                - salario_contribuicao: Valor do salário de contribuição (float)
                - codigo_pagamento: Código de pagamento (ex: "1007", "1163")
                - data_pagamento: Data de pagamento no formato DD/MM/YYYY (opcional)
                - nome_contribuinte: Nome do contribuinte (opcional)
        
        Returns:
            Dicionário com resultado:
                - pdf_bytes: bytes do PDF gerado
                - codigo_barras: código de barras extraído (opcional)
                - valor_total: valor total calculado (opcional)
                - vencimento: data de vencimento (opcional)
                - juros: valor de juros (opcional)
                - multa: valor de multa (opcional)
        
        Raises:
            RuntimeError: Se não conseguir emitir a GPS
        """
        await self.initialize()
        
        context = await self._criar_contexto()
        page = await context.new_page()
        
        try:
            print(f"[SAL] Acessando sistema SAL: {SAL_MODULO_URL}")
            
            # 1. Acessar página do módulo
            await page.goto(SAL_MODULO_URL, wait_until='networkidle', timeout=60000)
            await asyncio.sleep(2)  # Aguardar carregamento completo
            
            # 2. Preencher NIT/PIS/PASEP
            nit = dados.get("nit_pis_pasep", "")
            print(f"[SAL] Preenchendo NIT/PIS/PASEP: {nit}")
            
            # Tentar múltiplos seletores para o campo NIT
            seletores_nit = [
                'input[name="nit"]',
                'input[id*="nit"]',
                'input[placeholder*="NIT"]',
                'input[placeholder*="PIS"]',
                'input[type="text"]'
            ]
            
            await self._aguardar_elemento(page, seletores_nit[0], multiplos_seletores=seletores_nit[1:])
            await page.fill(seletores_nit[0], nit)
            
            # 3. Clicar em "Consultar"
            print("[SAL] Clicando em Consultar...")
            seletores_consultar = [
                'button:has-text("Consultar")',
                'button[type="submit"]',
                'input[type="submit"]',
                'button.btn-primary',
                'a:has-text("Consultar")'
            ]
            
            for sel in seletores_consultar:
                try:
                    await page.click(sel, timeout=5000)
                    break
                except:
                    continue
            
            # Aguardar carregamento da próxima página
            await page.wait_for_load_state('networkidle', timeout=30000)
            await asyncio.sleep(2)
            
            # 4. Adicionar contribuição
            print("[SAL] Adicionando contribuição...")
            seletores_adicionar = [
                'button:has-text("Adicionar")',
                'button:has-text("+ Adicionar")',
                'a:has-text("Adicionar")',
                'button.btn-success'
            ]
            
            for sel in seletores_adicionar:
                try:
                    await page.click(sel, timeout=5000)
                    break
                except:
                    continue
            
            # Aguardar modal aparecer
            await asyncio.sleep(1)
            
            # 5. Preencher competência no modal
            competencia = dados.get("competencia", "")
            print(f"[SAL] Preenchendo competência: {competencia}")
            
            seletores_competencia = [
                'input[name="competencia"]',
                'input[placeholder*="Competência"]',
                'input[id*="competencia"]'
            ]
            
            await self._aguardar_elemento(page, seletores_competencia[0], multiplos_seletores=seletores_competencia[1:])
            await page.fill(seletores_competencia[0], competencia)
            
            # 6. Preencher salário de contribuição
            salario = dados.get("salario_contribuicao", 0.0)
            print(f"[SAL] Preenchendo salário: R$ {salario:,.2f}")
            
            salario_formatado = f"{salario:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
            
            seletores_salario = [
                'input[name="salario"]',
                'input[placeholder*="Salário"]',
                'input[id*="salario"]'
            ]
            
            await self._aguardar_elemento(page, seletores_salario[0], multiplos_seletores=seletores_salario[1:])
            await page.fill(seletores_salario[0], salario_formatado)
            
            # 7. Confirmar adição
            print("[SAL] Confirmando adição...")
            seletores_confirmar = [
                'button:has-text("Confirmar")',
                'button.btn-primary:has-text("Confirmar")',
                'button[type="submit"]'
            ]
            
            for sel in seletores_confirmar:
                try:
                    await page.click(sel, timeout=5000)
                    break
                except:
                    continue
            
            await page.wait_for_load_state('networkidle', timeout=30000)
            await asyncio.sleep(2)
            
            # 8. Preencher código de pagamento
            codigo_pagamento = dados.get("codigo_pagamento", "")
            print(f"[SAL] Preenchendo código de pagamento: {codigo_pagamento}")
            
            seletores_codigo = [
                'select[name="codigoPagamento"]',
                'input[name="codigoPagamento"]',
                'select[id*="codigo"]',
                'input[id*="codigo"]'
            ]
            
            for sel in seletores_codigo:
                try:
                    if 'select' in sel:
                        await page.select_option(sel, codigo_pagamento, timeout=5000)
                    else:
                        await page.fill(sel, codigo_pagamento)
                    break
                except:
                    continue
            
            # 9. Preencher data de pagamento (se necessário)
            data_pagamento = dados.get("data_pagamento")
            if data_pagamento:
                print(f"[SAL] Preenchendo data de pagamento: {data_pagamento}")
                seletores_data = [
                    'input[name="dataPagamento"]',
                    'input[type="date"]',
                    'input[id*="data"]'
                ]
                
                for sel in seletores_data:
                    try:
                        await page.fill(sel, data_pagamento, timeout=5000)
                        break
                    except:
                        continue
            
            # 10. Clicar em "Emitir GPS" ou "Confirmar"
            print("[SAL] Emitindo GPS...")
            seletores_emitir = [
                'button:has-text("Emitir GPS")',
                'button:has-text("Emitir")',
                'button:has-text("Confirmar")',
                'button.btn-primary:has-text("Emitir")'
            ]
            
            for sel in seletores_emitir:
                try:
                    await page.click(sel, timeout=5000)
                    break
                except:
                    continue
            
            # 11. Aguardar download do PDF
            print("[SAL] Aguardando download do PDF...")
            
            # Configurar download
            async with page.expect_download(timeout=60000) as download_info:
                # O download pode ser disparado pelo clique acima
                await asyncio.sleep(3)  # Dar tempo para o download iniciar
            
            download = await download_info.value
            pdf_path = await download.path()
            
            # 12. Ler conteúdo do PDF
            with open(pdf_path, 'rb') as f:
                pdf_bytes = f.read()
            
            print(f"[SAL] [OK] PDF gerado com sucesso! Tamanho: {len(pdf_bytes)} bytes")
            
            # 13. Tentar extrair código de barras da página (se disponível)
            codigo_barras = None
            try:
                # Tentar encontrar código de barras na página
                seletores_codigo_barras = [
                    'span[id*="codigo"]',
                    'div[id*="codigo"]',
                    'input[id*="codigo"][readonly]',
                    'span:has-text("274")'
                ]
                
                for sel in seletores_codigo_barras:
                    try:
                        elemento = await page.query_selector(sel)
                        if elemento:
                            codigo_barras = await elemento.inner_text()
                            codigo_barras = "".join(filter(str.isdigit, codigo_barras))
                            if len(codigo_barras) == 48:
                                print(f"[SAL] Código de barras extraído: {codigo_barras[:10]}...")
                                break
                    except:
                        continue
            except Exception as e:
                print(f"[SAL] Não foi possível extrair código de barras: {e}")
            
            # 14. Tentar extrair valores calculados (se disponível)
            valor_total = None
            vencimento = None
            juros = None
            multa = None
            
            try:
                # Tentar encontrar valores na página
                seletores_valor = [
                    'span[id*="total"]',
                    'div[id*="total"]',
                    'td:has-text("Total")'
                ]
                
                for sel in seletores_valor:
                    try:
                        elemento = await page.query_selector(sel)
                        if elemento:
                            texto = await elemento.inner_text()
                            # Extrair valor numérico
                            import re
                            valores = re.findall(r'[\d,]+\.?\d*', texto)
                            if valores:
                                valor_str = valores[0].replace(',', '.')
                                valor_total = float(valor_str)
                                break
                    except:
                        continue
            except Exception as e:
                print(f"[SAL] Não foi possível extrair valores: {e}")
            
            # Limpar arquivo temporário
            try:
                os.unlink(pdf_path)
            except:
                pass
            
            return {
                'pdf_bytes': pdf_bytes,
                'codigo_barras': codigo_barras,
                'valor_total': valor_total,
                'vencimento': vencimento,
                'juros': juros,
                'multa': multa
            }
            
        except PlaywrightTimeoutError as e:
            print(f"[SAL] [ERROR] Timeout ao interagir com SAL: {e}")
            # Capturar screenshot para debug
            try:
                screenshot_path = 'sal_error.png'
                await page.screenshot(path=screenshot_path)
                print(f"[SAL] Screenshot salvo em: {screenshot_path}")
            except:
                pass
            raise RuntimeError(f"Timeout ao gerar PDF no SAL: {str(e)}")
        except Exception as e:
            print(f"[SAL] [ERROR] Erro ao gerar PDF no SAL: {e}")
            import traceback
            print(traceback.format_exc())
            # Capturar screenshot para debug
            try:
                screenshot_path = 'sal_error.png'
                await page.screenshot(path=screenshot_path)
                print(f"[SAL] Screenshot salvo em: {screenshot_path}")
            except:
                pass
            raise RuntimeError(f"Erro ao gerar PDF no SAL: {str(e)}")
        finally:
            await context.close()
    
    async def close(self) -> None:
        """Fecha o navegador e limpa recursos."""
        if self.browser:
            await self.browser.close()
            self.browser = None
        if self.playwright:
            await self.playwright.stop()
            self.playwright = None
    
    async def __aenter__(self):
        """Context manager entry."""
        await self.initialize()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit - fecha navegador."""
        await self.close()
