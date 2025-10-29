from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request, status

from ..services.ai_agent import INSSChatAgent
from ..services.supabase_service import SupabaseService
from ..services.whatsapp_service import WhatsAppService
from ..utils.validators import validar_whatsapp

router = APIRouter(tags=["Webhook WhatsApp"])

supabase_service = SupabaseService()
whatsapp_service = WhatsAppService(supabase_service=supabase_service)
chat_agent = INSSChatAgent()


@router.post("/webhook/whatsapp")
async def webhook_whatsapp(request: Request):
    """
    Webhook para receber mensagens do WhatsApp.
    """

    payload = await request.form()
    numero = payload.get("From", "").replace("whatsapp:", "")
    mensagem = payload.get("Body", "")

    if not validar_whatsapp(numero):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Origem inválida.")

    usuario = await supabase_service.obter_usuario_por_whatsapp(numero)
    contexto = {
        "whatsapp": numero,
        "tipo_contribuinte": usuario.get("tipo_contribuinte") if usuario else None,
    }

    resposta = await chat_agent.processar_mensagem(mensagem, contexto)
    if usuario:
        await supabase_service.registrar_conversa(usuario["id"], mensagem, resposta)

    await whatsapp_service.enviar_texto(numero, resposta)
    return {"status": "ok"}

