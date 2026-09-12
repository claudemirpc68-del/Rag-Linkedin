"""
Cliente de Integração com a LinkedIn API (Posts API & OAuth 2.0)
Suporta modo Live (requisições reais com cabeçalhos Restli 2.0.0) e modo Simulação (Sandbox seguro).
"""
import os
import time
import random
from typing import Dict, Any, Optional
import requests

from config import (
    LINKEDIN_CLIENT_ID,
    LINKEDIN_CLIENT_SECRET,
    LINKEDIN_ACCESS_TOKEN,
    LINKEDIN_AUTHOR_URN,
    LINKEDIN_API_VERSION,
    LINKEDIN_RESTLI_VERSION
)

class LinkedInClient:
    def __init__(self):
        self.api_version = os.getenv("LINKEDIN_API_VERSION") or LINKEDIN_API_VERSION
        self.restli_version = LINKEDIN_RESTLI_VERSION
        self.base_url = "https://api.linkedin.com/rest"

    def get_auth_url(self, client_id: Optional[str] = None, redirect_uri: str = "http://localhost:3000/callback") -> str:
        cid = client_id or os.getenv("LINKEDIN_CLIENT_ID") or LINKEDIN_CLIENT_ID
        # Escopos modernos: w_member_social para publicação, openid e profile para identificar o autor
        scopes = "w_member_social%20openid%20profile%20email"
        return (
            f"https://www.linkedin.com/oauth/v2/authorization"
            f"?response_type=code&client_id={cid}&redirect_uri={redirect_uri}&scope={scopes}&state=rag_linkedin_state"
        )

    def exchange_token(self, code: str, redirect_uri: str = "http://localhost:3000/callback") -> Dict[str, Any]:
        cid = os.getenv("LINKEDIN_CLIENT_ID") or LINKEDIN_CLIENT_ID
        csecret = os.getenv("LINKEDIN_CLIENT_SECRET") or LINKEDIN_CLIENT_SECRET
        payload = {
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": redirect_uri,
            "client_id": cid,
            "client_secret": csecret
        }
        res = requests.post(
            "https://www.linkedin.com/oauth/v2/accessToken",
            data=payload,
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            timeout=30
        )
        return res.json()

    def get_user_profile(self, access_token: str) -> Dict[str, Any]:
        """Obtém as informações do perfil autenticado para capturar a URN oficial."""
        headers = {"Authorization": f"Bearer {access_token}"}
        
        # 1. Tenta OpenID userinfo (padrão atual do LinkedIn)
        try:
            resp = requests.get("https://api.linkedin.com/v2/userinfo", headers=headers, timeout=15)
            if resp.status_code == 200:
                data = resp.json()
                sub_id = data.get("sub")
                return {
                    "author_urn": f"urn:li:person:{sub_id}",
                    "name": data.get("name", "Membro LinkedIn"),
                    "email": data.get("email", ""),
                    "raw": data
                }
        except Exception:
            pass

        # 2. Fallback para v2/me
        try:
            resp = requests.get("https://api.linkedin.com/v2/me", headers=headers, timeout=15)
            if resp.status_code == 200:
                data = resp.json()
                person_id = data.get("id")
                return {
                    "author_urn": f"urn:li:person:{person_id}",
                    "name": f"{data.get('localizedFirstName', '')} {data.get('localizedLastName', '')}".strip() or "Membro LinkedIn",
                    "raw": data
                }
        except Exception:
            pass

        return {"author_urn": None, "name": "Membro LinkedIn"}

    def upload_image(
        self,
        image_bytes: bytes,
        content_type: str = "image/jpeg",
        author_urn: Optional[str] = None,
        access_token: Optional[str] = None,
        mode: str = "simulation"
    ) -> Dict[str, Any]:
        """
        Executa o fluxo de upload de imagem oficial do LinkedIn (Images API):
        1. initializeUpload -> Obtém uploadUrl e image URN
        2. PUT image binary -> Envia os bytes para uploadUrl
        """
        token = access_token or os.getenv("LINKEDIN_ACCESS_TOKEN") or LINKEDIN_ACCESS_TOKEN
        author = author_urn or os.getenv("LINKEDIN_AUTHOR_URN") or LINKEDIN_AUTHOR_URN or "urn:li:person:AQX123fakeMember"

        if mode == "simulation" or not token or token.startswith("fake_"):
            sim_img = f"urn:li:image:sim_{random.randint(100000000, 999999999)}"
            return {
                "status": "success",
                "mode": "simulation",
                "image_urn": sim_img,
                "message": "Upload de imagem simulado com sucesso!"
            }

        headers = {
            "Authorization": f"Bearer {token}",
            "Linkedin-Version": self.api_version,
            "X-Restli-Protocol-Version": self.restli_version,
            "Content-Type": "application/json"
        }

        # Etapa 1: initializeUpload
        init_endpoint = f"{self.base_url}/images?action=initializeUpload"
        init_payload = {
            "initializeUploadRequest": {
                "owner": author
            }
        }

        try:
            init_res = requests.post(init_endpoint, json=init_payload, headers=headers, timeout=30)
            if init_res.status_code not in [200, 201]:
                return {
                    "status": "error",
                    "mode": "live",
                    "message": f"Erro na inicialização do upload de imagem: HTTP {init_res.status_code}",
                    "details": init_res.text
                }

            init_data = init_res.json().get("value", {})
            upload_url = init_data.get("uploadUrl")
            image_urn = init_data.get("image")

            if not upload_url or not image_urn:
                return {
                    "status": "error",
                    "mode": "live",
                    "message": "LinkedIn não retornou uploadUrl ou image URN válido.",
                    "details": init_res.text
                }

            # Etapa 2: PUT do binário da imagem
            put_headers = {
                "Authorization": f"Bearer {token}",
                "Content-Type": content_type
            }
            put_res = requests.put(upload_url, data=image_bytes, headers=put_headers, timeout=60)
            if put_res.status_code not in [200, 201]:
                return {
                    "status": "error",
                    "mode": "live",
                    "message": f"Falha ao enviar binário da imagem: HTTP {put_res.status_code}",
                    "details": put_res.text
                }

            return {
                "status": "success",
                "mode": "live",
                "image_urn": image_urn,
                "message": "Imagem carregada com sucesso nos servidores do LinkedIn!"
            }

        except Exception as e:
            return {
                "status": "error",
                "mode": "live",
                "message": f"Erro de conexão durante upload de imagem: {str(e)}"
            }

    def publish_post(
        self,
        commentary: str,
        author_urn: Optional[str] = None,
        access_token: Optional[str] = None,
        mode: str = "simulation",
        image_urn: Optional[str] = None,
        image_title: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Publica um post via LinkedIn Posts API com suporte a texto e imagem.
        """
        token = access_token or os.getenv("LINKEDIN_ACCESS_TOKEN") or LINKEDIN_ACCESS_TOKEN
        author = author_urn or os.getenv("LINKEDIN_AUTHOR_URN") or LINKEDIN_AUTHOR_URN

        if not author:
            author = "urn:li:person:AQX123fakeMember"

        post_payload = {
            "author": author,
            "commentary": commentary,
            "visibility": "PUBLIC",
            "distribution": {
                "feedDistribution": "MAIN_FEED",
                "targetEntities": [],
                "thirdPartyDistributionChannels": []
            },
            "lifecycleState": "PUBLISHED",
            "isReshareDisabledByAuthor": False
        }

        # Anexa mídia se houver imagem
        if image_urn:
            post_payload["content"] = {
                "media": {
                    "title": image_title or "Post Visual",
                    "id": image_urn
                }
            }

        headers = {
            "Authorization": f"Bearer {token}",
            "Linkedin-Version": self.api_version,
            "X-Restli-Protocol-Version": self.restli_version,
            "Content-Type": "application/json"
        }

        if mode == "simulation" or not token or token.startswith("fake_"):
            simulated_id = f"urn:li:share:{random.randint(7200000000000000000, 7299999999999999999)}"
            return {
                "status": "success",
                "mode": "simulation",
                "http_status": 201,
                "message": "Post aprovado e simulado com sucesso na LinkedIn Posts API!" + (" (com imagem)" if image_urn else ""),
                "post_urn": simulated_id,
                "created_at": int(time.time()),
                "target_author": author,
                "image_urn": image_urn,
                "headers_sent": {
                    "Linkedin-Version": self.api_version,
                    "X-Restli-Protocol-Version": self.restli_version,
                    "Content-Type": "application/json"
                },
                "payload": post_payload
            }

        # Modo Live
        endpoint = f"{self.base_url}/posts"
        try:
            resp = requests.post(endpoint, json=post_payload, headers=headers, timeout=30)
            if resp.status_code in [200, 201]:
                return {
                    "status": "success",
                    "mode": "live",
                    "http_status": resp.status_code,
                    "post_urn": resp.headers.get("x-restli-id", "urn:li:post:published"),
                    "image_attached": bool(image_urn),
                    "response_headers": dict(resp.headers),
                    "message": "Publicado com sucesso no perfil do LinkedIn!" + (" (com imagem)" if image_urn else "")
                }
            else:
                return {
                    "status": "error",
                    "mode": "live",
                    "http_status": resp.status_code,
                    "error_body": resp.text,
                    "message": f"Falha na API LinkedIn: HTTP {resp.status_code}"
                }
        except Exception as e:
            return {
                "status": "error",
                "mode": "live",
                "message": f"Erro de rede ao conectar à LinkedIn API: {str(e)}"
            }

linkedin_client_instance = LinkedInClient()

def get_linkedin_client() -> LinkedInClient:
    return linkedin_client_instance
