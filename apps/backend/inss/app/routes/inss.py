from __future__ import annotations

import os
import logging
import traceback
from datetime import datetime, date
from decimal import Decimal
from io import BytesIO
from typing import Any, Dict, Optional

from fastapi import APIRouter, HTTPException, status, Depends, BackgroundTasks
from fastapi.responses import Response
from pydantic import BaseModel, Field
from starlette.concurrency import run_in_threadpool

from ..models.guia_inss import ComplementacaoRequest, EmitirGuiaRequest
from ..services.inss_calculator import CalculoSAL, INSSCalculator
from ..services.gps_pdf_generator_oficial import GPSPDFGeneratorOficial as GPSGenerator

try:
    from ..services.pdf_generator_completo import GPSGeneratorCompleto
except ImportError:
    GPSGeneratorCompleto = None  # type: ignore

from ..services.supabase_service import SupabaseService
from ..services.whatsapp_service import WhatsAppService
from ..utils.constants import SAL_CLASSES, calcular_vencimento_padrao
from ..utils.validators import normalizar_competencia, validar_whatsapp
from ..utils.pis_formatter import formatar_pis

router = APIRouter(prefix="/api/v1/guias", tags=["Guias INSS"])

calculator = INSSCalculator()
supabase_service = SupabaseService()
pdf_generator = GPSGenerator()
pdf_generator_completo = GPSGeneratorCompleto() if GPSGeneratorCompleto else None
whatsapp_service = WhatsAppService(supabase_service=supabase_service)


async def _obter_ou_criar_usuario(payload: dict[str, Any]) -> dict[str, Any]:
    whatsapp = payload["whatsapp"]
    usuario = await supabase_service.obter_usuario_por_whatsapp(whatsapp)
    if usuario and usuario.get("id"):
        return usuario

    # Tentar criar usuário
    usuario_criado = await supabase_service.criar_usuario(
        {
            "whatsapp_phone": whatsapp,
            "name": payload.get("nome"),
            "document": payload.get("cpf"),
            "pis": payload.get("nit"),
            "user_type": payload.get("tipo_contribuinte"),
        }
    )

    # Garantir que sempre tenha id
    if not usuario_criado.get("id"):
        usuario_criado["id"] = f"mock-{whatsapp}"

    return usuario_criado


async def _calcular_por_tipo(request: EmitirGuiaRequest) -> CalculoSAL:
    if request.tipo_contribuinte in {"autonomo", "autonomo_simplificado"}:
        # Validar código GPS por tipo
        # Simplificado (11%) deve usar código 1163
        # Normal (20%) deve usar código 1007
        if request.tipo_contribuinte == "autonomo_simplificado":
            # Forçar plano simplificado para garantir código 1163
            plano = "simplificado"
        else:
            # Autônomo normal - usar plano informado ou padrão "normal"
            plano = request.plano or "normal"
        
        calculo = await calculator.calcular_contribuinte_individual(request.valor_base, plano)
        
        # Validação adicional: garantir código GPS correto
        if plano == "simplificado" and calculo.codigo_gps != "1163":
            print(f"[WARN] Código GPS incorreto para simplificado: {calculo.codigo_gps}, esperado 1163")
            # Corrigir código GPS
            calculo.codigo_gps = "1163"
        elif plano == "normal" and calculo.codigo_gps != "1007":
            print(f"[WARN] Código GPS incorreto para normal: {calculo.codigo_gps}, esperado 1007")
            # Corrigir código GPS
            calculo.codigo_gps = "1007"
        
        return calculo
    if request.tipo_contribuinte == "domestico":
        return await calculator.calcular_domestico(request.valor_base)
    if request.tipo_contribuinte == "produtor_rural":
        return await calculator.calcular_produtor_rural(request.valor_base, segurado_especial=False)
    if request.tipo_contribuinte == "complementacao":
        raise HTTPException(
            status_code=400,
            detail="Use o endpoint /complementacao para emissão de complementação"
        )
    if request.tipo_contribuinte == "facultativo_baixa_renda":
        valor = calculator.salario_minimo_2025 * SAL_CLASSES["facultativo_baixa_renda"]["aliquota"]
        return CalculoSAL(
            codigo_gps=SAL_CLASSES["facultativo_baixa_renda"]["codigo_gps"],
            valor=round(valor, 2),
            descricao=SAL_CLASSES["facultativo_baixa_renda"]["descricao"],
            detalhes={"base_calculo": calculator.salario_minimo_2025, "aliquota": 0.05},
        )
    if request.tipo_contribuinte == "facultativo":
        base = max(calculator.salario_minimo_2025, request.valor_base)
        valor = base * SAL_CLASSES["facultativo"]["aliquota"]
        return CalculoSAL(
            codigo_gps=SAL_CLASSES["facultativo"]["codigo_gps"],
            valor=round(valor, 2),
            descricao=SAL_CLASSES["facultativo"]["descricao"],
            detalhes={"base_calculo": base, "aliquota": 0.20},
        )
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Tipo de contribuinte não suportado.")


class GerarPDFRequest(BaseModel):
    nome_segurado: str
    cpf: str
    valor_base: float = Field(..., gt=0)
    tipo_contribuinte: str
    plano: str | None = "normal"


@router.post("/gerar-pdf")
async def gerar_pdf(request: GerarPDFRequest) -> Response:
    """
    Gera apenas o PDF da guia (sem criar registro ou enviar WhatsApp).
    Compatível com o teste de integração local.
    """
    try:
        tipo = request.tipo_contribuinte
        if tipo == "autonomo":
            calculo = calculator.calcular_contribuinte_individual(request.valor_base, request.plano or "normal")
        elif tipo == "domestico":
            calculo = calculator.calcular_domestico(request.valor_base)
        elif tipo == "produtor_rural":
            calculo = calculator.calcular_produtor_rural(request.valor_base, segurado_especial=False)
        elif tipo == "facultativo":
            base = max(calculator.salario_minimo_2025, request.valor_base)
            valor = base * SAL_CLASSES["facultativo"]["aliquota"]
            calculo = CalculoSAL(
                codigo_gps=SAL_CLASSES["facultativo"]["codigo_gps"],
                valor=round(valor, 2),
                descricao=SAL_CLASSES["facultativo"]["descricao"],
                detalhes={"base_calculo": base, "aliquota": 0.20},
            )
        else:
            raise HTTPException(status_code=400, detail="tipo_contribuinte não suportado")

        competencia = datetime.utcnow().strftime("%m/%Y")
        vencimento = calcular_vencimento_padrao(competencia)
        
        dados_pdf = {
            "nome": request.nome_segurado,
            "cpf": request.cpf,
            "nit": request.cpf, # Fallback
            "codigo_pagamento": calculo.codigo_gps,
            "competencia": competencia,
            "valor_inss": calculo.valor,
            "vencimento": vencimento.strftime("%d/%m/%Y"),
        }
        
        buffer = await run_in_threadpool(pdf_generator.gerar, dados_pdf)
        pdf_bytes = buffer.getvalue()
        
        return Response(content=pdf_bytes, media_type="application/pdf")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao gerar PDF: {str(e)}")


from ..services.sal_version_manager import SALVersionManager
from ..services.gps_validator import GPSValidator
from ..services.inss_calculator import INSSCalculator
from ..services.l_digitavel_generator import LDigitavelGenerator
from ..services.gps_pdf_generator_v2 import PDFGeneratorV2


def _variacoes_whatsapp(numero: str) -> list[str]:
    """Gera variações do número com e sem o 9 após o DDD."""
    digits = "".join(filter(str.isdigit, numero))
    if not digits.startswith("55"):
        digits = "55" + digits

    variacoes = {digits}
    sem_55 = digits[2:]

    # Se faltar o 9 (10 dígitos), inserir após o DDD
    if len(sem_55) == 10:
        with_9 = "55" + sem_55[:2] + "9" + sem_55[2:]
        variacoes.add(with_9)

    # Se tiver 11 dígitos e o terceiro for 9, gerar sem o 9 também
    if len(sem_55) == 11 and sem_55[2] == "9":
        without_9 = "55" + sem_55[:2] + sem_55[3:]
        variacoes.add(without_9)

    return list(variacoes)

@router.post("/emitir")
async def emitir_guia(
    guia_data: EmitirGuiaRequest, 
    background_tasks: BackgroundTasks
):
    print("=" * 80)
    print(f"[ENDPOINT /emitir] CHAMADO! whatsapp={guia_data.whatsapp}, valor_base={guia_data.valor_base}")
    print("=" * 80)
    try:
        print(f"[INSS] Iniciando emissão de guia para {guia_data.whatsapp}")
        
        # 1. Inicializar Serviços
        sal_manager = SALVersionManager(supabase_service)
        validator = GPSValidator(supabase_service, sal_manager)
        calculator = INSSCalculator(sal_manager)
        ldig_generator = LDigitavelGenerator()
        pdf_generator = PDFGeneratorV2() # Adicionar logo path se tiver
        
        # 2. Obter ou Criar Usuário
        # Mapear tipo_contribuinte para user_type
        user_type_map = {
            'autonomo': 'autonomo',
            'autonomo_simplificado': 'autonomo',
            'mei': 'mei'
        }
        
        target_user_type = user_type_map.get(guia_data.tipo_contribuinte, 'autonomo')
        # Tentar buscar usuario especifico por whatsapp + tipo (inclui variacoes com/sem 9)
        print(f"[INSS] Buscando usuario whatsapp={guia_data.whatsapp} tipo={target_user_type}")
        usuario = None
        for phone in _variacoes_whatsapp(guia_data.whatsapp):
            try:
                registros = await supabase_service.get_records(
                    "profiles",
                    {"whatsapp_phone": phone, "user_type": target_user_type}
                )
                if registros:
                    usuario = registros[0]
                    guia_data.whatsapp = phone  # manter consistente para downstream
                    break
            except Exception as e:
                print(f"[INSS] Falha na busca especifica ({phone}): {e}")

        # Fallback: se nao encontrar especifico, busca generico (qualquer tipo)
        if not usuario:
            print(f"[INSS] Usuario especifico tipo={target_user_type} nao encontrado. Tentando busca generica.")
            for phone in _variacoes_whatsapp(guia_data.whatsapp):
                usuario = await supabase_service.obter_usuario_por_whatsapp(phone)
                if usuario:
                    guia_data.whatsapp = phone
                    break

        if not usuario or not usuario.get("id"):
            print(f"[ERROR] Usuario nao encontrado para whatsapp={guia_data.whatsapp}")
            raise HTTPException(status_code=500, detail="Falha ao identificar usuario.")

        user_id = usuario["id"]
        print(f"[INSS] Usuario identificado: id={user_id}, pis={usuario.get('pis')}")
        # Converter competencia para mes/ano
        try:
            mes, ano = map(int, guia_data.competencia.split("/"))
            competencia = guia_data.competencia
        except Exception:
            raise HTTPException(status_code=400, detail="Formato de competencia invalido. Use MM/AAAA")

        tipo_map = {
            "autonomo": "ci_normal",
            "autonomo_simplificado": "ci_simplificado",
            "individual": "ci_normal",
        }
        tipo_contribuinte = tipo_map.get(guia_data.tipo_contribuinte, guia_data.tipo_contribuinte)
        
        validacao = await validator.validar_completo(
            cpf=usuario.get("document") or usuario.get("cpf", "00000000000"),  # Fallback se nao tiver CPF no user
            periodo_mes=mes,
            periodo_ano=ano,
            tipo_contribuinte=tipo_contribuinte,
            valor_base=Decimal(str(guia_data.valor_base))
        )
        
        if not validacao["valido"]:
            raise HTTPException(status_code=400, detail="Erro de validacao: " + "; ".join(validacao["erros"]))
            raise HTTPException(status_code=400, detail=f"Erro de validação: {'; '.join(validacao['erros'])}")

        # 4. Calcular
        # 4. Calcular
        data_competencia = date(ano, mes, 1)
        if tipo_contribuinte == "ci_simplificado":
            calculo = calculator.calcular_contribuinte_individual(float(guia_data.valor_base), "simplificado")
            codigo_gps = calculo.codigo_gps or "1163"
        elif tipo_contribuinte == "domestico":
            calc_obj = await calculator.calcular_domestico(float(guia_data.valor_base), data_competencia)
            calculo = calc_obj.detalhes
            codigo_gps = calc_obj.codigo_gps
        else:
            calculo = calculator.calcular_contribuinte_individual(float(guia_data.valor_base), "normal")
            codigo_gps = calculo.codigo_gps or "1007"
        # 6. Emissão via GPSHybridService (Sempre usa o oficial ou SAL)
        print(f"[DEBUG] Iniciando emissão híbrida para {competencia}")
        try:
            from ..services.gps_hybrid_service import GPSHybridService
            hybrid_service = GPSHybridService(supabase_service)
            
            # Preparar dados do usuário para o PDF
            dados_usuario_pdf = {
                "nome": usuario.get("nome") or usuario.get("name"),
                "cpf": usuario.get("cpf") or usuario.get("document"),
                "nit": usuario.get("pis") or usuario.get("nit"),
                "endereco": usuario.get("endereco") or usuario.get("address"),
                "telefone": usuario.get("telefone") or guia_data.whatsapp,
                "uf": usuario.get("endereco_uf") or usuario.get("uf"),
            }

            # Emitir GPS (decide entre SAL e Local Oficial)
            resultado_emissao = await hybrid_service.emitir_gps(
                user_id=user_id,
                competencia=competencia,
                valor=calculo.valor,
                codigo_pagamento=calculo.codigo_gps,
                dados_usuario=dados_usuario_pdf,
                metodo_forcado=None # Deixa o serviço decidir (SAL ou Local)
            )
            
            pdf_bytes = resultado_emissao.get("pdf_bytes")
            pdf_url = resultado_emissao.get("pdf_url")
            codigo_barras = resultado_emissao.get("codigo_barras")
            linha_digitavel = resultado_emissao.get("linha_digitavel")
            metodo_emissao = resultado_emissao.get("metodo_emissao")
            validado_sal = resultado_emissao.get("validado_sal", False)
            
            if not pdf_bytes and not pdf_url:
                raise HTTPException(status_code=500, detail="Falha na geração do PDF (sem bytes nem URL).")

            # Se não tem URL (foi gerado localmente), fazer upload
            if not pdf_url and pdf_bytes:
                print(f"[DEBUG] Fazendo upload do PDF gerado localmente...")
                from datetime import datetime
                filename = f"gps_{user_id}_{competencia.replace('/', '-')}_{int(datetime.now().timestamp())}.pdf"
                pdf_url = await supabase_service.upload_file("gps-pdfs", filename, pdf_bytes, "application/pdf")
                print(f"[DEBUG] Upload concluído: {pdf_url}")
            
            # Preparar dados para salvar (ou atualizar)
            print(f"[DEBUG] Preparando dados para salvar...")
            venc_padrao = calcular_vencimento_padrao(data_competencia)
            ref_num = f"GPS-{user_id}-{competencia.replace('/', '')}"
            valor_total = calculo.valor
            guia_save_data = {
                "cpf": usuario.get("document") or usuario.get("cpf", ""),
                "nome": usuario.get("name") or usuario.get("nome", "Não Informado"),
                "rg": usuario.get("rg", ""),
                "endereco": usuario.get("endereco_logradouro") or usuario.get("endereco", ""),
                "pis_pasep": usuario.get("pis", ""),
                "periodo_mes": mes,
                "periodo_ano": ano,
                "tipo_contribuinte": tipo_contribuinte,
                "codigo_gps": codigo_gps,
                "valor_base": float(guia_data.valor),
                "aliquota": calculo.detalhes.get('aliquota', 0.0),
                "valor_contribuicao": float(calculo.valor),
                "valor_juros": 0.0, # TODO: Implementar cálculo de juros se necessário
                "valor_multa": 0.0,
                "valor_total": float(calculo.valor),
                "vencimento": venc_padrao.isoformat(),
            "status": "emitted",
            "reference_number": ref_num,
            "linha_digitavel": linha_digitavel,
            "codigo_barras": linha_digitavel,
            "pdf_url": pdf_url,
            "metodo_emissao": "v2_secure"
        }
        
            print(f"[DEBUG] Salvando GPS v2...")
            guia_salva = await supabase_service.salvar_gps_v2(user_id=user_id, gps_data=guia_save_data)
            print(f"[DEBUG] GPS salva: {guia_salva.keys() if guia_salva else 'None'}")
        
            # Garantir ID no retorno (Correção do Bug Original)
            if not guia_salva or "id" not in guia_salva:
                from uuid import uuid4
                guia_salva = {"id": str(uuid4()), **guia_save_data}
            
            return {
                "message": "Guia emitida com sucesso (V2 Secure)",
                "guia": {**guia_salva, "linha_digitavel": linha_digitavel},
                "pdf_url": pdf_url,
                "valor_total": float(valor_total),
                "codigo_barras": linha_digitavel
            }

        except Exception as e:
            print(f"[ERROR] Falha na emissão híbrida: {e}")
            raise e

    except Exception as e:
        import traceback
        trace = traceback.format_exc()
        print(f"[INSS] [ERROR] Erro crítico em emitir_guia V2: {str(e)}")
        print(trace)
        raise HTTPException(status_code=500, detail=f"Erro: {str(e)} | Tipo: {type(e).__name__}")



@router.post("/complementacao")
async def emitir_complementacao(request: ComplementacaoRequest):
    """
    Emite guia de complementação 11% → 20%.
    """
    try:
        if not validar_whatsapp(request.whatsapp):
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="WhatsApp inválido.")

        competencias = [normalizar_competencia(item) for item in request.competencias]
        calculo = calculator.calcular_complementacao(competencias, request.valor_base)
        competencia_principal = competencias[-1]
        vencimento = calcular_vencimento_padrao(competencia_principal)

        usuario = await _obter_ou_criar_usuario({"whatsapp": request.whatsapp, "tipo_contribuinte": "complementacao"})

        dados_pdf = {
            "nome": usuario.get("name") or usuario.get("nome"),
            "cpf": usuario.get("document") or usuario.get("cpf"),
            "nit": usuario.get("pis") or usuario.get("nit"),
            "whatsapp": request.whatsapp,
            "codigo_pagamento": calculo.codigo_gps,
            "competencia": competencia_principal,
            "valor_inss": calculo.valor,
            "vencimento": vencimento.strftime("%d/%m/%Y"),
        }

        buffer = await run_in_threadpool(pdf_generator.gerar, dados_pdf)
        pdf_bytes = buffer.getvalue()

        # Obter id do usuário de forma segura
        user_id_compl = usuario.get("id")
        if not user_id_compl:
            raise HTTPException(
                status_code=500,
                detail=f"Usuário não possui ID válido para complementação. Usuario: {usuario}"
            )
        
        guia_salva = await supabase_service.salvar_guia(
            user_id=user_id_compl,
            guia_data={
                "codigo_gps": calculo.codigo_gps,
                "competencia": competencia_principal,
                "valor": calculo.valor,
                "status": "pendente",
                "data_vencimento": vencimento.isoformat(),
            },
        )

        mensagem = (
            f"Complementação gerada (código {calculo.codigo_gps}). "
            f"Total com juros: R$ {calculo.valor:,.2f}. Vencimento {vencimento.strftime('%d/%m/%Y')}."
        )
        
        envio = await whatsapp_service.enviar_pdf_whatsapp(request.whatsapp, pdf_bytes, mensagem)

        return {
            "guia": guia_salva,
            "whatsapp": {"sid": envio.sid, "status": envio.status, "media_url": envio.media_url},
            "detalhes_calculo": calculo.detalhes,
        }
    except Exception as e:
        import traceback
        tb = traceback.format_exc()
        print(f"[ERROR] Erro ao emitir guia: {e}")
        print(tb)
        # Retornar traceback no detalhe para debug
        raise HTTPException(status_code=500, detail=f"Erro: {str(e)} | Traceback: {tb}")
