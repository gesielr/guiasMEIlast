"""
Constantes do sistema INSS - Categorias e Códigos GPS
Atualizado: Novembro/Dezembro 2025
"""

from datetime import date
from decimal import Decimal

# Valores oficiais INSS 2025
SALARIO_MINIMO_2025 = Decimal("1518.00")
TETO_INSS_2025 = Decimal("8157.41")

# Categorias oficiais de contribuintes com códigos GPS corretos
SAL_CLASSES = {
    # 20% - Contribuinte Individual
    "autonomo": {
        "codigo_gps": "1007",
        "aliquota": 0.20,
        "tipo": "range",  # Permite escolher valor
        "permite_escolher_valor": True,
        "descricao": "Contribuinte Individual Mensal (20% sobre valor escolhido)",
    },
    "autonomo_trimestral": {
        "codigo_gps": "1120",
        "aliquota": 0.20,
        "tipo": "range",
        "permite_escolher_valor": True,
        "meses": 3,
        "descricao": "Contribuinte Individual Trimestral (20% × 3 meses)",
    },

    # 11% - Plano Simplificado
    "autonomo_simplificado": {
        "codigo_gps": "1163",
        "aliquota": 0.11,
        "tipo": "fixo",  # Sempre sobre salário mínimo
        "permite_escolher_valor": False,
        "descricao": "Contribuinte Individual Plano Simplificado (11% sobre salário mínimo)",
    },

    # 20% - Facultativo
    "facultativo": {
        "codigo_gps": "1406",
        "aliquota": 0.20,
        "tipo": "range",
        "permite_escolher_valor": True,
        "descricao": "Facultativo Mensal (20% sobre valor escolhido)",
    },
    "facultativo_trimestral": {
        "codigo_gps": "1457",
        "aliquota": 0.20,
        "tipo": "range",
        "permite_escolher_valor": True,
        "meses": 3,
        "descricao": "Facultativo Trimestral (20% × 3 meses)",
    },

    # 11% - Facultativo Simplificado
    "facultativo_simplificado": {
        "codigo_gps": "1473",
        "aliquota": 0.11,
        "tipo": "fixo",
        "permite_escolher_valor": False,
        "descricao": "Facultativo Plano Simplificado (11% sobre salário mínimo)",
    },

    # 5% - Baixa Renda
    "facultativo_baixa_renda": {
        "codigo_gps": "1929",
        "aliquota": 0.05,
        "tipo": "fixo",
        "permite_escolher_valor": False,
        "descricao": "Facultativo Baixa Renda (5% sobre salário mínimo - requer CadÚnico)",
    },

    # 5% - MEI
    "mei": {
        "codigo_gps": "1910",
        "aliquota": 0.05,
        "tipo": "fixo",
        "permite_escolher_valor": False,
        "descricao": "MEI - Microempreendedor Individual (5% sobre salário mínimo)",
    },

    # 5% - Segurado Especial
    "segurado_especial": {
        "codigo_gps": "1503",
        "aliquota": 0.05,
        "tipo": "fixo",
        "permite_escolher_valor": False,
        "descricao": "Segurado Especial (5% sobre salário mínimo)",
    },

    # Complementação
    "complementacao": {
        "codigo_gps": "1147",
        "aliquota": 0.09,  # Diferença entre 11% e 20%
        "tipo": "livre",
        "permite_escolher_valor": True,
        "descricao": "Complementação de 11% para 20%",
    },

    # Mantidos para compatibilidade (códigos antigos)
    "domestico": {
        "codigo_gps": "1503",
        "aliquota": None,
        "tipo": "progressivo",
        "descricao": "Empregado doméstico (tabela progressiva)",
    },
    "produtor_rural": {
        "codigo_gps": "1120",
        "aliquota": 0.015,
        "tipo": "especial",
        "descricao": "Produtor rural pessoa física",
    },
}

TABELA_PROGRESSIVA_DOMESTICO = [
    (1412.00, 0.075),
    (2666.68, 0.09),
    (4000.03, 0.12),
    (float("inf"), 0.14),
]


def calcular_vencimento_padrao(competencia: str) -> date:
    """Retorna data de vencimento padrão (15 do mês seguinte)."""

    mes, ano = competencia.split("/")
    mes_int = int(mes)
    ano_int = int(ano)
    if mes_int == 12:
        mes_vencimento = 1
        ano_vencimento = ano_int + 1
    else:
        mes_vencimento = mes_int + 1
        ano_vencimento = ano_int
    return date(ano_vencimento, mes_vencimento, 15)

