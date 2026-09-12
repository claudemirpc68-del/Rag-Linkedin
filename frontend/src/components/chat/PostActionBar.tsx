import { useState } from 'react';
import {
  Copy, Check, Linkedin, Loader2, CheckCircle2,
  AlertCircle, Send, Globe, Shield, Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

interface PostActionBarProps {
  content: string;
}

export function PostActionBar({ content }: PostActionBarProps) {
  const [copied, setCopied] = useState(false);
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [publishMode, setPublishMode] = useState<'simulation' | 'live'>('simulation');
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState<{
    status: 'success' | 'simulated' | 'error';
    urn?: string;
    message?: string;
  } | null>(null);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      toast.success('Post copiado com sucesso!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Não foi possível copiar o texto.');
    }
  };

  const handlePublish = async () => {
    if (!content.trim()) return;
    setIsPublishing(true);
    setPublishResult(null);

    try {
      const res = await fetch('/api/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          post_content: content,
          mode: publishMode,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.status === 'error') {
        throw new Error(data.message || data.error || 'Falha ao publicar post no LinkedIn');
      }

      setPublishResult({
        status: data.mode === 'live' ? 'success' : 'simulated',
        urn: data.post_urn || data.urn,
        message: data.message || (data.mode === 'live' ? 'Post publicado no LinkedIn com sucesso!' : 'Simulação de publicação executada com sucesso!'),
      });

      if (data.mode === 'live') {
        toast.success('Post publicado no feed oficial do LinkedIn! 🚀');
      } else {
        toast.info('Validação Restli 2.0.0 simulada com sucesso!');
      }
    } catch (err: any) {
      console.error('Erro na publicação:', err);
      setPublishResult({
        status: 'error',
        message: err.message || 'Erro inesperado na conexão com a LinkedIn Posts API.',
      });
      toast.error(err.message || 'Erro ao publicar no LinkedIn.');
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <>
      <div className="mt-4 border border-border rounded-xl overflow-hidden bg-card/50 backdrop-blur-sm shadow-sm">
        {/* Quick Action Bar: Copiar e Publicação Automática LinkedIn */}
        <div className="flex items-center gap-1.5 p-2 flex-wrap">
          {/* Botão Copiar */}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 text-xs text-foreground/80 hover:text-foreground"
            onClick={handleCopy}
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-500" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            {copied ? 'Copiado' : 'Copiar'}
          </Button>

          {/* Botão Publicação Automática no LinkedIn */}
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-8 gap-1.5 text-xs font-medium transition-all duration-200",
              publishResult?.status === 'success'
                ? "text-emerald-500 bg-emerald-500/10 hover:bg-emerald-500/20"
                : "text-[#0A66C2] hover:text-[#0A66C2] hover:bg-[#0A66C2]/10"
            )}
            onClick={() => setIsPublishModalOpen(true)}
          >
            {publishResult?.status === 'success' ? (
              <CheckCircle2 className="w-3.5 h-3.5" />
            ) : (
              <Linkedin className="w-3.5 h-3.5 fill-current" />
            )}
            {publishResult?.status === 'success' ? 'Publicado no LinkedIn' : 'LinkedIn'}
          </Button>

          {/* Badge de status caso já tenha sido publicado nesta sessão */}
          {publishResult && (
            <div className="ml-auto flex items-center gap-1.5 text-[11px] text-muted-foreground pr-2">
              <span
                className={cn(
                  "w-2 h-2 rounded-full",
                  publishResult.status === 'success' && "bg-emerald-500",
                  publishResult.status === 'simulated' && "bg-blue-500",
                  publishResult.status === 'error' && "bg-red-500"
                )}
              />
              <span className="font-mono text-[10px]">
                {publishResult.status === 'success'
                  ? 'Live OK'
                  : publishResult.status === 'simulated'
                  ? 'Sandbox OK'
                  : 'Falha'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Publicação Automática */}
      <Dialog open={isPublishModalOpen} onOpenChange={setIsPublishModalOpen}>
        <DialogContent className="max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <div className="w-7 h-7 rounded-lg bg-[#0A66C2]/15 text-[#0A66C2] flex items-center justify-center">
                <Linkedin className="w-4 h-4 fill-current" />
              </div>
              Publicação Automática no LinkedIn
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Disparo direto via LinkedIn Posts API (Restli 2.0.0) com formatação de quebra de linhas e hashtags.
            </DialogDescription>
          </DialogHeader>

          {/* Seleção de Modo */}
          <div className="grid grid-cols-2 gap-2 my-2">
            <button
              type="button"
              onClick={() => setPublishMode('simulation')}
              className={cn(
                "flex flex-col items-start p-3 rounded-lg border text-left transition-all",
                publishMode === 'simulation'
                  ? "border-[#0A66C2] bg-[#0A66C2]/10 text-foreground"
                  : "border-border bg-card/60 text-muted-foreground hover:bg-accent/40"
              )}
            >
              <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <Shield className="w-3.5 h-3.5 text-blue-400" />
                🧪 Sandbox
              </div>
              <span className="text-[10px] mt-1 text-muted-foreground">
                Valida headers e payload sem enviar ao feed.
              </span>
            </button>

            <button
              type="button"
              onClick={() => setPublishMode('live')}
              className={cn(
                "flex flex-col items-start p-3 rounded-lg border text-left transition-all",
                publishMode === 'live'
                  ? "border-[#0A66C2] bg-[#0A66C2]/10 text-foreground"
                  : "border-border bg-card/60 text-muted-foreground hover:bg-accent/40"
              )}
            >
              <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <Globe className="w-3.5 h-3.5 text-emerald-400" />
                🌐 Live Feed
              </div>
              <span className="text-[10px] mt-1 text-muted-foreground">
                Publica imediatamente no perfil oficial.
              </span>
            </button>
          </div>

          {/* Pré-visualização do conteúdo */}
          <div className="max-h-40 overflow-y-auto rounded-lg border border-border bg-background/50 p-2.5 text-xs text-foreground/90 whitespace-pre-wrap font-sans">
            {content}
          </div>

          {/* Feedback de resultado */}
          {publishResult && (
            <div
              className={cn(
                "p-2.5 rounded-lg border text-xs flex items-start gap-2",
                publishResult.status === 'success' && "bg-emerald-500/10 border-emerald-500/30 text-emerald-300",
                publishResult.status === 'simulated' && "bg-blue-500/10 border-blue-500/30 text-blue-300",
                publishResult.status === 'error' && "bg-red-500/10 border-red-500/30 text-red-300"
              )}
            >
              {publishResult.status === 'success' || publishResult.status === 'simulated' ? (
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              )}
              <div className="space-y-1 overflow-hidden">
                <p className="font-medium">{publishResult.message}</p>
                {publishResult.urn && (
                  <p className="font-mono text-[10px] opacity-80 truncate">
                    URN: {publishResult.urn}
                  </p>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsPublishModalOpen(false)}
              className="text-xs"
            >
              Fechar
            </Button>

            <Button
              size="sm"
              onClick={handlePublish}
              disabled={isPublishing}
              className="text-xs gap-1.5 bg-[#0A66C2] hover:bg-[#084e96] text-white"
            >
              {isPublishing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Publicando...
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  {publishMode === 'live' ? 'Publicar Agora' : 'Testar no Sandbox'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
