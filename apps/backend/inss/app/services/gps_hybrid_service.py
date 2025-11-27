"""
Serviço híbrido para emissão de GPS com estratégia inteligente:
- 99% geração local (rápida, barata, escalável)
- 1% validação via SAL (conformidade)
- SAL sob demanda (GPS vencidas, solicitação explícita)
"""
from __future__ import annotations

import secrets
import random
import asyncio
import os
from enum import Enum
from typing import Optional, Dict, Any
from datetime import datetime, timedelta

from ..services.codigo_barras_gps import CodigoBarrasGPS
from ..services.gps_pdf_generator_oficial import GPSPDFGeneratorOficial
from ..services.sal_automation import SALAutomation
from ..services.supabase_service import SupabaseService
from ..services.alert_service import AlertService
from ..utils.constants import calcular_vencimento_padrao
from ..utils.logger_utils import get_logger


class MetodoEmissao(str, Enum):
    """Métodos de emissão de GPS disponíveis."""
    LOCAL = "local"
    SAL_VALIDADO = "sal_validado"
    SAL_OFICIAL = "sal_oficial"


class GPSHybridService:
    """
    Serviço híbrido para emissão de GPS com estratégia inteligente.
    
    Decide automaticamente qual método usar baseado em:
    - Status da competência (vencida ou não)
    - Preferência do usuário
    - Amostragem aleatória (1% para validação)
    """
    
    def __init__(self, supabase_service: SupabaseService):
        """
        Inicializa o serviço híbrido.
        
        Args:
            supabase_service: Serviço do Supabase para persistência
        """
        self.supabase = supabase_service
        # [OK] CORREÇÃO: CodigoBarrasGPS é uma classe com métodos estáticos, não precisa instanciar
        self.pdf_generator = GPSPDFGeneratorOficial()
        self.sal_automation = SALAutomation()
        self.alert_service = AlertService()  # [OK] CORREÇÃO: Serviço de alertas
        self.logger = get_logger("GPSHybridService")  # [OK] FASE 2: Logger estruturado
        
        # [OK] CORREÇÃO: Taxa de validação configurável via variável de ambiente
        # Padrão: 1% (0.01) se não configurado
        taxa_validacao_str = os.getenv("GPS_VALIDATION_RATE", "0.01")
        try:
            self.taxa_validacao = float(taxa_validacao_str)
            if not (0.0 <= self.taxa_validacao <= 1.0):
                print(f"[GPS HYBRID] [WARN] Taxa de validação inválida ({self.taxa_validacao}), usando padrão 0.01")
                self.taxa_validacao = 0.01
        except ValueError:
            print(f"[GPS HYBRID] [WARN] Taxa de validação inválida ({taxa_validacao_str}), usando padrão 0.01")
            self.taxa_validacao = 0.01
        
        self.logger.info(
            "Taxa de validação configurada",
            taxa_validacao_percent=self.taxa_validacao * 100
        )
    
    def _gps_vencida(self, competencia: str) -> bool:
        """
        Verifica se a GPS está vencida (competência anterior ao mês atual).
        
        Args:
            competencia: Competência no formato MM/YYYY
        
        Returns:
            True se vencida, False caso contrário
        """
        try:
            mes, ano = competencia.split("/")
            competencia_date = datetime(int(ano), int(mes), 1)
            hoje = datetime.now()
            mes_atual = datetime(hoje.year, hoje.month, 1)
            
            return competencia_date < mes_atual
        except Exception as e:
            print(f"[GPS HYBRID] Erro ao verificar se GPS está vencida: {e}")
            return False
    
    async def _decidir_metodo(
        self,
        competencia: str,
        usuario: Optional[Dict[str, Any]] = None,
        metodo_forcado: Optional[MetodoEmissao] = None
    ) -> MetodoEmissao:
        """
        Decide qual método de emissão usar.
        
        Args:
            competencia: Competência no formato MM/YYYY
            usuario: Dados do usuário (opcional)
            metodo_forcado: Método forçado pelo usuário (opcional)
        
        Returns:
            Método de emissão a ser usado
        """
        # Se método foi forçado, usar ele
        if metodo_forcado:
            print(f"[GPS HYBRID] Método forçado: {metodo_forcado.value}")
            return metodo_forcado
        
        # Se GPS está vencida, usar SAL oficial
        if self._gps_vencida(competencia):
            print(f"[GPS HYBRID] GPS vencida detectada, usando SAL_OFICIAL")
            return MetodoEmissao.SAL_OFICIAL
        
        # Verificar preferência do usuário
        if usuario:
            preferencia = usuario.get("preferencia_emissao_gps")
            if preferencia == "sal_oficial":
                print(f"[GPS HYBRID] Preferência do usuário: SAL_OFICIAL")
                return MetodoEmissao.SAL_OFICIAL
        
        # [OK] CORREÇÃO: Amostragem aleatória usando secrets (criptograficamente seguro)
        # Usa taxa configurável via GPS_VALIDATION_RATE (padrão 1%)
        # secrets.randbelow(100) retorna 0-99, então < taxa*100 é equivalente
        if secrets.randbelow(10000) < int(self.taxa_validacao * 10000):
            print(f"[GPS HYBRID] Amostragem aleatória: SAL_VALIDADO ({self.taxa_validacao * 100}%)")
            return MetodoEmissao.SAL_VALIDADO
        
        # Padrão: geração local
        print(f"[GPS HYBRID] Método padrão: LOCAL")
        return MetodoEmissao.LOCAL
    
    async def _emitir_local(
        self,
        user_id: str,
        competencia: str,
        valor: float,
        codigo_pagamento: str,
        dados_usuario: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Emite GPS usando geração local (rápida).
        
        Args:
            user_id: ID do usuário
            competencia: Competência no formato MM/YYYY
            valor: Valor da contribuição
            codigo_pagamento: Código de pagamento
            dados_usuario: Dados do usuário (nome, cpf, nit, etc.)
        
        Returns:
            Dicionário com resultado da emissão
        """
        print(f"[GPS HYBRID] Emitindo GPS localmente...")
        
        # Calcular vencimento
        vencimento = calcular_vencimento_padrao(competencia)
        
        # Gerar código de barras
        # O identificador deve ser NIT ou CPF (11 dígitos, sem formatação)
        # Priorizar nit_raw (sem formatação) se disponível
        identificador_raw = dados_usuario.get("nit_raw") or dados_usuario.get("nit") or dados_usuario.get("cpf") or ""
        
        # [OK] DEBUG: Log do identificador antes de processar
        print(f"[GPS HYBRID] Identificador raw recebido: {identificador_raw[:10] if identificador_raw else 'None'}...")
        print(f"[GPS HYBRID] nit_raw: {dados_usuario.get('nit_raw', 'None')[:10] if dados_usuario.get('nit_raw') else 'None'}...")
        print(f"[GPS HYBRID] nit: {dados_usuario.get('nit', 'None')[:10] if dados_usuario.get('nit') else 'None'}...")
        print(f"[GPS HYBRID] cpf: {dados_usuario.get('cpf', 'None')[:10] if dados_usuario.get('cpf') else 'None'}...")
        
        # [OK] VALIDAÇÃO: Garantir que pelo menos NIT ou CPF está disponível
        if not identificador_raw:
            # Tentar buscar CPF como último recurso
            cpf_fallback = dados_usuario.get("cpf", "")
            if cpf_fallback:
                identificador_raw = cpf_fallback
                print(f"[GPS HYBRID] [WARN] NIT não disponível, usando CPF como fallback")
            else:
                raise ValueError("Identificador (NIT/CPF) não disponível. É necessário ter pelo menos NIT ou CPF cadastrado.")
        
        # Remover formatação do identificador (apenas dígitos)
        identificador_digits = "".join(filter(str.isdigit, str(identificador_raw)))
        
        # [OK] DEBUG: Log do identificador após limpeza
        print(f"[GPS HYBRID] Identificador após limpeza: {identificador_digits[:3]}*** (tamanho: {len(identificador_digits)})")
        
        if len(identificador_digits) != 11:
            raise ValueError(f"Identificador deve ter 11 dígitos, recebido: {len(identificador_digits)} dígitos ({identificador_digits[:10] if len(identificador_digits) > 0 else 'vazio'}...). Verifique se NIT ou CPF está cadastrado corretamente.")
        
        # [OK] DEBUG: Log dos parâmetros antes de gerar código de barras
        print(f"[GPS HYBRID] Gerando código de barras:")
        print(f"  - Código pagamento: {codigo_pagamento}")
        print(f"  - Competência: {competencia}")
        print(f"  - Valor: {valor} (tipo: {type(valor)})")
        print(f"  - Identificador: {identificador_digits}")
        
        # [OK] CORREÇÃO: Usar método de classe diretamente
        resultado_barras = CodigoBarrasGPS.gerar(
            codigo_pagamento=codigo_pagamento,
            competencia=competencia,
            valor=valor,
            nit=identificador_digits  # [OK] CORREÇÃO: parâmetro correto é 'nit', não 'identificador'
        )
        
        # Extrair código de barras e linha digitável
        codigo_barras = resultado_barras['codigo_barras']
        linha_digitavel = resultado_barras['linha_digitavel']

        # Validar código de barras gerado (GPS tem 44 dígitos)
        if not codigo_barras or len(codigo_barras) != 44:
            raise ValueError(f"Código de barras inválido: deve ter 44 dígitos, recebido {len(codigo_barras) if codigo_barras else 0}")
        # Validar usando o servico (metodo estatico)
        if not CodigoBarrasGPS.validar(codigo_barras):
            raise ValueError("Codigo de barras gerado nao passou na validacao")


        print(f"[GPS HYBRID] Código de barras gerado e validado: {codigo_barras[:10]}...{codigo_barras[-5:]}")
        
        # Validar e formatar dados antes de gerar PDF
        # CPF: remover formatação e validar (deve ter 11 dígitos)
        cpf_raw = dados_usuario.get("cpf", "")
        if cpf_raw:
            cpf_digits = "".join(filter(str.isdigit, str(cpf_raw)))
            if len(cpf_digits) != 11:
                print(f"[WARN] CPF inválido ou incompleto: {cpf_raw[:10]}... (esperado 11 dígitos)")
                cpf_raw = ""  # Não usar CPF inválido
        
        # NIT: usar nit_raw (sem formatação) se disponível, senão remover formatação
        nit_raw = dados_usuario.get("nit_raw") or dados_usuario.get("nit", "")
        if nit_raw:
            # Se já está sem formatação (nit_raw), usar diretamente
            if len(nit_raw) == 11 and nit_raw.isdigit():
                # Já está no formato correto (11 dígitos)
                pass
            else:
                # Remover formatação
                nit_digits = "".join(filter(str.isdigit, str(nit_raw)))
                if len(nit_digits) == 11:
                    nit_raw = nit_digits
                else:
                    print(f"[WARN] NIT inválido ou incompleto: {nit_raw[:10]}... (esperado 11 dígitos)")
                    nit_raw = ""
        
        # Endereço: garantir que seja um endereço, não telefone
        endereco_raw = dados_usuario.get("endereco", "") or dados_usuario.get("address", "")
        # Se endereço parece ser um telefone (só números), não usar
        if endereco_raw and endereco_raw.replace(" ", "").replace("-", "").replace("(", "").replace(")", "").isdigit():
            print(f"[WARN] Endereço parece ser um telefone: {endereco_raw}")
            endereco_raw = ""
        
        # Extrair UF do endereço ou dados do usuário
        uf = dados_usuario.get("uf") or dados_usuario.get("endereco_uf") or ""
        
        # Linha digitável já foi gerada acima junto com o código de barras
        # from ..services.codigo_barras_gps import CodigoBarrasGPS
        # linha_digitavel = CodigoBarrasGPS.linha_digitavel(codigo_barras)
        
        # Preparar dados para PDF
        dados_pdf = {
            'nome': dados_usuario.get("nome", "Não informado"),
            'cpf': cpf_raw,  # CPF validado ou vazio
            'nit': nit_raw,  # NIT validado ou vazio (11 dígitos sem formatação)
            'endereco': endereco_raw,  # Endereço validado ou vazio
            'telefone': dados_usuario.get("telefone", ""),
            'codigo_pagamento': codigo_pagamento,
            'competencia': competencia,
            'valor_inss': valor,  # [OK] CORREÇÃO: usar 'valor_inss' em vez de 'valor'
            'valor_outras_entidades': 0.0,
            'atm_multa_juros': 0.0,  # [OK] CORREÇÃO: usar 'atm_multa_juros' em vez de 'valor_multa_juros'
            'codigo_barras': codigo_barras,
            'linha_digitavel': linha_digitavel,  # [OK] CORREÇÃO: adicionar linha digitável
            'vencimento': vencimento.strftime("%d/%m/%Y"),
            'uf': uf  # UF do estado
        }
        
        # Gerar PDF
        pdf_buffer = self.pdf_generator.gerar(dados_pdf)
        pdf_bytes = pdf_buffer.read()
        
        # Salvar no Supabase Storage
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        caminho_pdf = f"guias/{user_id}/{timestamp}_gps.pdf"
        
        pdf_url = await self.supabase.upload_file(
            bucket="guias",
            file_path=caminho_pdf,
            file_data=pdf_bytes,
            content_type="application/pdf"
        )
        
        # Salvar registro no banco
        guia_data = {
            "codigo_gps": codigo_pagamento,
            "competencia": competencia,
            "valor": valor,
            "status": "pendente",
            "data_vencimento": vencimento.isoformat(),
            "metodo_emissao": MetodoEmissao.LOCAL.value,
            "validado_sal": False,
            "pdf_url": pdf_url,
            "codigo_barras": codigo_barras
        }
        
        guia_salva = await self.supabase.salvar_guia(user_id=user_id, guia_data=guia_data)
        
        if not guia_salva or not isinstance(guia_salva, dict):
            print(f"[GPS HYBRID] [WARN] guia_salva inválido em _emitir_local: {guia_salva}")
            guia_salva = {"id": f"error-{user_id}", "user_id": user_id}
            
        return {
            'id': guia_salva.get('id', f"fallback-{user_id}"),
            'pdf_url': pdf_url,
            'codigo_barras': codigo_barras,
            'linha_digitavel': linha_digitavel,  # [OK] Adicionar linha digitável ao retorno
            'vencimento': vencimento.strftime("%d/%m/%Y"),
            'valor_total': valor,
            'metodo_emissao': MetodoEmissao.LOCAL.value,
            'validado_sal': False,
            'pdf_bytes': pdf_bytes
        }
    
    async def _emitir_local_com_validacao(
        self,
        user_id: str,
        competencia: str,
        valor: float,
        codigo_pagamento: str,
        dados_usuario: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Emite GPS localmente e valida em background no SAL.
        
        Args:
            user_id: ID do usuário
            competencia: Competência no formato MM/YYYY
            valor: Valor da contribuição
            codigo_pagamento: Código de pagamento
            dados_usuario: Dados do usuário
        
        Returns:
            Dicionário com resultado da emissão (retorna imediatamente, validação em background)
        """
        print(f"[GPS HYBRID] Emitindo GPS localmente com validação em background...")
        
        # Emitir localmente primeiro (não bloqueia usuário)
        resultado = await self._emitir_local(
            user_id=user_id,
            competencia=competencia,
            valor=valor,
            codigo_pagamento=codigo_pagamento,
            dados_usuario=dados_usuario
        )
        
        # Marcar para validação em background
        resultado['validacao_pendente'] = True
        
        # Iniciar validação em background (não aguarda)
        asyncio.create_task(
            self._validar_no_sal_background(
                guia_id=resultado['id'],
                competencia=competencia,
                valor=valor,
                codigo_pagamento=codigo_pagamento,
                codigo_barras_local=resultado['codigo_barras'],
                dados_usuario=dados_usuario
            )
        )
        
        return resultado
    
    async def _emitir_via_sal(
        self,
        user_id: str,
        competencia: str,
        valor: float,
        codigo_pagamento: str,
        dados_usuario: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Emite GPS através do sistema SAL oficial.
        
        Args:
            user_id: ID do usuário
            competencia: Competência no formato MM/YYYY
            valor: Valor da contribuição
            codigo_pagamento: Código de pagamento
            dados_usuario: Dados do usuário
        
        Returns:
            Dicionário com resultado da emissão
        """
        print(f"[GPS HYBRID] Emitindo GPS via SAL oficial...")
        
        # Preparar dados para SAL
        nit_formatado = dados_usuario.get("nit", "")
        if not nit_formatado:
            raise ValueError("NIT/PIS/PASEP não disponível para emissão via SAL")
        
        vencimento = calcular_vencimento_padrao(competencia)
        
        dados_sal = {
            "nit_pis_pasep": nit_formatado,
            "competencia": competencia,
            "salario_contribuicao": valor,
            "codigo_pagamento": codigo_pagamento,
            "data_pagamento": vencimento.strftime("%d/%m/%Y"),
            "nome_contribuinte": dados_usuario.get("nome", "")
        }
        
        # Emitir via SAL
        resultado_sal = await self.sal_automation.emitir_gps(dados_sal)
        
        pdf_bytes = resultado_sal['pdf_bytes']
        codigo_barras_sal = resultado_sal.get('codigo_barras')
        valor_total_sal = resultado_sal.get('valor_total', valor)
        
        # Salvar PDF no Supabase Storage
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        caminho_pdf = f"guias/{user_id}/{timestamp}_gps_sal.pdf"
        
        pdf_url = await self.supabase.upload_file(
            bucket="guias",
            file_path=caminho_pdf,
            file_data=pdf_bytes,
            content_type="application/pdf"
        )
        
        # Salvar registro no banco
        guia_data = {
            "codigo_gps": codigo_pagamento,
            "competencia": competencia,
            "valor": valor_total_sal,
            "status": "pendente",
            "data_vencimento": vencimento.isoformat(),
            "metodo_emissao": MetodoEmissao.SAL_OFICIAL.value,
            "validado_sal": True,
            "validado_em": datetime.now().isoformat(),
            "pdf_url": pdf_url,
            "codigo_barras": codigo_barras_sal or ""
        }
        
        guia_salva = await self.supabase.salvar_guia(user_id=user_id, guia_data=guia_data)
        
        if not guia_salva or not isinstance(guia_salva, dict):
            print(f"[GPS HYBRID] [WARN] guia_salva inválido em _emitir_via_sal: {guia_salva}")
            guia_salva = {"id": f"error-{user_id}", "user_id": user_id}

        return {
            'id': guia_salva.get('id', f"fallback-{user_id}"),
            'pdf_url': pdf_url,
            'codigo_barras': codigo_barras_sal or "",
            'vencimento': vencimento.strftime("%d/%m/%Y"),
            'valor_total': valor_total_sal,
            'metodo_emissao': MetodoEmissao.SAL_OFICIAL.value,
            'validado_sal': True,
            'pdf_bytes': pdf_bytes
        }
    
    async def _validar_no_sal_background(
        self,
        guia_id: str,
        competencia: str,
        valor: float,
        codigo_pagamento: str,
        codigo_barras_local: str,
        dados_usuario: Dict[str, Any]
    ) -> None:
        """
        Valida GPS no SAL em background (não bloqueia usuário).
        
        Args:
            guia_id: ID da guia já emitida
            competencia: Competência
            valor: Valor
            codigo_pagamento: Código de pagamento
            codigo_barras_local: Código de barras gerado localmente
            dados_usuario: Dados do usuário
        """
        try:
            print(f"[GPS HYBRID] Iniciando validação em background para guia {guia_id}...")
            
            # [OK] CORREÇÃO: Delay aleatório antes de validar (evita pico de requisições no SAL)
            # Delay entre 10 e 30 segundos usando secrets para aleatoriedade segura
            delay_segundos = secrets.randbelow(21) + 10  # 10 a 30 segundos
            print(f"[GPS HYBRID] Aguardando {delay_segundos} segundos antes de validar (evita sobrecarga do SAL)...")
            await asyncio.sleep(delay_segundos)
            
            # Preparar dados para SAL
            nit_formatado = dados_usuario.get("nit", "")
            if not nit_formatado:
                print(f"[GPS HYBRID] NIT não disponível para validação")
                return
            
            vencimento = calcular_vencimento_padrao(competencia)
            
            dados_sal = {
                "nit_pis_pasep": nit_formatado,
                "competencia": competencia,
                "salario_contribuicao": valor,
                "codigo_pagamento": codigo_pagamento,
                "data_pagamento": vencimento.strftime("%d/%m/%Y"),
                "nome_contribuinte": dados_usuario.get("nome", "")
            }
            
            # Emitir via SAL para comparação
            resultado_sal = await self.sal_automation.emitir_gps(dados_sal)
            codigo_barras_sal = resultado_sal.get('codigo_barras')
            
            # Comparar códigos de barras
            if codigo_barras_sal and codigo_barras_sal != codigo_barras_local:
                print(f"[GPS HYBRID] [WARN] DIVERGÊNCIA DETECTADA!")
                print(f"[GPS HYBRID] Local: {codigo_barras_local[:20]}...")
                print(f"[GPS HYBRID] SAL: {codigo_barras_sal[:20]}...")
                
                # Registrar divergência
                await self._registrar_divergencia(
                    guia_id=guia_id,
                    competencia=competencia,
                    valor=valor,
                    codigo_local=codigo_barras_local,
                    codigo_sal=codigo_barras_sal,
                    tipo_divergencia="codigo_barras_diferente"
                )
                
                # [OK] CORREÇÃO: Alertar equipe técnica sobre divergência
                try:
                    # Buscar user_id da guia para o alerta
                    guia = await self.supabase.get_records("gps_emissions", {"id": guia_id})
                    user_id = guia[0].get("user_id") if guia else None
                    
                    if user_id:
                        await self.alert_service.alertar_divergencia_gps(
                            guia_id=guia_id,
                            usuario_id=user_id,
                            competencia=competencia,
                            valor=valor,
                            codigo_local=codigo_barras_local,
                            codigo_sal=codigo_barras_sal,
                            tipo_divergencia="codigo_barras_diferente"
                        )
                except Exception as alert_err:
                    print(f"[GPS HYBRID] [WARN] Erro ao enviar alerta (divergência já registrada): {alert_err}")
            else:
                print(f"[GPS HYBRID] [OK] Validação OK - códigos de barras coincidem")
                
                # Atualizar guia como validada (usar update se disponível)
                try:
                    # Tentar atualizar registro existente
                    await self.supabase.create_record("gps_emissions", {
                        "id": guia_id,
                        "validado_sal": True,
                        "validado_em": datetime.now().isoformat()
                    })
                except Exception as e:
                    print(f"[GPS HYBRID] Erro ao atualizar validação: {e}")
        
        except Exception as e:
            print(f"[GPS HYBRID] [ERROR] Erro na validação em background: {e}")
            import traceback
            print(traceback.format_exc())
    
    async def _registrar_divergencia(
        self,
        guia_id: str,
        competencia: str,
        valor: float,
        codigo_local: str,
        codigo_sal: str,
        tipo_divergencia: str
    ) -> None:
        """
        Registra divergência entre GPS local e SAL.
        
        Args:
            guia_id: ID da guia
            competencia: Competência
            valor: Valor
            codigo_local: Código de barras local
            codigo_sal: Código de barras do SAL
            tipo_divergencia: Tipo de divergência
        """
        try:
            # Buscar user_id da guia
            guia = await self.supabase.get_records("gps_emissions", {"id": guia_id})
            if not guia:
                print(f"[GPS HYBRID] Guia não encontrada para registrar divergência")
                return
            
            user_id = guia[0].get("user_id")
            
            # Criar registro de divergência
            divergencia_data = {
                "usuario_id": user_id,
                "guia_id": guia_id,
                "competencia": competencia,
                "valor": valor,
                "codigo_local": codigo_local,
                "codigo_sal": codigo_sal,
                "tipo_divergencia": tipo_divergencia,
                "resolvido": False
            }
            
            await self.supabase.create_record("gps_divergencias", divergencia_data)
            print(f"[GPS HYBRID] Divergência registrada: {tipo_divergencia}")
        
        except Exception as e:
            print(f"[GPS HYBRID] Erro ao registrar divergência: {e}")
    
    async def emitir_gps(
        self,
        user_id: str,
        competencia: str,
        valor: float,
        codigo_pagamento: str,
        dados_usuario: Dict[str, Any],
        metodo_forcado: Optional[MetodoEmissao] = None
    ) -> Dict[str, Any]:
        """
        Emite GPS usando estratégia híbrida.
        
        Args:
            user_id: ID do usuário
            competencia: Competência no formato MM/YYYY
            valor: Valor da contribuição
            codigo_pagamento: Código de pagamento
            dados_usuario: Dados do usuário (nome, cpf, nit, endereco, telefone)
            metodo_forcado: Método forçado pelo usuário (opcional)
        
        Returns:
            Dicionário com resultado da emissão:
                - id: ID da guia
                - pdf_url: URL do PDF
                - codigo_barras: Código de barras
                - vencimento: Data de vencimento
                - valor_total: Valor total
                - metodo_emissao: Método usado
                - validado_sal: Se foi validado no SAL
                - pdf_bytes: Bytes do PDF (opcional)
        """
        # Buscar dados do usuário se não fornecidos
        if not dados_usuario:
            usuario = await self.supabase.get_records("profiles", {"id": user_id})
            if usuario:
                dados_usuario = usuario[0]
            else:
                raise ValueError(f"Usuário {user_id} não encontrado")
        
        # Decidir método
        metodo = await self._decidir_metodo(
            competencia=competencia,
            usuario=dados_usuario,
            metodo_forcado=metodo_forcado
        )
        
        # Emitir conforme método escolhido
        if metodo == MetodoEmissao.LOCAL:
            return await self._emitir_local(
                user_id=user_id,
                competencia=competencia,
                valor=valor,
                codigo_pagamento=codigo_pagamento,
                dados_usuario=dados_usuario
            )
        elif metodo == MetodoEmissao.SAL_VALIDADO:
            return await self._emitir_local_com_validacao(
                user_id=user_id,
                competencia=competencia,
                valor=valor,
                codigo_pagamento=codigo_pagamento,
                dados_usuario=dados_usuario
            )
        else:  # SAL_OFICIAL
            return await self._emitir_via_sal(
                user_id=user_id,
                competencia=competencia,
                valor=valor,
                codigo_pagamento=codigo_pagamento,
                dados_usuario=dados_usuario
            )
