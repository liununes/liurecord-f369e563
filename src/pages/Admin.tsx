import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAdminCheck, useClients, useAllPortfolioMedia } from "@/hooks/useSiteContent";
import { 
  LogOut, 
  FileText, 
  Palette, 
  Music, 
  Settings, 
  Users, 
  LayoutDashboard, 
  Menu, 
  X, 
  Database,
  ArrowRight,
  Compass,
  ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import AdminContentTab from "@/components/admin/AdminContentTab";
import AdminThemeTab from "@/components/admin/AdminThemeTab";
import AdminMediaTab from "@/components/admin/AdminMediaTab";
import AdminSettingsTab from "@/components/admin/AdminSettingsTab";
import AdminClientsTab from "@/components/admin/AdminClientsTab";

const tabs = [
  { id: "overview", label: "Visão Geral", icon: LayoutDashboard },
  { id: "content", label: "Conteúdo", icon: FileText },
  { id: "theme", label: "Cores / Tema", icon: Palette },
  { id: "media", label: "Mídia", icon: Music },
  { id: "clients", label: "Clientes", icon: Users },
  { id: "settings", label: "Configurações", icon: Settings },
];

interface AdminOverviewTabProps {
  clients: any[];
  media: any[];
  setActiveTab: (tab: string) => void;
}

const AdminOverviewTab = ({ clients, media, setActiveTab }: AdminOverviewTabProps) => {
  const totalClients = clients?.length || 0;
  const totalMedia = media?.length || 0;
  
  let totalPhotos = 0;
  let approvedPhotos = 0;
  
  clients?.forEach((client) => {
    if (client.photos) {
      totalPhotos += client.photos.length;
      approvedPhotos += client.photos.filter((p: any) => p.status === "liked").length;
    }
  });

  const mediaTypes = {
    audio: media?.filter(m => m.media_type === "audio").length || 0,
    video: media?.filter(m => m.media_type === "video").length || 0,
    image: media?.filter(m => m.media_type === "image").length || 0,
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-card border border-border/80 p-6 sm:p-8 shadow-gold">
        <div className="absolute right-0 bottom-0 opacity-5 pointer-events-none transform translate-y-1/4 translate-x-1/4">
          <LayoutDashboard size={240} className="text-primary" />
        </div>
        <div className="relative z-10 max-w-3xl">
          <span className="text-xs font-semibold text-primary uppercase tracking-widest bg-primary/10 px-2.5 py-1 rounded-full border border-primary/20">
            Painel Administrativo
          </span>
          <h1 className="font-display text-3xl sm:text-4xl text-foreground mt-4 mb-3 tracking-wide">
            Bem-vindo de volta!
          </h1>
          <p className="font-body text-sm sm:text-base text-muted-foreground leading-relaxed">
            Aqui você pode gerenciar os dados do site, alterar cores e fontes, adicionar arquivos ao seu portfólio de áudio/vídeo/imagem e criar novos cofres de seleção de fotos para os seus clientes.
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Clients Card */}
        <div 
          onClick={() => setActiveTab("clients")}
          className="bg-card border border-border/80 hover:border-primary/45 rounded-xl p-5 transition-all duration-300 cursor-pointer hover:-translate-y-1 hover:shadow-gold group"
        >
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <p className="text-xs font-body text-muted-foreground uppercase tracking-wider">Clientes Cadastrados</p>
              <h3 className="font-display text-4xl text-foreground font-semibold group-hover:text-primary transition-colors">{totalClients}</h3>
            </div>
            <div className="p-3 bg-secondary/80 rounded-lg group-hover:bg-primary/10 transition-colors">
              <Users size={20} className="text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-border/50 flex justify-between text-xs text-muted-foreground font-body">
            <span>{totalPhotos} fotos nos cofres</span>
            <span className="text-primary">{approvedPhotos} curtidas</span>
          </div>
        </div>

        {/* Media Card */}
        <div 
          onClick={() => setActiveTab("media")}
          className="bg-card border border-border/80 hover:border-primary/45 rounded-xl p-5 transition-all duration-300 cursor-pointer hover:-translate-y-1 hover:shadow-gold group"
        >
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <p className="text-xs font-body text-muted-foreground uppercase tracking-wider">Mídias no Portfólio</p>
              <h3 className="font-display text-4xl text-foreground font-semibold group-hover:text-primary transition-colors">{totalMedia}</h3>
            </div>
            <div className="p-3 bg-secondary/80 rounded-lg group-hover:bg-primary/10 transition-colors">
              <Music size={20} className="text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-border/50 flex justify-between text-xs text-muted-foreground font-body">
            <span>{mediaTypes.audio} áudios / {mediaTypes.video} vídeos</span>
            <span className="text-primary">{mediaTypes.image} imagens</span>
          </div>
        </div>

        {/* Theme Settings Card */}
        <div 
          onClick={() => setActiveTab("theme")}
          className="bg-card border border-border/80 hover:border-primary/45 rounded-xl p-5 transition-all duration-300 cursor-pointer hover:-translate-y-1 hover:shadow-gold group"
        >
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <p className="text-xs font-body text-muted-foreground uppercase tracking-wider">Design & Cores</p>
              <h3 className="font-display text-4xl text-foreground font-semibold group-hover:text-primary transition-colors">Ativo</h3>
            </div>
            <div className="p-3 bg-secondary/80 rounded-lg group-hover:bg-primary/10 transition-colors">
              <Palette size={20} className="text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-border/50 text-xs text-muted-foreground font-body">
            <span>Tema personalizado em execução</span>
          </div>
        </div>

        {/* Database Status Card */}
        <div className="bg-card border border-border/80 rounded-xl p-5 transition-all duration-300">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <p className="text-xs font-body text-muted-foreground uppercase tracking-wider">Status do Servidor</p>
              <h3 className="font-display text-4xl text-foreground font-semibold text-emerald-500">Conectado</h3>
            </div>
            <div className="p-3 bg-secondary/80 rounded-lg">
              <Database size={20} className="text-emerald-500" />
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-border/50 flex items-center gap-1.5 text-xs text-muted-foreground font-body">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Supabase Database Online</span>
          </div>
        </div>
      </div>

      {/* Quick Actions & System Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="bg-card border border-border/80 rounded-xl p-6 md:col-span-2 space-y-4">
          <h3 className="font-display text-xl tracking-wider text-foreground">Ações Rápidas</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button 
              onClick={() => setActiveTab("clients")}
              className="flex items-center justify-between p-4 rounded-lg bg-secondary/30 border border-border/60 hover:border-primary/30 hover:bg-secondary/60 transition-all text-left group"
            >
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">Gerenciar Clientes</p>
                <p className="text-xs text-muted-foreground font-body">Crie cofres e envie fotos de prova</p>
              </div>
              <ArrowRight size={16} className="text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
            </button>

            <button 
              onClick={() => setActiveTab("media")}
              className="flex items-center justify-between p-4 rounded-lg bg-secondary/30 border border-border/60 hover:border-primary/30 hover:bg-secondary/60 transition-all text-left group"
            >
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">Enviar Novo Portfólio</p>
                <p className="text-xs text-muted-foreground font-body">Publique Spot, Áudios ou Vídeos</p>
              </div>
              <ArrowRight size={16} className="text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
            </button>

            <button 
              onClick={() => setActiveTab("content")}
              className="flex items-center justify-between p-4 rounded-lg bg-secondary/30 border border-border/60 hover:border-primary/30 hover:bg-secondary/60 transition-all text-left group"
            >
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">Editar Conteúdo do Site</p>
                <p className="text-xs text-muted-foreground font-body">Altere textos de depoimentos e serviços</p>
              </div>
              <ArrowRight size={16} className="text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
            </button>

            <button 
              onClick={() => setActiveTab("settings")}
              className="flex items-center justify-between p-4 rounded-lg bg-secondary/30 border border-border/60 hover:border-primary/30 hover:bg-secondary/60 transition-all text-left group"
            >
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">Configurações Gerais</p>
                <p className="text-xs text-muted-foreground font-body">Altere contatos, logo e rodapés</p>
              </div>
              <ArrowRight size={16} className="text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
            </button>
          </div>
        </div>

        {/* System Info & Guide */}
        <div className="bg-card border border-border/80 rounded-xl p-6 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <h3 className="font-display text-xl tracking-wider text-foreground">Dica do Painel</h3>
            <div className="space-y-2 font-body text-xs text-muted-foreground leading-relaxed">
              <p>
                <strong>Prova de Clientes:</strong> Ao criar um cliente, defina um limite de fotos. Ele poderá curtir e aprovar as fotos de prova diretamente da área exclusiva.
              </p>
              <p>
                <strong>Tema:</strong> A aba de Cores e Temas permite alterar as variáveis HSL das cores principais e secundárias do site de forma prática.
              </p>
            </div>
          </div>
          
          <div className="pt-4 border-t border-border/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Compass size={14} className="text-primary" />
              <span className="text-[10px] uppercase font-semibold text-foreground font-body">Site Público</span>
            </div>
            <a 
              href="/" 
              target="_blank" 
              rel="noreferrer"
              className="text-xs text-primary hover:underline flex items-center gap-1 font-body font-medium"
            >
              Visualizar Site <ArrowRight size={12} />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

const Admin = () => {
  const navigate = useNavigate();
  const { data: isAdmin, isLoading } = useAdminCheck();
  const { data: clients = [] } = useClients();
  const { data: media = [] } = useAllPortfolioMedia();
  
  const [activeTab, setActiveTab] = useState("overview");
  const [user, setUser] = useState<any>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) navigate("/admin/login");
      else setUser(session.user);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) navigate("/admin/login");
      else setUser(session.user);
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    // Auto logout after 15 minutes of inactivity (900,000 ms)
    const INACTIVITY_TIMEOUT = 15 * 60 * 1000;
    let timeoutId: NodeJS.Timeout;

    const performAutoLogout = async () => {
      await supabase.auth.signOut();
      toast.warning("Sua sessão expirou por inatividade.");
      navigate("/admin/login");
    };

    const resetTimer = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(performAutoLogout, INACTIVITY_TIMEOUT);
    };

    const events = ["mousedown", "mousemove", "keypress", "scroll", "touchstart"];

    // Initialize timer
    resetTimer();

    // Attach listeners
    events.forEach((event) => {
      window.addEventListener(event, resetTimer);
    });

    return () => {
      clearTimeout(timeoutId);
      events.forEach((event) => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/admin/login");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground font-body">Carregando...</p>
      </div>
    );
  }

  if (isAdmin === false) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center">
          <Settings className="mx-auto text-muted-foreground mb-4" size={48} />
          <h1 className="font-display text-3xl text-foreground mb-2">Acesso Restrito</h1>
          <p className="font-body text-muted-foreground mb-6">
            Sua conta não possui permissão de administrador.
          </p>
          <p className="font-body text-xs text-muted-foreground mb-4">{user?.email}</p>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={handleLogout}>Sair</Button>
            <Button variant="outline" onClick={() => navigate("/")}>Voltar ao site</Button>
          </div>
        </div>
      </div>
    );
  }

  const getPageTitle = () => {
    const current = tabs.find(t => t.id === activeTab);
    return current ? current.label : "Painel";
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col lg:flex-row">
      {/* --- DESKTOP SIDEBAR --- */}
      <aside className="hidden lg:flex flex-col w-64 bg-card border-r border-border fixed top-0 bottom-0 left-0 z-30">
        {/* Brand/Logo */}
        <div className="px-6 h-16 border-b border-border flex flex-col justify-center">
          <div className="flex flex-col">
            <a href="/" className="font-display text-2xl tracking-wider text-gradient-gold">LIU RECORD</a>
            <span className="text-[9px] tracking-widest text-muted-foreground uppercase font-body">Painel Adm</span>
          </div>
        </div>

        {/* Sidebar Nav */}
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-body transition-all relative ${
                  isActive
                    ? "bg-secondary text-primary font-medium shadow-sm"
                    : "text-muted-foreground hover:bg-secondary/40 hover:text-foreground"
                }`}
              >
                {isActive && (
                  <span className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-primary rounded-r-full" />
                )}
                <Icon size={18} className={isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"} />
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* Profile / Logout Footer */}
        <div className="p-4 border-t border-border flex items-center gap-3 bg-secondary/10">
          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm border border-primary/20">
            {user?.email?.charAt(0).toUpperCase() || "A"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-foreground truncate">{user?.email}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-body">Administrador</p>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleLogout} 
            className="text-muted-foreground hover:text-destructive h-8 w-8 rounded-lg"
            title="Sair"
          >
            <LogOut size={16} />
          </Button>
        </div>
      </aside>

      {/* --- MOBILE HEADER & DRAWER --- */}
      {/* Mobile Top Bar */}
      <header className="lg:hidden flex items-center justify-between px-4 h-16 bg-card border-b border-border sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <a href="/" className="font-display text-xl tracking-wider text-gradient-gold">LIU RECORD</a>
          <span className="text-[9px] tracking-widest text-muted-foreground uppercase font-body bg-secondary px-2 py-0.5 rounded">Admin</span>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="h-9 w-9 rounded-md border border-border"
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </Button>
      </header>

      {/* Mobile Sidebar Backdrop Overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Drawer */}
      <aside className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-card border-r border-border flex flex-col transform transition-transform duration-300 ease-in-out lg:hidden ${
        mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      }`}>
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex flex-col">
            <span className="font-display text-xl tracking-wider text-gradient-gold">LIU RECORD</span>
            <span className="text-[9px] tracking-widest text-muted-foreground uppercase font-body">Painel Adm</span>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setMobileMenuOpen(false)}
            className="h-8 w-8 rounded-md"
          >
            <X size={18} />
          </Button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-body transition-all relative ${
                  isActive
                    ? "bg-secondary text-primary font-medium"
                    : "text-muted-foreground hover:bg-secondary/40"
                }`}
              >
                {isActive && (
                  <span className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-primary rounded-r-full" />
                )}
                <Icon size={18} className={isActive ? "text-primary" : "text-muted-foreground"} />
                {tab.label}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border flex items-center gap-3 bg-secondary/10">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs border border-primary/20">
            {user?.email?.charAt(0).toUpperCase() || "A"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-foreground truncate">{user?.email}</p>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleLogout} 
            className="text-muted-foreground hover:text-destructive h-8 w-8 rounded-lg"
          >
            <LogOut size={16} />
          </Button>
        </div>
      </aside>

      {/* --- CONTENT AREA --- */}
      <div className="flex-1 lg:pl-64 flex flex-col min-h-screen bg-background">
        {/* Top Header Bar for Desktop */}
        <header className="hidden lg:flex items-center justify-between px-8 h-16 border-b border-border/50 bg-card/30 sticky top-0 z-20 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <h2 className="font-display text-lg tracking-wider text-muted-foreground uppercase">
              Admin
            </h2>
            <ChevronRight size={14} className="text-muted-foreground/60" />
            <h2 className="font-display text-lg tracking-wider text-foreground">
              {getPageTitle()}
            </h2>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 px-3 py-1 bg-secondary/50 rounded-full border border-border text-xs text-muted-foreground font-body">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Conexão Supabase</span>
            </div>
            <div className="text-xs text-muted-foreground font-body">
              {user?.email}
            </div>
          </div>
        </header>

        {/* Main Content Pane */}
        <main className="flex-1 p-6 sm:p-8">
          {activeTab === "overview" && (
            <AdminOverviewTab 
              clients={clients} 
              media={media} 
              setActiveTab={setActiveTab} 
            />
          )}
          {activeTab === "content" && <AdminContentTab />}
          {activeTab === "theme" && <AdminThemeTab />}
          {activeTab === "media" && <AdminMediaTab />}
          {activeTab === "clients" && <AdminClientsTab />}
          {activeTab === "settings" && <AdminSettingsTab />}
        </main>
      </div>
    </div>
  );
};

export default Admin;
