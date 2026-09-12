from agent_core import get_agent

agent = get_agent()
res = agent.generate_content(
    topic="IA em DevOps: A morte dos scripts manuais ou uma ilusão perigosa?",
    engine="Groq",
    model="openai/gpt-oss-120b"
)
print("Keys:", list(res.keys()))
if "perspectives" in res:
    print("SUCESSO TOTAL! Perspectivas geradas:")
    for mode, data in res["perspectives"].items():
        print(f" -> [{mode.upper()}]: {data.get('hook', '')[:80]}...")
        print(f"    Prompt Imagem: {data.get('image_prompt', '')[:70]}...")
elif "error" in res:
    print("Erro retornado:", res["error"])
