"""
Servidor FastAPI para o ecossistema LinkedIn Viral Content AI.
Fornece rotas REST para geração de conteúdo, consulta RAG técnica,
aprovação e publicação na API do LinkedIn, e disponibiliza o frontend interativo.
"""
import os
import uvicorn
from pathlib import Path
from typing import Optional, Dict, Any
from pydantic import BaseModel
from fastapi import FastAPI, HTTPException, Request, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse, RedirectResponse, HTMLResponse

from config import (
    BASE_DIR,
    GROQ_API_KEY, GROQ_DEFAULT_MODEL,
    OPENROUTER_API_KEY, OPENROUTER_DEFAULT_MODEL,
    LINKEDIN_ACCESS_TOKEN, LINKEDIN_API_VERSION
)
from agent_core import get_agent
from linkedin_client import get_linkedin_client
from rag_engine import get_rag_engine

app = FastAPI(
    title="LinkedIn Viral Content AI",
    description="Agente de IA para criação de posts virais, técnicos e multi-perspectiva com RAG da documentação oficial do LinkedIn",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Modelos Pydantic para validação
class GenerateRequest(BaseModel):
    topic: str
    objective: Optional[str] = "Estimular debate e gerar autoridade técnica"
    style: Optional[str] = "provocativo"
    audience: Optional[str] = "Líderes de TI, Desenvolvedores e Entusiastas de IA"
    engine: Optional[str] = "Groq"
    model: Optional[str] = None
    api_key: Optional[str] = None

class PublishRequest(BaseModel):
    post_content: str
    author_urn: Optional[str] = None
    mode: Optional[str] = "simulation" # "simulation" ou "live"
    access_token: Optional[str] = None
    image_urn: Optional[str] = None
    image_title: Optional[str] = None

class RAGQueryRequest(BaseModel):
    query: str
    k: Optional[int] = 4

class ChatRequest(BaseModel):
    messages: list
    engine: Optional[str] = "Groq"
    model: Optional[str] = None
    api_key: Optional[str] = None

class ConfigUpdateRequest(BaseModel):
    groq_api_key: Optional[str] = None
    groq_model: Optional[str] = None
    openrouter_api_key: Optional[str] = None
    openrouter_model: Optional[str] = None
    linkedin_access_token: Optional[str] = None
    linkedin_author_urn: Optional[str] = None

# Rotas de API
@app.get("/auth/linkedin")
def auth_linkedin():
    """Inicia o fluxo de autorização OAuth 2.0 redirecionando para o LinkedIn."""
    client = get_linkedin_client()
    url = client.get_auth_url()
    return RedirectResponse(url)

@app.get("/callback")
def auth_callback(code: Optional[str] = None, error: Optional[str] = None, error_description: Optional[str] = None):
    """Recebe o código de autorização do LinkedIn, obtém o token de acesso e atualiza as configurações."""
    if error or not code:
        err_msg = error_description or error or "Código de autorização não recebido."
        return HTMLResponse(
            content=f"""
            <html><body style='font-family:sans-serif; background:#09090b; color:#fafafa; padding:3rem; text-align:center;'>
                <h2 style='color:#ef4444;'>❌ Falha na Autorização do LinkedIn</h2>
                <p style='color:#a1a1aa;'>{err_msg}</p>
                <a href='/' style='color:#60a5fa; text-decoration:none; font-weight:bold;'>← Voltar ao Painel</a>
            </body></html>
            """,
            status_code=400
        )

    client = get_linkedin_client()
    token_data = client.exchange_token(code)
    access_token = token_data.get("access_token")

    if not access_token:
        return HTMLResponse(
            content=f"""
            <html><body style='font-family:sans-serif; background:#09090b; color:#fafafa; padding:3rem; text-align:center;'>
                <h2 style='color:#ef4444;'>❌ Erro ao obter Token do LinkedIn</h2>
                <pre style='background:#18181b; padding:1rem; border-radius:8px; color:#f87171; text-align:left;'>{token_data}</pre>
                <a href='/' style='color:#60a5fa; text-decoration:none; font-weight:bold;'>← Voltar ao Painel</a>
            </body></html>
            """,
            status_code=400
        )

    # Identifica o perfil do usuário e a URN oficial
    profile = client.get_user_profile(access_token)
    author_urn = profile.get("author_urn") or os.getenv("LINKEDIN_AUTHOR_URN") or "urn:li:person:connected"

    # Salva no .env
    env_path = BASE_DIR / ".env"
    lines = env_path.read_text(encoding="utf-8").splitlines() if env_path.exists() else []
    settings = {}
    for line in lines:
        if "=" in line and not line.strip().startswith("#"):
            k, v = line.split("=", 1)
            settings[k.strip()] = v.strip()

    settings["LINKEDIN_ACCESS_TOKEN"] = access_token
    settings["LINKEDIN_AUTHOR_URN"] = author_urn
    os.environ["LINKEDIN_ACCESS_TOKEN"] = access_token
    os.environ["LINKEDIN_AUTHOR_URN"] = author_urn

    new_content = "\n".join([f"{k}={v}" for k, v in settings.items()])
    env_path.write_text(new_content, encoding="utf-8")

    return RedirectResponse(url="/?auth_success=1")

@app.get("/api/status")
def get_status():
    rag = get_rag_engine()
    has_rag_index = rag.vector_store is not None
    return {
        "status": "online",
        "agent": "LinkedIn Viral Content AI",
        "engines": {
            "groq": {
                "configured": bool(os.getenv("GROQ_API_KEY") or GROQ_API_KEY),
                "model": os.getenv("GROQ_MODEL") or GROQ_DEFAULT_MODEL
            },
            "openrouter": {
                "configured": bool(os.getenv("OPENROUTER_API_KEY") or OPENROUTER_API_KEY),
                "model": os.getenv("OPENROUTER_MODEL") or OPENROUTER_DEFAULT_MODEL
            }
        },
        "linkedin_api": {
            "version": os.getenv("LINKEDIN_API_VERSION") or LINKEDIN_API_VERSION,
            "has_token": bool(os.getenv("LINKEDIN_ACCESS_TOKEN") or LINKEDIN_ACCESS_TOKEN),
            "author_urn": os.getenv("LINKEDIN_AUTHOR_URN", "")
        },
        "rag_indexed": has_rag_index
    }

@app.post("/api/generate")
def generate_posts(req: GenerateRequest):
    if not req.topic.strip():
        raise HTTPException(status_code=400, detail="O tema não pode estar vazio.")

    agent = get_agent()
    try:
        content = agent.generate_content(
            topic=req.topic,
            objective=req.objective,
            style=req.style,
            audience=req.audience,
            engine=req.engine,
            model=req.model,
            api_key=req.api_key
        )
        return content
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/chat")
def chat_endpoint(req: ChatRequest):
    if not req.messages:
        raise HTTPException(status_code=400, detail="A lista de mensagens não pode estar vazia.")
    agent = get_agent()
    try:
        return agent.interact_chat(
            messages=req.messages,
            engine=req.engine or "Groq",
            model=req.model,
            api_key=req.api_key
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/upload-image")
async def upload_image(file: UploadFile = File(...), mode: Optional[str] = Form("live")):
    """Recebe uma imagem enviada pelo usuário e executa o upload oficial na LinkedIn Images API."""
    if not file:
        raise HTTPException(status_code=400, detail="Nenhum arquivo enviado.")

    contents = await file.read()
    content_type = file.content_type or "image/jpeg"
    client = get_linkedin_client()
    res = client.upload_image(
        image_bytes=contents,
        content_type=content_type,
        mode=mode
    )
    if res.get("status") != "success":
        raise HTTPException(status_code=400, detail=res.get("message", "Falha no upload da imagem"))
    return res

@app.post("/api/publish")
def publish_post(req: PublishRequest):
    if not req.post_content.strip():
        raise HTTPException(status_code=400, detail="O conteúdo do post não pode ser vazio.")

    client = get_linkedin_client()
    result = client.publish_post(
        commentary=req.post_content,
        author_urn=req.author_urn,
        access_token=req.access_token,
        mode=req.mode,
        image_urn=req.image_urn,
        image_title=req.image_title
    )
    return result

@app.post("/api/rag-query")
def query_rag(req: RAGQueryRequest):
    if not req.query.strip():
        raise HTTPException(status_code=400, detail="A consulta não pode estar vazia.")

    rag = get_rag_engine()
    results = rag.query(req.query, k=req.k)
    return {
        "query": req.query,
        "matches_count": len(results),
        "results": results
    }

@app.post("/api/config")
def update_config(req: ConfigUpdateRequest):
    env_path = BASE_DIR / ".env"
    lines = []
    if env_path.exists():
        lines = env_path.read_text(encoding="utf-8").splitlines()
    
    settings = {}
    for line in lines:
        if "=" in line and not line.strip().startswith("#"):
            k, v = line.split("=", 1)
            settings[k.strip()] = v.strip()

    if req.groq_api_key is not None:
        settings["GROQ_API_KEY"] = req.groq_api_key
        os.environ["GROQ_API_KEY"] = req.groq_api_key
    if req.groq_model is not None:
        settings["GROQ_MODEL"] = req.groq_model
        os.environ["GROQ_MODEL"] = req.groq_model
    if req.openrouter_api_key is not None:
        settings["OPENROUTER_API_KEY"] = req.openrouter_api_key
        os.environ["OPENROUTER_API_KEY"] = req.openrouter_api_key
    if req.openrouter_model is not None:
        settings["OPENROUTER_MODEL"] = req.openrouter_model
        os.environ["OPENROUTER_MODEL"] = req.openrouter_model
    if req.linkedin_access_token is not None:
        settings["LINKEDIN_ACCESS_TOKEN"] = req.linkedin_access_token
        os.environ["LINKEDIN_ACCESS_TOKEN"] = req.linkedin_access_token
    if req.linkedin_author_urn is not None:
        settings["LINKEDIN_AUTHOR_URN"] = req.linkedin_author_urn
        os.environ["LINKEDIN_AUTHOR_URN"] = req.linkedin_author_urn

    new_env_content = "\n".join([f"{k}={v}" for k, v in settings.items()])
    env_path.write_text(new_env_content, encoding="utf-8")
    return {"status": "success", "message": "Configurações atualizadas com sucesso!"}

# Montagem de arquivos estáticos (prioriza o build do React em frontend/dist se existir)
frontend_dist = BASE_DIR / "frontend" / "dist"
if frontend_dist.exists() and (frontend_dist / "assets").exists():
    app.mount("/assets", StaticFiles(directory=str(frontend_dist / "assets")), name="react-assets")

static_dir = BASE_DIR / "static"
static_dir.mkdir(parents=True, exist_ok=True)
app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")

@app.get("/")
@app.get("/{full_path:path}")
def serve_index(full_path: str = ""):
    # Não intercepta rotas de API, Auth ou estáticos se não capturados pelos mounts
    if full_path.startswith("api/") or full_path.startswith("auth/") or full_path.startswith("callback"):
        raise HTTPException(status_code=404, detail="Endpoint não encontrado")
        
    if frontend_dist.exists() and (frontend_dist / "index.html").exists():
        return FileResponse(str(frontend_dist / "index.html"))
    index_file = static_dir / "index.html"
    if not index_file.exists():
        return JSONResponse({"message": "Frontend em carregamento..."})
    return FileResponse(str(index_file))

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    host = os.getenv("HOST", "127.0.0.1")
    print(f"[SERVER] Iniciando LinkedIn Viral Content AI em http://{host}:{port}", flush=True)
    uvicorn.run(app, host=host, port=port)
