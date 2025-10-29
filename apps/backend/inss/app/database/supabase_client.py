from __future__ import annotations

from supabase import Client, create_client

from ..config import get_settings


def get_supabase_client() -> Client:
    """Cria e retorna um cliente Supabase configurado."""
    settings = get_settings()
    return create_client(str(settings.supabase_url), settings.supabase_key)
