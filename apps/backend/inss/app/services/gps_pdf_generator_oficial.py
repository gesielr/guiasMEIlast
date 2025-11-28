"""
Gerador de GPS (Guia da Previdência Social) - Modelo Oficial
Replica exatamente o layout da Receita Federal conforme PROMPT para montar o pdf oficial.txt
"""

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm, cm
from reportlab.pdfgen import canvas
from reportlab.lib import colors
from reportlab.lib.utils import ImageReader
from reportlab.graphics.barcode import common  # Para Interleaved 2 of 5
from reportlab.graphics import renderPDF
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from io import BytesIO
from datetime import datetime
from typing import Dict, Optional
import os


class GPSEstilo:
    """
    Todas as constantes de estilo da GPS oficial conforme PROMPT para montar o pdf oficial.txt
    """
    
    # Dimensões da página (A4 PORTRAIT conforme prompt)
    PAGINA_LARGURA = 210 * mm  # A4
    PAGINA_ALTURA = 297 * mm   # A4
    
    # Margens
    MARGEM_ESQUERDA = 3 * mm
    MARGEM_DIREITA = 3 * mm
    MARGEM_SUPERIOR = 3 * mm
    MARGEM_INFERIOR = 3 * mm
    
    # Área útil
    AREA_UTIL_LARGURA = PAGINA_LARGURA - MARGEM_ESQUERDA - MARGEM_DIREITA  # 204mm
    AREA_UTIL_ALTURA = PAGINA_ALTURA - MARGEM_SUPERIOR - MARGEM_INFERIOR
    
    # Cores
    COR_BORDA = colors.black
    COR_TEXTO_NORMAL = colors.black
    COR_TEXTO_TITULO = colors.black
    COR_FUNDO_BRANCO = colors.white
    
    # Fontes e Tamanhos
    FONTE_CABECALHO = "Helvetica"
    TAMANHO_CABECALHO = 6
    
    FONTE_TITULO = "Helvetica-Bold"
    TAMANHO_TITULO = 11
    
    FONTE_LABEL = "Helvetica-Bold"
    TAMANHO_LABEL = 5.5
    
    FONTE_VALOR = "Helvetica"
    TAMANHO_VALOR_PEQUENO = 7
    TAMANHO_VALOR_MEDIO = 8
    TAMANHO_VALOR_GRANDE = 9
    
    FONTE_NOME = "Helvetica-Bold"
    TAMANHO_NOME = 9
    
    FONTE_VENCIMENTO = "Helvetica-Bold"
    TAMANHO_VENCIMENTO = 11
    
    FONTE_NUMERICO = "Helvetica-Bold"
    TAMANHO_NUMERICO = 9
    
    FONTE_TOTAL = "Helvetica-Bold"
    TAMANHO_TOTAL = 14
    
    FONTE_LINHA_DIGITAVEL = "Courier-Bold"
    TAMANHO_LINHA_DIGITAVEL = 9
    
    # Espessuras de linha
    BORDA_FINA = 0.5
    
    # Cabeçalho
    CABECALHO_Y_INICIO = PAGINA_ALTURA - MARGEM_SUPERIOR - 10 * mm
    CABECALHO_ALTURA = 10 * mm
    TEXTO_INST_1_Y = CABECALHO_Y_INICIO - 2 * mm
    TEXTO_INST_2_Y = CABECALHO_Y_INICIO - 5 * mm
    TEXTO_INST_3_Y = CABECALHO_Y_INICIO - 8 * mm
    
    # Título
    TITULO_Y = CABECALHO_Y_INICIO - 15 * mm
    
    # Campos principais
    CAMPOS_Y_INICIO = TITULO_Y - 5 * mm
    
    # Divisão vertical
    DIVISAO_X = MARGEM_ESQUERDA + 105 * mm  # Divide a página ~50%
    SECAO_ESQUERDA_LARGURA = DIVISAO_X - MARGEM_ESQUERDA  # ~105mm
    SECAO_DIREITA_LARGURA = (PAGINA_LARGURA - MARGEM_DIREITA) - DIVISAO_X  # ~102mm
    
    # Campo 1: NOME
    CAMPO1_Y = CAMPOS_Y_INICIO
    CAMPO1_ALTURA = 22 * mm
    CAMPO1_LABEL_Y_OFFSET = 2 * mm
    CAMPO1_NIT_Y_OFFSET = 5 * mm
    CAMPO1_NOME_Y_OFFSET = 9 * mm
    CAMPO1_UF_Y_OFFSET = 18 * mm
    
    # Campo 2: VENCIMENTO
    CAMPO2_Y = CAMPO1_Y - CAMPO1_ALTURA
    CAMPO2_ALTURA = 9 * mm
    CAMPO2_LABEL_Y_OFFSET = 2 * mm
    CAMPO2_VALOR_Y_OFFSET = 6 * mm
    
    # Seção Direita
    CAMPOS_DIR_Y_INICIO = CAMPOS_Y_INICIO
    COLUNA_PEQUENA = 32 * mm
    COLUNA_MEDIA = 34 * mm
    
    # Linha 1: Código, Competência, Identificador
    LINHA1_Y = CAMPOS_DIR_Y_INICIO
    LINHA1_ALTURA = 7 * mm
    CAMPO3_X = DIVISAO_X
    CAMPO3_LARGURA = COLUNA_PEQUENA
    CAMPO4_X = CAMPO3_X + COLUNA_PEQUENA
    CAMPO4_LARGURA = COLUNA_PEQUENA
    CAMPO5_X = CAMPO4_X + COLUNA_PEQUENA
    CAMPO5_LARGURA = COLUNA_MEDIA
    
    # Linha 2: Valor INSS, dois campos vazios
    LINHA2_Y = LINHA1_Y - LINHA1_ALTURA
    LINHA2_ALTURA = 7 * mm
    CAMPO6_X = DIVISAO_X
    CAMPO6_LARGURA = COLUNA_PEQUENA
    CAMPO7_X = CAMPO6_X + COLUNA_PEQUENA
    CAMPO7_LARGURA = COLUNA_PEQUENA
    CAMPO8_X = CAMPO7_X + COLUNA_PEQUENA
    CAMPO8_LARGURA = COLUNA_MEDIA
    
    # Linha 3: Valor Outras Entidades, ATM/Multa
    LINHA3_Y = LINHA2_Y - LINHA2_ALTURA
    LINHA3_ALTURA = 7 * mm
    CAMPO9_X = DIVISAO_X
    CAMPO9_LARGURA = (COLUNA_PEQUENA + COLUNA_PEQUENA) / 2 + 1*mm  # ~49mm
    CAMPO10_X = CAMPO9_X + CAMPO9_LARGURA
    CAMPO10_LARGURA = (COLUNA_PEQUENA + COLUNA_MEDIA) / 2 + 1*mm   # ~49mm
    
    # Linha 4: TOTAL
    LINHA4_Y = LINHA3_Y - LINHA3_ALTURA
    LINHA4_ALTURA = 10 * mm
    CAMPO11_X = DIVISAO_X
    CAMPO11_LARGURA = SECAO_DIREITA_LARGURA
    
    # Atenção
    ATENCAO_Y = LINHA4_Y - LINHA4_ALTURA - 3 * mm
    ATENCAO_ALTURA = 8 * mm
    ATENCAO_FONTE = "Helvetica"
    ATENCAO_TAMANHO = 5.5
    ATENCAO_TAMANHO_TITULO = 6
    
    # Competências consolidadas
    CONSOLIDADO_Y = ATENCAO_Y - ATENCAO_ALTURA - 2 * mm
    CONSOLIDADO_ALTURA = 10 * mm
    CONSOLIDADO_LABEL_Y_OFFSET = 2 * mm
    CONSOLIDADO_VALOR_Y_OFFSET = 6 * mm
    
    # Código de Barras
    CODIGO_BARRAS_Y = CONSOLIDADO_Y - CONSOLIDADO_ALTURA - 3 * mm
    CODIGO_BARRAS_ALTURA = 12 * mm
    CODIGO_BARRAS_LARGURA_BARRA = 0.75 * mm
    CODIGO_BARRAS_LARGURA_TOTAL = 150 * mm
    
    # Autenticação Bancária
    AUTENTICACAO_Y = CODIGO_BARRAS_Y - CODIGO_BARRAS_ALTURA - 5 * mm
    AUTENTICACAO_ALTURA = 12 * mm
    AUTENTICACAO_LARGURA = 45 * mm
    AUTENTICACAO_X = PAGINA_LARGURA - MARGEM_DIREITA - AUTENTICACAO_LARGURA
    
    # Padding
    PADDING_HORIZONTAL = 1.5 * mm
    PADDING_VERTICAL_LABEL = 1.5 * mm
    
    @staticmethod
    def formatar_moeda(valor: float) -> str:
        """Formata valor monetário no padrão brasileiro"""
        return f"R$ {valor:,.2f}".replace(',', 'X').replace('.', ',').replace('X', '.')
    
    @staticmethod
    def formatar_nit(nit: str) -> str:
        """Formata NIT: 12345678901 -> 123.45678.90-1"""
        nit = ''.join(filter(str.isdigit, str(nit)))
        if len(nit) != 11:
            return nit
        return f"{nit[:3]}.{nit[3:8]}.{nit[8:10]}-{nit[10]}"


class GPSPDFGeneratorOficial:
    """
    Gerador de GPS seguindo modelo oficial da Receita Federal
    """
    
    def __init__(self):
        # [OK] CORREÇÃO: PDF em A4 PORTRAIT conforme PROMPT para montar o pdf oficial.txt
        self.width = GPSEstilo.PAGINA_LARGURA  # 210mm
        self.height = GPSEstilo.PAGINA_ALTURA  # 297mm
        self.margin_left = GPSEstilo.MARGEM_ESQUERDA  # 3mm
        self.margin_right = GPSEstilo.MARGEM_DIREITA  # 3mm
        self.margin_top = GPSEstilo.MARGEM_SUPERIOR  # 3mm
        
        print(f"[PDF] Gerando PDF em A4 PORTRAIT: {self.width:.1f} x {self.height:.1f}")
        
        # Cores oficiais
        self.color_blue = colors.Color(0, 0.4, 0.8)  # Azul institucional
        self.color_black = GPSEstilo.COR_BORDA
        self.color_gray = colors.Color(0.5, 0.5, 0.5)
        self._ultima_posicao_digitavel = None
        
    def _obter_logo_inss_path(self) -> Optional[str]:
        """
        Retorna o caminho absoluto para o arquivo de logo do INSS.
        Procura em caminhos candidatos relativos ao diretório atual.
        """
        base_dir = os.path.abspath(
            os.path.join(os.path.dirname(__file__), "..", "..", "..", "..")
        )
        candidatos = [
            os.path.join(base_dir, "web", "src", "assets", "logo inss.png"),
            os.path.join(base_dir, "web", "src", "assets", "logo_inss.png"),
            os.path.join(base_dir, "web", "src", "assets", "logo-inss.png"),
        ]
        for caminho in candidatos:
            if os.path.exists(caminho):
                return caminho
        return None
    
    def gerar(self, dados: Dict) -> BytesIO:
        """
        Gera GPS em PDF (método principal usado pelo sistema)
        
        Args:
        
        Args:
            dados = {
                'nome': 'CARLOS GESIEL REBELO',
                'cpf': '12345678900',
                'nit': '128.00186.72-2',
                'endereco': 'Rua X, 123',
                'cidade': 'Florianópolis',
                'uf': 'SANTA CATARINA',
                'telefone': '48999999999',
                'codigo_pagamento': '1007',
                'competencia': '11/2025',
                'valor_inss': 303.60,
                'valor_outras_entidades': 0.00,
                'atm_multa_juros': 0.00,
                'vencimento': '15/12/2025',
                'codigo_barras': '858100000003036002701007000128001867222025113',
                'linha_digitavel': '858100000003-0 03600270100-7 70001280018-4 67222025113-0'
            }
        
        Returns:
            BytesIO com PDF gerado
        """

        # Cria buffer em A4 PORTRAIT (conforme prompt oficial)
        buffer = BytesIO()
        c = canvas.Canvas(buffer, pagesize=A4)
        
        # Desenha todos os elementos
        self._desenhar_cabecalho(c)
        self._desenhar_titulo_principal(c)
        self._desenhar_secao_dados_contribuinte(c, dados)
        self._desenhar_secao_dados_pagamento(c, dados)
        self._desenhar_rodape_atencao(c)
        self._desenhar_competencias_consolidadas(c, dados)  # [OK] Inclui linha digitável ACIMA do código de barras
        self._desenhar_autenticacao_bancaria(c)
        # [OK] CORREÇÃO: Código de barras ABAIXO da linha digitável (linha digitável já foi desenhada acima)
        self._desenhar_codigo_barras(c, dados)
        
        # Finaliza
        c.save()

        # Retorna buffer
        buffer.seek(0)
        return buffer
    
    def _desenhar_cabecalho(self, c: canvas.Canvas):
        """
        Desenha cabeçalho com logo e informações institucionais conforme GPSEstilo
        """
        logo_path = self._obter_logo_inss_path()
        logo_width = 32 * mm
        logo_height = 20 * mm
        x_logo = GPSEstilo.MARGEM_ESQUERDA
        y_logo = GPSEstilo.CABECALHO_Y_INICIO - logo_height
        
        if logo_path:
            try:
                c.drawImage(
                    logo_path,
                    x_logo,
                    y_logo,
                    width=logo_width,
                    height=logo_height,
                    preserveAspectRatio=True,
                    mask='auto'
                )
            except Exception as err:
                print(f"[PDF] [WARN] Falha ao desenhar logo INSS: {err}")
                logo_path = None
        
        # Posição inicial dos textos (ao lado da logo)
        x_texto = x_logo + (logo_width + 4 * mm) if logo_path else GPSEstilo.MARGEM_ESQUERDA
        
        # [OK] CORREÇÃO: Usar fontes e posições exatas do GPSEstilo
        c.setFont(GPSEstilo.FONTE_CABECALHO, GPSEstilo.TAMANHO_CABECALHO)
        c.setFillColor(GPSEstilo.COR_TEXTO_NORMAL)
        
        c.drawString(x_texto, GPSEstilo.TEXTO_INST_1_Y, "MINISTÉRIO DA PREVIDÊNCIA SOCIAL - MPS")
        c.drawString(x_texto, GPSEstilo.TEXTO_INST_2_Y, "INSTITUTO NACIONAL DO SEGURO SOCIAL - INSS")
        c.drawString(x_texto, GPSEstilo.TEXTO_INST_3_Y, "SECRETARIA DA RECEITA PREVIDENCIÁRIA - SRP")
        
        c.setFont("Helvetica-Bold", 8)
        c.setFillColor(self.color_blue)
        c.drawString(x_texto, GPSEstilo.TEXTO_INST_3_Y - 3*mm, "PREVIDÊNCIA SOCIAL")
        
        # Restaurar cor padrão
        c.setFillColor(GPSEstilo.COR_TEXTO_NORMAL)
    
    def _desenhar_titulo_principal(self, c: canvas.Canvas):
        """
        Desenha título principal "GUIA DA PREVIDÊNCIA SOCIAL - GPS" conforme GPSEstilo
        """
        # [OK] CORREÇÃO: Usar fonte e posição exatas do GPSEstilo
        c.setFont(GPSEstilo.FONTE_TITULO, GPSEstilo.TAMANHO_TITULO)
        c.setFillColor(GPSEstilo.COR_TEXTO_TITULO)
        
        titulo = "GUIA DA PREVIDÊNCIA SOCIAL - GPS"
        titulo_width = c.stringWidth(titulo, GPSEstilo.FONTE_TITULO, GPSEstilo.TAMANHO_TITULO)
        x_centro = (GPSEstilo.PAGINA_LARGURA - titulo_width) / 2
        
        c.drawString(x_centro, GPSEstilo.TITULO_Y, titulo)
    
    def _desenhar_secao_dados_contribuinte(self, c: canvas.Canvas, dados: Dict):
        """
        Desenha seção esquerda com dados do contribuinte (campos 1 e 2) conforme GPSEstilo
        """
        x = GPSEstilo.MARGEM_ESQUERDA
        
        # ========== CAMPO 1: NOME OU RAZÃO SOCIAL ==========
        y_campo1 = GPSEstilo.CAMPO1_Y
        
        # Borda do campo
        c.setStrokeColor(GPSEstilo.COR_BORDA)
        c.setLineWidth(GPSEstilo.BORDA_FINA)
        c.rect(x, y_campo1 - GPSEstilo.CAMPO1_ALTURA, GPSEstilo.SECAO_ESQUERDA_LARGURA, GPSEstilo.CAMPO1_ALTURA)
        
        # Label
        c.setFont(GPSEstilo.FONTE_LABEL, GPSEstilo.TAMANHO_LABEL)
        c.setFillColor(GPSEstilo.COR_TEXTO_NORMAL)
        c.drawString(
            x + GPSEstilo.PADDING_HORIZONTAL,
            y_campo1 - GPSEstilo.CAMPO1_LABEL_Y_OFFSET,
            "1 - NOME OU RAZÃO SOCIAL"
        )
        
        # NIT/PIS/PASEP
        nit_raw = dados.get('nit', '')
        nit_formatado = GPSEstilo.formatar_nit(nit_raw) if nit_raw else ''
        
        c.setFont(GPSEstilo.FONTE_VALOR, GPSEstilo.TAMANHO_VALOR_PEQUENO)
        c.drawString(
            x + GPSEstilo.PADDING_HORIZONTAL,
            y_campo1 - GPSEstilo.CAMPO1_NIT_Y_OFFSET,
            f"NIT/PIS/PASEP: {nit_formatado}"
        )
        
        # Nome (em negrito, tamanho 9pt)
        c.setFont(GPSEstilo.FONTE_NOME, GPSEstilo.TAMANHO_NOME)
        nome = dados.get('nome', '').upper()
        c.drawString(
            x + GPSEstilo.PADDING_HORIZONTAL,
            y_campo1 - GPSEstilo.CAMPO1_NOME_Y_OFFSET,
            nome
        )
        
        # UF
        c.setFont(GPSEstilo.FONTE_VALOR, GPSEstilo.TAMANHO_VALOR_PEQUENO)
        uf = dados.get('uf', '').upper()
        c.drawString(
            x + GPSEstilo.PADDING_HORIZONTAL,
            y_campo1 - GPSEstilo.CAMPO1_UF_Y_OFFSET,
            f"UF: {uf}"
        )
        
        # ========== CAMPO 2: VENCIMENTO ==========
        y_campo2 = GPSEstilo.CAMPO2_Y
        
        # Borda do campo
        c.rect(x, y_campo2 - GPSEstilo.CAMPO2_ALTURA, GPSEstilo.SECAO_ESQUERDA_LARGURA, GPSEstilo.CAMPO2_ALTURA)
        
        # Label
        c.setFont(GPSEstilo.FONTE_LABEL, GPSEstilo.TAMANHO_LABEL)
        c.drawString(
            x + GPSEstilo.PADDING_HORIZONTAL,
            y_campo2 - GPSEstilo.CAMPO2_LABEL_Y_OFFSET,
            "2 - VENCIMENTO (Uso exclusivo INSS)"
        )
        
        # Data de vencimento (centralizado, negrito, tamanho 11pt)
        vencimento = dados.get('vencimento', '')
        c.setFont(GPSEstilo.FONTE_VENCIMENTO, GPSEstilo.TAMANHO_VENCIMENTO)
        text_width = c.stringWidth(vencimento, GPSEstilo.FONTE_VENCIMENTO, GPSEstilo.TAMANHO_VENCIMENTO)
        x_centered = x + (GPSEstilo.SECAO_ESQUERDA_LARGURA - text_width) / 2
        c.drawString(x_centered, y_campo2 - GPSEstilo.CAMPO2_VALOR_Y_OFFSET, vencimento)
    
    def _desenhar_secao_dados_pagamento(self, c: canvas.Canvas, dados: Dict):
        """
        Desenha seção direita com dados de pagamento (campos 3-11) conforme GPSEstilo
        """
        c.setStrokeColor(GPSEstilo.COR_BORDA)
        c.setLineWidth(GPSEstilo.BORDA_FINA)
        c.setFillColor(GPSEstilo.COR_TEXTO_NORMAL)
        
        # ========== LINHA 1: Código, Competência, Identificador ==========
        # CAMPO 3: CÓDIGO DE PAGAMENTO
        self._desenhar_campo_numerico(
            c,
            GPSEstilo.CAMPO3_X,
            GPSEstilo.LINHA1_Y,
            GPSEstilo.CAMPO3_LARGURA,
            GPSEstilo.LINHA1_ALTURA,
            "3 - CÓDIGO DE PAGAMENTO",
            dados.get('codigo_pagamento', ''),
            tamanho_valor=GPSEstilo.TAMANHO_NUMERICO,
            negrito_valor=True
        )
        
        # CAMPO 4: COMPETÊNCIA
        self._desenhar_campo_numerico(
            c,
            GPSEstilo.CAMPO4_X,
            GPSEstilo.LINHA1_Y,
            GPSEstilo.CAMPO4_LARGURA,
            GPSEstilo.LINHA1_ALTURA,
            "4 - COMPETÊNCIA",
            dados.get('competencia', ''),
            tamanho_valor=GPSEstilo.TAMANHO_NUMERICO,
            negrito_valor=True
        )
        
        # CAMPO 5: IDENTIFICADOR
        nit_raw = dados.get('nit', '')
        nit_formatado = GPSEstilo.formatar_nit(nit_raw) if nit_raw else ''
        self._desenhar_campo_numerico(
            c,
            GPSEstilo.CAMPO5_X,
            GPSEstilo.LINHA1_Y,
            GPSEstilo.CAMPO5_LARGURA,
            GPSEstilo.LINHA1_ALTURA,
            "5 - IDENTIFICADOR",
            nit_formatado,
            tamanho_valor=GPSEstilo.TAMANHO_VALOR_PEQUENO,
            negrito_valor=True
        )
        
        # ========== LINHA 2: Valor INSS, dois campos vazios ==========
        # CAMPO 6: VALOR DO INSS
        self._desenhar_campo_valor(
            c,
            GPSEstilo.CAMPO6_X,
            GPSEstilo.LINHA2_Y,
            GPSEstilo.CAMPO6_LARGURA,
            GPSEstilo.LINHA2_ALTURA,
            "6 - VALOR DO INSS",
            dados.get('valor_inss', 0.00)
        )
        
        # CAMPO 7: (vazio)
        c.rect(GPSEstilo.CAMPO7_X, GPSEstilo.LINHA2_Y - GPSEstilo.LINHA2_ALTURA, GPSEstilo.CAMPO7_LARGURA, GPSEstilo.LINHA2_ALTURA)
        c.setFont(GPSEstilo.FONTE_LABEL, GPSEstilo.TAMANHO_LABEL)
        c.drawString(GPSEstilo.CAMPO7_X + GPSEstilo.PADDING_HORIZONTAL, GPSEstilo.LINHA2_Y - GPSEstilo.PADDING_VERTICAL_LABEL, "7 -")
        
        # CAMPO 8: (vazio)
        c.rect(GPSEstilo.CAMPO8_X, GPSEstilo.LINHA2_Y - GPSEstilo.LINHA2_ALTURA, GPSEstilo.CAMPO8_LARGURA, GPSEstilo.LINHA2_ALTURA)
        c.setFont(GPSEstilo.FONTE_LABEL, GPSEstilo.TAMANHO_LABEL)
        c.drawString(GPSEstilo.CAMPO8_X + GPSEstilo.PADDING_HORIZONTAL, GPSEstilo.LINHA2_Y - GPSEstilo.PADDING_VERTICAL_LABEL, "8 -")
        
        # ========== LINHA 3: Valor Outras Entidades, ATM/Multa ==========
        # CAMPO 9: VALOR OUTRAS ENTIDADES
        self._desenhar_campo_valor(
            c,
            GPSEstilo.CAMPO9_X,
            GPSEstilo.LINHA3_Y,
            GPSEstilo.CAMPO9_LARGURA,
            GPSEstilo.LINHA3_ALTURA,
            "9 - VALOR OUTRAS ENTIDADES",
            dados.get('valor_outras_entidades', 0.00)
        )
        
        # CAMPO 10: ATM/MULTA E JUROS
        self._desenhar_campo_valor(
            c,
            GPSEstilo.CAMPO10_X,
            GPSEstilo.LINHA3_Y,
            GPSEstilo.CAMPO10_LARGURA,
            GPSEstilo.LINHA3_ALTURA,
            "10 - ATM/MULTA E JUROS",
            dados.get('atm_multa_juros', 0.00)
        )
        
        # ========== LINHA 4: TOTAL ==========
        # CAMPO 11: TOTAL
        c.rect(GPSEstilo.CAMPO11_X, GPSEstilo.LINHA4_Y - GPSEstilo.LINHA4_ALTURA, GPSEstilo.CAMPO11_LARGURA, GPSEstilo.LINHA4_ALTURA)
        
        # Label
        c.setFont(GPSEstilo.FONTE_LABEL, GPSEstilo.TAMANHO_LABEL)
        c.drawString(
            GPSEstilo.CAMPO11_X + GPSEstilo.PADDING_HORIZONTAL,
            GPSEstilo.LINHA4_Y - GPSEstilo.PADDING_VERTICAL_LABEL,
            "11 - TOTAL"
        )
        
        # Valor total (negrito, tamanho 14pt, centralizado)
        valor_total = dados.get('valor_inss', 0) + dados.get('valor_outras_entidades', 0) + dados.get('atm_multa_juros', 0)
        valor_formatado = GPSEstilo.formatar_moeda(valor_total)
        c.setFont(GPSEstilo.FONTE_TOTAL, GPSEstilo.TAMANHO_TOTAL)
        text_width = c.stringWidth(valor_formatado, GPSEstilo.FONTE_TOTAL, GPSEstilo.TAMANHO_TOTAL)
        x_centered = GPSEstilo.CAMPO11_X + (GPSEstilo.CAMPO11_LARGURA - text_width) / 2
        y_valor = GPSEstilo.LINHA4_Y - GPSEstilo.LINHA4_ALTURA/2 - GPSEstilo.TAMANHO_TOTAL/3
        c.drawString(x_centered, y_valor, valor_formatado)
    
    def _desenhar_campo_numerico(self, c: canvas.Canvas, x: float, y: float, 
                                 largura: float, altura: float, label: str, 
                                 valor: str, tamanho_valor: int = 9, negrito_valor: bool = True):
        """
        Desenha campo numérico com label e valor conforme GPSEstilo
        """
        c.setStrokeColor(GPSEstilo.COR_BORDA)
        c.setLineWidth(GPSEstilo.BORDA_FINA)
        c.rect(x, y - altura, largura, altura)
        
        # Label
        c.setFont(GPSEstilo.FONTE_LABEL, GPSEstilo.TAMANHO_LABEL)
        c.setFillColor(GPSEstilo.COR_TEXTO_NORMAL)
        c.drawString(x + GPSEstilo.PADDING_HORIZONTAL, y - GPSEstilo.PADDING_VERTICAL_LABEL, label)
        
        # Valor (centralizado)
        if valor:
            fonte_valor = GPSEstilo.FONTE_NUMERICO if negrito_valor else GPSEstilo.FONTE_VALOR
            c.setFont(fonte_valor, tamanho_valor)
            text_width = c.stringWidth(valor, fonte_valor, tamanho_valor)
            x_centered = x + (largura - text_width) / 2
            y_centered = y - altura/2 - tamanho_valor/3
            c.drawString(x_centered, y_centered, valor)
    
    def _desenhar_campo_valor(self, c: canvas.Canvas, x: float, y: float,
                              largura: float, altura: float, label: str, valor: float):
        """
        Desenha campo de valor monetário conforme GPSEstilo (formato brasileiro: R$ 1.234,56)
        """
        c.setStrokeColor(GPSEstilo.COR_BORDA)
        c.setLineWidth(GPSEstilo.BORDA_FINA)
        c.rect(x, y - altura, largura, altura)
        
        # Label
        c.setFont(GPSEstilo.FONTE_LABEL, GPSEstilo.TAMANHO_LABEL)
        c.setFillColor(GPSEstilo.COR_TEXTO_NORMAL)
        c.drawString(x + GPSEstilo.PADDING_HORIZONTAL, y - GPSEstilo.PADDING_VERTICAL_LABEL, label)
        
        # Valor formatado (formato brasileiro: R$ 1.234,56)
        valor_formatado = GPSEstilo.formatar_moeda(valor)
        c.setFont(GPSEstilo.FONTE_VALOR, GPSEstilo.TAMANHO_VALOR_GRANDE)
        text_width = c.stringWidth(valor_formatado, GPSEstilo.FONTE_VALOR, GPSEstilo.TAMANHO_VALOR_GRANDE)
        x_centered = x + (largura - text_width) / 2
        y_centered = y - altura/2 - GPSEstilo.TAMANHO_VALOR_GRANDE/3
        c.drawString(x_centered, y_centered, valor_formatado)
    
    def _desenhar_rodape_atencao(self, c: canvas.Canvas):
        """
        Desenha aviso de atenção no rodapé conforme GPSEstilo
        """
        x = GPSEstilo.MARGEM_ESQUERDA
        y = GPSEstilo.ATENCAO_Y
        largura_texto = GPSEstilo.AREA_UTIL_LARGURA
        
        # Título "ATENÇÃO:"
        c.setFont(GPSEstilo.ATENCAO_FONTE, GPSEstilo.ATENCAO_TAMANHO_TITULO)
        c.setFillColor(GPSEstilo.COR_TEXTO_NORMAL)
        c.drawString(x, y, "ATENÇÃO:")
        
        # Texto do aviso
        c.setFont(GPSEstilo.ATENCAO_FONTE, GPSEstilo.ATENCAO_TAMANHO)
        texto = (
            "É vedada a utilização de GPS para recolhimento de receita de valor inferior a R$ 10,00 (dez reais), "
            "estipulado no art. 238 da Instrução Normativa RFB nº 2.110, de 17 de outubro de 2022."
        )
        
        # Quebra texto em múltiplas linhas
        y -= 3*mm
        palavras = texto.split()
        linha_atual = ""
        
        for palavra in palavras:
            teste_linha = linha_atual + " " + palavra if linha_atual else palavra
            if c.stringWidth(teste_linha, GPSEstilo.ATENCAO_FONTE, GPSEstilo.ATENCAO_TAMANHO) < largura_texto:
                linha_atual = teste_linha
            else:
                c.drawString(x, y, linha_atual)
                y -= 3*mm
                linha_atual = palavra
        
        if linha_atual:
            c.drawString(x, y, linha_atual)
    
    def _desenhar_competencias_consolidadas(self, c: canvas.Canvas, dados: Dict):
        """
        Desenha texto "Competências consolidadas nesta GPS:" e linha digitável ACIMA do código de barras
        conforme GPSEstilo - a linha digitável deve estar ACIMA do código de barras
        """
        x = GPSEstilo.MARGEM_ESQUERDA
        y = GPSEstilo.CONSOLIDADO_Y
        
        c.setFont(GPSEstilo.FONTE_VALOR, GPSEstilo.TAMANHO_VALOR_PEQUENO)
        c.setFillColor(GPSEstilo.COR_TEXTO_NORMAL)
        c.drawString(x, y, "Competências consolidadas nesta GPS:")
        
        # [OK] CORREÇÃO: Desenhar linha digitável ACIMA do código de barras (na seção de competências consolidadas)
        linha_digitavel = dados.get('linha_digitavel', '')
        if linha_digitavel:
            # Posição Y: abaixo do label "Competências consolidadas"
            y_linha = y - GPSEstilo.CONSOLIDADO_VALOR_Y_OFFSET
            
            # [OK] CORREÇÃO: Linha digitável em Courier-Bold 9pt conforme GPSEstilo
            c.setFont(GPSEstilo.FONTE_LINHA_DIGITAVEL, GPSEstilo.TAMANHO_LINHA_DIGITAVEL)
            c.setFillColor(GPSEstilo.COR_TEXTO_NORMAL)
            
            # Centraliza horizontalmente
            texto_width = c.stringWidth(linha_digitavel, GPSEstilo.FONTE_LINHA_DIGITAVEL, GPSEstilo.TAMANHO_LINHA_DIGITAVEL)
            x_linha = (GPSEstilo.PAGINA_LARGURA - texto_width) / 2
            
            print(f"[PDF] [DEBUG] Desenhando linha digitável ACIMA do código de barras: x={x_linha/mm:.1f}mm, y={y_linha/mm:.1f}mm, texto='{linha_digitavel}'")
            
            c.drawString(x_linha, y_linha, linha_digitavel)
            
            print(f"[PDF] [OK] Linha digitável desenhada ACIMA do código de barras em Courier-Bold 9pt")
        
        # Guardar posição Y para referência do código de barras
        self._y_competencias = y
    
    def _desenhar_autenticacao_bancaria(self, c: canvas.Canvas):
        """
        Desenha texto "AUTENTICAÇÃO BANCÁRIA" no canto direito conforme GPSEstilo
        """
        y_referencia = getattr(self, '_y_competencias', GPSEstilo.CONSOLIDADO_Y)
        texto = "AUTENTICAÇÃO BANCÁRIA"
        c.setFont(GPSEstilo.FONTE_LABEL, GPSEstilo.TAMANHO_LABEL)
        c.setFillColor(GPSEstilo.COR_TEXTO_NORMAL)
        text_width = c.stringWidth(texto, GPSEstilo.FONTE_LABEL, GPSEstilo.TAMANHO_LABEL)
        x_texto = GPSEstilo.PAGINA_LARGURA - GPSEstilo.MARGEM_DIREITA - text_width
        c.drawString(x_texto, y_referencia, texto)

    def _desenhar_codigo_barras(self, c: canvas.Canvas, dados: Dict):
        """
        Desenha código de barras Interleaved 2 of 5 (I2of5) conforme padrão FEBRABAN
        para GPS/Arrecadação:
        - Tipo: Interleaved 2 of 5 (padrão FEBRABAN para produto 8)
        - Altura: 12mm (GPSEstilo.CODIGO_BARRAS_ALTURA)
        - Largura de barra: ajustada para ~150mm total
        """
        codigo_barras = dados.get('codigo_barras', '')

        if not codigo_barras:
            print("[PDF] [WARN] Código de barras não fornecido")
            return

        # GPS tem 44 dígitos
        if len(codigo_barras) != 44:
            print(f"[PDF] [WARN] Código de barras GPS deve ter 44 dígitos, recebido: {len(codigo_barras)}")
            # Tentar usar mesmo assim

        # Posição Y conforme GPSEstilo
        y_barcode_bottom = GPSEstilo.CODIGO_BARRAS_Y - GPSEstilo.CODIGO_BARRAS_ALTURA

        try:
            # Interleaved 2 of 5 (I2of5) é o padrão FEBRABAN para GPS/Arrecadação
            #
            # Características I2of5:
            # - Codifica apenas dígitos numéricos (0-9)
            # - Número PAR de dígitos (44 é par ✓)
            # - Cada par de dígitos codificado em 5 barras
            # - Largura de barras: fina (1x) ou grossa (2x ou 3x o módulo)
            
            # Para I2of5, barWidth é o módulo fino
            # Padrão bancário: módulo fino entre 0.33mm e 0.52mm
            # Vamos usar 0.43mm para boa legibilidade
            bar_width_i2of5 = 0.43 * mm

            print(f"[PDF] [DEBUG] Gerando Interleaved 2 of 5: {len(codigo_barras)} dígitos")
            print(f"[PDF] [DEBUG] barWidth (módulo fino): {bar_width_i2of5/mm:.3f}mm")

            # Gerar código de barras I2of5
            barcode = common.I2of5(
                codigo_barras,
                barWidth=bar_width_i2of5,  # Módulo fino
                barHeight=GPSEstilo.CODIGO_BARRAS_ALTURA,  # 12mm
                humanReadable=False,  # Não mostrar números (linha digitável separada)
                checksum=0  # GPS já tem DV próprio, não adicionar checksum I2of5
            )

            # Verificar largura gerada
            barcode_width = barcode.width

            print(f"[PDF] [DEBUG] Código I2of5 gerado: largura={barcode_width/mm:.1f}mm")

            # Ajustar barWidth se necessário para aproximar de 150mm
            largura_desejada = GPSEstilo.CODIGO_BARRAS_LARGURA_TOTAL  # 150mm
            diferenca = abs(barcode_width - largura_desejada)

            if diferenca > 15 * mm:  # Se diferença > 15mm, ajustar
                fator_ajuste = largura_desejada / barcode_width
                bar_width_ajustado = bar_width_i2of5 * fator_ajuste

                # Manter dentro dos limites FEBRABAN: 0.33mm a 0.52mm
                bar_width_minimo = 0.33 * mm
                bar_width_maximo = 0.52 * mm
                bar_width_ajustado = min(max(bar_width_ajustado, bar_width_minimo), bar_width_maximo)

                print(f"[PDF] [DEBUG] Ajustando barWidth I2of5: {bar_width_ajustado/mm:.3f}mm (fator: {fator_ajuste:.3f})")

                # Regenerar código de barras com largura ajustada
                barcode = common.I2of5(
                    codigo_barras,
                    barWidth=bar_width_ajustado,
                    barHeight=GPSEstilo.CODIGO_BARRAS_ALTURA,
                    humanReadable=False,
                    checksum=0
                )
                barcode_width = barcode.width
                print(f"[PDF] [DEBUG] Código I2of5 ajustado: largura={barcode_width/mm:.1f}mm")

            # Centraliza horizontalmente
            x_barcode = (GPSEstilo.PAGINA_LARGURA - barcode_width) / 2

            print(f"[PDF] [DEBUG] Desenhando I2of5: x={x_barcode/mm:.1f}mm, y={y_barcode_bottom/mm:.1f}mm")

            barcode.drawOn(c, x_barcode, y_barcode_bottom)

            # Guardar posição Y do código de barras para desenhar linha digitável abaixo
            self._y_barcode_bottom = y_barcode_bottom

            print(f"[PDF] [OK] Código de barras I2of5 desenhado com sucesso")
            
        except Exception as e:
            print(f"[PDF] [ERRO] Erro ao gerar código de barras: {e}")
            import traceback
            print(traceback.format_exc())
            # Fallback: desenha apenas texto
            c.setFont("Courier", 6)
            text_width = c.stringWidth(codigo_barras, "Courier", 6)
            x_centro = GPSEstilo.PAGINA_LARGURA / 2
            c.drawString(x_centro - text_width/2, y_barcode_bottom, codigo_barras)
            self._y_barcode_bottom = y_barcode_bottom


# FUNÇÃO DE TESTE
def gerar_gps_teste():
    """
    Gera GPS de teste com dados de exemplo
    """
    
    dados_teste = {
        'nome': 'CARLOS GESIEL REBELO',
        'cpf': '123.456.789-00',
        'nit': '128.00186.72-2',
        'endereco': 'Rua Exemplo, 123',
        'cidade': 'Florianópolis',
        'uf': 'SANTA CATARINA',
        'telefone': '48999999999',
        'codigo_pagamento': '1007',
        'competencia': '11/2025',
        'valor_inss': 303.60,
        'valor_outras_entidades': 0.00,
        'atm_multa_juros': 0.00,
        'vencimento': '15/12/2025',
        'codigo_barras': '858100000003036002701007000128001867222025113',
        'linha_digitavel': '858100000003-0 03600270100-7 70001280018-4 67222025113-0'
    }
    
    gerador = GPSPDFGeneratorOficial()
    
    # Gera para arquivo
    output_path = 'gps_teste.pdf'
    gerador.gerar_gps(dados_teste, output_path=output_path)
    
    print(f"[OK] GPS gerada com sucesso: {output_path}")
    
    # Ou gera para BytesIO
    # buffer = gerador.gerar_gps(dados_teste)
    # print(f"[OK] GPS gerada em memória: {len(buffer.getvalue())} bytes")


if __name__ == "__main__":
    gerar_gps_teste()