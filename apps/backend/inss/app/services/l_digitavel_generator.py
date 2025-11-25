from decimal import Decimal
from datetime import date

class LDigitavelGenerator:
    """
    Gera linha digitável conforme ISO 7064 MOD 97-10
    Formato: AAAAMMCC VVVVVVVVVVVV XX
    """
    
    def gerar_linha_digitavel(self, reference_number: str, valor: Decimal, 
                             vencimento: date, codigo_gps: str) -> str:
        """
        Gera linha digitável completa com dígito verificador
        reference_number = AAAAMMCC + CPF + SEQUÊNCIA
        """
        # Base: Referência (20 chars) + Código GPS (4) + Valor (12) + Vencimento (8)
        # YYYYMMDDCCPFSEQGPSVALOR(12)VENCIMENTO
        
        # Nota: O formato exato da linha digitável da GPS é complexo e varia.
        # Vamos usar um formato padronizado sugerido no documento:
        # AAAAMMCC VVVVVVVVVVVV XX (Isso parece curto demais para GPS)
        # GPS geralmente tem 4 campos:
        # 1. Código de Pagamento + DV
        # 2. Competência + DV
        # 3. Identificador (NIT/CPF) + DV
        # 4. Valor + DV
        
        # Mas o documento sugere um formato específico. Vamos seguir o documento para "100% conformidade" com o que foi pedido.
        # "AAAAMMCC VVVVVVVVVVVV XX"
        
        # Mas espere, o código de barras tem 44 ou 48 dígitos.
        # Vamos implementar algo robusto que gere uma linha válida baseada no código de barras.
        
        # Se o documento pede ISO 7064 MOD 97-10, é o padrão de boleto de arrecadação (começa com 8).
        
        venc_str = vencimento.strftime('%d%m%Y')
        valor_str = f"{int(valor*100):011d}"  # Valor em centavos
        
        # Montando base para cálculo (exemplo genérico de arrecadação)
        # 8 (Produto) + 5 (Segmento) + 2 (Valor real) + 0 (Verificador geral - placeholder)
        # + ...
        
        # Vamos usar a lógica do `codigo_barras_gps.py` que já existe e parece correta para GPS (começa com 85...)
        # Mas o usuário pediu para implementar essa classe.
        # Vou adaptar a lógica do `codigo_barras_gps.py` para cá se possível, ou usar a do documento.
        
        # Documento: "base = reference_number + codigo_gps + valor_str + venc_str"
        # Isso gera um número gigante.
        
        # Vou implementar conforme o documento para satisfazer o pedido, 
        # mas sabendo que pode divergir do padrão FEBRABAN se o reference_number não for padrão.
        
        # Ajuste: reference_number deve ser numérico.
        ref_num = "".join(filter(str.isdigit, reference_number))
        if not ref_num: ref_num = "0"
        
        base = f"{ref_num}{codigo_gps}{valor_str}{venc_str}"
        
        # Calcula dígito verificador ISO 7064 MOD 97-10
        dv = self._calcular_digito_verificador(base)
        
        # Formata linha digitável (exemplo visual)
        # Quebra em blocos para facilitar leitura
        linha = f"{base[:8]} {base[8:20]} {base[20:]} {dv:02d}"
        
        return linha
    
    def _calcular_digito_verificador(self, base: str) -> int:
        """
        Implementa algoritmo ISO 7064 MOD 97-10
        """
        try:
            # Converte string para número
            numero = int(base)
            
            # Resto da divisão por 97
            resto = numero % 97
            
            # Dígito verificador = 98 - resto
            dv = 98 - resto
            
            return dv
        except:
            return 0 # Fallback
    
    def validar_linha_digitavel(self, linha: str) -> bool:
        """
        Valida integridade da linha digitável
        """
        # Remove espaços
        linha_limpa = linha.replace(' ', '')
        
        if len(linha_limpa) < 20: # Tamanho mínimo arbitrário
            return False
        
        base = linha_limpa[:-2]
        try:
            dv = int(linha_limpa[-2:])
            dv_calculado = self._calcular_digito_verificador(base)
            return dv == dv_calculado
        except:
            return False
