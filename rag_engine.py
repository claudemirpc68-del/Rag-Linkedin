"""
Mecanismo de RAG (Retrieval-Augmented Generation) para documentação oficial da API LinkedIn.
Utiliza FastEmbed (BAAI/bge-small-en-v1.5) e FAISS em memória.
Totalmente imune a problemas de encoding de caminhos no Windows (ex: acentos em nomes de usuários).
"""
from typing import List, Dict, Any, Optional

from langchain_community.vectorstores import FAISS
from langchain_community.embeddings.fastembed import FastEmbedEmbeddings
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter

CORE_LINKEDIN_DOCS = [
    Document(
        page_content="""LinkedIn Marketing Developer Platform - Versioned APIs and Headers
LinkedIn continuously improves our products, which means our APIs also evolve. We want our API partners to trust in stable integrations and reliable change schedules.
HTTP headers are used for clients to indicate which API version implementation they expect.
Include a request header with the key 'Linkedin-Version' and set the value to the version (format: YYYYMM) to correspond with the documentation version you are referencing. Example: 'Linkedin-Version: 202602'.
Clients must also pass the header 'X-Restli-Protocol-Version: 2.0.0' for all REST calls.""",
        metadata={"page": 32, "source": "LinkedIn Marketing Developer Platform (PDF)"}
    ),
    Document(
        page_content="""Posts API - Overview and Permissions
The Posts API allows member-authenticated applications and organization administrators to create, read, and manage organic and sponsored posts on LinkedIn.
Endpoint: POST https://api.linkedin.com/rest/posts
Permissions:
- w_member_social: Post, comment, and like posts on behalf of an authenticated member.
- w_organization_social: Post, comment, and like posts on behalf of an organization. Restricted to organizations where the authenticated member has one of the following company page roles: ADMINISTRATOR, DIRECT_SPONSORED_CONTENT_POSTER, CONTENT_ADMIN.
- r_organization_social: Retrieve organization posts, comments, and analytics.""",
        metadata={"page": 957, "source": "LinkedIn Marketing Developer Platform (PDF)"}
    ),
    Document(
        page_content="""Posts API - JSON Payload Schema
To create a post on LinkedIn via the REST API:
{
  "author": "urn:li:person:{personId}" or "urn:li:organization:{organizationId}",
  "commentary": "Your post content with hashtags and emojis",
  "visibility": "PUBLIC" or "CONNECTIONS",
  "distribution": {
    "feedDistribution": "MAIN_FEED",
    "targetEntities": [],
    "thirdPartyDistributionChannels": []
  },
  "lifecycleState": "PUBLISHED",
  "isReshareDisabledByAuthor": false
}
Response: HTTP 201 Created with Header 'x-restli-id: urn:li:share:{shareId}'.""",
        metadata={"page": 958, "source": "LinkedIn Marketing Developer Platform (PDF)"}
    ),
    Document(
        page_content="""OAuth 2.0 Authorization Code Flow
LinkedIn uses OAuth 2.0 for authorization. The authorization code flow consists of:
1. Authorization URL: https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id={CLIENT_ID}&redirect_uri={REDIRECT_URI}&scope=w_member_social%20r_basicprofile
2. Token Exchange: POST https://www.linkedin.com/oauth/v2/accessToken
Parameters: grant_type=authorization_code, code={CODE}, redirect_uri={REDIRECT_URI}, client_id={CLIENT_ID}, client_secret={CLIENT_SECRET}.
Response: { "access_token": "AQX...", "expires_in": 5184000 }.""",
        metadata={"page": 43, "source": "LinkedIn Marketing Developer Platform (PDF)"}
    ),
    Document(
        page_content="""Images and Videos Media Upload API
To publish posts containing images or videos:
1. Initialize Upload: POST https://api.linkedin.com/rest/images?action=initializeUpload
Payload: { "initializeUploadRequest": { "owner": "urn:li:person:{id}" } }
Response includes 'uploadUrl' and 'image' URN (e.g. urn:li:image:{id}).
2. Upload Media Binary via PUT to 'uploadUrl'.
3. Attach media to post: Inside 'content': { 'media': { 'title': 'Title', 'id': 'urn:li:image:{id}' } }.""",
        metadata={"page": 462, "source": "LinkedIn Marketing Developer Platform (PDF)"}
    )
]

class LinkedInRAGEngine:
    def __init__(self):
        print("[RAG] Inicializando FastEmbed embeddings...", flush=True)
        self.embeddings = FastEmbedEmbeddings(model_name="BAAI/bge-small-en-v1.5")
        self.vector_store: Optional[FAISS] = None
        self.build_index()

    def build_index(self):
        docs = list(CORE_LINKEDIN_DOCS)
        splitter = RecursiveCharacterTextSplitter(chunk_size=800, chunk_overlap=100)
        chunks = splitter.split_documents(docs)

        print("[RAG] Calculando embeddings vetoriais com FAISS...", flush=True)
        self.vector_store = FAISS.from_documents(chunks, self.embeddings)
        print("[RAG] Indice vetorial pronto na memoria!", flush=True)

    def query(self, user_query: str, k: int = 4) -> List[Dict[str, Any]]:
        if not self.vector_store:
            return []
        
        results = self.vector_store.similarity_search_with_score(user_query, k=k)
        retrieved = []
        for doc, score in results:
            retrieved.append({
                "content": doc.page_content,
                "page": doc.metadata.get("page", 0),
                "source": doc.metadata.get("source", "PDF"),
                "score": float(score)
            })
        return retrieved

    def get_technical_context(self, topic: str = "Posts API and OAuth 2.0 authorization") -> str:
        matches = self.query(topic, k=3)
        if not matches:
            return "Nenhuma especificacao tecnica adicional encontrada."
        
        context_parts = []
        for m in matches:
            context_parts.append(f"--- [Pagina {m['page']} | {m['source']}] ---\n{m['content']}")
        return "\n\n".join(context_parts)

rag_engine_instance: Optional[LinkedInRAGEngine] = None

def get_rag_engine() -> LinkedInRAGEngine:
    global rag_engine_instance
    if rag_engine_instance is None:
        rag_engine_instance = LinkedInRAGEngine()
    return rag_engine_instance
