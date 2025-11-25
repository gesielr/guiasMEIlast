"""
Utilitários para formatação de PIS/NIT conforme padrão do sistema SAL.
"""


def formatar_pis(pis: str) -> str:
    """
    Formata PIS/NIT no padrão do sistema SAL.
    
    Formato esperado: XXX.XXXXX.XX-X (ex: 128.00186.72-2)
    
    Args:
        pis: PIS sem formatação (apenas números, 11 dígitos)
    
    Returns:
        PIS formatado no padrão SAL
    
    Examples:
        >>> formatar_pis("12800186722")
        '128.00186.72-2'
        
        >>> formatar_pis("128.00186.72-2")
        '128.00186.72-2'  # Já formatado, retorna como está
    """
    if not pis:
        return ""
    
    # Remove formatação existente (pontos, traços, espaços)
    pis_limpo = "".join(filter(str.isdigit, str(pis)))
    
    # Verifica se tem 11 dígitos
    if len(pis_limpo) != 11:
        # Se não tem 11 dígitos, retorna como está (pode ser inválido)
        return pis
    
    # Formata: XXX.XXXXX.XX-X
    return f"{pis_limpo[:3]}.{pis_limpo[3:8]}.{pis_limpo[8:10]}-{pis_limpo[10:]}"


def validar_pis(pis: str) -> bool:
    """
    Valida se o PIS tem formato válido (11 dígitos).
    
    Args:
        pis: PIS com ou sem formatação
    
    Returns:
        True se válido, False caso contrário
    """
    if not pis:
        return False
    
    pis_limpo = "".join(filter(str.isdigit, str(pis)))
    return len(pis_limpo) == 11

