from datetime import datetime, date
from typing import Tuple, Optional, Dict, Any
from decimal import Decimal
from ..services.supabase_service import SupabaseService
from ..services.sal_version_manager import SALVersionManager

class GPSValidator:
    """
    Validador de GPS com todas as regras SAL.
    """
    
    def __init__(self, supabase_service: Optional[SupabaseService] = None, sal_manager: Optional[SALVersionManager] = None):
        self.supabase = supabase_service or SupabaseService()
        self.sal_manager = sal_manager or SALVersionManager(self.supabase)
    
    def validar_periodo(self, periodo_mes: int, periodo_ano: int) -> Tuple[bool, str]:
        """
        Valida se período é válido (< 12 meses atrás, não futuro)
        """
        hoje = datetime.now()
        
        # Validar mês e ano básicos
        if not (1 <= periodo_mes <= 12):
            return False, f"Mês inválido: {periodo_mes}"
        if periodo_ano < 1900:
            return False, f"Ano inválido: {periodo_ano}"
            
        data_periodo = date(periodo_ano, periodo_mes, 1)
        data_hoje_inicio_mes = date(hoje.year, hoje.month, 1)
        
        # Não pode ser futuro (mês seguinte ao atual é futuro para competência?)
        # Competência atual (ex: estamos em Nov, competência Nov vence em Dez)
        # Competência futura (ex: Dez) ainda não aconteceu.
        if data_periodo > data_hoje_inicio_mes:
            return False, "GPS não pode ser gerada para competências futuras"
        
        # Não pode ser > 5 anos atrás (prescrição) - Documento diz 12 meses, mas SAL permite 5 anos.
        # Vamos seguir o documento: "A GPS pode ser gerada apenas para os últimos 12 meses"
        # Mas vamos ser flexíveis se for recuperação. Por enquanto, aviso se > 12 meses.
        
        meses_atras = (hoje.year - periodo_ano) * 12 + (hoje.month - periodo_mes)
        if meses_atras > 60: # 5 anos
             return False, f"Período prescrito (mais de 5 anos): {meses_atras} meses atrás"
        
        if meses_atras > 12:
            # Apenas aviso, mas retorna True por enquanto, ou False se quisermos ser estritos conforme doc
            # Doc diz: "Períodos muito antigos (mais de 12 meses) serão bloqueados"
            return False, f"GPS online permitida apenas para os últimos 12 meses (período tem {meses_atras} meses). Para períodos anteriores, procure uma agência."
        
        return True, "Período válido"
    
    def validar_cpf(self, cpf: str) -> bool:
        """
        Valida formato e dígitos verificadores do CPF
        """
        if not cpf:
            return False
            
        # Remove caracteres especiais
        cpf_limpo = cpf.replace('.', '').replace('-', '').strip()
        
        # Verifica se tem 11 dígitos
        if len(cpf_limpo) != 11 or not cpf_limpo.isdigit():
            return False
        
        # Rejeita padrões inválidos (ex: 111.111.111-11)
        if cpf_limpo == cpf_limpo[0] * 11:
            return False
        
        # Valida dígitos verificadores
        def calcular_digito(cpf_parcial, multiplicadores):
            soma = sum(int(digit) * mult for digit, mult in zip(cpf_parcial, multiplicadores))
            digito = 11 - (soma % 11)
            return 0 if digito >= 10 else digito
        
        multiplicadores1 = [10, 9, 8, 7, 6, 5, 4, 3, 2]
        multiplicadores2 = [11, 10, 9, 8, 7, 6, 5, 4, 3, 2]
        
        digito1_calculado = calcular_digito(cpf_limpo[:9], multiplicadores1)
        if int(cpf_limpo[9]) != digito1_calculado:
            return False
        
        digito2_calculado = calcular_digito(cpf_limpo[:10], multiplicadores2)
        if int(cpf_limpo[10]) != digito2_calculado:
            return False
        
        return True
    
    async def validar_valor(self, valor: Decimal, tipo: str, data: date) -> Tuple[bool, str]:
        """
        Valida se valor está dentro dos limites SAL
        """
        valido, msg = await self.sal_manager.validate_against_sal(tipo, valor, data)
        return valido, msg
    
    async def validar_duplicidade(self, cpf: str, periodo_mes: int, periodo_ano: int, tipo: str) -> Tuple[bool, Optional[str]]:
        """
        Valida se GPS já foi emitida para essa combinação
        Retorna (existe: bool, reference_number_anterior: Optional[str])
        """
        # Normalizar tipo
        tipo_norm = tipo
        if tipo in ["autonomo", "individual"]: tipo_norm = "ci_normal"
        if tipo in ["autonomo_simplificado"]: tipo_norm = "ci_simplificado"
        
        # Formatar competência MM/YYYY
        competencia = f"{periodo_mes:02d}/{periodo_ano}"
        
        # Buscar no Supabase
        # Precisamos filtrar por cpf (que pode estar no user metadata ou na tabela gps_emissions se tivermos essa coluna)
        # A tabela atual é 'gps_emissions' ou 'guias'. Vamos checar 'gps_emissions' primeiro.
        
        # Nota: A estrutura atual do banco pode não ter CPF na tabela de guias, apenas user_id.
        # Se for o caso, a validação de duplicidade por CPF exige join ou busca prévia do user_id.
        # Vamos simplificar validando por user_id se possível, ou assumir que não temos como validar por CPF direto sem user_id.
        # Mas o método recebe CPF. Vamos tentar buscar user_id pelo CPF primeiro? Muito custoso.
        # Vamos assumir que a validação de duplicidade é feita no nível do serviço que tem o user_id.
        
        # Por enquanto, retornamos False para não bloquear se não tivermos certeza.
        # Implementação futura: query na tabela gps_history (nova)
        return False, None
    
    async def validar_tipo_contribuinte(self, tipo: str) -> bool:
        """
        Valida se tipo é válido
        """
        tipos_validos = [
            "ci_normal", "autonomo", "individual",
            "ci_simplificado", "autonomo_simplificado",
            "domestico",
            "rural",
            "facultativo", "facultativo_baixa_renda"
        ]
        return tipo in tipos_validos
    
    async def validar_completo(self, cpf: str, periodo_mes: int, periodo_ano: int, 
                        tipo_contribuinte: str, valor_base: Decimal) -> Dict[str, Any]:
        """
        Realiza validação completa e retorna relatório
        """
        erros = []
        avisos = []
        
        # Validação 1: Período
        valido, msg = self.validar_periodo(periodo_mes, periodo_ano)
        if not valido:
            erros.append(msg)
        
        # Validação 2: CPF
        if not self.validar_cpf(cpf):
            erros.append("CPF inválido")
        
        # Validação 3: Tipo de Contribuinte
        if not await self.validar_tipo_contribuinte(tipo_contribuinte):
            erros.append(f"Tipo de contribuinte inválido: {tipo_contribuinte}")
        
        # Validação 4: Valor
        data_competencia = date(periodo_ano, periodo_mes, 1)
        valido, msg = await self.validar_valor(valor_base, tipo_contribuinte, data_competencia)
        if not valido:
            erros.append(msg)
        
        # Validação 5: Duplicidade (Opcional por enquanto)
        # existe, ref_anterior = await self.validar_duplicidade(cpf, periodo_mes, periodo_ano, tipo_contribuinte)
        # if existe:
        #     erros.append(f"GPS já foi emitida para este período (Referência: {ref_anterior})")
        
        return {
            'valido': len(erros) == 0,
            'erros': erros,
            'avisos': avisos
        }
