from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field


TipoContribuinte = Literal[
    "autonomo",
    "autonomo_simplificado",
    "facultativo",
    "facultativo_baixa_renda",
    "domestico",
    "produtor_rural",
    "complementacao",
]


class UserBase(BaseModel):
    whatsapp: str = Field(..., description="Número do WhatsApp no formato internacional com +55")
    nome: Optional[str] = Field(default=None)
    cpf: Optional[str] = Field(default=None, min_length=11, max_length=14)
    nit: Optional[str] = Field(default=None, min_length=11, max_length=20)
    tipo_contribuinte: Optional[TipoContribuinte] = Field(default=None)


class UserCreate(UserBase):
    """Modelo para criação de usuários."""


class UserResponse(UserBase):
    id: str
    created_at: datetime

    model_config = dict(from_attributes=True)

