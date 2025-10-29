import pytest

from app.services.inss_calculator import INSSCalculator


def test_calculo_autonomo_normal():
    calc = INSSCalculator()
    resultado = calc.calcular_contribuinte_individual(2000.00, "normal")
    assert resultado.valor == 400.0
    assert resultado.codigo_gps == "1007"


def test_calculo_simplificado():
    calc = INSSCalculator()
    resultado = calc.calcular_contribuinte_individual(calc.salario_minimo_2025, "simplificado")
    assert resultado.valor == pytest.approx(166.98, 0.01)
    assert resultado.codigo_gps == "1163"

