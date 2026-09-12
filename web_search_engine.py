"""
Módulo de Pesquisa e Web Scraping em Tempo Real para o LinkedIn Viral Content AI.
Utiliza Tavily AI Search como motor prioritário de alta precisão (IA grounding com fontes auditáveis),
com fallback inteligente para Google News RSS e DuckDuckGo + BeautifulSoup.
"""
import os
import re
import urllib.parse
import requests
import bs4
import feedparser
from datetime import datetime
from typing import List, Dict, Any, Optional

from config import TAVILY_API_KEY, TECH_SEARCH_DOMAINS, TRUSTED_TECH_SOURCES

SIMPLE_USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

def search_tavily(query: str, max_results: int = 5, include_domains: Optional[List[str]] = None) -> Optional[Dict[str, Any]]:
    """Pesquisa via Tavily AI Search (extração profunda, resposta analítica e fontes auditáveis)."""
    api_key = os.getenv("TAVILY_API_KEY", "") or TAVILY_API_KEY
    if not api_key:
        return None

    try:
        url = "https://api.tavily.com/search"
        payload = {
            "api_key": api_key,
            "query": query,
            "search_depth": "advanced",
            "include_answer": True,
            "include_raw_content": False,
            "max_results": max_results
        }
        if include_domains:
            payload["include_domains"] = include_domains

        resp = requests.post(url, json=payload, timeout=15)
        if resp.status_code == 200:
            data = resp.json()
            sources = []
            for r in data.get("results", []):
                domain = urllib.parse.urlparse(r.get("url", "")).netloc.replace("www.", "")
                content_text = r.get("content", "").strip()
                
                # Identifica se é fonte prioritária (Olhar Digital, MIT Tech Review, Wired, Springer, JMLR, etc.)
                source_label = domain
                if "olhardigital" in domain:
                    source_label = "Revista Olhar Digital Online"
                elif "technologyreview" in domain or "mittechreview" in domain:
                    source_label = "MIT Technology Review"
                elif "wired" in domain:
                    source_label = "Wired"
                elif "springer" in domain or "nature" in domain:
                    source_label = "Springer / Nature Science"
                elif "jmlr" in domain:
                    source_label = "JMLR (Journal of Machine Learning Research)"
                elif "pucsp" in domain or "teccogs" in domain:
                    source_label = "TECCOGS (Revista de Tecnologias Cognitivas)"
                elif "aiembrasil" in domain:
                    source_label = "AIemBrasil"

                # Extrai trechos com métricas numéricas se existirem
                metric_lines = []
                for line in content_text.split("."):
                    if any(c in line for c in ["%", "R$", "$", "cresceu", "subiu", "aumentou", "caiu"]):
                        if len(line.strip()) > 30:
                            metric_lines.append(line.strip())

                sources.append({
                    "title": r.get("title", ""),
                    "source": source_label,
                    "published": "Tempo Real (2026)",
                    "url": r.get("url", ""),
                    "paragraphs": [content_text] if content_text else [],
                    "metrics": metric_lines[:3]
                })

            return {
                "engine": "Tavily AI Search",
                "answer": data.get("answer", ""),
                "sources": sources
            }
        else:
            print(f"[TAVILY] Status {resp.status_code}: {resp.text}", flush=True)
    except Exception as ex:
        print(f"[TAVILY] Erro de conexão com Tavily: {ex}", flush=True)

    return None

def search_google_news(query: str, max_results: int = 5) -> List[Dict[str, Any]]:
    """Busca notícias recentes em tempo real no Google News RSS Brasil."""
    results = []
    try:
        encoded_query = urllib.parse.quote(query)
        rss_url = f"https://news.google.com/rss/search?q={encoded_query}&hl=pt-BR&gl=BR&ceid=BR:pt-419"
        feed = feedparser.parse(rss_url)
        
        for entry in feed.entries[:max_results]:
            raw_title = entry.title if hasattr(entry, 'title') else ''
            clean_title = re.sub(r'<[^>]+>', '', raw_title)
            
            source_name = "Notícia Oficial"
            if " - " in clean_title:
                parts = clean_title.rsplit(" - ", 1)
                clean_title = parts[0].strip()
                source_name = parts[1].strip()
            
            pub_date = entry.published if hasattr(entry, 'published') else ''
            link = entry.link if hasattr(entry, 'link') else ''
            summary = re.sub(r'<[^>]+>', '', entry.summary) if hasattr(entry, 'summary') else ''

            results.append({
                "title": clean_title,
                "source": source_name,
                "published": pub_date,
                "link": link,
                "snippet": summary or clean_title,
                "type": "news"
            })
    except Exception as ex:
        print(f"[SEARCH] Erro no Google News: {ex}", flush=True)

    return results

def search_duckduckgo_web(query: str, max_results: int = 5) -> List[Dict[str, Any]]:
    """Busca artigos técnicos e análises no DuckDuckGo HTML."""
    results = []
    try:
        url = "https://html.duckduckgo.com/html/"
        headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
        resp = requests.post(url, data={"q": query}, headers=headers, timeout=10)
        
        if resp.status_code == 200:
            soup = bs4.BeautifulSoup(resp.text, "html.parser")
            items = soup.find_all("div", class_="result")
            for item in items:
                title_el = item.find("a", class_="result__a")
                snippet_el = item.find("a", class_="result__snippet")
                if title_el and title_el.get("href"):
                    raw_link = title_el.get("href")
                    actual_url = raw_link
                    if "uddg=" in raw_link:
                        match = re.search(r"uddg=([^&]+)", raw_link)
                        if match:
                            actual_url = urllib.parse.unquote(match.group(1))

                    domain = urllib.parse.urlparse(actual_url).netloc.replace("www.", "")
                    title_text = title_el.get_text().strip()
                    snippet_text = snippet_el.get_text().strip() if snippet_el else ""

                    results.append({
                        "title": title_text,
                        "source": domain,
                        "published": "Recente (2026)",
                        "link": actual_url,
                        "snippet": snippet_text,
                        "type": "web"
                    })
                    if len(results) >= max_results:
                        break
    except Exception as ex:
        print(f"[SEARCH] Erro no DuckDuckGo: {ex}", flush=True)

    return results

def scrape_article_content(url: str, max_paragraphs: int = 5) -> Dict[str, Any]:
    """Extrai parágrafos textuais e números/estatísticas de um artigo web direto."""
    if "news.google.com/rss/articles" in url:
        return {"success": False, "paragraphs": [], "metrics": []}

    try:
        headers = {"User-Agent": SIMPLE_USER_AGENT}
        resp = requests.get(url, headers=headers, timeout=8, allow_redirects=True)
        if resp.status_code == 200:
            soup = bs4.BeautifulSoup(resp.text, "html.parser")
            for tag in soup(["script", "style", "nav", "header", "footer", "aside"]):
                tag.decompose()
            
            paragraphs = []
            metrics = []
            metric_pattern = re.compile(r'(\d+[\.,]?\d*\s*%)|(\b(subiu|cresceu|aumentou|caiu|reduziu)\b[^\.\n]+)|(R\$\s*\d+|\$\s*\d+)', re.IGNORECASE)

            for p in soup.find_all("p"):
                txt = p.get_text().strip()
                if len(txt) > 70 and not any(skip in txt.lower() for skip in ["cookies", "privacidade", "termos de uso", "assine"]):
                    paragraphs.append(txt)
                    if metric_pattern.search(txt):
                        metrics.append(txt)
                if len(paragraphs) >= max_paragraphs:
                    break
            
            return {
                "success": len(paragraphs) > 0,
                "paragraphs": paragraphs,
                "metrics": metrics[:3]
            }
    except Exception:
        pass
    
    return {"success": False, "paragraphs": [], "metrics": []}

def fetch_olhar_digital_rss(query: Optional[str] = None, max_items: int = 2) -> List[Dict[str, Any]]:
    """Obtém artigos e notícias em tempo real diretamente da Revista Olhar Digital Online via feed oficial."""
    items = []
    try:
        feed = feedparser.parse("https://olhardigital.com.br/feed/")
        for entry in feed.entries:
            title = entry.title if hasattr(entry, 'title') else ''
            link = entry.link if hasattr(entry, 'link') else ''
            pub_date = entry.published if hasattr(entry, 'published') else 'Tempo Real (12/09/2026)'
            summary = re.sub(r'<[^>]+>', '', entry.summary) if hasattr(entry, 'summary') else ''

            if query:
                q_words = [w.lower() for w in query.split() if len(w) > 3]
                match_count = sum(1 for w in q_words if w in title.lower() or w in summary.lower())
                is_general_tech = any(kw in query.lower() for kw in ["ia", "inteligência", "inteligencia", "tecnologia", "tech", "ti", "mercado"])
                if q_words and match_count == 0 and not is_general_tech:
                    continue

            scraped = scrape_article_content(link, max_paragraphs=3)
            paragraphs = scraped.get("paragraphs", [])
            if not paragraphs and summary:
                paragraphs = [summary]

            items.append({
                "title": title,
                "source": "Revista Olhar Digital Online",
                "published": pub_date,
                "url": link,
                "paragraphs": paragraphs,
                "metrics": scraped.get("metrics", [])
            })
            if len(items) >= max_items:
                break
    except Exception as ex:
        print(f"[OLHAR_DIGITAL] Erro ao ler feed: {ex}", flush=True)

    return items

def research_topic_trends(topic: str, max_sources: int = 5) -> Dict[str, Any]:
    """
    Executa pesquisa e scraping em tempo real:
    1. Prioridade: Tavily AI Search (focado nas autoridades técnicas: Olhar Digital, MIT Tech Review, Wired, JMLR, TECCOGS, Springer).
    2. Scraping direto: Feed RSS em tempo real da Revista Olhar Digital Online.
    3. Fallback: Google News RSS + DuckDuckGo + BeautifulSoup scraping local.
    Retorna fontes auditáveis e o bloco consolidado de dados reais para injeção no LLM.
    """
    now = datetime.now()
    engine_used = "Tavily AI Search"
    tavily_answer = ""
    processed_sources = []

    is_tech_topic = any(kw in topic.lower() for kw in [
        "ia", "inteligência artificial", "inteligencia artificial", "ti", "tech", "tecnologia",
        "machine learning", "deep learning", "agente", "llm", "software", "desenvolvimento",
        "dados", "futuro do trabalho", "carreira", "prompt"
    ])

    # 1. Se for tema de IA/TI, busca prioritária com domínios autoritativos no Tavily
    if is_tech_topic:
        tavily_tech = search_tavily(f"{topic} 2026", max_results=3, include_domains=TECH_SEARCH_DOMAINS)
        if tavily_tech and tavily_tech.get("sources"):
            for s in tavily_tech["sources"]:
                processed_sources.append(s)
            tavily_answer = tavily_tech.get("answer", "")
            engine_used = "Tavily AI Search (Portais Técnicos & Revistas Acadêmicas)"

        # Extrai artigo fresco em tempo real da Revista Olhar Digital Online
        od_posts = fetch_olhar_digital_rss(topic, max_items=2)
        for od in od_posts:
            if not any(od["url"] == s.get("url") for s in processed_sources):
                processed_sources.insert(0, od)

    # 2. Se ainda precisar de mais fontes ou não for estritamente de tech, busca ampla no Tavily
    if len(processed_sources) < max_sources:
        tavily_result = search_tavily(f"{topic} 2026", max_results=max_sources - len(processed_sources))
        if not tavily_result or not tavily_result.get("sources"):
            tavily_result = search_tavily(topic, max_results=max_sources - len(processed_sources))

        if tavily_result and tavily_result.get("sources"):
            for s in tavily_result["sources"]:
                if not any(s["url"] == ps.get("url") for ps in processed_sources):
                    processed_sources.append(s)
            if not tavily_answer:
                tavily_answer = tavily_result.get("answer", "")

    # 3. Fallback se Tavily não retornar nada: Google News + DuckDuckGo
    if not processed_sources:
        engine_used = "Google News & Web Scraper"
        news_results = search_google_news(f"{topic} 2026", max_results=3)
        if not news_results:
            news_results = search_google_news(topic, max_results=3)
        web_results = search_duckduckgo_web(f"{topic} 2026", max_results=3)

        combined_results = news_results + web_results
        seen_titles = set()
        for res in combined_results:
            clean_key = res["title"][:30].lower()
            if clean_key in seen_titles:
                continue
            seen_titles.add(clean_key)

            scraped = scrape_article_content(res["link"], max_paragraphs=3)
            paragraphs = scraped.get("paragraphs", [])
            if not paragraphs and res.get("snippet"):
                paragraphs = [res["snippet"]]

            processed_sources.append({
                "title": res["title"],
                "source": res["source"],
                "published": res["published"],
                "url": res["link"],
                "paragraphs": paragraphs,
                "metrics": scraped.get("metrics", [])
            })
            if len(processed_sources) >= max_sources:
                break

    # Monta o contexto textual para o prompt da IA
    lines = [
        f"=== DADOS FACTUAIS E TENDÊNCIAS EM TEMPO REAL ({engine_used} — {now.strftime('%d/%m/%Y')} às {now.strftime('%H:%M')}) ===",
        "\nDIRETRIZ DE CURADORIA DE FONTES (RIGOR CIENTÍFICO + VISÃO DE MERCADO):",
        "• Portais Técnicos de Mercado: Revista Olhar Digital Online (obrigatoriamente destacada como referência de tecnologia no Brasil), MIT Technology Review, Wired e AIemBrasil.",
        "• Revistas Acadêmicas (Rigor Científico): JMLR (Journal of Machine Learning Research), TECCOGS (PUC-SP) e Springer / Nature Machine Intelligence."
    ]

    if tavily_answer:
        lines.append(f"\nSÍNTESE EXECUTIVA DOS FATOS:\n{tavily_answer}\n")

    if not processed_sources:
        lines.append("Aviso: Nenhuma notícia factual encontrada para este termo exato. Baseie-se em conceitos técnicos consolidados sem inventar percentuais fictícios.")
    else:
        for i, s in enumerate(processed_sources, 1):
            lines.append(f"\n[FONTE {i}]: {s['title']}")
            lines.append(f"  • Veículo/Autoridade: {s['source']}")
            lines.append(f"  • Data/Referência: {s['published']}")
            lines.append(f"  • URL Verificada: {s['url']}")
            if s.get("metrics"):
                lines.append(f"  • Dados/Métricas Identificados:")
                for m in s["metrics"]:
                    lines.append(f"    - \"{m}\"")
            lines.append(f"  • Trechos Reais do Conteúdo:")
            for p in s["paragraphs"][:2]:
                lines.append(f"    > {p}")

    lines.append("\n" + "="*70)
    lines.append("DIRETRIZ INEGOCIÁVEL DE INTEGRIDADE JORNALÍSTICA E TÉCNICA (ANTI-FALSA ATRIBUIÇÃO):")
    lines.append("1. É ESTRITAMENTE PROIBIDO INVENTAR ESTATÍSTICAS, NOTÍCIAS OU DADOS FICTÍCIOS.")
    lines.append("2. PROIBIÇÃO DE FALSA ATRIBUIÇÃO: NUNCA afirme que um veículo (ex: Olhar Digital, Wired, etc.) publicou algo a menos que o fato esteja literalmente contido nos trechos raspados acima.")
    lines.append("3. Se você citar números, percentuais ou pesquisas, utilize OBRIGATORIAMENTE os dados extraídos das fontes reais acima.")
    lines.append("4. Distinga rigorosamente: Artigo Acadêmico (conceitual/metodológico) NÃO É reportagem jornalística de portal.")
    lines.append("="*70)

    compiled_context = "\n".join(lines)

    return {
        "topic": topic,
        "engine": engine_used,
        "searched_at": now.strftime("%Y-%m-%d %H:%M:%S"),
        "tavily_answer": tavily_answer,
        "total_sources": len(processed_sources),
        "sources": processed_sources,
        "compiled_context": compiled_context
    }

if __name__ == "__main__":
    print("Testando pesquisa com Tavily AI Search...")
    relatorio = research_topic_trends("IA generativa mercado de trabalho Brasil")
    print(f"Motor: {relatorio['engine']}")
    print(relatorio["compiled_context"])
