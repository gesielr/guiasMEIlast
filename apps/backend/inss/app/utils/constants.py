"""Constantes do sistema SAL e metadados padrões."""

from datetime import date

SAL_CLASSES = {
    "autonomo": {
        "codigo_gps": "1007",
        "aliquota": 0.20,
        "descricao": "Contribuinte individual (autônomo)",
    },
    "autonomo_simplificado": {
        "codigo_gps": "1163",
        "aliquota": 0.11,
        "descricao": "Contribuinte individual plano simplificado",
    },
    "facultativo": {
        "codigo_gps": "1295",
        "aliquota": 0.20,
        "descricao": "Facultativo",
    },
    "facultativo_baixa_renda": {
        "codigo_gps": "1929",
        "aliquota": 0.05,
        "descricao": "Facultativo baixa renda (CadÚnico)",
    },
    "domestico": {
        "codigo_gps": "1503",
        "aliquota": None,
        "descricao": "Empregado doméstico (tabela progressiva)",
    },
    "produtor_rural": {
        "codigo_gps": "1120",
        "aliquota": 0.015,
        "descricao": "Produtor rural pessoa física",
    },
    "produtor_rural_especial": {
        "codigo_gps": "1180",
        "aliquota": 0.013,
        "descricao": "Produtor rural segurado especial",
    },
    "complementacao": {
        "codigo_gps": "2010",
        "aliquota": 0.09,
        "descricao": "Complementação 11% → 20%",
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

