"""
Core de Orquestração da IA para LinkedIn Viral Content AI
Suporta os motores Groq e OpenRouter, gerando múltiplos pontos de vista,
narrativas com ganchos virais, prompts visuais em inglês e otimização de engajamento.
"""
import os
import json
import requests
from datetime import datetime
from typing import Dict, Any, Optional, List

from config import (
    GROQ_API_KEY, GROQ_DEFAULT_MODEL,
    OPENROUTER_API_KEY, OPENROUTER_DEFAULT_MODEL,
    AGENT_PERSONA
)

def get_current_datetime_context() -> str:
    """Retorna o contexto temporal dinâmico em português do Brasil com data, dia da semana e horário."""
    now = datetime.now()
    dias_semana = [
        "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira",
        "Sexta-feira", "Sábado", "Domingo"
    ]
    dia_nome = dias_semana[now.weekday()]
    meses = [
        "", "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
        "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ]
    mes_nome = meses[now.month]
    return f"Hoje é {dia_nome}, {now.strftime('%d/%m/%Y')} ({now.day} de {mes_nome} de {now.year}), horário local: {now.strftime('%H:%M')}"


class LLMClient:
    """Cliente unificado para chamadas LLM com suporte a Groq e OpenRouter."""

    @staticmethod
    def call_llm(
        prompt: str,
        system_prompt: str,
        engine: str = "Groq",
        model: Optional[str] = None,
        api_key: Optional[str] = None,
        temperature: float = 0.7
    ) -> str:
        engine_lower = engine.lower()

        if "openrouter" in engine_lower:
            key = api_key or os.getenv("OPENROUTER_API_KEY") or OPENROUTER_API_KEY
            if not key:
                raise ValueError("Chave de API do OpenRouter não configurada.")
            
            selected_model = model or OPENROUTER_DEFAULT_MODEL
            headers = {
                "Authorization": f"Bearer {key}",
                "HTTP-Referer": "http://localhost:8000",
                "X-Title": "LinkedIn Viral Content AI",
                "Content-Type": "application/json"
            }
            payload = {
                "model": selected_model,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": prompt}
                ],
                "temperature": temperature
            }
            response = requests.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers=headers,
                json=payload,
                timeout=60
            )
            if response.status_code != 200:
                raise Exception(f"Erro na API OpenRouter ({response.status_code}): {response.text}")
            
            data = response.json()
            return data["choices"][0]["message"]["content"].strip()

        else: # Default: Groq
            key = api_key or os.getenv("GROQ_API_KEY") or GROQ_API_KEY
            if not key:
                raise ValueError("Chave de API da Groq não configurada.")
            
            selected_model = model or os.getenv("GROQ_MODEL") or GROQ_DEFAULT_MODEL or "openai/gpt-oss-120b"
            headers = {
                "Authorization": f"Bearer {key}",
                "Content-Type": "application/json"
            }
            payload = {
                "model": selected_model,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": prompt}
                ],
                "temperature": temperature,
                "response_format": {"type": "json_object"},
                "max_tokens": 1500
            }
            response = requests.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers=headers,
                json=payload,
                timeout=60
            )
            if response.status_code != 200:
                raise Exception(f"Erro na API Groq ({response.status_code}): {response.text}")
            
            data = response.json()
            return data["choices"][0]["message"]["content"].strip()

    @staticmethod
    def call_chat_llm(
        messages: List[Dict[str, str]],
        system_prompt: str,
        engine: str = "Groq",
        model: Optional[str] = None,
        api_key: Optional[str] = None,
        temperature: float = 0.7
    ) -> str:
        engine_lower = engine.lower()
        formatted_messages = [{"role": "system", "content": system_prompt}]
        for m in messages:
            formatted_messages.append({
                "role": m.get("role", "user"),
                "content": m.get("content", "")
            })

        if "openrouter" in engine_lower:
            key = api_key or os.getenv("OPENROUTER_API_KEY") or OPENROUTER_API_KEY
            if not key:
                raise ValueError("Chave de API do OpenRouter não configurada.")
            selected_model = model or OPENROUTER_DEFAULT_MODEL
            headers = {
                "Authorization": f"Bearer {key}",
                "HTTP-Referer": "http://localhost:8000",
                "X-Title": "LinkedIn Viral Content AI",
                "Content-Type": "application/json"
            }
            payload = {
                "model": selected_model,
                "messages": formatted_messages,
                "temperature": temperature
            }
            response = requests.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers=headers,
                json=payload,
                timeout=60
            )
            if response.status_code != 200:
                raise Exception(f"Erro na API OpenRouter ({response.status_code}): {response.text}")
            return response.json()["choices"][0]["message"]["content"].strip()

        else: # Default: Groq
            key = api_key or os.getenv("GROQ_API_KEY") or GROQ_API_KEY
            if not key:
                raise ValueError("Chave de API da Groq não configurada.")
            selected_model = model or os.getenv("GROQ_MODEL") or GROQ_DEFAULT_MODEL or "openai/gpt-oss-120b"
            headers = {
                "Authorization": f"Bearer {key}",
                "Content-Type": "application/json"
            }
            payload = {
                "model": selected_model,
                "messages": formatted_messages,
                "temperature": temperature,
                "max_tokens": 1800
            }
            response = requests.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers=headers,
                json=payload,
                timeout=60
            )
            if response.status_code != 200:
                raise Exception(f"Erro na API Groq ({response.status_code}): {response.text}")
            return response.json()["choices"][0]["message"]["content"].strip()


class LinkedInViralContentAI:
    def __init__(self):
        self.persona = AGENT_PERSONA

    def build_system_prompt(self) -> str:
        temporal_context = get_current_datetime_context()
        return f"""Você é o '{self.persona['name']}', um especialista em criação de conteúdo viral, técnico e humano para o LinkedIn.
Sua persona possui o tom: {self.persona['tone']}.
Estilos narrativos dominados: {', '.join(self.persona['styles'])}.

CONTEXTO TEMPORAL FACTUAL OBRIGATÓRIO:
- {temporal_context}.
- Você SEMPRE opera no presente real (ano corrente de 2026).
- Todas as análises de tendências, acontecimentos do mercado, novidades e sugestões de cronograma/calendário devem obrigatoriamente considerar que a data atual é {temporal_context}. Nunca use anos passados (como 2023, 2024 ou 2025) como tempo presente.

Suas capacidades:
- Gerar pontos de vista próprios e autênticos (fugindo do lugar-comum e de clichês corporativos vazios).
- Usar storytelling, frases de alto impacto e ganchos (hooks) que prendem a atenção antes do botão 'Ver mais'.
- Escrever em português do Brasil impecável, com cadência dinâmica e parágrafos curtos.
- Criar prompts de imagem em inglês hiper-específicos para acompanhar cada postagem.
- Sempre responder em formato JSON estrito conforme solicitado."""

    def generate_content(
        self,
        topic: str,
        objective: str = "Estimular debate e gerar autoridade",
        style: str = "provocativo",
        audience: str = "Líderes de TI, Desenvolvedores e Entusiastas de IA",
        engine: str = "Groq",
        model: Optional[str] = None,
        api_key: Optional[str] = None
    ) -> Dict[str, Any]:
        """Gera 3 variações contrastantes (Otimista, Crítica, Pragmática) com prompts de imagem e otimizações."""
        
        system_prompt = self.build_system_prompt()

        temporal_context = get_current_datetime_context()
        user_prompt = f"""CONTEXTO TEMPORAL ATUAL: {temporal_context}. Utilize este contexto temporal e dia da semana para formular ganchos, tendências atuais e recomendações de dias/horários ideais de postagem a partir de hoje ({temporal_context}).
TEMA: {topic}
OBJETIVO: {objective}
ESTILO PRINCIPAL: {style}
PÚBLICO-ALVO: {audience}

Gere um objeto JSON completo com 3 perspectivas contrastantes sobre este tema:
1. OTIMISTA (Foco no potencial transformador, saltos de escala, novas oportunidades e visão de futuro).
2. CRÍTICA (Foco no que ninguém está falando: hype exagerado, riscos operacionais, custos ocultos, impacto humano).
3. PRAGMÁTICA (Foco em 'mão na massa', ROI mensurável, trade-offs técnicos e o que implementar na prática hoje).

Para CADA UMA das 3 perspectivas, forneça:
- hook: Frase inicial de altíssimo impacto (máx 2 linhas) para prender antes do 'Ver mais'.
- post_content: O texto completo do post no LinkedIn, formatado com quebras de linha elegantes, storytelling, insights sólidos e encerramento com uma pergunta instigante que obrigue o leitor a comentar.
- hashtags: Lista de 4 a 6 hashtags estratégicas (ex: #InteligenciaArtificial #DevOps #TechLeadership).
- image_prompt: Um prompt detalhado em INGLÊS para geração de imagem realista ou artística conceitual de alto nível (ex: para Midjourney/DALL-E/Designer).
- est_read_time: Tempo estimado de leitura (ex: '1 min e 30 seg').
- virality_score: Nota prevista de viralidade de 80 a 98.
- best_posting_time: Recomendação do melhor dia e horário para postar essa variação.

Responda EXCLUSIVAMENTE com o JSON válido sem blocos adicionais de texto fora do JSON:
{{
  "topic": "{topic}",
  "objective": "{objective}",
  "perspectives": {{
    "otimista": {{
      "title": "Visão Visionária & Otimista",
      "hook": "...",
      "post_content": "...",
      "hashtags": ["#Tag1", "#Tag2"],
      "image_prompt": "...",
      "est_read_time": "...",
      "virality_score": 92,
      "best_posting_time": "Terça-feira às 08:30"
    }},
    "critica": {{
      "title": "Visão Crítica & Provocativa",
      "hook": "...",
      "post_content": "...",
      "hashtags": ["#Tag1", "#Tag2"],
      "image_prompt": "...",
      "est_read_time": "...",
      "virality_score": 95,
      "best_posting_time": "Quarta-feira às 11:45"
    }},
    "pragmatica": {{
      "title": "Visão Pragmática & Operacional",
      "hook": "...",
      "post_content": "...",
      "hashtags": ["#Tag1", "#Tag2"],
      "image_prompt": "...",
      "est_read_time": "...",
      "virality_score": 89,
      "best_posting_time": "Quinta-feira às 17:15"
    }}
  }},
  "general_recommendations": {{
    "target_reaction": "Insightful / Comentários acalorados",
    "engagement_tip": "Responda aos primeiros 5 comentários nos primeiros 30 minutos da postagem para alavancar o algoritmo do LinkedIn."
  }}
}}"""

        raw_response = LLMClient.call_llm(
            prompt=user_prompt,
            system_prompt=system_prompt,
            engine=engine,
            model=model,
            api_key=api_key,
            temperature=0.75
        )

        # Remove blocos de raciocínio <think>...</think> característicos de modelos de raciocínio
        if "<think>" in raw_response:
            if "</think>" in raw_response:
                raw_response = raw_response.split("</think>", 1)[1].strip()
            else:
                # Se truncou dentro do think, tenta localizar o primeiro {
                first_brace = raw_response.find("{")
                if first_brace != -1:
                    raw_response = raw_response[first_brace:]

        # Extrai o primeiro bloco JSON válido com regex
        import re
        match = re.search(r'(\{[\s\S]*\})', raw_response)
        if match:
            cleaned_json = match.group(1).strip()
        else:
            cleaned_json = raw_response.strip()

        if cleaned_json.startswith("```json"):
            cleaned_json = cleaned_json[7:]
        if cleaned_json.startswith("```"):
            cleaned_json = cleaned_json[3:]
        if cleaned_json.endswith("```"):
            cleaned_json = cleaned_json[:-3]
        cleaned_json = cleaned_json.strip()

        try:
            parsed = json.loads(cleaned_json)
            return parsed
        except json.JSONDecodeError as ex:
            return {
                "error": f"Falha ao interpretar resposta do modelo: {str(ex)}",
                "raw_text": raw_response
            }

    def audit_post(
        self,
        post_text: str,
        engine: str = "Groq",
        model: Optional[str] = None
    ) -> Dict[str, Any]:
        """Audita um post e retorna score viral, força do gancho e melhorias."""
        temporal_context = get_current_datetime_context()
        system_prompt = f"Você é um auditor especialista em viralidade e engajamento no LinkedIn. Data e horário atual de referência: {temporal_context}. Responda exclusivamente em JSON válido."
        user_prompt = f"""Analise este post para LinkedIn e avalie seu potencial de engajamento:
---
{post_text}
---
Retorne exclusivamente o JSON no formato:
{{
  "virality_score": 88,
  "hook_strength": "Forte",
  "read_time": "1 min",
  "strengths": ["Abertura direta", "Storytelling pessoal"],
  "improvements": ["Adicionar pergunta final", "Diminuir o 3º parágrafo"],
  "optimized_hook": "Gancho reescrito de impacto máximo",
  "diagnostico": "Resumo do impacto do post"
}}"""
        raw = LLMClient.call_llm(prompt=user_prompt, system_prompt=system_prompt, engine=engine, model=model, temperature=0.4)
        
        import re
        match = re.search(r'(\{[\s\S]*\})', raw)
        clean = match.group(1).strip() if match else raw.strip()
        if clean.startswith("```json"): clean = clean[7:]
        if clean.startswith("```"): clean = clean[3:]
        if clean.endswith("```"): clean = clean[:-3]
        
        try:
            return json.loads(clean.strip())
        except Exception:
            return {
                "virality_score": 85,
                "hook_strength": "Médio",
                "read_time": "1 min",
                "strengths": ["Tema relevante para o público"],
                "improvements": ["Usar ganchos mais contraintuitivos"],
                "optimized_hook": "Gancho otimizado para o seu tema",
                "diagnostico": "Post com boa base técnica e potencial de discussão."
            }

    def generate_carousel(
        self,
        topic: str,
        num_slides: int = 5,
        engine: str = "Groq",
        model: Optional[str] = None
    ) -> Dict[str, Any]:
        """Gera roteiro completo de carrossel para LinkedIn."""
        temporal_context = get_current_datetime_context()
        system_prompt = f"Você é especialista em carrosséis virais de alto engajamento no LinkedIn. Data de referência atual: {temporal_context}. Responda exclusivamente em JSON."
        user_prompt = f"""Crie um carrossel de {num_slides} slides sobre o tema: '{topic}'.
Retorne exclusivamente o JSON:
{{
  "title": "Título do Carrossel",
  "total_slides": {num_slides},
  "slides": [
    {{"slide_num": 1, "title": "Slide de Capa (Gancho)", "content": "Texto chamativo", "visual_hint": "Dica visual"}},
    {{"slide_num": 2, "title": "Slide 2", "content": "Ponto 1", "visual_hint": "Dica visual"}},
    {{"slide_num": 3, "title": "Slide 3", "content": "Ponto 2", "visual_hint": "Dica visual"}},
    {{"slide_num": 4, "title": "Slide 4", "content": "Ponto 3", "visual_hint": "Dica visual"}},
    {{"slide_num": 5, "title": "Slide Final (CTA)", "content": "Chamada para ação", "visual_hint": "Dica visual"}}
  ],
  "hashtags": ["#Tag1", "#Tag2", "#Tag3"]
}}"""
        raw = LLMClient.call_llm(prompt=user_prompt, system_prompt=system_prompt, engine=engine, model=model, temperature=0.6)
        
        import re
        match = re.search(r'(\{[\s\S]*\})', raw)
        clean = match.group(1).strip() if match else raw.strip()
        if clean.startswith("```json"): clean = clean[7:]
        if clean.startswith("```"): clean = clean[3:]
        if clean.endswith("```"): clean = clean[:-3]
        
        try:
            return json.loads(clean.strip())
        except Exception:
            return {
                "title": f"Carrossel: {topic}",
                "total_slides": 5,
                "slides": [
                    {"slide_num": 1, "title": f"O Guia Definitivo: {topic}", "content": "Descubra o que a maioria não percebe.", "visual_hint": "Fundo contrastante com tipografia grande"},
                    {"slide_num": 2, "title": "1. O Erro Comum", "content": "Tentar fazer tudo manualmente sem automação.", "visual_hint": "Ícone de alerta com dados"},
                    {"slide_num": 3, "title": "2. O Ponto de Virada", "content": "Conectar IA com APIs e processos estruturados.", "visual_hint": "Diagrama de fluxo simples"},
                    {"slide_num": 4, "title": "3. O Resultado Real", "content": "Mais velocidade, governança e autoridade.", "visual_hint": "Gráfico de crescimento"},
                    {"slide_num": 5, "title": "Qual o seu próximo passo?", "content": "Deixe sua opinião nos comentários e salve para consultar depois.", "visual_hint": "Seta de salvar e perfil"}
                ],
                "hashtags": ["#Tech", "#Inovacao", "#Carreira"]
            }

    def interact_chat(
        self,
        messages: List[Dict[str, str]],
        engine: str = "Groq",
        model: Optional[str] = None,
        api_key: Optional[str] = None
    ) -> Dict[str, Any]:
        """Interage de forma conversacional natural e gera post apenas quando o usuário pedir."""
        temporal_context = get_current_datetime_context()
        system_prompt = f"""Você é o Especialista Estratégico em Conteúdo Viral e Autoridade Técnica para o LinkedIn.
Seu objetivo é ajudar o usuário a construir autoridade sólida, alto engajamento e gerar conexões de alto valor na rede.

CONTEXTO TEMPORAL OBRIGATÓRIO (ÂNCORA FACTUAL EM TEMPO REAL):
- {temporal_context}.
- Você DEVE obrigatoriamente utilizar datas, dias da semana e horários atuais reais (ano de 2026). Hoje é exatamente {temporal_context}.
- Quando o usuário perguntar sobre a data de hoje, dia da semana, calendário de publicações, planejamento de posts ou tendências atuais de mercado, responda sempre com precisão absoluta com base nesta data e horário ({temporal_context}).
- NUNCA se refira a anos anteriores (como 2023, 2024 ou 2025) como presentes; o presente é 2026.

DIRETRIZES FUNDAMENTAIS DE COMPORTAMENTO:
1. INTERAÇÃO E CONVERSAÇÃO NATURAL (MODO PADRÃO):
- Se o usuário estiver apenas conversando (ex: cumprimentando como "oi", "tudo bem?", fazendo perguntas sobre boas práticas no LinkedIn, pedindo sugestões de temas ou trocando ideias), responda com um diálogo natural, prestativo, inteligente e consultivo em português do Brasil.
- Dê insights, responda dúvidas e faça perguntas instigantes sobre a carreira ou projetos dele.
- NUNCA gere um post completo de forma precipitada sem que o usuário peça. Converse primeiro, refine a ideia e pergunte gentilmente se ele quer que você escreva o post.

2. GERAÇÃO DE POST COMPLETO (APENAS QUANDO O USUÁRIO PEDIR):
- Se o usuário pedir expressamente para criar, gerar, escrever ou redigir um post (ex: "Gere o post", "Crie um post sobre...", "Escreva um post...", "Gere com essa ideia", "Faça um post"), aí sim elabore um post de alto impacto:
  * Gancho (Hook) magnético de 1 a 2 linhas que prenda a atenção antes do botão 'Ver mais';
  * Corpo dinâmico com quebras de linha elegantes, parágrafos curtos e lições práticas ou storytelling;
  * Pergunta reflexiva no final para puxar comentários;
  * 3 a 5 hashtags estratégicas no final.
- REGRA TÉCNICA OBRIGATÓRIA: Sempre que você gerar um post final, envolva o texto EXATO do post entre as tags <LINKEDIN_POST> e </LINKEDIN_POST>. Qualquer comentário, dica de publicação ou introdução sua deve vir ANTES ou DEPOIS dessa tag. Isso permite que a interface ofereça ao usuário os botões de Copiar e Publicar no LinkedIn!"""

        raw_reply = LLMClient.call_chat_llm(
            messages=messages,
            system_prompt=system_prompt,
            engine=engine,
            model=model,
            api_key=api_key,
            temperature=0.7
        )

        if "<think>" in raw_reply and "</think>" in raw_reply:
            raw_reply = raw_reply.split("</think>", 1)[1].strip()

        is_post = False
        post_content = None
        display_text = raw_reply

        import re
        match = re.search(r'<LINKEDIN_POST>([\s\S]*?)</LINKEDIN_POST>', raw_reply, re.IGNORECASE)
        if match:
            is_post = True
            post_content = match.group(1).strip()
            display_text = raw_reply.replace(match.group(0), post_content).strip()
        else:
            # Heurística caso o modelo tenha redigido um post completo diretamente em resposta a um comando claro de escrita
            last_user_msg = messages[-1].get("content", "").lower() if messages else ""
            wants_post = any(kw in last_user_msg for kw in ["crie um post", "gere um post", "escreva um post", "faça um post", "faca um post", "redija um post", "gere o post", "escreva o post"])
            if wants_post and ("#" in raw_reply and ("\n" in raw_reply)):
                is_post = True
                post_content = raw_reply

        return {
            "response": raw_reply,
            "display_text": display_text,
            "is_post": is_post,
            "post_content": post_content
        }

agent_instance = LinkedInViralContentAI()

def get_agent() -> LinkedInViralContentAI:
    return agent_instance
