import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useAdminCheck } from "@/hooks/useSiteContent";
import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";

const RequireAdmin = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();
  const [sessionChecked, setSessionChecked] = useState(false);
  const [userEmail, setUserEmail] = useState<string | undefined>(undefined);
  const { data: isAdmin, isLoading } = useAdminCheck();

  useEffect(() => {
    let mounted = true;
    const handleSession = (session: Session | null) => {
      if (!mounted) return;
      if (!session) {
        navigate("/admin/login");
      } else {
        setUserEmail(session.user?.email);
        setSessionChecked(true);
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => handleSession(session));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      handleSession(session);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [navigate]);

  if (!sessionChecked || isLoading) {
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
          <p className="font-body text-xs text-muted-foreground mb-4">{userEmail}</p>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={() => supabase.auth.signOut().then(() => navigate("/admin/login"))}>
              Sair
            </Button>
            <Button variant="outline" onClick={() => navigate("/")}>Voltar ao site</Button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default RequireAdmin;