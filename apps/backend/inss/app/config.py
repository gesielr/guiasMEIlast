from functools import lru_cache
from typing import Optional

from pydantic import Field, HttpUrl
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Configurações globais carregadas do ambiente."""

    model_config = SettingsConfigDict(env_file="../.env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = Field(default="INSS Guias API")
    app_version: str = Field(default="1.0.0")

    # Supabase
    supabase_url: HttpUrl = Field(..., alias="SUPABASE_URL")
    supabase_key: str = Field(..., alias="SUPABASE_ANON_KEY")

    # Twilio / WhatsApp
    twilio_account_sid: Optional[str] = Field(default=None, alias="TWILIO_ACCOUNT_SID")
    twilio_auth_token: Optional[str] = Field(default=None, alias="TWILIO_AUTH_TOKEN")
    twilio_whatsapp_number: Optional[str] = Field(default=None, alias="TWILIO_WHATSAPP_NUMBER")
    whatsapp_number: Optional[str] = Field(default=None, alias="WHATSAPP_NUMBER")

    # OpenAI / LangChain
    openai_api_key: Optional[str] = Field(default=None, alias="OPENAI_API_KEY")

    # Configurações INSS
    salario_minimo_2025: float = Field(default=1518.00, alias="SALARIO_MINIMO_2025")
    teto_inss_2025: float = Field(default=8157.41, alias="TETO_INSS_2025")

    # URLs auxiliares
    webhook_secret: Optional[str] = Field(default=None, alias="WHATSAPP_WEBHOOK_SECRET")

    @field_validator("twilio_whatsapp_number")
    @classmethod
    def validar_numero_whatsapp(cls, value: Optional[str]) -> Optional[str]:
        if value is None or value.startswith("whatsapp:"):
            return value
        raise ValueError("O número do WhatsApp deve seguir o formato 'whatsapp:+5511999999999'")


@lru_cache()
def get_settings() -> Settings:
    """Retorna instância única de Settings ao longo do ciclo de vida da aplicação."""

    return Settings()

