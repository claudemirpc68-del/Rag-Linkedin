import { User, Sparkles, Globe, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Message } from '@/types';
import { PostActionBar } from './PostActionBar';

interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';

  return (
    <div className={cn('flex gap-3 animate-fade-in', isUser && 'flex-row-reverse')}>
      <div
        className={cn(
          'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
          isUser ? 'bg-secondary' : 'linkedin-gradient'
        )}
      >
        {isUser ? (
          <User className="w-4 h-4 text-secondary-foreground" />
        ) : (
          <Sparkles className="w-4 h-4 text-primary-foreground" />
        )}
      </div>
      <div className="max-w-[85%]">
        <div
          className={cn(
            'chat-bubble',
            isUser ? 'chat-bubble-user' : 'chat-bubble-assistant'
          )}
        >
          <div className={cn('prose prose-sm max-w-none', isUser ? 'prose-invert' : '')}>
            {message.content.split('\n').map((line, i) => {
              const parts = line.split(/(\*\*.*?\*\*)/g);
              const formattedLine = parts.map((part, j) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                  return <strong key={j}>{part.slice(2, -2)}</strong>;
                }
                return part;
              });

              return (
                <p key={i} className={cn('mb-1 last:mb-0', line === '' && 'h-3')}>
                  {formattedLine}
                </p>
              );
            })}
          </div>
        </div>
        
        {/* Barra de Publicação Automática exibida EXCLUSIVAMENTE quando um post foi gerado */}
        {!isUser && message.isPost && (message.postContent || message.content) && (
          <PostActionBar content={message.postContent || message.content} />
        )}

        {/* Fontes Reais Verificadas via Web Scraping */}
        {!isUser && message.verifiedSources && message.verifiedSources.length > 0 && (
          <div className="mt-2.5 p-2.5 rounded-xl bg-card/70 border border-border/70 text-xs shadow-xs">
            <div className="flex items-center gap-1.5 font-semibold text-primary mb-1.5">
              <Globe className="w-3.5 h-3.5" />
              <span>Fontes e Fatos Reais Verificados via Web Scraping ({message.verifiedSources.length}):</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {message.verifiedSources.map((source, idx) => (
                <a
                  key={idx}
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-muted/50 hover:bg-muted text-[11px] text-muted-foreground hover:text-foreground border border-border/50 transition-colors"
                  title={source.title}
                >
                  <span className="font-semibold text-primary">{source.source}</span>
                  <span className="truncate max-w-[180px] opacity-80">{source.title}</span>
                  <ExternalLink className="w-2.5 h-2.5 opacity-60 flex-shrink-0" />
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
