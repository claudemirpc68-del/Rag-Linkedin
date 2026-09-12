# LinkedIn Viral Content AI — Estado do Projeto & Documentação Completa

**Data de Atualização:** 12 de Setembro de 2026  
**Autor/Proprietário:** Claudemir Pedroso Cubas  
**Repositório/Workspace:** `c:\Users\FAMÍLIA\Desktop\RAG_LINKEDIN`  
**Porta Padrão Local:** `http://127.0.0.1:3000`

---

## 1. Visão Geral e Propósito do Sistema

O **LinkedIn Viral Content AI** é um ecossistema full-stack de alta performance projetado para construir autoridade técnica e impulsionar o engajamento no LinkedIn através de:
1. **Inteligência Artificial Multi-Perspectiva:** Geração de conteúdo otimista, crítico e pragmático orientado pelo algoritmo de engajamento da rede.
2. **RAG Oficial do LinkedIn:** Base vetorial FAISS indexada com a documentação oficial do LinkedIn Marketing Developer Platform (Restli 2.0.0, Images API e Posts API).
3. **Frontend React 18 + Vite (Design Lovable Dark Mode):** Interface idêntica à especificação visual dark mode, com sidebar de navegação, badge do autor (`Claudemir Pedroso Cubas`), menus contextuais e 8 módulos completos.
4. **Interação Conversacional Natural com Geração Sob Demanda:** O assistente de IA dialoga naturalmente, responde dúvidas e faz consultoria de carreira/posicionamento. Ele gera posts estruturados e exibe a barra de publicação rápida (*Copiar* / *LinkedIn*) **exclusivamente** quando solicitado pelo usuário.
5. **Automação de Publicação Segura:** Integração direta com a API oficial do LinkedIn (`/rest/posts` e `/rest/images`), alternando entre os modos **Simulação** (segurança e testes) e **Live** (publicação real com verificação de URN).

---

## 2. Arquitetura e Estrutura de Diretórios

```
RAG_LINKEDIN/
├── agent_core.py             # Núcleo de IA (Groq / OpenRouter, RAG prompt, chat conversacional)
├── app.py                    # Servidor FastAPI com rotas REST e SPA fallback
├── config.py                 # Gestão de variáveis de ambiente e caminhos base
├── linkedin_client.py        # Cliente oficial da API do LinkedIn (OAuth, Upload, Post)
├── rag_engine.py             # Indexação e busca vetorial FAISS com embeddings locais
├── quick_test.py             # Teste de validação rápida do RAG e LLM
├── test_system.py            # Suite de testes dos endpoints e fluxos
├── ESTADO_PROJETO.md         # Documentação e rastreabilidade deste projeto
├── .env                      # Credenciais locais (chaves Groq, OpenRouter, LinkedIn)
├── .gitignore                # Regras de exclusão de artefatos temporários e dependências
│
├── frontend/                 # Aplicação React 18 + Vite + Tailwind + shadcn/ui
│   ├── src/
│   │   ├── components/
│   │   │   ├── chat/         # ChatInterface, ChatMessage, PostActionBar, ChatSuggestions
│   │   │   ├── layout/       # Sidebar (Dark mode com autor), AppLayout
│   │   │   └── ui/           # Componentes Radix UI / shadcn
│   │   ├── pages/            # 8 páginas operacionais
│   │   │   ├── Dashboard.tsx # Métricas, gráficos e ações rápidas
│   │   │   ├── Chat.tsx      # Chat consultivo com assistente viral
│   │   │   ├── Templates.tsx # Biblioteca de templates filtráveis
│   │   │   ├── Analyze.tsx   # Auditoria de posts com score e dicas
│   │   │   ├── Carousel.tsx  # Gerador de carrosséis em slides
│   │   │   ├── Calendar.tsx  # Planejamento de publicações com visualização em grid
│   │   │   ├── Gallery.tsx   # Histórico de posts gerados com tags
│   │   │   └── LinkedIn.tsx  # Painel de autorização OAuth e status da API
│   │   └── types/            # Definições TypeScript (Message, Post, Template, etc.)
│   └── dist/                 # Build de produção servido diretamente pelo FastAPI
│
└── static/                   # Frontend estático leve legada / fallback
```

---

## 3. Módulos e Páginas do Sistema

| Rota Frontend | Módulo | Descrição & Funcionalidades |
|---|---|---|
| `/` | **Dashboard** | Visão geral de métricas virais, histórico de posts, atalhos rápidos e status de conexões. |
| `/chat` | **Chat Estratégico** | Conversação natural com a IA, histórico salvo no `localStorage`, geração de post sob demanda e barra de ação (*Copiar* e *LinkedIn*). |
| `/templates` | **Templates** | Biblioteca de estruturas de posts (Storytelling, Contrário, Lista, Antes/Depois, etc.) com filtros por categoria. |
| `/analyze` | **Análise de Post** | Auditoria de ganchos virais, tempo de leitura, cálculo de score e sugestão de melhorias. |
| `/carousel` | **Carrossel** | Roteirização de slides para carrosséis em formato PDF/imagem para o LinkedIn. |
| `/calendar` | **Calendário** | Agendamento visual e planejamento de linha editorial. |
| `/gallery` | **Galeria** | Repositório de posts gerados e salvos para reutilização. |
| `/linkedin` | **Publicar no LinkedIn** | Verificação de token de acesso, URN do autor, modo Simulação vs. Modo Live e logs de publicação. |

---

## 4. Endpoints REST da API FastAPI (`app.py`)

- `POST /api/chat`: Recebe a lista de mensagens multi-turno `[{"role": "user"|"assistant", "content": "..."}]` e processa a resposta conversacional. Quando envolve tendências/notícias, dispara pesquisa web com grounding em tempo real. Retorna `{ response, display_text, is_post: bool, post_content: Optional[str], verified_sources: List[Dict] }`.
- `POST /api/research`: Endpoint dedicado de pesquisa web e extração de notícias/estatísticas reais. Integra Tavily AI Search + scraping de feed da Revista Olhar Digital Online e fallback para Google News RSS.
- `POST /api/generate`: Gera o pacote triplo de perspectivas (Otimista, Crítica e Pragmática) com ganchos, prompts de imagem e recomendações algorítmicas fundamentadas em dados reais.
- `POST /api/publish`: Publica o comentário/post no LinkedIn via API oficial ou em modo de simulação.
- `POST /api/upload-image`: Realiza o upload de mídia para registro de URN na API de Imagens do LinkedIn.
- `POST /api/rag-query`: Consulta semântica de tópicos na documentação oficial indexada via FAISS.
- `GET /api/status`: Retorna o status de conexão com Groq, OpenRouter, LinkedIn e índice vetorial.
- `POST /api/config`: Atualiza dinamicamente as chaves e modelos no arquivo `.env`.
- `GET /auth/linkedin`: Inicia o fluxo de autorização OAuth 2.0.
- `GET /callback`: Processa o código retornado pelo LinkedIn e armazena o access token.
- `GET /{full_path:path}`: Roteamento SPA inteligente para servir `frontend/dist/index.html`.

---

## 5. Como Executar o Projeto

### Backend (FastAPI + Uvicorn)
```powershell
python -m uvicorn app:app --host 127.0.0.1 --port 3000
```

### Compilação do Frontend (Vite)
Se houver alterações no código fonte dentro de `frontend/src`:
```powershell
cd frontend
node ./node_modules/vite/bin/vite.js build
```

---

## 6. Histórico de Versões & Melhorias Recentes

- **v1.0:** RAG local com documentação oficial do LinkedIn e geração de 3 perspectivas.
- **v1.5:** Integração OAuth 2.0 com LinkedIn Developer API e upload de imagens.
- **v2.0:** Migração completa para o design system Lovable Dark Mode (React 18, Vite, Lucide Icons, shadcn/ui).
- **v2.1:** Remoção de botões desnecessários na barra de ações dos posts, mantendo exclusivamente **Copiar** e **LinkedIn**.
- **v2.2:** Ajuste do comportamento do agente conversacional para interação natural e geração de post exclusivamente sob demanda explícita.
- **v2.3:** Correção da navegação na sidebar (desacoplamento Dashboard/Chat com espaçamento suave), resiliência e fallback offline local no calendário e histórico (sem erros de Supabase), remoção do badge Lovable e script de auditoria integral automatizada (30/30 testes aprovados).
- **v2.4 (12/09/2026):** Enriquecimento cromático do Calendário (chips por categoria, status dots, legenda de cores, destaque vibrante do dia atual e bordas temáticas nos próximos posts), âncora factual em tempo real (data dinâmica, Sábado, 12/09/2026, ano corrente 2026 e horário local em todos os prompts da LLM) e estabilização completa da barra de rolagem (eliminação de loop de re-renders no `useLocalStorage`, scroll inteligente sob demanda no chat, contenção `overscroll-contain` e `scroll-behavior: auto !important`).
- **v2.5 (12/09/2026):** **Pesquisa em Tempo Real, Grounding Anti-Alucinação & Curadoria de Fontes Especializadas:**
  - **Tavily AI Search Engine (`web_search_engine.py`):** Motor de pesquisa avançado com extração profunda, síntese executiva factual e auditoria de fontes reais.
  - **Curadoria Equilibrada (Rigor Científico + Prática de Mercado):**
    - *Revistas Acadêmicas:* JMLR (Journal of Machine Learning Research), TECCOGS (Revista de Tecnologias Cognitivas - PUC-SP) e Springer / Nature Machine Intelligence.
    - *Portais Técnicos de Mercado:* Destaque imperativo para a **Revista Olhar Digital Online** (com leitor RSS nativo em tempo real para breaking news do Brasil), além de MIT Technology Review, Wired e AIemBrasil.
  - **Diretriz Inegociável Anti-Alucinação:** Proibição estrita de estatísticas inventadas; citação obrigatória de veículos e estudos verificados.
  - **Frontend Grounding Badges:** Exibição de chips de "Fontes Verificadas" com links auditáveis nas respostas do chat.
