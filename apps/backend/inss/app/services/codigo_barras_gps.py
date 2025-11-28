"""
Gerador de código de barras GPS - VERSÃO FINAL CORRIGIDA
"""

class CodigoBarrasGPS:
    """Gerador correto de código de barras GPS"""

    @staticmethod
    def calcular_dv_modulo11(codigo_sem_dv: str) -> str:
        """
        Calcula DV Módulo 11 (posição 4 do código de barras)
        GPS tem 44 dígitos: 43 sem DV + 1 DV na posição 4
        Regra: Pesos de 2 a 9 da DIREITA para a ESQUERDA
        """
        if len(codigo_sem_dv) != 43:
            raise ValueError(f"Código sem DV deve ter 43 dígitos, tem {len(codigo_sem_dv)}")

        sequencia = [2, 3, 4, 5, 6, 7, 8, 9]
        soma = 0
        
        # Itera da direita para a esquerda
        for i, d in enumerate(reversed(codigo_sem_dv)):
            soma += int(d) * sequencia[i % 8]
            
        resto = soma % 11
        
        # Regra geral:
        # Resto 0 ou 1 => DV = 1 (Padrão Febraban Arrecadação)
        # Resto > 1 => DV = 11 - resto
        
        dv = 11 - resto
        if dv >= 10:
            return "1"
        return str(dv)

    @staticmethod
    def calcular_dv_modulo10(campo: str) -> str:
        """
        Calcula DV Módulo 10 (DVs da linha digitável para ID de Valor 6 ou 7)
        Aplica da DIREITA para ESQUERDA
        """
        if len(campo) != 11:
            raise ValueError(f"Campo deve ter 11 dígitos, tem {len(campo)}")

        soma = 0
        multiplicador = 2

        # Da DIREITA para ESQUERDA
        for i in range(len(campo) - 1, -1, -1):
            digito = int(campo[i])
            produto = digito * multiplicador

            if produto >= 10:
                produto = (produto // 10) + (produto % 10)

            soma += produto
            multiplicador = 1 if multiplicador == 2 else 2

        resto = soma % 10
        return "0" if resto == 0 else str(10 - resto)

    @staticmethod
    def calcular_dv_modulo11_bloco(campo: str) -> str:
        """
        Calcula DV Módulo 11 para blocos da linha digitável (ID de Valor 8 ou 9)
        Usado para GPS de arrecadação (código 8x...)
        Sequência: 2-9 da direita para esquerda
        """
        if len(campo) != 11:
            raise ValueError(f"Campo deve ter 11 dígitos, tem {len(campo)}")

        sequencia = [2, 3, 4, 5, 6, 7, 8, 9]
        soma = 0

        # Da DIREITA para ESQUERDA
        for i in range(len(campo) - 1, -1, -1):
            digito = int(campo[i])
            mult = sequencia[(len(campo) - 1 - i) % 8]  # Ciclo 2-9
            soma += digito * mult

        resto = soma % 11

        # Regra específica GPS/Arrecadação:
        # Resto 0 ou 1 = DV 0
        # Resto 2-10 = DV = 11 - resto
        if resto == 0 or resto == 1:
            return "0"
        else:
            return str(11 - resto)

    @classmethod
    def gerar(cls, codigo_pagamento: str, competencia: str,
              valor: float, nit: str) -> dict:
        """
        Gera código de barras GPS completo

        Args:
            codigo_pagamento: Ex: "1007"
            competencia: Ex: "11/2025"
            valor: Ex: 303.60 (em REAIS, não centavos!)
            nit: Ex: "12800186722" ou "27317621955"

        Returns:
            dict com codigo_barras (48 dígitos) e linha_digitavel
        """

        print(f"\n" + "=" * 80)
        print(f"[GPS] DEBUG - GERANDO GPS")
        print(f"=" * 80)
        print(f"   Valor recebido: R$ {valor:.2f} (tipo: {type(valor)})")
        print(f"   Código pagamento: {codigo_pagamento}")
        print(f"   NIT recebido: {nit}")
        print(f"   Competência: {competencia}")

        # VALIDACAO CRITICA DO VALOR
        if valor <= 0:
            raise ValueError(f"ERRO CRITICO: Valor invalido R$ {valor:.2f} - deve ser maior que zero!")
        if valor < 10:
            print(f"   AVISO: Valor muito baixo R$ {valor:.2f} - possivel erro no calculo!")

        # 1. VALOR EM CENTAVOS (11 dígitos, ZERO-PADDED À ESQUERDA)
        valor_centavos = int(round(valor * 100))
        valor_str = str(valor_centavos).zfill(11)

        print(f"\nCONVERSAO PARA CENTAVOS:")
        print(f"   Valor em reais: R$ {valor:.2f}")
        print(f"   Valor em centavos: {valor_centavos}")
        print(f"   Valor formatado (11 dig): {valor_str}")

        # VALIDACAO CRITICA
        if len(valor_str) != 11:
            raise ValueError(f"ERRO: Valor formatado deve ter 11 digitos, tem {len(valor_str)}")

        # 2. IDENTIFICADOR DE VALOR (posição 3)
        if valor_centavos < 1000:
            id_valor = "6"
        elif valor_centavos < 10000:
            id_valor = "7"
        elif valor_centavos < 100000:
            id_valor = "8"
        else:
            id_valor = "9"

        print(f"\nID VALOR:")
        if valor_centavos < 1000:
            faixa = "R$ 0,01 - R$ 9,99"
        elif valor_centavos < 10000:
            faixa = "R$ 10,00 - R$ 99,99"
        elif valor_centavos < 100000:
            faixa = "R$ 100,00 - R$ 999,99"
        else:
            faixa = "R$ 1.000,00+"
        print(f"   ID Valor: {id_valor} (faixa: {faixa})")

        # 3. LIMPA NIT (só números)
        nit_limpo = ''.join(filter(str.isdigit, nit))
        print(f"   NIT limpo: {nit_limpo} ({len(nit_limpo)} dígitos)")

        # 4. NIT SEM PRIMEIRO DÍGITO (10 dígitos)
        if len(nit_limpo) >= 11:
            nit_10_digitos = nit_limpo[1:11]
        elif len(nit_limpo) == 10:
            nit_10_digitos = nit_limpo
        else:
            nit_10_digitos = nit_limpo.zfill(10)

        print(f"   NIT 10 dígitos: {nit_10_digitos}")

        # 5. COMPETÊNCIA (YYYYMM3 = 7 dígitos) - FORMATO OFICIAL GPS
        mes, ano = competencia.split('/')
        competencia_oficial = ano + mes.zfill(2) + "3"  # Ex: 2025 + 11 + 3 = "2025113"

        print(f"   Competência codificada: {competencia_oficial} (formato YYYYMM3)")

        # 6. MONTA CÓDIGO SEM DV (43 dígitos)
        # GPS TEM 44 DÍGITOS TOTAL: 43 sem DV + 1 DV na posição 4
        # ESTRUTURA OFICIAL: 858[DV]VVVVVVVVVVV0270CCCC0001NNNNNNNNNNYYYYMM3
        codigo_sem_dv = (
            "8" +                           # Pos 1: Produto
            "5" +                           # Pos 2: Segmento
            id_valor +                      # Pos 3: ID Valor
            valor_str +                     # Pos 4-14: Valor (11 dígitos)
            "0270" +                        # Pos 15-18: Campo GPS
            codigo_pagamento.zfill(4) +     # Pos 19-22: Código pagamento
            "0001" +                        # Pos 23-26: Campo GPS
            nit_10_digitos +                # Pos 27-36: NIT (10 dígitos)
            competencia_oficial             # Pos 37-43: Competência (7 dígitos YYYYMM3)
        )

        print(f"   Código sem DV: {codigo_sem_dv}")
        print(f"   Comprimento sem DV: {len(codigo_sem_dv)} dígitos")

        if len(codigo_sem_dv) != 43:
            raise ValueError(f"ERRO: Código sem DV deve ter 43 dígitos, tem {len(codigo_sem_dv)}")

        # 7. CALCULA DV (posição 4)
        dv = cls.calcular_dv_modulo11(codigo_sem_dv)
        print(f"   DV Geral calculado: {dv}")

        # 8. INSERE DV NA POSIÇÃO 4 (após posições 1-3)
        codigo_completo = codigo_sem_dv[:3] + dv + codigo_sem_dv[3:]

        print(f"\nCODIGO DE BARRAS (44 DIGITOS):")
        print(f"   {codigo_completo}")
        print(f"   Comprimento: {len(codigo_completo)} digitos")

        if len(codigo_completo) != 44:
            raise ValueError(f"ERRO: Codigo de barras GPS deve ter 44 digitos, tem {len(codigo_completo)}")

        # VALIDACAO DA ESTRUTURA
        print(f"\nVALIDACAO DA ESTRUTURA:")
        print(f"   Pos 1: {codigo_completo[0]} (deve ser 8) {'OK' if codigo_completo[0] == '8' else 'ERRO'}")
        print(f"   Pos 2: {codigo_completo[1]} (deve ser 5) {'OK' if codigo_completo[1] == '5' else 'ERRO'}")
        print(f"   Pos 3: {codigo_completo[2]} (ID = {id_valor}) {'OK' if codigo_completo[2] == id_valor else 'ERRO'}")
        print(f"   Pos 4: {codigo_completo[3]} (DV = {dv}) {'OK' if codigo_completo[3] == dv else 'ERRO'}")
        print(f"   Pos 5-15: {codigo_completo[4:15]} (valor) {'OK' if codigo_completo[4:15] == valor_str else 'ERRO'}")
        print(f"   Pos 16-19: {codigo_completo[15:19]} (0270) {'OK' if codigo_completo[15:19] == '0270' else 'ERRO'}")

        # 10. GERA LINHA DIGITAVEL
        linha_digitavel = cls.gerar_linha_digitavel(codigo_completo)

        print(f"\nLINHA DIGITAVEL:")
        print(f"   {linha_digitavel}")
        print(f"=" * 80 + "\n")

        return {
            'codigo_barras': codigo_completo,
            'linha_digitavel': linha_digitavel,
            'valor': valor,
            'competencia': competencia
        }

    @classmethod
    def gerar_linha_digitavel(cls, codigo_barras: str) -> str:
        """
        Gera linha digitável GPS (48 dígitos)
        Divide código de barras (44 dig) em 4 campos de 11 + 1 DV cada = 48 total

        IMPORTANTE: O tipo de DV depende do ID de Valor (3ª posição):
        - ID 6 ou 7: Módulo 10 (convênios)
        - ID 8 ou 9: Módulo 11 (arrecadação/GPS)
        """
        if len(codigo_barras) != 44:
            raise ValueError(f"Código de barras deve ter 44 dígitos, tem {len(codigo_barras)}")

        print(f"   Código de barras (44 dig): {codigo_barras}")

        # Verificar ID de Valor (3ª posição, índice 2)
        id_valor = codigo_barras[2]
        print(f"   ID de Valor: {id_valor}")

        # Determinar qual método de DV usar
        if id_valor in ['8', '9']:
            metodo_dv = "Módulo 11 (Arrecadação/GPS)"
            funcao_dv = cls.calcular_dv_modulo11_bloco
        elif id_valor in ['6', '7']:
            metodo_dv = "Módulo 10 (Convênios)"
            funcao_dv = cls.calcular_dv_modulo10
        else:
            raise ValueError(f"ID de Valor inválido: {id_valor}. Deve ser 6, 7, 8 ou 9")

        print(f"   Método DV: {metodo_dv}")

        campos = []

        # DIVIDE OS 44 DIGITOS EM 4 CAMPOS DE 11 DIGITOS
        for i in range(0, 44, 11):
            campo_dados = codigo_barras[i:i+11]
            campo_dv = funcao_dv(campo_dados)
            campo_formatado = f"{campo_dados}-{campo_dv}"
            campos.append(campo_formatado)
            print(f"   Campo {(i//11)+1}: {campo_dados} -> DV: {campo_dv} -> {campo_formatado}")

        return " ".join(campos)

    @staticmethod
    def validar(codigo_barras: str) -> bool:
        """
        Valida um código de barras GPS verificando o DV
        GPS tem 44 dígitos
        """
        if len(codigo_barras) != 44:
            return False

        try:
            # Extrai o DV (posição 4, índice 3)
            dv_informado = codigo_barras[3]

            # Reconstrói código sem DV (posições 1-3 + 5-44)
            codigo_sem_dv = codigo_barras[:3] + codigo_barras[4:]

            # Calcula DV esperado
            dv_calculado = CodigoBarrasGPS.calcular_dv_modulo11(codigo_sem_dv)

            return dv_informado == dv_calculado
        except:
            return False
