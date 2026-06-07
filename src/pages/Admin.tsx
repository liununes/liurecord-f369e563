import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAdminCheck } from "@/hooks/useSiteContent";
import { LogOut, FileText, Palette, Music, Settings, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import AdminContentTab from "@/components/admin/AdminContentTab";
import AdminThemeTab from "@/components/admin/AdminThemeTab";
import AdminMediaTab from "@/components/admin/AdminMediaTab";
import AdminSettingsTab from "@/components/admin/AdminSettingsTab";
import AdminClientsTab from "@/components/admin/AdminClientsTab";

const tabs = [
  { id: "content", label: "Conteúdo", icon: FileText },
  { id: "theme", label: "Cores / Tema", icon: Palette },
  { id: "media", label: "Mídia", icon: Music },
  { id: "clients", label: "Clientes", icon: Users },
  { id: "settings", label: "Configurações", icon: Settings },
];

const Admin = () => {
  const navigate = useNavigate();
  const { data: isAdmin, isLoading } = useAdminCheck();
  const [activeTab, setActiveTab] = useState("content");
  const [user, setUser] = useState<any>(null);

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

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/" className="font-display text-xl tracking-wider text-gradient-gold">LIU RECORD</a>
            <span className="text-xs font-body text-muted-foreground bg-secondary px-2 py-0.5 rounded">Admin</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground font-body hidden sm:inline">{user?.email}</span>
            <Button variant="ghost" size="icon" onClick={handleLogout} title="Sair">
              <LogOut size={18} />
            </Button>
          </div>
        </div>
      </header>

      <div className="border-b border-border bg-card/50">
        <div className="container mx-auto px-4 flex gap-1 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-body border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <main className="container mx-auto px-4 py-6">
        {activeTab === "content" && <AdminContentTab />}
        {activeTab === "theme" && <AdminThemeTab />}
        {activeTab === "media" && <AdminMediaTab />}
        {activeTab === "clients" && <AdminClientsTab />}
        {activeTab === "settings" && <AdminSettingsTab />}
      </main>
    </div>
  );
};

export default Admin;
