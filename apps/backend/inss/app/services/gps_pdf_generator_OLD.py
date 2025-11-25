"""
Gerador de PDF para Guia da Previdência Social (GPS) seguindo layout oficial da Receita Federal.

Este gerador cria PDFs idênticos aos gerados pelo sistema SAL oficial.
"""
from __future__ import annotations

from io import BytesIO
from typing import Dict, Any, Optional
from datetime import datetime

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import Paragraph, Spacer
from reportlab.lib.enums import TA_CENTER, TA_LEFT

try:
    from barcode import Code128  # type: ignore
    from barcode.writer import ImageWriter  # type: ignore
    from PIL import Image  # type: ignore
    BARCODE_AVAILABLE = True
except ImportError:
    Code128 = None  # type: ignore
    ImageWriter = None  # type: ignore
    Image = None  # type: ignore
    BARCODE_AVAILABLE = False
    print("[WARN] Bibliotecas de código de barras não disponíveis. Instale: pip install python-barcode Pillow")


class GPSPDFGenerator:
    """
    Gerador de PDF para GPS seguindo layout oficial da Receita Federal.
    """
    
    def __init__(self):
        """Inicializa o gerador de PDF."""
        self.width, self.height = A4
        self.margem_esquerda = 10 * mm
        self.margem_direita = self.width - 10 * mm
        self.margem_superior = self.height - 10 * mm
        self.margem_inferior = 10 * mm
    
    def formatar_cpf(self, cpf: Optional[str]) -> str:
        """
        Formata CPF no padrão XXX.XXX.XXX-XX.
        
        Args:
            cpf: CPF com ou sem formatação
        
        Returns:
            CPF formatado ou string vazia se inválido
        """
        if not cpf:
            return ""
        
        # Remover formatação
        apenas_digitos = "".join(filter(str.isdigit, str(cpf)))
        
        if len(apenas_digitos) == 11:
            return f"{apenas_digitos[0:3]}.{apenas_digitos[3:6]}.{apenas_digitos[6:9]}-{apenas_digitos[9:]}"
        
        return apenas_digitos
    
    def formatar_valor(self, valor: float) -> str:
        """
        Formata valor monetário no padrão brasileiro R$ X.XXX,XX.
        
        Args:
            valor: Valor em reais
        
        Returns:
            Valor formatado
        """
        return f"R$ {valor:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
    
    def formatar_nit(self, nit: Optional[str]) -> str:
        """
        Formata NIT/PIS no padrão XXX.XXXXX.XX-X.
        
        Args:
            nit: NIT/PIS com ou sem formatação
        
        Returns:
            NIT/PIS formatado ou string vazia se inválido
        """
        if not nit:
            return ""
        
        # Remover formatação
        apenas_digitos = "".join(filter(str.isdigit, str(nit)))
        
        if len(apenas_digitos) == 11:
            return f"{apenas_digitos[0:3]}.{apenas_digitos[3:8]}.{apenas_digitos[8:10]}-{apenas_digitos[10]}"
        
        return apenas_digitos
    
    def gerar_codigo_barras_visual(self, codigo_barras: str) -> Optional[BytesIO]:
        """
        Gera imagem do código de barras Code128.
        
        Args:
            codigo_barras: Código de barras completo (48 dígitos)
        
        Returns:
            BytesIO com imagem PNG do código de barras ou None se falhar
        """
        if not BARCODE_AVAILABLE:
            return None
        
        try:
            buffer = BytesIO()
            code128 = Code128(codigo_barras, writer=ImageWriter())
            code128.write(buffer, options={
                'module_width': 0.3,
                'module_height': 10,
                'quiet_zone': 2,
                'font_size': 10,
                'text_distance': 3,
            })
            buffer.seek(0)
            
            # Converter para PIL Image e depois para PNG
            img = Image.open(buffer)
            img_buffer = BytesIO()
            img.save(img_buffer, format='PNG')
            img_buffer.seek(0)
            
            return img_buffer
        except Exception as e:
            print(f"[WARN] Erro ao gerar código de barras visual: {e}")
            return None
    
    def gerar(self, dados: Dict[str, Any]) -> BytesIO:
        """
        Gera PDF da GPS seguindo layout oficial.
        
        Args:
            dados: Dicionário com dados da GPS:
                - nome: Nome completo do contribuinte
                - cpf: CPF (com ou sem formatação)
                - nit: NIT/PIS/PASEP (com ou sem formatação)
                - endereco: Endereço completo (opcional)
                - telefone: Telefone/WhatsApp (opcional)
                - codigo_pagamento: Código de pagamento (ex: "1007", "1163")
                - competencia: Competência no formato MM/YYYY
                - valor: Valor da contribuição (float)
                - codigo_barras: Código de barras completo (48 dígitos)
                - vencimento: Data de vencimento no formato DD/MM/YYYY
        
        Returns:
            BytesIO com conteúdo do PDF
        
        Raises:
            ValueError: Se dados obrigatórios estiverem faltando
        """
        # Validar dados obrigatórios
        campos_obrigatorios = ['nome', 'cpf', 'codigo_pagamento', 'competencia', 'valor', 'codigo_barras']
        for campo in campos_obrigatorios:
            if campo not in dados or not dados[campo]:
                raise ValueError(f"Campo obrigatório faltando: {campo}")
        
        buffer = BytesIO()
        c = canvas.Canvas(buffer, pagesize=A4)
        
        # Metadados do PDF
        c.setTitle("Guia da Previdência Social - GPS")
        c.setSubject("GPS - INSS")
        c.setAuthor("Sistema GuiasMEI")
        
        y = self.margem_superior
        
        # ========== CABEÇALHO ==========
        c.setFont("Helvetica-Bold", 18)
        c.drawCentredString(self.width / 2, y, "GUIA DA PREVIDÊNCIA SOCIAL - GPS")
        
        # Linha separadora
        y -= 8 * mm
        c.setLineWidth(1.5)
        c.line(self.margem_esquerda, y, self.margem_direita, y)
        
        # ========== DADOS DO CONTRIBUINTE ==========
        y -= 12 * mm
        
        # Nome/Razão Social
        c.setFont("Helvetica-Bold", 10)
        c.drawString(self.margem_esquerda, y, "NOME OU RAZÃO SOCIAL:")
        c.setFont("Helvetica", 11)
        nome = dados.get("nome", "Não informado")
        c.drawString(self.margem_esquerda + 50 * mm, y, nome[:60])
        
        # CPF/CNPJ
        y -= 8 * mm
        c.setFont("Helvetica-Bold", 10)
        c.drawString(self.margem_esquerda, y, "CPF/CNPJ:")
        c.setFont("Helvetica", 11)
        cpf_formatado = self.formatar_cpf(dados.get("cpf", ""))
        # Só mostrar se CPF válido foi fornecido
        cpf_display = cpf_formatado if cpf_formatado and len("".join(filter(str.isdigit, cpf_formatado))) == 11 else ""
        c.drawString(self.margem_esquerda + 50 * mm, y, cpf_display or "Não informado")
        
        # NIT/PIS/PASEP
        y -= 8 * mm
        c.setFont("Helvetica-Bold", 10)
        c.drawString(self.margem_esquerda, y, "NIT/PIS/PASEP:")
        c.setFont("Helvetica", 11)
        nit_formatado = self.formatar_nit(dados.get("nit", ""))
        # Só mostrar se NIT válido foi fornecido (11 dígitos)
        nit_display = nit_formatado if nit_formatado and len("".join(filter(str.isdigit, nit_formatado))) == 11 else ""
        c.drawString(self.margem_esquerda + 50 * mm, y, nit_display or "Não informado")
        
        # Contato/Endereço
        telefone = dados.get("telefone", "")
        endereco = dados.get("endereco", "")
        # Validar que endereço não seja apenas telefone
        if endereco:
            endereco_limpo = endereco.replace(" ", "").replace("-", "").replace("(", "").replace(")", "")
            if endereco_limpo.isdigit() and len(endereco_limpo) >= 10:
                # Parece ser telefone, não endereço
                endereco = ""
        
        if telefone or endereco:
            y -= 8 * mm
            c.setFont("Helvetica-Bold", 10)
            c.drawString(self.margem_esquerda, y, "CONTATO/ENDEREÇO:")
            c.setFont("Helvetica", 10)
            # Se tem endereço, mostrar endereço. Se não, mostrar telefone
            if endereco:
                info_contato = endereco[:70]
            elif telefone:
                info_contato = f"Tel: {telefone}"
            else:
                info_contato = ""
            if info_contato:
                c.drawString(self.margem_esquerda + 50 * mm, y, info_contato[:70])
        
        # ========== DADOS DA CONTRIBUIÇÃO ==========
        y -= 15 * mm
        c.setLineWidth(1)
        c.line(self.margem_esquerda, y, self.margem_direita, y)
        y -= 8 * mm
        
        # Código de Pagamento
        c.setFont("Helvetica-Bold", 10)
        c.drawString(self.margem_esquerda, y, "CÓDIGO DE PAGAMENTO:")
        c.setFont("Helvetica", 11)
        codigo_pagamento = dados.get("codigo_pagamento", "")
        c.drawString(self.margem_esquerda + 50 * mm, y, codigo_pagamento)
        
        # Competência
        y -= 8 * mm
        c.setFont("Helvetica-Bold", 10)
        c.drawString(self.margem_esquerda, y, "COMPETÊNCIA:")
        c.setFont("Helvetica", 11)
        competencia = dados.get("competencia", "")
        c.drawString(self.margem_esquerda + 50 * mm, y, competencia)
        
        # ========== VALORES ==========
        y -= 15 * mm
        c.setFont("Helvetica-Bold", 12)
        c.drawString(self.margem_esquerda, y, "VALORES DA CONTRIBUIÇÃO")
        y -= 8 * mm
        
        # Valor do INSS
        c.setFont("Helvetica-Bold", 10)
        c.drawString(self.margem_esquerda, y, "VALOR DO INSS:")
        c.setFont("Helvetica", 11)
        valor_inss = float(dados.get("valor", 0))
        c.drawString(self.margem_esquerda + 50 * mm, y, self.formatar_valor(valor_inss))
        
        # Valor de outras entidades
        y -= 8 * mm
        c.setFont("Helvetica-Bold", 10)
        c.drawString(self.margem_esquerda, y, "VALOR DE OUTRAS ENTIDADES:")
        c.setFont("Helvetica", 11)
        valor_outras = float(dados.get("valor_outras_entidades", 0))
        c.drawString(self.margem_esquerda + 50 * mm, y, self.formatar_valor(valor_outras))
        
        # Multa e Juros
        y -= 8 * mm
        c.setFont("Helvetica-Bold", 10)
        c.drawString(self.margem_esquerda, y, "MULTA E JUROS:")
        c.setFont("Helvetica", 11)
        valor_multa_juros = float(dados.get("valor_multa_juros", 0))
        c.drawString(self.margem_esquerda + 50 * mm, y, self.formatar_valor(valor_multa_juros))
        
        # Total
        y -= 8 * mm
        c.setLineWidth(1)
        c.line(self.margem_esquerda, y, self.margem_direita, y)
        y -= 8 * mm
        c.setFont("Helvetica-Bold", 12)
        c.drawString(self.margem_esquerda, y, "TOTAL:")
        valor_total = valor_inss + valor_outras + valor_multa_juros
        c.drawString(self.margem_esquerda + 50 * mm, y, self.formatar_valor(valor_total))
        
        # Vencimento
        y -= 12 * mm
        c.setFont("Helvetica-Bold", 10)
        c.drawString(self.margem_esquerda, y, "VENCIMENTO:")
        c.setFont("Helvetica", 11)
        vencimento = dados.get("vencimento", "")
        c.drawString(self.margem_esquerda + 50 * mm, y, vencimento)
        
        # ========== CÓDIGO DE BARRAS ==========
        y -= 20 * mm
        codigo_barras = dados.get("codigo_barras", "")
        
        # Texto do código de barras
        c.setFont("Helvetica-Bold", 10)
        c.drawString(self.margem_esquerda, y, "CÓDIGO DE BARRAS")
        c.setFont("Helvetica", 9)
        
        # Formatar código para exibição (agrupar de 5 em 5)
        codigo_formatado = " ".join([codigo_barras[i:i+5] for i in range(0, len(codigo_barras), 5)])
        y -= 6 * mm
        c.drawString(self.margem_esquerda, y, codigo_formatado)
        
        # Linha digitável
        from ..services.codigo_barras_gps import CodigoBarrasGPS
        linha_digitavel = CodigoBarrasGPS.linha_digitavel(codigo_barras)
        y -= 6 * mm
        c.setFont("Helvetica", 9)
        c.drawString(self.margem_esquerda, y, f"Linha Digitável: {linha_digitavel}")
        
        # Imagem do código de barras
        y -= 20 * mm
        barcode_img_buffer = self.gerar_codigo_barras_visual(codigo_barras)
        
        if barcode_img_buffer:
            try:
                import tempfile
                import os
                
                img = Image.open(barcode_img_buffer)
                tmp_file = tempfile.NamedTemporaryFile(suffix='.png', delete=False)
                tmp_path = tmp_file.name
                tmp_file.close()
                
                img.save(tmp_path, format='PNG')
                
                c.drawImage(
                    tmp_path,
                    self.margem_esquerda,
                    y - 20 * mm,
                    width=150 * mm,
                    height=15 * mm,
                    preserveAspectRatio=True
                )
                
                os.unlink(tmp_path)
            except Exception as e:
                print(f"[WARN] Erro ao desenhar código de barras: {e}")
                # Fallback: desenhar retângulo com texto
                c.rect(self.margem_esquerda, y - 20 * mm, 150 * mm, 15 * mm)
                c.setFont("Helvetica", 8)
                c.drawString(self.margem_esquerda + 5 * mm, y - 10 * mm, f"Código: {codigo_formatado}")
        else:
            # Fallback: desenhar retângulo com texto
            c.rect(self.margem_esquerda, y - 20 * mm, 150 * mm, 15 * mm)
            c.setFont("Helvetica", 8)
            c.drawString(self.margem_esquerda + 5 * mm, y - 10 * mm, f"Código: {codigo_formatado}")
        
        # ========== INSTRUÇÕES ==========
        y -= 30 * mm
        c.setFont("Helvetica-Bold", 10)
        c.drawString(self.margem_esquerda, y, "INSTRUÇÕES:")
        y -= 6 * mm
        c.setFont("Helvetica", 9)
        instrucoes = [
            "1. Esta guia pode ser paga em qualquer banco, lotérica ou pela internet.",
            "2. O pagamento deve ser efetuado até a data de vencimento indicada.",
            "3. Após o vencimento, serão cobrados juros e multa.",
            "4. Guarde o comprovante de pagamento para sua segurança."
        ]
        
        for instrucao in instrucoes:
            c.drawString(self.margem_esquerda + 5 * mm, y, instrucao)
            y -= 5 * mm
        
        # ========== RODAPÉ ==========
        y = self.margem_inferior + 5 * mm
        c.setFont("Helvetica", 8)
        c.setFillColor(colors.grey)
        c.drawCentredString(
            self.width / 2,
            y,
            f"Gerado em {datetime.now().strftime('%d/%m/%Y %H:%M:%S')} - Sistema GuiasMEI"
        )
        
        # Finalizar PDF
        c.save()
        buffer.seek(0)
        
        return buffer
