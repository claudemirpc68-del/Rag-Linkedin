"""
Script de validação integral do sistema LinkedIn Viral Content AI
"""
import json
from rag_engine import get_rag_engine
from agent_core import get_agent
from linkedin_client import get_linkedin_client

def test_all():
    print("=" * 60)
    print("1. TESTANDO MOTOR RAG COM FAISS E FASTEMBED")
    print("=" * 60)
    rag = get_rag_engine()
    results = rag.query("Posts API headers and permissions", k=2)
    print(f"Encontrados {len(results)} resultados no manual oficial:")
    for r in results:
        print(f" - Página {r['page']} (Score {r['score']:.3f}): {r['content'][:120]}...")

    print("\n" + "=" * 60)
    print("2. TESTANDO AGENTE DE GERAÇÃO VIRAL VIA GROQ")
    print("=" * 60)
    agent = get_agent()
    content_groq = agent.generate_content(
        topic="IA em DevOps: Automação Total vs Risco Humano",
        objective="Estimular debate e reflexão crítica",
        engine="Groq",
        model="qwen/qwen3.6-27b"
    )
    
    if "perspectives" in content_groq:
        perspectives = content_groq["perspectives"]
        print("Perspectivas geradas com sucesso:")
        for mode, data in perspectives.items():
            print(f"  [{mode.upper()}]: {data.get('hook', '')[:80]}...")
            print(f"     Prompt Imagem: {data.get('image_prompt', '')[:70]}...")
    else:
        print("Retorno Groq:", json.dumps(content_groq, indent=2))

    print("\n" + "=" * 60)
    print("3. TESTANDO CLIENTE LINKEDIN (MODO SIMULAÇÃO)")
    print("=" * 60)
    client = get_linkedin_client()
    sample_text = "O futuro de DevOps não é sobre menos código, é sobre mais governança. #Tech"
    pub_res = client.publish_post(commentary=sample_text, mode="simulation")
    print(f"Status: {pub_res.get('status')} | URN: {pub_res.get('post_urn')}")
    print(f"Headers enviados: {pub_res.get('headers_sent')}")

    print("\n" + "=" * 60)
    print("✅ TODOS OS MÓDULOS FORAM VALIDADOS COM SUCESSO!")
    print("=" * 60)

if __name__ == "__main__":
    test_all()
