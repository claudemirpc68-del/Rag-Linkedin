import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLocalStorage } from './useLocalStorage';
import { CalendarPost, TemplateCategory } from '@/types';
import { useToast } from './use-toast';
import { format, parseISO } from 'date-fns';

// Map local status to database status
const statusToDb: Record<CalendarPost['status'], string> = {
  'rascunho': 'draft',
  'agendado': 'scheduled',
  'publicado': 'published'
};

// Map database status to local status
const statusFromDb: Record<string, CalendarPost['status']> = {
  'draft': 'rascunho',
  'scheduled': 'agendado',
  'published': 'publicado'
};

interface DbCalendarPost {
  id: string;
  user_id: string;
  title: string;
  content: string | null;
  date: string;
  status: string;
  category: string;
  created_at: string;
  updated_at: string;
}

export function useCalendarPosts() {
  const { user, session } = useAuth();
  const { toast } = useToast();
  const [posts, setPosts] = useState<CalendarPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [localPosts, setLocalPosts] = useLocalStorage<CalendarPost[]>('linkedin-calendar-posts', []);
  const [migrationDone, setMigrationDone] = useLocalStorage<boolean>('calendar-migration-done', false);

  // Convert database row to local CalendarPost
  const fromDb = useCallback((row: DbCalendarPost): CalendarPost => ({
    id: row.id,
    title: row.title,
    content: row.content || '',
    category: row.category as TemplateCategory,
    scheduledDate: parseISO(row.date),
    status: statusFromDb[row.status] || 'rascunho',
    createdAt: parseISO(row.created_at)
  }), []);

  // Convert local CalendarPost to database format
  const toDb = useCallback((post: CalendarPost, userId: string) => ({
    id: post.id,
    user_id: userId,
    title: post.title,
    content: post.content || null,
    date: format(new Date(post.scheduledDate), 'yyyy-MM-dd'),
    status: statusToDb[post.status] || 'draft',
    category: post.category
  }), []);

  // Migrate local posts to database on first login with real session
  const migrateLocalPosts = useCallback(async () => {
    if (!user || !session || migrationDone || localPosts.length === 0) return;

    try {
      const postsToInsert = localPosts.map(post => toDb(post, user.id));
      
      const { error } = await supabase
        .from('calendar_posts')
        .insert(postsToInsert);

      if (error) throw error;

      setMigrationDone(true);
      setLocalPosts([]);
      
      toast({
        title: 'Dados migrados!',
        description: `${localPosts.length} post(s) foram sincronizados com a nuvem.`
      });
    } catch (error) {
      console.warn('Supabase indisponível para migração, mantendo dados locais:', error);
    }
  }, [user, session, migrationDone, localPosts, toDb, setMigrationDone, setLocalPosts, toast]);

  // Load posts from database or localStorage
  const loadPosts = useCallback(async () => {
    setIsLoading(true);

    if (user && session) {
      try {
        const { data, error } = await supabase
          .from('calendar_posts')
          .select('*')
          .eq('user_id', user.id)
          .order('date', { ascending: true });

        if (error) throw error;

        setPosts((data || []).map(fromDb));
        setIsLoading(false);
        return;
      } catch (error) {
        console.warn('Supabase não acessível, carregando posts do localStorage:', error);
      }
    }

    // Use localStorage when not logged in or when Supabase is offline
    setPosts(localPosts.map(post => ({
      ...post,
      scheduledDate: new Date(post.scheduledDate),
      createdAt: new Date(post.createdAt)
    })));

    setIsLoading(false);
  }, [user, session, localPosts, fromDb]);

  // Initial load and migration
  useEffect(() => {
    loadPosts();
  }, [user, session]);

  useEffect(() => {
    if (user && session && !migrationDone && localPosts.length > 0) {
      migrateLocalPosts();
    }
  }, [user, session, migrationDone, localPosts.length, migrateLocalPosts]);

  // Add a new post
  const addPost = useCallback(async (postData: Omit<CalendarPost, 'id' | 'createdAt'>) => {
    const newPost: CalendarPost = {
      id: crypto.randomUUID(),
      ...postData,
      createdAt: new Date()
    };

    if (user && session) {
      try {
        const { error } = await supabase
          .from('calendar_posts')
          .insert(toDb(newPost, user.id));

        if (!error) {
          setPosts(prev => [...prev, newPost]);
          return { success: true };
        }
      } catch (error) {
        console.warn('Falha no Supabase, salvando localmente:', error);
      }
    }

    setLocalPosts(prev => [...prev, newPost]);
    setPosts(prev => [...prev, newPost]);
    return { success: true };
  }, [user, session, toDb, setLocalPosts]);

  // Update an existing post
  const updatePost = useCallback(async (id: string, updates: Partial<CalendarPost>) => {
    if (user && session) {
      try {
        const updateData: Record<string, unknown> = {};
        
        if (updates.title !== undefined) updateData.title = updates.title;
        if (updates.content !== undefined) updateData.content = updates.content || null;
        if (updates.category !== undefined) updateData.category = updates.category;
        if (updates.scheduledDate !== undefined) {
          updateData.date = format(new Date(updates.scheduledDate), 'yyyy-MM-dd');
        }
        if (updates.status !== undefined) {
          updateData.status = statusToDb[updates.status] || 'draft';
        }

        const { error } = await supabase
          .from('calendar_posts')
          .update(updateData)
          .eq('id', id)
          .eq('user_id', user.id);

        if (!error) {
          setPosts(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
          return { success: true };
        }
      } catch (error) {
        console.warn('Falha ao atualizar no Supabase, atualizando localmente:', error);
      }
    }

    const updatedPosts = localPosts.map(p => p.id === id ? { ...p, ...updates } : p);
    setLocalPosts(updatedPosts);
    setPosts(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
    return { success: true };
  }, [user, session, localPosts, setLocalPosts]);

  // Delete a post
  const deletePost = useCallback(async (id: string) => {
    if (user && session) {
      try {
        const { error } = await supabase
          .from('calendar_posts')
          .delete()
          .eq('id', id)
          .eq('user_id', user.id);

        if (!error) {
          setPosts(prev => prev.filter(p => p.id !== id));
          return { success: true };
        }
      } catch (error) {
        console.warn('Falha ao deletar no Supabase, deletando localmente:', error);
      }
    }

    setLocalPosts(prev => prev.filter(p => p.id !== id));
    setPosts(prev => prev.filter(p => p.id !== id));
    return { success: true };
  }, [user, session, setLocalPosts]);

  return {
    posts,
    isLoading,
    isAuthenticated: !!user,
    addPost,
    updatePost,
    deletePost,
    refreshPosts: loadPosts
  };
}
