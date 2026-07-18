import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Lock, Camera, Loader2, Key, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const ClientPortal = () => {
  const navigate = useNavigate();
  const [clientName, setClientName] = useState(() => localStorage.getItem("liurecord_client_name") || "");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName || !password) { toast.error("Preencha todos os campos."); return; }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("client-portal", {
        body: { action: "login", name: clientName.trim(), password: password.trim() },
      });
      if (error || !data?.token) {
        toast.error(data?.error || "Nome ou senha incorretos.");
        setLoading(false);
        return;
      }
      localStorage.setItem("liurecord_client_name", clientName.trim());
      sessionStorage.setItem(`client_token_${data.client.id}`, data.token);
      toast.success(`Bem-vindo, ${data.client.name}!`);
      setTimeout(() => navigate(`/galeria/${data.client.id}`), 400);
    } catch (err: any) {
      toast.error("Erro ao acessar: " + (err?.message || "desconhecido"));
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0c0a09] text-foreground flex flex-col">
      <Header />
      <main className="flex-1 flex items-center justify-center px-4 py-24 relative overflow-hidden">
        <div className="absolute top-1/3 left-1/3 w-80 h-80 bg-primary/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-1/3 right-1/3 w-80 h-80 bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
        <Card className="w-full max-w-md bg-card/60 border-border backdrop-blur-md shadow-2xl relative z-10">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-2">
              <Camera size={22} />
            </div>
            <CardTitle className="font-display text-xl text-foreground">Portal do Cliente</CardTitle>
            <CardDescription className="font-body text-xs text-muted-foreground mt-1">
              Acesse sua galeria para visualizar e selecionar suas fotos.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAccess} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-medium flex items-center gap-1.5"><User size={13} className="text-primary" /> Nome</label>
                <Input placeholder="Ex: João e Maria" className="bg-card/50 border-border" value={clientName} onChange={(e) => setClientName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium flex items-center gap-1.5"><Key size={13} className="text-primary" /> Senha</label>
                <Input type="password" placeholder="Digite sua senha" className="bg-card/50 border-border" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
              <Button type="submit" disabled={loading} className="w-full bg-gradient-gold text-primary-foreground font-semibold py-5 mt-2 flex items-center justify-center gap-2">
                {loading ? <><Loader2 className="animate-spin" size={16} /> Acessando...</> : <><Lock size={16} /> Entrar na Galeria</>}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
};

export default ClientPortal;
