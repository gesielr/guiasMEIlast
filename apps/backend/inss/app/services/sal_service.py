"""
Serviço para interagir com o sistema SAL (Sistema de Acréscimos Legais)
e extrair o PDF da guia GPS gerado pelo próprio sistema SAL.
"""
from __future__ import annotations

import os
import asyncio
from typing import Optional, Dict, Any
from io import BytesIO

try:
    from playwright.async_api import async_playwright, Browser, Page, TimeoutError as PlaywrightTimeoutError
    PLAYWRIGHT_AVAILABLE = True
except ImportError:
    PLAYWRIGHT_AVAILABLE = False
    print("[WARN] Playwright não disponível. Instale com: pip install playwright && playwright install chromium")

# URL base do sistema SAL
SAL_BASE_URL = "https://sal.rfb.gov.br"
SAL_LOGIN_URL = f"{SAL_BASE_URL}/home"
SAL_CALCULO_URL = f"{SAL_BASE_URL}/contribuintes-filiados-depois-de-29-11-1999"


class SALService:
    """Serviço para interagir com o sistema SAL e extrair PDFs de guias GPS."""
    
    def __init__(self):
        self.browser: Optional[Browser] = None
        self.playwright = None
    
    async def _get_browser(self) -> Browser:
        """Obtém ou cria uma instância do navegador."""
        if not PLAYWRIGHT_AVAILABLE:
            raise RuntimeError("Playwright não está disponível. Instale com: pip install playwright && playwright install chromium")
        
        if self.browser is None:
            self.playwright = await async_playwright().start()
            # Usar modo headless para produção
            self.browser = await self.playwright.chromium.launch(
                headless=True,
                args=['--no-sandbox', '--disable-setuid-sandbox']
            )
        
        return self.browser
    
    async def _close_browser(self):
        """Fecha o navegador e limpa recursos."""
        if self.browser:
            await self.browser.close()
            self.browser = None
        if self.playwright:
            await self.playwright.stop()
            self.playwright = None
    
    async def gerar_pdf_gps(
        self,
        nit_pis_pasep: str,
        competencia: str,  # Formato: MM/YYYY
        salario_contribuicao: float,
        codigo_pagamento: str,  # Ex: "1007" ou "1163"
        data_pagamento: Optional[str] = None,  # Formato: DD/MM/YYYY
        nome_contribuinte: Optional[str] = None
    ) -> bytes:
        """
        Gera PDF da guia GPS através do sistema SAL.
        
        Args:
            nit_pis_pasep: NIT/PIS/PASEP do contribuinte (formato: XXX.XXXXX.XX-X)
            competencia: Competência no formato MM/YYYY
            salario_contribuicao: Valor do salário de contribuição
            codigo_pagamento: Código de pagamento (ex: "1007" para normal, "1163" para simplificado)
            data_pagamento: Data do pagamento (opcional, padrão: data atual)
            nome_contribuinte: Nome do contribuinte (opcional, usado apenas para validação)
        
        Returns:
            bytes: Conteúdo do PDF gerado pelo SAL
        
        Raises:
            RuntimeError: Se não conseguir gerar o PDF
        """
        if not PLAYWRIGHT_AVAILABLE:
            raise RuntimeError("Playwright não está disponível. Instale com: pip install playwright && playwright install chromium")
        
        browser = await self._get_browser()
        context = await browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        )
        page = await context.new_page()
        
        try:
            print(f"[SAL] Acessando sistema SAL: {SAL_CALCULO_URL}")
            
            # 1. Acessar página de cálculo
            await page.goto(SAL_CALCULO_URL, wait_until='networkidle', timeout=30000)
            
            # 2. Preencher NIT/PIS/PASEP
            print(f"[SAL] Preenchendo NIT/PIS/PASEP: {nit_pis_pasep}")
            await page.fill('input[name="nit"]', nit_pis_pasep)
            # Ou tentar outros seletores comuns
            # await page.fill('input[type="text"][placeholder*="NIT"]', nit_pis_pasep)
            
            # 3. Preencher competência (se houver campo)
            # A competência pode ser preenchida depois, na tela de adicionar contribuição
            
            # 4. Clicar em "Consultar" ou similar
            print("[SAL] Clicando em Consultar...")
            await page.click('button:has-text("Consultar")', timeout=10000)
            # Ou tentar: await page.click('button[type="submit"]')
            
            # Aguardar carregamento da próxima página
            await page.wait_for_load_state('networkidle', timeout=30000)
            
            # 5. Adicionar contribuição (clicar em "+ Adicionar")
            print("[SAL] Adicionando contribuição...")
            await page.click('button:has-text("Adicionar")', timeout=10000)
            # Aguardar modal aparecer
            await page.wait_for_selector('input[name="competencia"], input[placeholder*="Competência"]', timeout=10000)
            
            # 6. Preencher competência no modal
            print(f"[SAL] Preenchendo competência: {competencia}")
            await page.fill('input[name="competencia"], input[placeholder*="Competência"]', competencia)
            
            # 7. Preencher salário de contribuição
            print(f"[SAL] Preenchendo salário: R$ {salario_contribuicao:,.2f}")
            salario_formatado = f"{salario_contribuicao:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
            await page.fill('input[name="salario"], input[placeholder*="Salário"]', salario_formatado)
            
            # 8. Confirmar adição
            await page.click('button:has-text("Confirmar")', timeout=10000)
            await page.wait_for_load_state('networkidle', timeout=10000)
            
            # 9. Preencher código de pagamento
            print(f"[SAL] Preenchendo código de pagamento: {codigo_pagamento}")
            await page.fill('input[name="codigoPagamento"], select[name="codigoPagamento"]', codigo_pagamento)
            # Ou selecionar do dropdown
            # await page.select_option('select[name="codigoPagamento"]', codigo_pagamento)
            
            # 10. Preencher data de pagamento (se necessário)
            if data_pagamento:
                print(f"[SAL] Preenchendo data de pagamento: {data_pagamento}")
                await page.fill('input[name="dataPagamento"], input[type="date"]', data_pagamento)
            
            # 11. Clicar em "Emitir GPS" ou "Confirmar"
            print("[SAL] Emitindo GPS...")
            await page.click('button:has-text("Emitir GPS")', timeout=10000)
            # Aguardar download do PDF
            
            # 12. Aguardar download do PDF
            print("[SAL] Aguardando download do PDF...")
            async with page.expect_download(timeout=60000) as download_info:
                # O download pode ser disparado pelo clique acima ou por um link
                pass
            
            download = await download_info.value
            pdf_path = await download.path()
            
            # 13. Ler conteúdo do PDF
            with open(pdf_path, 'rb') as f:
                pdf_bytes = f.read()
            
            print(f"[SAL] [OK] PDF gerado com sucesso! Tamanho: {len(pdf_bytes)} bytes")
            
            # Limpar arquivo temporário
            os.unlink(pdf_path)
            
            return pdf_bytes
            
        except PlaywrightTimeoutError as e:
            print(f"[SAL] [ERROR] Timeout ao interagir com SAL: {e}")
            # Capturar screenshot para debug
            await page.screenshot(path='sal_error.png')
            raise RuntimeError(f"Timeout ao gerar PDF no SAL: {str(e)}")
        except Exception as e:
            print(f"[SAL] [ERROR] Erro ao gerar PDF no SAL: {e}")
            import traceback
            print(traceback.format_exc())
            # Capturar screenshot para debug
            try:
                await page.screenshot(path='sal_error.png')
            except:
                pass
            raise RuntimeError(f"Erro ao gerar PDF no SAL: {str(e)}")
        finally:
            await context.close()
    
    async def __aenter__(self):
        """Context manager entry."""
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit - fecha navegador."""
        await self._close_browser()


# Instância global do serviço (será inicializada quando necessário)
_sal_service: Optional[SALService] = None


async def get_sal_service() -> SALService:
    """Obtém instância do serviço SAL."""
    global _sal_service
    if _sal_service is None:
        _sal_service = SALService()
    return _sal_service

