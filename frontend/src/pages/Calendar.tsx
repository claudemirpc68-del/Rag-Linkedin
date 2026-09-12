import { useState, useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useCalendarPosts } from '@/hooks/useCalendarPosts';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { CalendarPost, TemplateCategory } from '@/types';
import { getCategoryLabel, getCategoryColor } from '@/data/templates';
import { useToast } from '@/hooks/use-toast';
import { LinkedInPublishButton } from '@/components/linkedin/LinkedInPublishButton';
import { 
  ChevronLeft, 
  ChevronRight,
  Trash2,
  Edit2,
  Loader2,
  Cloud,
  CloudOff,
  Download
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameDay,
  addMonths,
  subMonths,
  isToday
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

const categories: TemplateCategory[] = [
  'historia-pessoal',
  'dica-pratica',
  'case-sucesso',
  'ia-tecnologia',
  'esg-cultura',
  'tendencias'
];

export default function CalendarPage() {
  const { posts, isLoading, isAuthenticated, addPost, updatePost, deletePost } = useCalendarPosts();
  // webhookUrl removed - now using direct LinkedIn API
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<CalendarPost | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: 'dica-pratica' as TemplateCategory,
    status: 'rascunho' as CalendarPost['status']
  });
  const { toast } = useToast();

  const days = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const getPostsForDay = (day: Date) => {
    return posts.filter(post => 
      isSameDay(new Date(post.scheduledDate), day)
    );
  };

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  const handleDayClick = (day: Date) => {
    setSelectedDate(day);
    setEditingPost(null);
    setFormData({
      title: '',
      content: '',
      category: 'dica-pratica',
      status: 'rascunho'
    });
    setIsDialogOpen(true);
  };

  const handleEditPost = (post: CalendarPost) => {
    setEditingPost(post);
    setSelectedDate(new Date(post.scheduledDate));
    setFormData({
      title: post.title,
      content: post.content || '',
      category: post.category,
      status: post.status
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.title.trim() || !selectedDate) return;

    setIsSaving(true);

    try {
      if (editingPost) {
        const result = await updatePost(editingPost.id, {
          ...formData,
          scheduledDate: selectedDate
        });

        if (result.success) {
          toast({ title: 'Atualizado!', description: 'Post atualizado com sucesso.' });
        } else {
          throw result.error;
        }
      } else {
        const result = await addPost({
          ...formData,
          scheduledDate: selectedDate
        });

        if (result.success) {
          toast({ title: 'Salvo!', description: 'Post adicionado ao calendário.' });
        } else {
          throw result.error;
        }
      }

      setIsDialogOpen(false);
      setEditingPost(null);
    } catch (error) {
      console.error('Error saving post:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar o post. Tente novamente.',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setIsSaving(true);

    try {
      const result = await deletePost(id);

      if (result.success) {
        toast({ title: 'Excluído!', description: 'Post removido do calendário.' });
        setIsDialogOpen(false);
      } else {
        throw result.error;
      }
    } catch (error) {
      console.error('Error deleting post:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir o post. Tente novamente.',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const getCategoryChipStyle = (category: string) => {
    switch (category) {
      case 'historia-pessoal':
        return 'bg-purple-500/15 text-purple-300 border-purple-500/30 hover:bg-purple-500/25';
      case 'dica-pratica':
        return 'bg-blue-500/15 text-blue-300 border-blue-500/30 hover:bg-blue-500/25';
      case 'case-sucesso':
        return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25';
      case 'ia-tecnologia':
        return 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30 hover:bg-cyan-500/25';
      case 'esg-cultura':
        return 'bg-teal-500/15 text-teal-300 border-teal-500/30 hover:bg-teal-500/25';
      case 'tendencias':
        return 'bg-amber-500/15 text-amber-300 border-amber-500/30 hover:bg-amber-500/25';
      default:
        return 'bg-slate-500/15 text-slate-300 border-slate-500/30 hover:bg-slate-500/25';
    }
  };

  const getCategoryLeftBorder = (category: string) => {
    switch (category) {
      case 'historia-pessoal': return 'border-l-purple-500';
      case 'dica-pratica': return 'border-l-blue-500';
      case 'case-sucesso': return 'border-l-emerald-500';
      case 'ia-tecnologia': return 'border-l-cyan-500';
      case 'esg-cultura': return 'border-l-teal-500';
      case 'tendencias': return 'border-l-amber-500';
      default: return 'border-l-primary';
    }
  };

  const getStatusDotColor = (status: CalendarPost['status']) => {
    switch (status) {
      case 'publicado': return 'bg-emerald-400 shadow-xs shadow-emerald-400/50';
      case 'agendado': return 'bg-blue-400 shadow-xs shadow-blue-400/50';
      default: return 'bg-amber-400 shadow-xs shadow-amber-400/50';
    }
  };

  const getStatusColor = (status: CalendarPost['status']) => {
    switch (status) {
      case 'publicado': return 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30';
      case 'agendado': return 'bg-blue-500/15 text-blue-300 border border-blue-500/30';
      default: return 'bg-amber-500/15 text-amber-300 border border-amber-500/30';
    }
  };

  const exportAsJSON = () => {
    const dataToExport = posts.map(post => ({
      title: post.title,
      content: post.content,
      category: post.category,
      status: post.status,
      scheduledDate: format(new Date(post.scheduledDate), 'yyyy-MM-dd'),
      createdAt: post.createdAt ? format(new Date(post.createdAt), 'yyyy-MM-dd HH:mm:ss') : null
    }));
    
    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `posts-linkedin-${format(new Date(), 'yyyy-MM-dd')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast({ title: 'Exportado!', description: `${posts.length} post(s) exportado(s) como JSON.` });
  };

  const exportAsCSV = () => {
    const headers = ['Título', 'Conteúdo', 'Categoria', 'Status', 'Data Agendada', 'Data Criação'];
    const rows = posts.map(post => [
      `"${(post.title || '').replace(/"/g, '""')}"`,
      `"${(post.content || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`,
      post.category,
      post.status,
      format(new Date(post.scheduledDate), 'yyyy-MM-dd'),
      post.createdAt ? format(new Date(post.createdAt), 'yyyy-MM-dd HH:mm:ss') : ''
    ]);
    
    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `posts-linkedin-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast({ title: 'Exportado!', description: `${posts.length} post(s) exportado(s) como CSV.` });
  };

  // Get first day of month's day of week (0 = Sunday)
  const firstDayOfMonth = startOfMonth(currentMonth).getDay();

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-[50vh]">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-6xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-bold text-foreground">Calendário de Conteúdo</h1>
            <div className="flex items-center gap-3">
              {posts.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Download className="w-4 h-4 mr-2" />
                      Exportar
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={exportAsJSON}>
                      Exportar como JSON
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={exportAsCSV}>
                      Exportar como CSV
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              <div className="text-sm">
                {isAuthenticated ? (
                  <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                    <Cloud className="w-4 h-4" />
                    Sincronizado
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <CloudOff className="w-4 h-4" />
                    Local
                  </span>
                )}
              </div>
            </div>
          </div>
          <p className="text-muted-foreground">
            Organize e planeje seus posts do LinkedIn com antecedência e controle visual de frequência.
            {!isAuthenticated && (
              <span className="block text-xs mt-1">
                💡 Faça login para sincronizar seus posts entre dispositivos.
              </span>
            )}
          </p>
        </div>

        {/* Calendar Header */}
        <Card className="mb-4">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <Button variant="outline" size="icon" onClick={handlePrevMonth}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <h2 className="text-xl font-semibold text-foreground capitalize">
                {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
              </h2>
              <Button variant="outline" size="icon" onClick={handleNextMonth}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Color Legend Bar */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 px-3 py-2.5 rounded-lg bg-card/60 border border-border/50 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-muted-foreground font-medium mr-1">Categorias:</span>
            {categories.map(cat => (
              <span
                key={cat}
                className={`px-2 py-0.5 rounded-md border text-[11px] font-medium transition-all ${getCategoryChipStyle(cat)}`}
              >
                {getCategoryLabel(cat)}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-3 border-l border-border/40 pl-3">
            <span className="text-muted-foreground font-medium">Status:</span>
            <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-xs shadow-emerald-400/50" /> Publicado
            </span>
            <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span className="w-2 h-2 rounded-full bg-blue-400 shadow-xs shadow-blue-400/50" /> Agendado
            </span>
            <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span className="w-2 h-2 rounded-full bg-amber-400 shadow-xs shadow-amber-400/50" /> Rascunho
            </span>
          </div>
        </div>

        {/* Calendar Grid */}
        <Card>
          <CardContent className="p-4">
            {/* Day headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {[
                { name: 'Dom', weekend: true },
                { name: 'Seg', weekend: false },
                { name: 'Ter', weekend: false },
                { name: 'Qua', weekend: false },
                { name: 'Qui', weekend: false },
                { name: 'Sex', weekend: false },
                { name: 'Sáb', weekend: true }
              ].map(day => (
                <div 
                  key={day.name} 
                  className={`text-center text-xs font-semibold py-2 rounded-md ${
                    day.weekend ? 'text-muted-foreground/60 bg-muted/20' : 'text-foreground/80 bg-muted/40'
                  }`}
                >
                  {day.name}
                </div>
              ))}
            </div>

            {/* Calendar days */}
            <div className="grid grid-cols-7 gap-1">
              {/* Empty cells for days before the first day of month */}
              {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                <div key={`empty-${i}`} className="min-h-[105px] bg-muted/15 border border-border/20 rounded-lg" />
              ))}

              {days.map(day => {
                const dayPosts = getPostsForDay(day);
                const isCurrentDay = isToday(day);
                const hasPosts = dayPosts.length > 0;

                return (
                  <div
                    key={day.toISOString()}
                    className={`min-h-[105px] p-2 rounded-lg border cursor-pointer transition-all duration-150 hover:border-primary/60 hover:shadow-xs ${
                      isCurrentDay
                        ? 'border-primary/80 bg-gradient-to-b from-primary/15 via-primary/5 to-transparent ring-1 ring-primary/50 shadow-sm shadow-primary/15'
                        : hasPosts
                        ? 'border-border/80 bg-card/80 hover:bg-card'
                        : 'border-border/40 bg-card/30 hover:bg-card/60'
                    }`}
                    onClick={() => handleDayClick(day)}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className={`text-xs font-bold px-1.5 py-0.5 rounded-md ${
                        isCurrentDay
                          ? 'bg-primary text-primary-foreground shadow-xs'
                          : 'text-foreground/80'
                      }`}>
                        {format(day, 'd')}
                      </span>
                      {hasPosts && (
                        <div className="flex items-center gap-1">
                          {dayPosts.map(p => (
                            <span
                              key={p.id}
                              className={`w-1.5 h-1.5 rounded-full ${getStatusDotColor(p.status)}`}
                              title={`${p.title} (${p.status})`}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      {dayPosts.slice(0, 2).map(post => (
                        <div
                          key={post.id}
                          className={`text-xs p-1.5 rounded-md border flex items-center gap-1.5 truncate cursor-pointer transition-colors ${getCategoryChipStyle(post.category)}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditPost(post);
                          }}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${getStatusDotColor(post.status)}`} />
                          <span className="truncate font-medium">{post.title}</span>
                        </div>
                      ))}
                      {dayPosts.length > 2 && (
                        <div className="text-[10px] font-semibold text-muted-foreground/90 pl-1">
                          +{dayPosts.length - 2} mais
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Posts */}
        {posts.length > 0 && (
          <Card className="mt-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center justify-between">
                <span>Próximos Posts</span>
                <span className="text-xs font-normal text-muted-foreground">
                  {posts.length} post(s) cadastrado(s)
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {posts
                  .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime())
                  .slice(0, 5)
                  .map(post => (
                    <div 
                      key={post.id} 
                      className={`flex items-center justify-between p-3.5 rounded-lg bg-card/60 hover:bg-card/90 border border-border/50 border-l-4 ${getCategoryLeftBorder(post.category)} cursor-pointer gap-3 transition-all duration-150`}
                      onClick={() => handleEditPost(post)}
                    >
                      <div className="flex items-center gap-3.5 min-w-0 flex-1">
                        <div className="text-center flex-shrink-0 px-2.5 py-1 rounded-md bg-muted/40 border border-border/30">
                          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                            {format(new Date(post.scheduledDate), 'MMM', { locale: ptBR })}
                          </div>
                          <div className="text-xl font-bold text-foreground">
                            {format(new Date(post.scheduledDate), 'd')}
                          </div>
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="font-semibold text-foreground truncate text-sm">{post.title}</h4>
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            <span className={`px-2 py-0.5 rounded-md border text-[11px] font-medium ${getCategoryChipStyle(post.category)}`}>
                              {getCategoryLabel(post.category)}
                            </span>
                            <span className={`px-2 py-0.5 rounded-md text-[11px] font-medium ${getStatusColor(post.status)}`}>
                              {post.status}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {post.content && (
                          <LinkedInPublishButton 
                            content={post.content} 
                          />
                        )}
                        <Button variant="ghost" size="icon">
                          <Edit2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Add/Edit Post Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingPost ? 'Editar Post' : 'Novo Post'}
              </DialogTitle>
              <DialogDescription>
                {selectedDate && format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground">Título</label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Título do post..."
                  className="mt-1"
                  disabled={isSaving}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground">Conteúdo</label>
                <Textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Rascunho do post..."
                  className="mt-1 min-h-[150px]"
                  disabled={isSaving}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground">Categoria</label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value as TemplateCategory })}
                    disabled={isSaving}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(cat => (
                        <SelectItem key={cat} value={cat}>
                          {getCategoryLabel(cat)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground">Status</label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value as CalendarPost['status'] })}
                    disabled={isSaving}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="rascunho">Rascunho</SelectItem>
                      <SelectItem value="agendado">Agendado</SelectItem>
                      <SelectItem value="publicado">Publicado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <DialogFooter className="flex justify-between">
              {editingPost && (
                <Button
                  variant="destructive"
                  onClick={() => handleDelete(editingPost.id)}
                  disabled={isSaving}
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Trash2 className="w-4 h-4 mr-1" />}
                  Excluir
                </Button>
              )}
              <div className="flex gap-2 ml-auto">
                {editingPost && editingPost.content && (
                  <LinkedInPublishButton 
                    content={editingPost.content} 
                    variant="full"
                    size="default"
                  />
                )}
                <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSaving}>
                  Cancelar
                </Button>
                <Button onClick={handleSave} disabled={!formData.title.trim() || isSaving}>
                  {isSaving && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
                  Salvar
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
