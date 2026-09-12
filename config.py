"""
Configurações centrais do agente LinkedIn Viral Content AI
"""
import os
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

# LLM Configs
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_DEFAULT_MODEL = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
OPENROUTER_DEFAULT_MODEL = os.getenv("OPENROUTER_MODEL", "meta-llama/llama-3.3-70b-instruct")

# LinkedIn API Configs
LINKEDIN_CLIENT_ID = os.getenv("LINKEDIN_CLIENT_ID", "")
LINKEDIN_CLIENT_SECRET = os.getenv("LINKEDIN_CLIENT_SECRET", "")
LINKEDIN_ACCESS_TOKEN = os.getenv("LINKEDIN_ACCESS_TOKEN", "")
LINKEDIN_AUTHOR_URN = os.getenv("LINKEDIN_AUTHOR_URN", "")
LINKEDIN_API_VERSION = os.getenv("LINKEDIN_API_VERSION", "202602")
LINKEDIN_RESTLI_VERSION = "2.0.0"

# RAG & PDF Configs
PDF_PATH = BASE_DIR / "linkedin-marketing-li-lms-2026-08.pdf"
FAISS_INDEX_DIR = BASE_DIR / "faiss_index"

# Persona Prompt Definitions
AGENT_PERSONA = {
    "name": "LinkedIn Viral Content AI",
    "tone": "crítico, versátil, humano",
    "styles": ["educativo", "provocativo", "visionário"],
    "capabilities": [
        "gerar pontos de vista próprios",
        "alternar entre diferentes estilos narrativos",
        "usar storytelling e gatilhos emocionais",
        "estimular debate e engajamento"
    ]
}
