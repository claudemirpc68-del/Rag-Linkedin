import React, { useState } from 'react';
import { Share2, Send, CheckCircle2, AlertCircle, Image as ImageIcon, X } from 'lucide-react';
import { publishPost, uploadPostImage, PublishResult } from '@/services/api';

interface PostPublishCardProps {
  postContent: string;
  hasToken: boolean;
  authorUrn?: string;
}

export const PostPublishCard: React.FC<PostPublishCardProps> = ({
  postContent,
  hasToken,
  authorUrn,
}) => {
  const [mode, setMode] = useState<'simulation' | 'live'>(hasToken ? 'live' : 'simulation');
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState<PublishResult | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const handlePublish = async () => {
    if (!postContent.trim()) return;
    setIsPublishing(true);
    setPublishResult(null);

    try {
      let imageUrn: string | undefined = undefined;

      // Se houver imagem anexada, faz o upload primeiro
      if (imageFile) {
        const uploadRes = await uploadPostImage(imageFile, mode);
        imageUrn = uploadRes.image_urn;
      }

      const res = await publishPost({
        post_content: postContent,
        author_urn: authorUrn,
        mode: mode,
        image_urn: imageUrn,
      });

      setPublishResult(res);
    } catch (err: any) {
      setPublishResult({
        status: 'error',
        mode: mode,
        error: err.message || 'Erro inesperado ao publicar.',
      });
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="publish-auto-box">
      <div className="publish-auto-header">
        <div className="publish-auto-title">
          <Share2 size={16} color="#60a5fa" />
          <span>Publicação Automática LinkedIn</span>
        </div>

        <div className="publish-mode-selector">
          <button
            type="button"
            className={`publish-mode-btn ${mode === 'simulation' ? 'active' : ''}`}
            onClick={() => setMode('simulation')}
            title="Sandbox seguro (valida payload sem publicar no feed)"
          >
            🧪 Sandbox
          </button>
          <button
            type="button"
            className={`publish-mode-btn ${mode === 'live' ? 'active' : ''}`}
            onClick={() => setMode('live')}
            title="Disparo ao vivo no feed oficial do LinkedIn"
          >
            🌐 Live
          </button>
        </div>
      </div>

      {/* Upload de Imagem Opcional */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <label
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            cursor: 'pointer',
            fontSize: '0.75rem',
            color: '#a1a1aa',
            background: 'rgba(255,255,255,0.04)',
            padding: '0.35rem 0.65rem',
            borderRadius: '4px',
            border: '1px solid rgba(255,255,255,0.08)'
          }}
        >
          <ImageIcon size={14} />
          <span>{imageFile ? 'Trocar Imagem' : 'Anexar Imagem (Opcional)'}</span>
          <input
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleImageChange}
          />
        </label>

        {imagePreview && (
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <img
              src={imagePreview}
              alt="Preview"
              style={{ width: '28px', height: '28px', objectFit: 'cover', borderRadius: '4px' }}
            />
            <button
              type="button"
              onClick={handleRemoveImage}
              style={{
                marginLeft: '4px',
                background: 'none',
                border: 'none',
                color: '#ef4444',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center'
              }}
              title="Remover imagem"
            >
              <X size={14} />
            </button>
          </div>
        )}
      </div>

      <div className="publish-actions-row">
        <button
          type="button"
          className="publish-btn"
          onClick={handlePublish}
          disabled={isPublishing}
        >
          {isPublishing ? (
            <>
              <span className="spinner" />
              <span>Publicando...</span>
            </>
          ) : (
            <>
              <Send size={14} />
              <span>
                {mode === 'live' ? 'Publicar Agora no LinkedIn' : 'Testar no Sandbox'}
              </span>
            </>
          )}
        </button>

        {!hasToken && mode === 'live' && (
          <span style={{ fontSize: '0.72rem', color: '#f59e0b' }}>
            ⚠️ Token não conectado. O envio será simulado.
          </span>
        )}
      </div>

      {publishResult && (
        <div
          className={`publish-result-badge ${
            publishResult.status === 'success' || publishResult.status === 'simulated'
              ? 'success'
              : 'error'
          }`}
        >
          {publishResult.status === 'success' || publishResult.status === 'simulated' ? (
            <CheckCircle2 size={16} />
          ) : (
            <AlertCircle size={16} />
          )}
          <div>
            <strong>
              {publishResult.status === 'success'
                ? 'Publicado com Sucesso!'
                : publishResult.status === 'simulated'
                ? 'Simulação Concluída (Sandbox)'
                : 'Falha no Disparo'}
            </strong>
            {publishResult.urn && (
              <div style={{ fontSize: '0.7rem', opacity: 0.85, marginTop: '2px' }}>
                URN: <code>{publishResult.urn}</code>
              </div>
            )}
            {publishResult.error && (
              <div style={{ fontSize: '0.7rem', marginTop: '2px' }}>
                {publishResult.error}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
