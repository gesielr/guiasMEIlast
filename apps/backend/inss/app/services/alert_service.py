"""
Serviço de alertas para notificar equipe técnica sobre divergências GPS.
Suporta múltiplos canais: email, Slack webhook, webhook genérico.
"""
from __future__ import annotations

import os
import json
import httpx
from typing import Optional, Dict, Any
from datetime import datetime


class AlertService:
    """
    Serviço para enviar alertas sobre divergências GPS.
    
    Suporta:
    - Email via SendGrid (se configurado)
    - Slack webhook
    - Webhook genérico
    """
    
    def __init__(self):
        """Inicializa o serviço de alertas."""
        self.sendgrid_api_key = os.getenv("SENDGRID_API_KEY")
        self.email_from = os.getenv("EMAIL_FROM", "noreply@guiasmei.com.br")
        self.email_to = os.getenv("GPS_ALERT_EMAIL", os.getenv("ALERT_EMAIL"))
        self.slack_webhook_url = os.getenv("SLACK_WEBHOOK_URL")
        self.alert_webhook_url = os.getenv("GPS_ALERT_WEBHOOK_URL", os.getenv("ALERT_WEBHOOK_URL"))
        
        # Verificar se algum canal está configurado
        self.has_email = bool(self.sendgrid_api_key and self.email_to)
        self.has_slack = bool(self.slack_webhook_url)
        self.has_webhook = bool(self.alert_webhook_url)
        
        if not (self.has_email or self.has_slack or self.has_webhook):
            print("[ALERT SERVICE] [WARN] Nenhum canal de alerta configurado. Configure:")
            print("[ALERT SERVICE]   - SENDGRID_API_KEY + GPS_ALERT_EMAIL (para email)")
            print("[ALERT SERVICE]   - SLACK_WEBHOOK_URL (para Slack)")
            print("[ALERT SERVICE]   - GPS_ALERT_WEBHOOK_URL (para webhook generico)")
        else:
            canais = []
            if self.has_email:
                canais.append("Email")
            if self.has_slack:
                canais.append("Slack")
            if self.has_webhook:
                canais.append("Webhook")
            print(f"[ALERT SERVICE] [OK] Canais de alerta configurados: {', '.join(canais)}")
    
    async def alertar_divergencia_gps(
        self,
        guia_id: str,
        usuario_id: str,
        competencia: str,
        valor: float,
        codigo_local: str,
        codigo_sal: str,
        tipo_divergencia: str
    ) -> None:
        """
        Envia alerta sobre divergência GPS detectada.
        
        Args:
            guia_id: ID da guia GPS
            usuario_id: ID do usuário
            competencia: Competência da GPS
            valor: Valor da GPS
            codigo_local: Código de barras gerado localmente
            codigo_sal: Código de barras do SAL
            tipo_divergencia: Tipo de divergência
        """
        try:
            # Preparar dados do alerta
            alerta_data = {
                "tipo": "divergencia_gps",
                "severidade": "alta",
                "timestamp": datetime.now().isoformat(),
                "guia_id": guia_id,
                "usuario_id": usuario_id,
                "competencia": competencia,
                "valor": valor,
                "codigo_local": codigo_local,
                "codigo_sal": codigo_sal,
                "tipo_divergencia": tipo_divergencia,
                "mensagem": f"Divergência detectada na GPS {guia_id} - Competência: {competencia}"
            }
            
            # Enviar por todos os canais configurados
            tasks = []
            
            if self.has_email:
                tasks.append(self._enviar_email(alerta_data))
            
            if self.has_slack:
                tasks.append(self._enviar_slack(alerta_data))
            
            if self.has_webhook:
                tasks.append(self._enviar_webhook(alerta_data))
            
            # Executar todos os envios em paralelo
            if tasks:
                import asyncio
                resultados = await asyncio.gather(*tasks, return_exceptions=True)
                
                # Log de resultados
                for i, resultado in enumerate(resultados):
                    if isinstance(resultado, Exception):
                        canal = ["Email", "Slack", "Webhook"][i]
                        print(f"[ALERT SERVICE] [ERROR] Erro ao enviar alerta via {canal}: {resultado}")
                    elif resultado:
                        canal = ["Email", "Slack", "Webhook"][i]
                        print(f"[ALERT SERVICE] [OK] Alerta enviado via {canal}")
            else:
                print(f"[ALERT SERVICE] [WARN] Nenhum canal configurado, alerta não enviado")
                print(f"[ALERT SERVICE] Dados da divergência: {json.dumps(alerta_data, indent=2)}")
        
        except Exception as e:
            print(f"[ALERT SERVICE] [ERROR] Erro ao enviar alerta: {e}")
            import traceback
            print(traceback.format_exc())
    
    async def _enviar_email(self, dados: Dict[str, Any]) -> bool:
        """Envia alerta por email via SendGrid."""
        if not self.has_email:
            return False
        
        try:
            # Importar SendGrid apenas se necessário
            try:
                import sendgrid
                from sendgrid.helpers.mail import Mail
            except ImportError:
                print("[ALERT SERVICE] [WARN] SendGrid não instalado. Instale com: pip install sendgrid")
                return False
            
            sg = sendgrid.SendGridAPIClient(api_key=self.sendgrid_api_key)
            
            # Preparar email
            assunto = f"[GuiasMEI] [WARN] Divergência GPS Detectada - {dados['guia_id']}"
            
            html_content = f"""
            <html>
            <body>
                <h2>[WARN] Divergência GPS Detectada</h2>
                <p>Uma divergência foi detectada entre o código de barras gerado localmente e o código oficial do SAL.</p>
                
                <h3>Detalhes:</h3>
                <ul>
                    <li><strong>Guia ID:</strong> {dados['guia_id']}</li>
                    <li><strong>Usuário ID:</strong> {dados['usuario_id']}</li>
                    <li><strong>Competência:</strong> {dados['competencia']}</li>
                    <li><strong>Valor:</strong> R$ {dados['valor']:,.2f}</li>
                    <li><strong>Tipo:</strong> {dados['tipo_divergencia']}</li>
                </ul>
                
                <h3>Códigos de Barras:</h3>
                <p><strong>Local:</strong> {dados['codigo_local']}</p>
                <p><strong>SAL:</strong> {dados['codigo_sal']}</p>
                
                <p><small>Timestamp: {dados['timestamp']}</small></p>
            </body>
            </html>
            """
            
            message = Mail(
                from_email=self.email_from,
                to_emails=self.email_to,
                subject=assunto,
                html_content=html_content
            )
            
            response = sg.send(message)
            
            if response.status_code in [200, 201, 202]:
                print(f"[ALERT SERVICE] [OK] Email enviado com sucesso para {self.email_to}")
                return True
            else:
                print(f"[ALERT SERVICE] [WARN] Email retornou status {response.status_code}")
                return False
        
        except Exception as e:
            print(f"[ALERT SERVICE] [ERROR] Erro ao enviar email: {e}")
            return False
    
    async def _enviar_slack(self, dados: Dict[str, Any]) -> bool:
        """Envia alerta para Slack via webhook."""
        if not self.has_slack:
            return False
        
        try:
            # Formatar mensagem para Slack
            mensagem_slack = {
                "text": "[WARN] Divergência GPS Detectada",
                "blocks": [
                    {
                        "type": "header",
                        "text": {
                            "type": "plain_text",
                            "text": "[WARN] Divergência GPS Detectada"
                        }
                    },
                    {
                        "type": "section",
                        "fields": [
                            {
                                "type": "mrkdwn",
                                "text": f"*Guia ID:*\n{dados['guia_id']}"
                            },
                            {
                                "type": "mrkdwn",
                                "text": f"*Competência:*\n{dados['competencia']}"
                            },
                            {
                                "type": "mrkdwn",
                                "text": f"*Valor:*\nR$ {dados['valor']:,.2f}"
                            },
                            {
                                "type": "mrkdwn",
                                "text": f"*Tipo:*\n{dados['tipo_divergencia']}"
                            }
                        ]
                    },
                    {
                        "type": "section",
                        "text": {
                            "type": "mrkdwn",
                            "text": f"*Código Local:*\n`{dados['codigo_local']}`\n*Código SAL:*\n`{dados['codigo_sal']}`"
                        }
                    }
                ]
            }
            
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(
                    self.slack_webhook_url,
                    json=mensagem_slack
                )
                
                if response.status_code == 200:
                    print(f"[ALERT SERVICE] [OK] Alerta enviado para Slack")
                    return True
                else:
                    print(f"[ALERT SERVICE] [WARN] Slack retornou status {response.status_code}: {response.text}")
                    return False
        
        except Exception as e:
            print(f"[ALERT SERVICE] [ERROR] Erro ao enviar para Slack: {e}")
            return False
    
    async def _enviar_webhook(self, dados: Dict[str, Any]) -> bool:
        """Envia alerta para webhook genérico."""
        if not self.has_webhook:
            return False
        
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(
                    self.alert_webhook_url,
                    json=dados,
                    headers={"Content-Type": "application/json"}
                )
                
                if response.status_code in [200, 201, 202]:
                    print(f"[ALERT SERVICE] [OK] Alerta enviado para webhook")
                    return True
                else:
                    print(f"[ALERT SERVICE] [WARN] Webhook retornou status {response.status_code}: {response.text}")
                    return False
        
        except Exception as e:
            print(f"[ALERT SERVICE] [ERROR] Erro ao enviar webhook: {e}")
            return False

