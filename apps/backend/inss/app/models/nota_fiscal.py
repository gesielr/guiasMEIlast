from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class NotaFiscal(BaseModel):
    id: str
    numero: str
    serie: Optional[str]
    valor: float = Field(..., gt=0)
    emitida_em: datetime
    pdf_url: Optional[str] = None

    model_config = dict(from_attributes=True)

