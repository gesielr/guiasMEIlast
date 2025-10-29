from __future__ import annotations

from fastapi import APIRouter, HTTPException, status

from ..services.supabase_service import SupabaseService
from ..utils.validators import validar_whatsapp

router = APIRouter(prefix="/api/v1/usuarios", tags=["Usuários"])

supabase_service = SupabaseService()


@router.get("/{whatsapp}/historico")
async def buscar_historico(whatsapp: str):
    """
    Retorna histórico de guias do usuário.
    """

    if not validar_whatsapp(whatsapp):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="WhatsApp inválido.")

    usuario = await supabase_service.obter_usuario_por_whatsapp(whatsapp)
    if not usuario:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuário não encontrado.")

    historico = await supabase_service.buscar_historico(usuario["id"])
    return {"usuario": usuario, "historico": historico}

