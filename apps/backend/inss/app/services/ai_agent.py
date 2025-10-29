from __future__ import annotations

from typing import Any

try:
    from langchain_openai import ChatOpenAI
    LANGCHAIN_AVAILABLE = True
except ImportError:
    LANGCHAIN_AVAILABLE = False

from ..config import get_settings


class INSSChatAgent:
    """Agente conversacional para dúvidas sobre INSS."""

    def __init__(self) -> None:
        settings = get_settings()
        self.openai_api_key = settings.openai_api_key
        self.llm = None
        
        if LANGCHAIN_AVAILABLE and settings.openai_api_key and settings.openai_api_key != "sua-chave-openai":
            try:
                self.llm = ChatOpenAI(model="gpt-4o", temperature=0.3, openai_api_key=settings.openai_api_key)
            except Exception as e:
                print(f"⚠ AVISO: Não foi possível inicializar ChatOpenAI: {str(e)[:60]}...")
        
        self.conhecimento_sal = """
        REGRAS DO SISTEMA SAL (Sistema de Acréscimos Legais):

        1. CONTRIBUINTE INDIVIDUAL (Autônomo):
           - Código 1007: 20% sobre valor entre R$1.518 e R$8.157,41
           - Código 1163: 11% sobre salário mínimo (R$166,98 em 2025)
           - Não tem direito a aposentadoria por tempo no plano simplificado

        2. PRODUTOR RURAL:
           - Código 1503: 20% sobre valor declarado
           - Segurado especial: 1,3% sobre receita bruta

        3. EMPREGADO DOMÉSTICO:
           - Tabela progressiva de 7,5% a 14%
           - Empregador também contribui

        4. COMPLEMENTAÇÃO:
           - Código 1295: Para quem pagou 11% e quer complementar para 20%
           - Incide juros SELIC sobre valores em atraso
        """

    async def processar_mensagem(self, mensagem_usuario: str, contexto_usuario: dict[str, Any]) -> str:
        """
        Processa mensagem do usuário e retorna resposta da IA.
        """
        
        if not self.llm:
            # Resposta padrão quando LangChain não está disponível
            return self._resposta_padrao(mensagem_usuario, contexto_usuario)
        
        try:
            entrada = f"Contexto: {contexto_usuario}\n\nPergunta: {mensagem_usuario}"
            resposta = await self.llm.ainvoke(entrada)
            return resposta.content if hasattr(resposta, 'content') else str(resposta)
        except Exception as e:
            print(f"✗ Erro ao processar com IA: {str(e)[:60]}...")
            return self._resposta_padrao(mensagem_usuario, contexto_usuario)
    
    def _resposta_padrao(self, mensagem_usuario: str, contexto_usuario: dict[str, Any]) -> str:
        """Resposta padrão sem IA"""
        return f"""
        Olá! Recebi sua pergunta: "{mensagem_usuario}"
        
        Base de conhecimento do INSS:
        {self.conhecimento_sal}
        
        Para respostas mais específicas, configure sua chave OpenAI em apps/backend/.env
        """
