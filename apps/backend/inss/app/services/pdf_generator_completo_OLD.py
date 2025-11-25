"""
Gerador completo de GPS seguindo o modelo oficial do INSS.
Cria GPS do zero com todos os campos preenchidos corretamente.
"""

from __future__ import annotations

from io import BytesIO
from typing import Any, Optional

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas

from ..utils.constants import calcular_vencimento_padrao

try:
    from barcode import Code128
    from barcode.writer import ImageWriter
    BARCODE_AVAILABLE = True
except ImportError:
    BARCODE_AVAILABLE = False
    Code128 = None  # type: ignore
    ImageWriter = None  # type: ignore


class GPSGeneratorCompleto:
    """Gera GPS completa do zero seguindo o modelo oficial do INSS."""

    def __init__(self):
        self.width, self.height = A4
        self.margem_esquerda = 20 * mm
        self.margem_direita = self.width - 20 * mm
        self.margem_superior = self.height - 30 * mm
        self.margem_inferior = 20 * mm

    def formatar_cpf(self, cpf: Optional[str]) -> str:
        """Formata CPF no padrão XXX.XXX.XXX-XX"""
        if not cpf:
            return ""
        # Remove caracteres não numéricos
        cpf_limpo = "".join(filter(str.isdigit, str(cpf)))
        if len(cpf_limpo) == 11:
            return f"{cpf_limpo[:3]}.{cpf_limpo[3:6]}.{cpf_limpo[6:9]}-{cpf_limpo[9:]}"
        return cpf_limpo

    def formatar_valor(self, valor: float) -> str:
        """Formata valor monetário no padrão brasileiro"""
        return f"R$ {valor:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")

    def gerar_codigo_barras(self, codigo: str) -> Optional[BytesIO]:
        """Gera imagem do código de barras Code128"""
        if not BARCODE_AVAILABLE:
            return None
        
        try:
            from PIL import Image
            
            buffer = BytesIO()
            code128 = Code128(codigo, writer=ImageWriter())
            code128.write(buffer, options={
                'module_width': 0.3,
                'module_height': 10,
                'quiet_zone': 2,
                'font_size': 10,
                'text_distance': 3,
            })
            buffer.seek(0)
            
            # Converter para PIL Image para o ReportLab
            img = Image.open(buffer)
            img_buffer = BytesIO()
            img.save(img_buffer, format='PNG')
            img_buffer.seek(0)
            return img_buffer
        except Exception as e:
            print(f"[WARN] Erro ao gerar código de barras: {e}")
            return None

    def calcular_codigo_barras(self, codigo_gps: str, competencia: str, valor: float) -> str:
        """
        Calcula código de barras da GPS conforme padrão INSS.
        Formato: Código GPS (4 dígitos) + Competência (6 dígitos) + Valor (11 dígitos)
        """
        # Remove barras da competência (MM/YYYY -> MMYYYY)
        competencia_limpa = competencia.replace("/", "")
        
        # Valor em centavos, preenchido com zeros à esquerda (11 dígitos)
        valor_centavos = int(valor * 100)
        valor_formatado = f"{valor_centavos:011d}"
        
        # Código completo: 4 + 6 + 11 = 21 dígitos
        codigo_completo = f"{codigo_gps}{competencia_limpa}{valor_formatado}"
        
        return codigo_completo

    def criar_gps_completa(
        self,
        dados_usuario: dict[str, Any],
        dados_contribuicao: dict[str, Any],
    ) -> bytes:
        """
        Cria GPS completa do zero seguindo o modelo oficial.
        
        Args:
            dados_usuario: Dicionário com dados do usuário:
                - nome (ou name): Nome completo
                - cpf: CPF (com ou sem formatação)
                - nit: NIT/PIS/PASEP (opcional)
                - telefone (ou whatsapp): Telefone/WhatsApp (opcional)
                - endereco: Endereço completo (opcional)
            
            dados_contribuicao: Dicionário com dados da contribuição:
                - codigo_gps: Código GPS (ex: "1007")
                - competencia: Competência no formato MM/YYYY
                - valor: Valor da contribuição
                - vencimento: Data de vencimento (opcional, calculado se não fornecido)
        """
        buffer = BytesIO()
        c = canvas.Canvas(buffer, pagesize=A4)
        
        # Metadados do PDF
        c.setTitle("Guia da Previdência Social - GPS")
        c.setSubject("GPS - INSS")
        c.setAuthor("Sistema GuiasMEI")
        
        # ========== CABEÇALHO ==========
        y = self.margem_superior
        
        # Título principal
        c.setFont("Helvetica-Bold", 18)
        c.drawCentredString(self.width / 2, y, "GUIA DA PREVIDÊNCIA SOCIAL - GPS")
        
        # Linha separadora abaixo do título
        y -= 8 * mm
        c.setLineWidth(1.5)
        c.line(self.margem_esquerda, y, self.margem_direita, y)
        
        # ========== DADOS DO CONTRIBUINTE ==========
        y -= 12 * mm
        
        # Nome/Razão Social
        c.setFont("Helvetica-Bold", 10)
        c.drawString(self.margem_esquerda, y, "NOME OU RAZÃO SOCIAL:")
        c.setFont("Helvetica", 11)
        nome = dados_usuario.get("nome") or dados_usuario.get("name") or "Não informado"
        c.drawString(self.margem_esquerda + 50 * mm, y, nome[:60])  # Limita tamanho
        
        # CPF/CNPJ
        y -= 8 * mm
        c.setFont("Helvetica-Bold", 10)
        c.drawString(self.margem_esquerda, y, "CPF/CNPJ:")
        c.setFont("Helvetica", 11)
        cpf = self.formatar_cpf(dados_usuario.get("cpf"))
        c.drawString(self.margem_esquerda + 50 * mm, y, cpf or "Não informado")
        
        # NIT/PIS/PASEP
        y -= 8 * mm
        c.setFont("Helvetica-Bold", 10)
        c.drawString(self.margem_esquerda, y, "NIT/PIS/PASEP:")
        c.setFont("Helvetica", 11)
        nit = dados_usuario.get("nit") or dados_usuario.get("pis") or "Não informado"
        c.drawString(self.margem_esquerda + 50 * mm, y, str(nit))
        
        # Telefone e Endereço (se disponível)
        telefone = dados_usuario.get("telefone") or dados_usuario.get("whatsapp")
        endereco = dados_usuario.get("endereco") or dados_usuario.get("address")
        
        if telefone or endereco:
            y -= 8 * mm
            c.setFont("Helvetica-Bold", 10)
            c.drawString(self.margem_esquerda, y, "CONTATO/ENDEREÇO:")
            c.setFont("Helvetica", 10)
            info_contato = f"{telefone or ''} - {endereco or ''}".strip(" -")
            if info_contato:
                c.drawString(self.margem_esquerda + 50 * mm, y, info_contato[:70])
        
        # ========== DADOS DA CONTRIBUIÇÃO ==========
        y -= 15 * mm
        c.setLineWidth(0.5)
        c.line(self.margem_esquerda, y, self.margem_direita, y)
        y -= 8 * mm
        
        # Código de Pagamento
        c.setFont("Helvetica-Bold", 10)
        c.drawString(self.margem_esquerda, y, "CÓDIGO DE PAGAMENTO:")
        c.setFont("Helvetica", 12)
        codigo_gps = dados_contribuicao.get("codigo_gps", "1007")
        c.drawString(self.margem_esquerda + 55 * mm, y, codigo_gps)
        
        # Competência
        c.setFont("Helvetica-Bold", 10)
        c.drawString(self.margem_esquerda + 80 * mm, y, "COMPETÊNCIA:")
        c.setFont("Helvetica", 12)
        competencia = dados_contribuicao.get("competencia", "")
        c.drawString(self.margem_esquerda + 130 * mm, y, competencia)
        
        # ========== VALORES ==========
        y -= 20 * mm
        
        # Título da seção de valores
        c.setFont("Helvetica-Bold", 11)
        c.drawString(self.margem_esquerda, y, "VALORES DA CONTRIBUIÇÃO:")
        y -= 10 * mm
        
        valor_inss = dados_contribuicao.get("valor", 0.0)
        valor_outras = dados_contribuicao.get("valor_outras_entidades", 0.0)
        valor_multa_juros = dados_contribuicao.get("valor_multa_juros", 0.0)
        valor_total = valor_inss + valor_outras + valor_multa_juros
        
        # Tabela de valores
        valores = [
            ("VALOR DO INSS", valor_inss),
            ("VALOR DE OUTRAS ENTIDADES", valor_outras),
            ("MULTA E JUROS", valor_multa_juros),
            ("TOTAL", valor_total),
        ]
        
        x_label = self.margem_esquerda
        x_valor = self.margem_esquerda + 80 * mm
        
        for label, valor in valores:
            c.setFont("Helvetica-Bold", 9)
            c.drawString(x_label, y, label + ":")
            c.setFont("Helvetica", 11)
            c.drawString(x_valor, y, self.formatar_valor(valor))
            y -= 8 * mm
        
        # ========== VENCIMENTO ==========
        y -= 8 * mm
        c.setLineWidth(0.5)
        c.line(self.margem_esquerda, y, self.margem_direita, y)
        y -= 10 * mm
        
        vencimento = dados_contribuicao.get("vencimento")
        if not vencimento:
            competencia_str = dados_contribuicao.get("competencia", "")
            vencimento = calcular_vencimento_padrao(competencia_str)
        
        if hasattr(vencimento, 'strftime'):
            vencimento_str = vencimento.strftime("%d/%m/%Y")
        else:
            vencimento_str = str(vencimento)
        
        c.setFont("Helvetica-Bold", 11)
        c.drawString(self.margem_esquerda, y, "DATA DE VENCIMENTO:")
        c.setFont("Helvetica", 14)
        c.drawString(self.margem_esquerda + 60 * mm, y, vencimento_str)
        
        # ========== CÓDIGO DE BARRAS ==========
        y -= 25 * mm
        
        # Calcular código de barras
        codigo_barras = self.calcular_codigo_barras(
            codigo_gps,
            competencia,
            valor_total
        )
        
        # Texto do código de barras
        c.setFont("Helvetica-Bold", 10)
        c.drawString(self.margem_esquerda, y, "CÓDIGO DE BARRAS:")
        c.setFont("Helvetica", 9)
        # Formata código para leitura: grupos de 5 dígitos
        codigo_formatado = " ".join([codigo_barras[i:i+5] for i in range(0, len(codigo_barras), 5)])
        c.drawString(self.margem_esquerda, y - 6 * mm, codigo_formatado)
        
        # Imagem do código de barras
        y -= 20 * mm
        barcode_img_buffer = self.gerar_codigo_barras(codigo_barras)
        if barcode_img_buffer:
            try:
                from PIL import Image
                import tempfile
                import os
                
                img = Image.open(barcode_img_buffer)
                # Criar arquivo temporário e fechar antes de usar
                tmp_file = tempfile.NamedTemporaryFile(suffix='.png', delete=False)
                tmp_path = tmp_file.name
                tmp_file.close()  # Fechar antes de salvar
                
                img.save(tmp_path, format='PNG')
                
                # Desenhar imagem
                c.drawImage(
                    tmp_path,
                    self.margem_esquerda,
                    y - 20 * mm,
                    width=150 * mm,
                    height=15 * mm,
                    preserveAspectRatio=True
                )
                
                # Limpar arquivo temporário após desenhar
                try:
                    os.unlink(tmp_path)
                except:
                    pass  # Ignorar erro se arquivo já foi removido
                    
            except Exception as e:
                print(f"[WARN] Erro ao desenhar código de barras: {e}")
                # Desenha retângulo como fallback
                c.rect(self.margem_esquerda, y - 20 * mm, 150 * mm, 15 * mm)
                c.setFont("Helvetica", 8)
                c.drawString(
                    self.margem_esquerda + 5 * mm,
                    y - 10 * mm,
                    f"Código: {codigo_formatado}"
                )
        else:
            # Desenha retângulo como fallback
            c.rect(self.margem_esquerda, y - 20 * mm, 150 * mm, 15 * mm)
            c.setFont("Helvetica", 8)
            c.drawString(
                self.margem_esquerda + 5 * mm,
                y - 10 * mm,
                f"Código: {codigo_formatado}"
            )
        
        # ========== INSTRUÇÕES ==========
        y = y - 30 * mm
        c.setLineWidth(0.5)
        c.line(self.margem_esquerda, y, self.margem_direita, y)
        y -= 10 * mm
        
        c.setFont("Helvetica", 9)
        instrucoes = [
            "INSTRUÇÕES PARA PAGAMENTO:",
            "• Pague a GPS em bancos, casas lotéricas ou via internet banking até a data de vencimento.",
            "• Após o vencimento, serão cobrados juros e multa.",
            "• Guarde o comprovante de pagamento.",
        ]
        
        for instrucao in instrucoes:
            c.drawString(self.margem_esquerda, y, instrucao)
            y -= 6 * mm
        
        # ========== RODAPÉ ==========
        c.setFont("Helvetica-Oblique", 8)
        c.drawString(self.margem_esquerda, 15 * mm, "Ministério da Previdência Social - INSS")
        c.drawCentredString(self.width / 2, 15 * mm, "Sistema GuiasMEI")
        
        # Finalizar PDF
        c.showPage()
        c.save()
        buffer.seek(0)
        return buffer.read()

