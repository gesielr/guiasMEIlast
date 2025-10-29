import re
from datetime import datetime
from typing import Iterable

WHATSAPP_REGEX = re.compile(r"^\+?\d{10,15}$")
CPF_REGEX = re.compile(r"^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$")


def validar_whatsapp(numero: str) -> bool:
    """Valida número de WhatsApp incluindo código do país."""

    return bool(WHATSAPP_REGEX.match(numero.replace("whatsapp:", "")))


def normalizar_competencia(competencia: str) -> str:
    """Normaliza competência para MM/AAAA."""

    competencia_limpa = competencia.strip()
    if not re.match(r"^\d{2}/\d{4}$", competencia_limpa):
        raise ValueError("Competência deve estar no formato MM/AAAA")
    mes, ano = competencia_limpa.split("/")
    datetime(year=int(ano), month=int(mes), day=1)
    return competencia_limpa


def validar_lista_competencias(competencias: Iterable[str]) -> list[str]:
    """Valida e normaliza lista de competências."""

    return [normalizar_competencia(item) for item in competencias]


def validar_cpf(cpf: str) -> bool:
    """Valida CPF com dígitos verificadores."""

    numeros = re.sub(r"\D", "", cpf)
    if len(numeros) != 11 or numeros == numeros[0] * 11:
        return False
    for i in range(9, 11):
        soma = sum(int(numeros[num]) * ((i + 1) - num) for num in range(0, i))
        digito = (soma * 10) % 11
        if digito == 10:
            digito = 0
        if digito != int(numeros[i]):
            return False
    return True

