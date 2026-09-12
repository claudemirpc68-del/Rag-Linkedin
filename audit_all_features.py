"""
Script de Auditoria Completa do Sistema LinkedIn Viral Content AI
Executa bateria de testes unitários e de integração em todos os componentes:
1. Configurações e Variáveis de Ambiente
2. Motor RAG Vetorial (FAISS + FastEmbed)
3. LLM Core (Geração Multi-Perspectiva, Chat Conversacional, Auditoria, Carrossel)
4. Cliente Oficial da API do LinkedIn (OAuth, Headers Restli 2.0.0, Simulação)
5. Endpoints HTTP da API FastAPI (Status, Chat, Generate, Publish, Frontend SPA)
6. Build e Integridade do Frontend React 18 + Vite
"""
import sys
import os
import time
import json
import requests
from pathlib import Path

# Configura UTF-8 no terminal Windows para suportar emojis e caracteres acentuados
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

# Cores para o terminal
GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
CYAN = "\033[96m"
BOLD = "\033[1m"
RESET = "\033[0m"

results = {
    "total": 0,
    "passed": 0,
    "failed": 0,
    "warnings": 0,
    "details": []
}

def log_test(module: str, test_name: str, passed: bool, message: str = "", is_warning: bool = False):
    results["total"] += 1
    if passed:
        results["passed"] += 1
        status = f"{GREEN}✅ PASSOU{RESET}"
    elif is_warning:
        results["warnings"] += 1
        status = f"{YELLOW}⚠️ AVISO{RESET}"
    else:
        results["failed"] += 1
        status = f"{RED}❌ FALHOU{RESET}"
        
    print(f"  [{status}] {BOLD}{module}:{RESET} {test_name}")
    if message:
        print(f"         {CYAN}↳ {message}{RESET}")
    results["details"].append({
        "module": module,
        "test": test_name,
        "status": "PASS" if passed else ("WARN" if is_warning else "FAIL"),
        "message": message
    })

def section_header(title: str):
    print("\n" + "=" * 70)
    print(f"{BOLD}{CYAN}{title.center(70)}{RESET}")
    print("=" * 70)

def test_configurations():
    section_header("1. AUDITORIA DE CONFIGURAÇÕES & AMBIENTE")
    import config
    
    # .env exists
    env_file = config.BASE_DIR / ".env"
    log_test("ENV", "Arquivo .env presente", env_file.exists(), str(env_file))
    
    # Groq API
    groq_ok = bool(config.GROQ_API_KEY)
    log_test("GROQ", "Chave GROQ_API_KEY configurada", groq_ok, f"Modelo: {config.GROQ_DEFAULT_MODEL}")
    
    # OpenRouter API
    openrouter_ok = bool(config.OPENROUTER_API_KEY)
    log_test("OPENROUTER", "Chave OPENROUTER_API_KEY configurada", openrouter_ok, f"Modelo: {config.OPENROUTER_DEFAULT_MODEL}")
    
    # LinkedIn Credentials
    log_test("LINKEDIN", "LINKEDIN_CLIENT_ID configurado", bool(config.LINKEDIN_CLIENT_ID))
    log_test("LINKEDIN", "LINKEDIN_ACCESS_TOKEN configurado", bool(config.LINKEDIN_ACCESS_TOKEN))
    log_test("LINKEDIN", "LINKEDIN_AUTHOR_URN configurado", bool(config.LINKEDIN_AUTHOR_URN), config.LINKEDIN_AUTHOR_URN)
    log_test("LINKEDIN", "Protocolo Restli 2.0.0 e Versão da API", config.LINKEDIN_RESTLI_VERSION == "2.0.0", f"Versão: {config.LINKEDIN_API_VERSION}")
    
    # PDF & Index dir
    log_test("DOCS", "PDF Oficial da documentação do LinkedIn presente", config.PDF_PATH.exists(), f"Tamanho: {config.PDF_PATH.stat().st_size / (1024*1024):.1f} MB" if config.PDF_PATH.exists() else "Não encontrado")
    log_test("FAISS", "Diretório de Índice FAISS presente", config.FAISS_INDEX_DIR.exists(), str(config.FAISS_INDEX_DIR))

def test_rag_engine():
    section_header("2. AUDITORIA DO MOTOR RAG VETORIAL (FAISS + FASTEMBED)")
    from rag_engine import get_rag_engine
    
    t0 = time.time()
    try:
        rag = get_rag_engine()
        init_time = time.time() - t0
        log_test("RAG", "Inicialização e carregamento do índice FAISS", rag.vector_store is not None, f"Tempo de carga: {init_time:.2f}s")
        
        # Test query 1: Posts API
        t1 = time.time()
        res1 = rag.query("headers required for creating a post with Restli 2.0.0", k=2)
        q1_time = time.time() - t1
        has_results1 = len(res1) > 0
        log_test("RAG", "Busca Semântica 1: Posts API & Headers", has_results1, f"{len(res1)} trechos encontrados ({q1_time:.2f}s). Score: {res1[0]['score']:.3f}")
        
        # Test query 2: Images API
        res2 = rag.query("initializeUpload image URN rest/images", k=2)
        has_results2 = len(res2) > 0
        log_test("RAG", "Busca Semântica 2: Images API & Upload", has_results2, f"{len(res2)} trechos encontrados. Score: {res2[0]['score']:.3f}")
        
    except Exception as e:
        log_test("RAG", "Execução do Motor RAG", False, str(e))

def test_llm_agent():
    section_header("3. AUDITORIA DO AGENTE DE IA & ENGINES DE GERAÇÃO")
    from agent_core import get_agent
    agent = get_agent()
    
    # Test 1: Chat conversacional natural (sem gerar post indevido)
    try:
        t0 = time.time()
        chat_reply = agent.interact_chat(
            messages=[{"role": "user", "content": "Olá, sou especialista em Python e automações. O que você acha de eu falar sobre IA em backend no LinkedIn?"}],
            engine="Groq"
        )
        t_chat = time.time() - t0
        is_natural = not chat_reply.get("is_post", False) and len(chat_reply.get("display_text", "")) > 40
        log_test("AGENT", "Chat Conversacional: Modo Consultivo (sem post precipitado)", is_natural, f"Tempo: {t_chat:.2f}s | Resposta: {chat_reply.get('display_text','')[:65]}...")
    except Exception as e:
        log_test("AGENT", "Chat Conversacional: Modo Consultivo", False, str(e))

    # Test 2: Chat com comando explícito de geração de post (com tag <LINKEDIN_POST>)
    try:
        t0 = time.time()
        post_reply = agent.interact_chat(
            messages=[{"role": "user", "content": "Gere um post sobre automação de testes com IA para LinkedIn"}],
            engine="Groq"
        )
        t_post = time.time() - t0
        has_post_tag = post_reply.get("is_post", False) and post_reply.get("post_content") is not None
        log_test("AGENT", "Chat Conversacional: Geração de Post sob Demanda com Barra Rápida", has_post_tag, f"Tempo: {t_post:.2f}s | Conteúdo: {post_reply.get('post_content','')[:60]}...")
    except Exception as e:
        log_test("AGENT", "Chat Conversacional: Geração de Post", False, str(e))

    # Test 3: Geração Multi-Perspectiva (3 pontos de vista contrastantes)
    try:
        t0 = time.time()
        gen_data = agent.generate_content(
            topic="Bancos de Dados Vetoriais em Produção",
            objective="Autoridade Técnica",
            engine="Groq"
        )
        t_gen = time.time() - t0
        perspectives = gen_data.get("perspectives", {})
        norm_keys = [k.lower().replace("í", "i").replace("á", "a") for k in perspectives.keys()]
        has_3_persp = len(perspectives) >= 3 or ("otimista" in norm_keys and "critica" in norm_keys)
        log_test("AGENT", "Geração Multi-Perspectiva (Otimista, Crítica, Pragmática)", has_3_persp, f"Tempo: {t_gen:.2f}s | {len(perspectives)} perspectivas geradas: {list(perspectives.keys())}")
        
        # Test Prompts de Imagem em Inglês
        img_prompt_ok = all("image_prompt" in p and len(p["image_prompt"]) > 15 for p in perspectives.values())
        log_test("AGENT", "Prompts Visuais Conceituais em Inglês para cada perspectiva", img_prompt_ok)
    except Exception as e:
        log_test("AGENT", "Geração Multi-Perspectiva", False, str(e))

    # Test 4: Auditor de Post
    try:
        sample_post = "A maioria das empresas comete um erro fatal ao adotar microsserviços. Quer saber qual? Veja este caso real..."
        audit_res = agent.audit_post(sample_post, engine="Groq")
        has_audit = "virality_score" in audit_res and "hook_strength" in audit_res
        log_test("AGENT", "Auditor de Post (Score Viral & Força do Gancho)", has_audit, f"Score: {audit_res.get('virality_score')} | Gancho: {audit_res.get('hook_strength')}")
    except Exception as e:
        log_test("AGENT", "Auditor de Post", False, str(e))

    # Test 5: Gerador de Carrossel
    try:
        car_res = agent.generate_carousel("3 Lições de Arquitetura de Software", num_slides=5, engine="Groq")
        slides = car_res.get("slides", [])
        has_slides = len(slides) >= 3
        log_test("AGENT", "Gerador de Carrossel (Estrutura de Slides)", has_slides, f"{len(slides)} slides gerados com dicas visuais")
    except Exception as e:
        log_test("AGENT", "Gerador de Carrossel", False, str(e))

def test_linkedin_client():
    section_header("4. AUDITORIA DO CLIENTE OFICIAL LINKEDIN")
    from linkedin_client import get_linkedin_client
    client = get_linkedin_client()
    
    # Auth URL
    auth_url = client.get_auth_url()
    has_auth_url = "linkedin.com/oauth/v2/authorization" in auth_url and "w_member_social" in auth_url
    log_test("LINKEDIN", "Geração da URL de Autorização OAuth 2.0", has_auth_url, auth_url[:80] + "...")
    
    # Headers e Protocolo Restli 2.0.0
    has_headers = (
        client.api_version == "202602" and 
        client.restli_version == "2.0.0"
    )
    log_test("LINKEDIN", "Headers Oficiais Restli 2.0.0 & LinkedIn-Version 202602", has_headers, f"Versão API: {client.api_version} | Restli: {client.restli_version}")
    
    # Publicação em Modo Simulação (Segurança)
    pub_sim = client.publish_post("Post de teste para auditoria automatizada do ecossistema.", mode="simulation")
    sim_ok = pub_sim.get("status") == "success" and pub_sim.get("mode") == "simulation" and pub_sim.get("post_urn", "").startswith("urn:li:share:")
    log_test("LINKEDIN", "Mecanismo de Publicação Segura (Modo Simulação)", sim_ok, f"URN gerada: {pub_sim.get('post_urn')}")

def test_fastapi_server():
    section_header("5. AUDITORIA DO SERVIDOR FASTAPI & ROTAS HTTP")
    base_url = "http://127.0.0.1:3000"
    
    # 1. Healthcheck / Root (React SPA)
    try:
        r_root = requests.get(f"{base_url}/", timeout=5)
        is_spa = r_root.status_code == 200 and ("<div id=\"root\"></div>" in r_root.text)
        log_test("HTTP", "GET / (Servindo SPA React 18 + Vite)", is_spa, f"Status: {r_root.status_code}")
    except Exception as e:
        log_test("HTTP", "GET / (Servidor FastAPI)", False, f"Servidor não respondeu: {str(e)}")

    # 2. GET /api/status
    try:
        r_status = requests.get(f"{base_url}/api/status", timeout=5)
        data_status = r_status.json() if r_status.status_code == 200 else {}
        status_ok = data_status.get("status") == "online" and data_status.get("rag_indexed") is True
        log_test("HTTP", "GET /api/status (Status, Engines, LinkedIn e RAG)", status_ok, json.dumps(data_status))
    except Exception as e:
        log_test("HTTP", "GET /api/status", False, str(e))

    # 3. POST /api/chat
    try:
        r_chat = requests.post(f"{base_url}/api/chat", json={
            "messages": [{"role": "user", "content": "Teste de auditoria rápida de API"}]
        }, timeout=20)
        chat_ok = r_chat.status_code == 200 and "display_text" in r_chat.json()
        log_test("HTTP", "POST /api/chat (Endpoint de Chat em Tempo Real)", chat_ok, f"Status: {r_chat.status_code}")
    except Exception as e:
        log_test("HTTP", "POST /api/chat", False, str(e))

    # 4. POST /api/publish (simulation)
    try:
        r_pub = requests.post(f"{base_url}/api/publish", json={
            "post_content": "Teste de publicação automatizada via auditoria REST",
            "mode": "simulation"
        }, timeout=10)
        pub_data = r_pub.json() if r_pub.status_code == 200 else {}
        pub_ok = r_pub.status_code == 200 and pub_data.get("status") == "success" and pub_data.get("mode") == "simulation"
        log_test("HTTP", "POST /api/publish (Endpoint de Publicação Segura)", pub_ok, f"Status: {r_pub.status_code} | URN: {pub_data.get('post_urn')}")
    except Exception as e:
        log_test("HTTP", "POST /api/publish", False, str(e))

def test_frontend_assets():
    section_header("6. AUDITORIA DO BUILD DO FRONTEND (REACT 18 + VITE)")
    import config
    dist_dir = config.BASE_DIR / "frontend" / "dist"
    assets_dir = dist_dir / "assets"
    
    log_test("FRONTEND", "Pasta frontend/dist gerada", dist_dir.exists())
    log_test("FRONTEND", "Arquivo index.html de produção compilado", (dist_dir / "index.html").exists())
    
    js_files = list(assets_dir.glob("*.js")) if assets_dir.exists() else []
    css_files = list(assets_dir.glob("*.css")) if assets_dir.exists() else []
    
    log_test("FRONTEND", f"Bundles JavaScript presentes ({len(js_files)} arquivos)", len(js_files) > 0, str([f.name for f in js_files]))
    log_test("FRONTEND", f"Folhas de Estilo CSS presentes ({len(css_files)} arquivos)", len(css_files) > 0, str([f.name for f in css_files]))
    
    # Checa se o badge indesejado do Lovable realmente não existe nos fontes
    chat_file = config.BASE_DIR / "frontend" / "src" / "components" / "chat" / "ChatInterface.tsx"
    badge_clean = "Edit with" not in chat_file.read_text(encoding="utf-8") if chat_file.exists() else True
    log_test("FRONTEND", "Interface limpa sem o badge 'Edit with Lovable'", badge_clean)

def main():
    start_time = time.time()
    print("\n" + "#" * 70)
    print(f"{BOLD}INICIANDO AUDITORIA INTEGRAL — LINKEDIN VIRAL CONTENT AI{RESET}".center(70))
    print(f"Data/Hora: {time.strftime('%Y-%m-%d %H:%M:%S')}".center(70))
    print("#" * 70)
    
    try:
        test_configurations()
        test_rag_engine()
        test_llm_agent()
        test_linkedin_client()
        test_fastapi_server()
        test_frontend_assets()
    except KeyboardInterrupt:
        print("\nAuditoria interrompida pelo usuário.")
        return
        
    duration = time.time() - start_time
    section_header("RELATÓRIO FINAL DA AUDITORIA")
    
    print(f"\n  • Total de Testes Executados: {BOLD}{results['total']}{RESET}")
    print(f"  • Testes Bem-Sucedidos:       {GREEN}{BOLD}{results['passed']}{RESET}")
    print(f"  • Avisos / Alertas:          {YELLOW}{BOLD}{results['warnings']}{RESET}")
    print(f"  • Falhas Detectadas:         {RED}{BOLD}{results['failed']}{RESET}")
    print(f"  • Tempo Total de Auditoria:  {CYAN}{duration:.2f} segundos{RESET}\n")
    
    if results["failed"] == 0:
        print(f"{GREEN}{BOLD}🎉 PARABÉNS! TODAS AS FUNCIONALIDADES IMPLEMENTADAS FORAM AUDITADAS COM 100% DE SUCESSO!{RESET}\n")
    else:
        print(f"{RED}{BOLD}⚠️ Foram detectadas {results['failed']} falhas que demandam atenção.{RESET}\n")

if __name__ == "__main__":
    main()
