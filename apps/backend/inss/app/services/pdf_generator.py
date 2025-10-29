from __future__ import annotations

import tempfile
from io import BytesIO
from pathlib import Path
from typing import Any

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas

from ..utils.constants import calcular_vencimento_padrao

try:
    import barcode
    from barcode.writer import ImageWriter
except ImportError:  # pragma: no cover
    barcode = None  # type: ignore
    ImageWriter = None  # type: ignore


class GPSGenerator:
    """Responsável por gerar o PDF da guia GPS."""

    def gerar_guia(self, dados_contribuinte: dict[str, Any], valor: float, codigo: str, competencia: str) -> bytes:
        """
        Gera PDF da guia GPS e retorna bytes.
        """

        buffer = BytesIO()
        pdf = canvas.Canvas(buffer, pagesize=A4)
        largura, altura = A4
        margem = 20 * mm

        pdf.setTitle("Guia da Previdência Social")

        # Cabeçalho
        pdf.setFont("Helvetica-Bold", 16)
        pdf.drawString(margem, altura - margem, "GUIA DA PREVIDÊNCIA SOCIAL (GPS)")

        pdf.setLineWidth(1)
        pdf.line(margem, altura - margem - 5 * mm, largura - margem, altura - margem - 5 * mm)

        pdf.setFont("Helvetica", 11)
        y = altura - margem - 15 * mm
        campos = [
            ("Nome", dados_contribuinte.get("nome", "Não informado")),
            ("CPF", dados_contribuinte.get("cpf", "Não informado")),
            ("NIT/PIS/PASEP", dados_contribuinte.get("nit", "Não informado")),
            ("Código de Pagamento", codigo),
            ("Competência", competencia),
            ("Valor da Contribuição", f"R$ {valor:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")),
            (
                "Data de Vencimento",
                calcular_vencimento_padrao(competencia).strftime("%d/%m/%Y"),
            ),
            ("WhatsApp", dados_contribuinte.get("whatsapp", "Não informado")),
        ]

        for titulo, conteudo in campos:
            pdf.drawString(margem, y, f"{titulo}: {conteudo}")
            y -= 8 * mm

        pdf.setFont("Helvetica", 9)
        pdf.drawString(
            margem,
            y,
            "Pague a GPS em bancos, casas lotéricas ou via internet banking até a data de vencimento.",
        )

        y -= 15 * mm

        # Simples representação do código em vez de gerar barcode
        pdf.setFont("Helvetica-Bold", 11)
        codigo_texto = f"{codigo}{competencia.replace('/', '')}{int(valor*100):011d}"
        pdf.drawString(margem, y, f"Código de Barras: {codigo_texto}")

        pdf.showPage()
        pdf.save()
        buffer.seek(0)
        return buffer.read()

