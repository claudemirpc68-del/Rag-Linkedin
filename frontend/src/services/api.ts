export interface ApiStatus {
  status: string;
  agent: string;
  engines: {
    groq: { configured: boolean; model: string };
    openrouter: { configured: boolean; model: string };
  };
  linkedin_api: {
    version: string;
    has_token: boolean;
    author_urn?: string;
  };
  rag_indexed: boolean;
}

export interface GenerateParams {
  topic: string;
  objective?: string;
  style?: string;
  audience?: string;
  engine?: string;
  model?: string;
}

export interface PerspectiveContent {
  hook: string;
  angle: string;
  text: string;
  framework: string;
}

export interface GeneratedPostResponse {
  topic: string;
  engine_used: string;
  model_used: string;
  rag_context_used: boolean;
  perspectives: {
    critica?: PerspectiveContent;
    otimista?: PerspectiveContent;
    pragmatica?: PerspectiveContent;
  };
  image_prompt?: {
    english: string;
    aspect_ratio: string;
    suggested_style: string;
  };
  recommended_hashtags?: string[];
  raw_response?: string;
}

export interface PublishParams {
  post_content: string;
  author_urn?: string;
  mode?: 'simulation' | 'live';
  access_token?: string;
  image_urn?: string;
  image_title?: string;
}

export interface PublishResult {
  status: 'success' | 'simulated' | 'error';
  mode: string;
  urn?: string;
  endpoint?: string;
  author?: string;
  message?: string;
  error?: string;
  status_code?: number;
  response_body?: any;
}

export async function fetchApiStatus(): Promise<ApiStatus> {
  const res = await fetch('/api/status');
  if (!res.ok) throw new Error('Falha ao obter status da API');
  return res.json();
}

export async function generatePost(params: GenerateParams): Promise<GeneratedPostResponse> {
  const res = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Erro na geração' }));
    throw new Error(err.detail || 'Falha ao gerar post');
  }
  return res.json();
}

export async function publishPost(params: PublishParams): Promise<PublishResult> {
  const res = await fetch('/api/publish', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Erro na publicação' }));
    throw new Error(err.detail || 'Falha ao publicar post no LinkedIn');
  }
  return res.json();
}

export async function uploadPostImage(file: File, mode: 'simulation' | 'live' = 'live'): Promise<{ status: string; image_urn?: string; message?: string }> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('mode', mode);

  const res = await fetch('/api/upload-image', {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Erro no upload da imagem' }));
    throw new Error(err.detail || 'Falha no upload');
  }
  return res.json();
}
