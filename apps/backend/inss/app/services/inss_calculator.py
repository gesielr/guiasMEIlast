from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from typing import Literal

from ..config import get_settings
from ..utils.constants import SAL_CLASSES, TABELA_PROGRESSIVA_DOMESTICO
from ..utils.validators import normalizar_competencia

Plano = Literal["normal", "simplificado"]


@dataclass
class CalculoSAL:
    codigo_gps: str
    valor: float
    competencia: str | None = None
    descricao: str | None = None
    detalhes: dict | None = None


class INSSCalculator:
    """Realiza cálculos de contribuições conforme regras SAL."""

    def __init__(self) -> None:
        settings = get_settings()
        self.salario_minimo_2025 = settings.salario_minimo_2025
        self.teto_inss_2025 = settings.teto_inss_2025

    def calcular_contribuinte_individual(self, valor_base: float, plano: Plano) -> CalculoSAL:
        """
        Calcula contribuição para autônomo.

        plano: 'normal' (20%) ou 'simplificado' (11%)
        """

        if plano not in ("normal", "simplificado"):
            raise ValueError("Plano deve ser 'normal' ou 'simplificado'")

        if plano == "simplificado":
            codigo = SAL_CLASSES["autonomo_simplificado"]["codigo_gps"]
            valor = round(self.salario_minimo_2025 * SAL_CLASSES["autonomo_simplificado"]["aliquota"], 2)
            return CalculoSAL(
                codigo_gps=codigo,
                valor=valor,
                descricao=SAL_CLASSES["autonomo_simplificado"]["descricao"],
                detalhes={
                    "plano": plano,
                    "base_calculo": self.salario_minimo_2025,
                    "aliquota": SAL_CLASSES["autonomo_simplificado"]["aliquota"],
                },
            )

        base_calculo = max(self.salario_minimo_2025, min(valor_base, self.teto_inss_2025))
        valor = round(base_calculo * SAL_CLASSES["autonomo"]["aliquota"], 2)
        return CalculoSAL(
            codigo_gps=SAL_CLASSES["autonomo"]["codigo_gps"],
            valor=valor,
            descricao=SAL_CLASSES["autonomo"]["descricao"],
            detalhes={
                "plano": plano,
                "base_calculo": base_calculo,
                "aliquota": SAL_CLASSES["autonomo"]["aliquota"],
            },
        )

    def calcular_complementacao(self, competencias: list[str], valor_base: float) -> CalculoSAL:
        """
        Calcula complementação de 11% para 20% com juros.

        A taxa SELIC é aproximada por 0,5% ao mês para ilustração.
        """

        competencias_normalizadas = [normalizar_competencia(item) for item in competencias]
        aliquota_diferenca = SAL_CLASSES["complementacao"]["aliquota"]
        diferenca = round(valor_base * aliquota_diferenca, 2)

        # Juros SELIC simplificados
        taxa_mensal = 0.005
        hoje = date.today()
        total_juros = 0.0
        for competencia in competencias_normalizadas:
            mes, ano = competencia.split("/")
            meses_atraso = (hoje.year - int(ano)) * 12 + (hoje.month - int(mes))
            meses_atraso = max(meses_atraso, 0)
            juros = diferenca * ((1 + taxa_mensal) ** meses_atraso - 1)
            total_juros += juros

        total = round(diferenca + total_juros, 2)
        return CalculoSAL(
            codigo_gps=SAL_CLASSES["complementacao"]["codigo_gps"],
            valor=total,
            descricao=SAL_CLASSES["complementacao"]["descricao"],
            detalhes={
                "competencias": competencias_normalizadas,
                "valor_base": valor_base,
                "diferenca": diferenca,
                "juros": round(total_juros, 2),
                "taxa_mensal_aplicada": taxa_mensal,
            },
        )

    def calcular_produtor_rural(self, receita_bruta: float, segurado_especial: bool = False) -> CalculoSAL:
        """
        Calcula contribuição do produtor rural.

        segurado_especial=True aplica alíquota de 1,3% sobre receita bruta.
        """

        if receita_bruta <= 0:
            raise ValueError("Receita bruta deve ser positiva")

        chave = "produtor_rural_especial" if segurado_especial else "produtor_rural"
        aliquota = SAL_CLASSES[chave]["aliquota"]
        valor = round(receita_bruta * aliquota, 2)
        return CalculoSAL(
            codigo_gps=SAL_CLASSES[chave]["codigo_gps"],
            valor=valor,
            descricao=SAL_CLASSES[chave]["descricao"],
            detalhes={
                "receita_bruta": receita_bruta,
                "aliquota": aliquota,
                "segurado_especial": segurado_especial,
            },
        )

    def calcular_domestico(self, salario: float) -> CalculoSAL:
        """
        Calcula contribuição de empregado doméstico utilizando tabela progressiva 7,5% a 14%.
        """

        if salario <= 0:
            raise ValueError("Salário deve ser positivo")

        restante = salario
        faixas = []
        valor_total = 0.0
        base_anterior = 0.0
        for teto, aliquota in TABELA_PROGRESSIVA_DOMESTICO:
            base_faixa = min(restante, teto - base_anterior)
            if base_faixa <= 0:
                break
            parcela = base_faixa * aliquota
            faixas.append({"base": round(base_faixa, 2), "aliquota": aliquota, "valor": round(parcela, 2)})
            valor_total += parcela
            restante -= base_faixa
            base_anterior = teto

        return CalculoSAL(
            codigo_gps=SAL_CLASSES["domestico"]["codigo_gps"],
            valor=round(valor_total, 2),
            descricao=SAL_CLASSES["domestico"]["descricao"],
            detalhes={"faixas": faixas, "salario": salario},
        )

