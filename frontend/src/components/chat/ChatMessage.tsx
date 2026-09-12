import { User, Sparkles } from 'lucide-react';
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
      </div>
    </div>
  );
}
