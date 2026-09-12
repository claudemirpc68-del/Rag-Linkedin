import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { 
  LayoutDashboard,
  MessageSquare, 
  LayoutTemplate, 
  BarChart3, 
  Layers, 
  Calendar,
  ImageIcon,
  Sparkles,
  LogIn,
  LogOut,
  User,
  Linkedin,
} from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';
import { AuthModal } from '@/components/auth/AuthModal';
import { LinkedInWizard } from '@/components/linkedin/LinkedInWizard';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Chat', href: '/chat', icon: MessageSquare },
  { name: 'Templates', href: '/templates', icon: LayoutTemplate },
  { name: 'Analisar Post', href: '/analyze', icon: BarChart3 },
  { name: 'Carrossel', href: '/carousel', icon: Layers },
  { name: 'Calendário', href: '/calendar', icon: Calendar },
  { name: 'Galeria', href: '/gallery', icon: ImageIcon },
  { name: 'Publicar no LinkedIn', href: '/linkedin', icon: Linkedin },
];

export function AppSidebar() {
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const location = useLocation();

  const handleSignOut = async () => {
    if (user) {
      await signOut();
    }
    toast({
      title: 'Até logo!',
      description: 'Sessão finalizada.'
    });
  };

  return (
    <>
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 bg-card border-r border-border z-30">
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-border">
          <div className="w-10 h-10 rounded-lg linkedin-gradient flex items-center justify-center shadow-sm">
            <Sparkles className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-bold text-xl text-foreground leading-tight">LinkedIn Viral</h1>
            <p className="text-[9px] text-muted-foreground font-semibold tracking-wider uppercase">BY: CLAUDEMIR PEDROSO CUBAS</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-1.5">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;

            return (
              <NavLink
                key={item.name}
                to={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-accent text-accent-foreground font-semibold border border-border/40'
                    : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
                )}
              >
                <item.icon className="w-5 h-5" />
                {item.name}
              </NavLink>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-4 py-4 border-t border-border space-y-3">
          {/* User Profile Pill */}
          <div className="flex items-center gap-2 p-2 rounded-lg bg-accent/40 border border-border/60">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
              <User className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-foreground font-medium truncate">
                {user?.email || 'claudemirpc68@gma...'}
              </p>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              className="w-7 h-7 flex-shrink-0 hover:bg-accent"
              onClick={handleSignOut}
              title="Configurações &amp; Conta"
            >
              <LogOut className="w-3.5 h-3.5" />
            </Button>
          </div>

          <div className="flex items-center justify-end pr-1">
            <ThemeToggle />
          </div>

          <div className="p-3.5 rounded-lg bg-accent/40 border border-border/50">
            <p className="text-xs text-muted-foreground leading-relaxed">
              💡 Dica: Posts nativos (sem links externos) têm até 3x mais alcance!
            </p>
          </div>
        </div>
      </aside>

      <AuthModal open={authModalOpen} onOpenChange={setAuthModalOpen} />
      <LinkedInWizard open={wizardOpen} onOpenChange={setWizardOpen} />
    </>
  );
}
