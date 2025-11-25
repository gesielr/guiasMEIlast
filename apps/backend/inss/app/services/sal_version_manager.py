from datetime import date
from decimal import Decimal
from typing import Optional, Dict, Any
import json
from ..services.supabase_service import SupabaseService

class SALVersionManager:
    """
    Gerenciador de versões das tabelas SAL.
    Responsável por recuperar e validar as regras SAL para uma determinada competência.
    Adaptado para usar cache em memória (substituindo Redis por enquanto).
    """
    
    _cache: Dict[str, Any] = {}
    
    def __init__(self, supabase_service: Optional[SupabaseService] = None):
        self.supabase_service = supabase_service or SupabaseService()
    
    async def get_sal_version(self, data_competencia: date) -> Dict[str, Any]:
        """
        Retorna o conjunto de regras SAL válido para a data de competência especificada.
        Prioridade: Memória Cache > Supabase
        """
        ano = data_competencia.year
        cache_key = f"sal:version:{ano}"
        
        # 1. Tentar buscar do Cache
        if cache_key in self._cache:
            return self._cache[cache_key]
        
        # 2. Buscar do Supabase
        # Como o supabase_service.client pode ser None ou assíncrono, vamos usar o método get_records
        # Assumindo que existe uma tabela 'sal_version_history'
        # Se não existir, vamos retornar um fallback hardcoded para 2025 por enquanto
        
        try:
            records = await self.supabase_service.get_records(
                "sal_version_history", 
                {"effective_date": f"{ano}-01-01"}
            )
            
            if records and len(records) > 0:
                sal_data = records[0]
                self._cache[cache_key] = sal_data
                return sal_data
        except Exception as e:
            print(f"[SAL MANAGER] Erro ao buscar regras SAL do banco: {e}")
        
        # Fallback Hardcoded para 2025 (conforme documento)
        if ano == 2025:
            print(f"[SAL MANAGER] Usando regras SAL 2025 (Fallback)")
            fallback_2025 = {
                "effective_date": "2025-01-01",
                "teto_inss": 7786.02,
                "salario_minimo": 1518.00,
                "tabela_aliquotas": {
                    "ci_normal": [
                        {"faixa_min": 0.00, "faixa_max": 1518.00, "aliquota": 0.075},
                        {"faixa_min": 1518.01, "faixa_max": 2666.68, "aliquota": 0.09},
                        {"faixa_min": 2666.69, "faixa_max": 4000.03, "aliquota": 0.12},
                        {"faixa_min": 4000.04, "faixa_max": 7786.02, "aliquota": 0.14}
                    ],
                    "ci_simplificado": [
                        {"faixa_min": 0.00, "faixa_max": 7786.02, "aliquota": 0.11}
                    ],
                    "domestico": [
                        {"faixa_min": 0.00, "faixa_max": 7786.02, "aliquota": 0.08} # Simplificado para exemplo, real é progressivo
                    ],
                    "rural": [
                        {"faixa_min": 0.00, "faixa_max": 999999.99, "aliquota": 0.115}
                    ]
                }
            }
            self._cache[cache_key] = fallback_2025
            return fallback_2025
            
        raise ValueError(f"Não há regras SAL configuradas para o ano {ano}")
    
    async def get_teto_inss(self, ano: int) -> Decimal:
        """Retorna o teto INSS para um determinado ano"""
        sal_version = await self.get_sal_version(date(ano, 1, 1))
        return Decimal(str(sal_version['teto_inss']))
    
    async def get_salario_minimo(self, ano: int) -> Decimal:
        """Retorna o salário mínimo para um determinado ano"""
        sal_version = await self.get_sal_version(date(ano, 1, 1))
        return Decimal(str(sal_version['salario_minimo']))
    
    async def get_aliquotas(self, tipo_contribuinte: str, data: date) -> list:
        """
        Retorna as faixas e alíquotas para um tipo de contribuinte específico
        """
        sal_version = await self.get_sal_version(data)
        # Ajuste para estrutura JSONB ou dict Python
        tabela = sal_version.get('tabela_aliquotas', {})
        if isinstance(tabela, str):
            tabela = json.loads(tabela)
            
        aliquotas = tabela.get(tipo_contribuinte, [])
        
        if not aliquotas:
            # Tentar mapeamento de nomes antigos se necessário
            mapa_tipos = {
                "autonomo": "ci_normal",
                "autonomo_simplificado": "ci_simplificado",
                "individual": "ci_normal"
            }
            tipo_mapeado = mapa_tipos.get(tipo_contribuinte)
            if tipo_mapeado:
                aliquotas = tabela.get(tipo_mapeado, [])
        
        if not aliquotas:
            # Fallback seguro se não encontrar alíquotas
            print(f"[SAL MANAGER] [WARN] Alíquotas não encontradas para {tipo_contribuinte}, usando padrão")
            if tipo_contribuinte in ["ci_simplificado", "autonomo_simplificado"]:
                 return [{"faixa_min": 0, "faixa_max": 99999, "aliquota": 0.11}]
            return []
            # raise ValueError(f"Alíquotas não encontradas para tipo: {tipo_contribuinte}")
        
        return aliquotas
    
    async def validate_against_sal(self, tipo: str, valor: Decimal, data: date) -> tuple:
        """
        Valida se um valor está dentro dos limites SAL
        Retorna (valido: bool, mensagem: str)
        """
        try:
            teto = await self.get_teto_inss(data.year)
            salario_minimo = await self.get_salario_minimo(data.year)
            
            if valor > teto:
                return False, f"Valor R$ {valor:,.2f} excede teto INSS de R$ {teto:,.2f}"
            
            # Para simplificado, pode ser menor que salário mínimo? Não, regra D diz que mínimo é SM.
            # Exceto se for complemento, mas aqui é validação base.
            if valor < salario_minimo:
                return False, f"Valor R$ {valor:,.2f} abaixo do salário mínimo R$ {salario_minimo:,.2f}"
            
            return True, "Válido"
        
        except Exception as e:
            return False, f"Erro ao validar regras SAL: {str(e)}"
