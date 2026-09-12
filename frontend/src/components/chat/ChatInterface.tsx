import { useState, useRef, useEffect, useMemo } from 'react';
import {
  Send,
  Loader2,
  Sparkles,
  Settings,
  Plus,
  MessageSquare,
  Trash2,
  ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Message, Conversation } from '@/types';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { ChatMessage } from './ChatMessage';
import { ChatSuggestions } from './ChatSuggestions';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

export function ChatInterface() {
  const [conversations, setConversations] = useLocalStorage<Conversation[]>('linkedin-conversations', []);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [visibleConversations, setVisibleConversations] = useState(10);
  const [showHistory, setShowHistory] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const CONVERSATIONS_PER_PAGE = 10;

  const currentConversation = conversations.find(c => c.id === currentConversationId);
  const messages = currentConversation?.messages || [];

  const paginatedConversations = useMemo(() => {
    return conversations.slice(0, visibleConversations);
  }, [conversations, visibleConversations]);

  const hasMoreConversations = conversations.length > visibleConversations;

  const loadMoreConversations = () => {
    setVisibleConversations(prev => prev + CONVERSATIONS_PER_PAGE);
  };

  const prevMessagesCountRef = useRef(messages.length);

  useEffect(() => {
    // Só aciona scroll automático quando a quantidade de mensagens aumentar (nova mensagem)
    if (messages.length > prevMessagesCountRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    prevMessagesCountRef.current = messages.length;
  }, [messages.length]);

  const handleNewChat = () => {
    const newId = crypto.randomUUID();
    const newConv: Conversation = {
      id: newId,
      title: 'Nova conversa',
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setConversations(prev => [newConv, ...prev]);
    setCurrentConversationId(newId);
    return newId;
  };

  const handleSelectConversation = (id: string) => {
    setCurrentConversationId(id);
    setShowHistory(false);
  };

  const handleDeleteConversation = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConversations(prev => prev.filter(c => c.id !== id));
    if (currentConversationId === id) {
      const remaining = conversations.filter(c => c.id !== id);
      setCurrentConversationId(remaining.length > 0 ? remaining[0].id : null);
    }
    toast.success('Conversa excluída.');
  };

  const handleClearAllConversations = () => {
    setConversations([]);
    setCurrentConversationId(null);
    setShowHistory(false);
    toast.success('Todo o histórico de conversas foi excluído com sucesso.');
  };

  const handleSend = async (customTopic?: string) => {
    const textToSend = (customTopic || input).trim();
    if (!textToSend || isLoading) return;

    let convId = currentConversationId;
    if (!convId || !conversations.some(c => c.id === convId)) {
      convId = handleNewChat();
    }

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: textToSend,
      timestamp: new Date(),
    };

    // Adiciona mensagem do usuário
    setConversations(prev =>
      prev.map(c => {
        if (c.id !== convId) return c;
        const isFirst = c.messages.length === 0;
        return {
          ...c,
          title: isFirst ? textToSend.slice(0, 45) : c.title,
          messages: [...c.messages, userMessage],
          updatedAt: new Date(),
        };
      })
    );

    if (!customTopic) setInput('');
    setIsLoading(true);

    const currentConv = conversations.find(c => c.id === convId);
    const existingMsgs = currentConv ? currentConv.messages : [];
    const history = [
      ...existingMsgs.map(m => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content
      })),
      { role: 'user', content: textToSend }
    ];

    try {
      // Chama o backend /api/chat com conversação natural multi-turno
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: history,
          engine: 'Groq',
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Falha ao consultar API do agente.');
      }

      const data = await res.json();

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.display_text || data.response || 'Sem resposta.',
        isPost: Boolean(data.is_post),
        postContent: data.post_content || undefined,
        verifiedSources: data.verified_sources || undefined,
        timestamp: new Date(),
      };

      setConversations(prev =>
        prev.map(c =>
          c.id === convId
            ? { ...c, messages: [...c.messages, assistantMessage], updatedAt: new Date() }
            : c
        )
      );
    } catch (err: any) {
      console.error('Erro no chat:', err);
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `❌ Ocorreu um erro ao responder:\n${err.message || 'Verifique se o backend está ativo.'}`,
        timestamp: new Date(),
      };
      setConversations(prev =>
        prev.map(c =>
          c.id === convId
            ? { ...c, messages: [...c.messages, errorMessage], updatedAt: new Date() }
            : c
        )
      );
      toast.error('Erro na resposta do assistente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-[calc(100vh-3.5rem)] md:h-screen w-full overflow-hidden bg-background">
      {/* Coluna 2: Histórico de Conversas (Sub-Sidebar) */}
      <div className={`${showHistory ? 'flex' : 'hidden'} md:flex w-64 flex-col border-r border-border bg-card/40 flex-shrink-0`}>
        <div className="p-4 border-b border-border">
          <Button
            onClick={handleNewChat}
            className="w-full text-xs font-semibold"
            variant="outline"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nova Conversa
          </Button>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-4">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                  <MessageSquare className="w-6 h-6 text-muted-foreground" />
                </div>
                <h4 className="text-sm font-medium text-foreground mb-1">
                  Nenhuma conversa
                </h4>
                <p className="text-xs text-muted-foreground text-center mb-4">
                  Suas conversas aparecerão aqui
                </p>
                <Button 
                  onClick={handleNewChat} 
                  variant="ghost" 
                  size="sm"
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Começar agora
                </Button>
              </div>
            ) : (
              <>
                {paginatedConversations.map((conv) => (
                  <div
                    key={conv.id}
                    onClick={() => handleSelectConversation(conv.id)}
                    className={`group flex items-center justify-between gap-2 p-2.5 rounded-lg cursor-pointer transition-colors ${
                      currentConversationId === conv.id
                        ? 'bg-accent text-accent-foreground font-medium'
                        : 'hover:bg-accent/50 text-muted-foreground'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <MessageSquare className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium truncate text-foreground">{conv.title}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {format(new Date(conv.updatedAt), "dd 'de' MMM", { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-6 h-6 opacity-70 md:opacity-0 md:group-hover:opacity-100 hover:!opacity-100 flex-shrink-0"
                      onClick={(e) => handleDeleteConversation(conv.id, e)}
                      title="Excluir esta conversa"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </Button>
                  </div>
                ))}
                {hasMoreConversations && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full mt-2 text-xs text-muted-foreground hover:text-foreground"
                    onClick={loadMoreConversations}
                  >
                    <ChevronDown className="w-3 h-3 mr-1" />
                    Carregar mais ({conversations.length - visibleConversations} restantes)
                  </Button>
                )}
              </>
            )}
          </div>
        </ScrollArea>

        {/* Rodapé da Sub-sidebar com Ação de Limpar Todo o Histórico */}
        {conversations.length > 0 && (
          <div className="p-2 border-t border-border bg-card/20 flex-shrink-0">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex items-center justify-center gap-1.5 h-8"
                >
                  <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  <span>Limpar todo o histórico</span>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-card border-border">
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir todo o histórico?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação removerá permanentemente todas as suas conversas salvas localmente no navegador. Essa ação não pode ser desfeita.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={handleClearAllConversations}
                  >
                    Sim, excluir todas
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </div>

      {/* Coluna 3: Canvas Principal do Chat */}
      <div className="flex-1 flex flex-col relative h-full overflow-hidden">
        {/* Top bar com botão de excluir conversa atual, configurações e menu mobile */}
        <div className="absolute top-4 right-4 z-10 flex items-center gap-1.5 sm:gap-2">
          {currentConversation && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2.5 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors flex items-center gap-1.5"
              onClick={(e) => handleDeleteConversation(currentConversation.id, e)}
              title="Excluir esta conversa"
            >
              <Trash2 className="w-3.5 h-3.5 text-destructive" />
              <span className="hidden sm:inline">Excluir conversa</span>
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="md:hidden h-8 w-8 text-muted-foreground"
            onClick={() => setShowHistory(!showHistory)}
            title="Histórico de conversas"
          >
            <MessageSquare className="w-4 h-4" />
          </Button>

          <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" title="Configurações">
                <Settings className="w-4 h-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader>
                <DialogTitle>Configurações do Agente</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2 text-xs text-muted-foreground">
                <p>
                  O agente está operando com **FastAPI + RAG Oficial do LinkedIn** (Restli 2.0.0) e motor Groq (Qwen 2.5).
                </p>
                <div className="p-3 bg-muted/40 rounded-lg border border-border">
                  💡 A publicação automática no LinkedIn está integrada na barra de ações abaixo de cada post gerado.
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Área de Mensagens / Estado Vazio Fiel ao Screenshot */}
        {messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 overflow-y-auto">
            <div className="w-16 h-16 rounded-2xl linkedin-gradient flex items-center justify-center mb-6 shadow-md">
              <Sparkles className="w-8 h-8 text-primary-foreground" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2 text-center">
              Crie posts virais para o LinkedIn
            </h2>
            <p className="text-muted-foreground text-center max-w-lg mb-8 text-sm">
              Me conte sobre o que você quer postar e eu vou te ajudar a criar conteúdo que gera engajamento real.
            </p>
            <ChatSuggestions onSelect={handleSend} />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-6">
            <div className="max-w-3xl mx-auto space-y-6">
              {messages.map((msg) => (
                <ChatMessage key={msg.id} message={msg} />
              ))}

              {isLoading && (
                <div className="flex items-center gap-3 animate-fade-in text-muted-foreground text-xs py-2">
                  <div className="w-7 h-7 rounded-full linkedin-gradient flex items-center justify-center text-white">
                    <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                  </div>
                  <div className="flex items-center gap-2 bg-card/60 border border-border px-3 py-2 rounded-xl">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0A66C2]" />
                    <span>Pensando estrategicamente...</span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>
        )}

        {/* Input Area Idêntico ao Screenshot */}
        <div className="border-t border-border bg-card/60 backdrop-blur-sm px-4 py-4 relative">
          <div className="max-w-3xl mx-auto">
            <div className="relative">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Descreva sua ideia de post ou peça ajuda com algo..."
                className="min-h-[56px] max-h-[180px] pr-14 resize-none bg-background text-xs sm:text-sm border-border rounded-xl focus-visible:ring-1 focus-visible:ring-[#0A66C2]"
                rows={1}
              />
              <Button
                onClick={() => handleSend()}
                disabled={!input.trim() || isLoading}
                size="icon"
                className="absolute right-2 bottom-2 h-9 w-9 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground mt-2 text-center">
              Pressione Enter para enviar, Shift+Enter para nova linha
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
