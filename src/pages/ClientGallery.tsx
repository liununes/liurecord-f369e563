import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useClients, useUpdateClients } from "@/hooks/useSiteContent";
import { toast } from "sonner";
import { Heart, X as XIcon, Download, ArrowLeft, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const ClientGallery = () => {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const { data: clients = [], isLoading } = useClients();
  const updateClients = useUpdateClients();

  const [client, setClient] = useState<any>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const photos = client?.photos || [];

  useEffect(() => {
    if (clients.length > 0 && clientId) {
      const found = clients.find((c: any) => c.id === clientId);
      if (found) {
        setClient(found);
        const sessionAuth = sessionStorage.getItem(`auth_client_${clientId}`);
        if (sessionAuth === "true") setIsAuthenticated(true);
      }
    }
  }, [clients, clientId]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!client) return;
    if (passwordInput.trim() === client.password) {
      setIsAuthenticated(true);
      sessionStorage.setItem(`auth_client_${client.id}`, "true");
      toast.success("Acesso liberado!");
    } else {
      toast.error("Senha incorreta.");
    }
  };

  const toggleLike = async (photoId: string) => {
    if (!client || saving) return;

    const newPhotos = client.photos.map((p: any) =>
      p.id === photoId ? { ...p, status: p.status === "liked" ? "pending" : "liked" } : p
    );
    const updatedClient = { ...client, photos: newPhotos };
    const updatedClients = clients.map((c: any) => c.id === client.id ? updatedClient : c);

    setClient(updatedClient);
    setSaving(true);

    try {
      await updateClients.mutateAsync(updatedClients);
      toast.success("Escolha salva!");
    } catch (err: any) {
      setClient(client);
      toast.error("Erro ao salvar. Tente novamente.");
    }
    setSaving(false);
  };

  const downloadPhoto = async (photo: any) => {
    if (!photo.original_url) {
      toast.error("URL da foto não disponível.");
      return;
    }

    setDownloadingId(photo.id);

    try {
      const res = await fetch(photo.original_url);
      if (!res.ok) throw new Error(`Falha no servidor: ${res.status}`);
      const blob = await res.blob();
      if (blob.size === 0) throw new Error("Arquivo vazio");

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = photo.filename || "foto.jpg";
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 3000);

      toast.success("Download iniciado.");
    } catch (err: any) {
      console.error("Download via fetch falhou:", err);

      // Fallback 1: link direto
      try {
        const link = document.createElement("a");
        link.href = photo.original_url;
        link.download = photo.filename || "foto.jpg";
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.style.display = "none";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("Download iniciado.");
      } catch {
        // Fallback 2: abrir em nova aba
        window.open(photo.original_url, "_blank");
        toast.info("Salve a imagem manualmente (clique direito > Salvar como).");
      }
    } finally {
      setDownloadingId(null);
    }
  };

  const sendWhatsApp = () => {
    const liked = photos.filter((p: any) => p.status === "liked");
    const text = `Olá! Concluí a seleção. Escolhi ${liked.length} fotos de ${photos.length} total.`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, "_blank");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0c0a09] flex flex-col items-center justify-center text-muted-foreground font-body">
        <Loader2 className="animate-spin text-primary mb-4" size={36} />
        <p>Carregando galeria...</p>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="min-h-screen bg-[#0c0a09] flex flex-col items-center justify-center px-4 text-center">
        <h1 className="font-display text-2xl text-foreground mb-2">Galeria não encontrada</h1>
        <p className="font-body text-muted-foreground mb-6">Link incorreto ou removido.</p>
        <Button onClick={() => navigate("/")} className="bg-gradient-gold text-primary-foreground font-body">Voltar</Button>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0c0a09] flex items-center justify-center px-4 relative overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
        <div className="w-full max-w-md bg-card/60 border border-border backdrop-blur-md shadow-2xl rounded-lg p-8 relative z-10">
          <h1 className="font-display text-2xl tracking-wider text-gradient-gold text-center mb-1">LIU RECORD</h1>
          <p className="font-display text-lg text-foreground text-center mt-4 mb-1">Acesso à Galeria</p>
          <p className="font-body text-xs text-muted-foreground text-center mb-6">
            Olá, <span className="text-foreground font-medium">{client.name}</span>. Insira a senha.
          </p>
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              autoComplete="new-password"
              placeholder="Insira a senha"
              className="w-full bg-card/50 border border-border font-body text-center tracking-widest text-lg py-3 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              autoFocus
            />
            <Button type="submit" className="w-full bg-gradient-gold text-primary-foreground font-body font-semibold py-5">Acessar</Button>
          </form>
        </div>
      </div>
    );
  }

  const likedCount = photos.filter((p: any) => p.status === "liked").length;

  return (
    <div className="min-h-screen bg-[#0c0a09] text-foreground font-body pb-12">
      <header className="border-b border-border bg-card/50 sticky top-0 z-40 backdrop-blur">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="text-muted-foreground hover:text-foreground">
              <ArrowLeft size={18} />
            </Button>
            <div>
              <h1 className="font-display text-lg tracking-wider text-gradient-gold leading-none">LIU RECORD</h1>
              <p className="text-[11px] font-body text-muted-foreground mt-1">{client.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground font-body">
              <Heart size={12} className="inline text-rose-500" /> {likedCount} escolhida{likedCount !== 1 && "s"}
            </span>
            <Button onClick={sendWhatsApp} className="bg-green-600 hover:bg-green-700 text-white font-body text-xs flex items-center gap-1.5">
              Enviar Seleção
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {client.max_photos && (
          <p className="text-xs text-amber-500 font-medium font-body mb-4">
            Máximo de <strong>{client.max_photos}</strong> foto{client.max_photos !== 1 && "s"}.
          </p>
        )}

        {photos.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground border border-border bg-card/10 rounded-lg">
            Nenhuma foto disponível.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {photos.map((photo: any, index: number) => {
              const isLiked = photo.status === "liked";
              return (
                <div
                  key={photo.id}
                  className={`bg-card border overflow-hidden rounded-lg flex flex-col transition-all duration-300 ${
                    isLiked ? "border-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.1)]" : "border-border hover:border-primary/30"
                  }`}
                >
                  <div className="aspect-square bg-muted relative overflow-hidden cursor-pointer" onClick={() => setLightboxIndex(index)}>
                    <img src={photo.thumbnail_url} alt={photo.filename} className="object-cover w-full h-full" loading="lazy" />
                    {isLiked && (
                      <div className="absolute top-2 left-2 bg-rose-600 text-white rounded px-1.5 py-0.5 text-[9px] font-body flex items-center gap-0.5">
                        <Heart size={8} className="fill-white" /> Escolhida
                      </div>
                    )}
                    {photo.released && (
                      <div className="absolute top-2 right-2 bg-green-500 text-white rounded-full p-1 shadow">
                        <Download size={10} />
                      </div>
                    )}
                  </div>
                  <div className="p-2 flex items-center justify-between bg-card/80 border-t border-border/50">
                    <button
                      onClick={() => toggleLike(photo.id)}
                      disabled={saving}
                      className={`p-1.5 rounded-full border transition-all ${
                        isLiked
                          ? "bg-rose-600 border-rose-600 text-white"
                          : "bg-secondary border-border text-muted-foreground hover:text-rose-500"
                      }`}
                    >
                      {saving ? <Loader2 size={14} className="animate-spin" /> : <Heart size={14} className={isLiked ? "fill-white" : ""} />}
                    </button>
                    {photo.released ? (
                      <Button
                        size="sm"
                        onClick={() => downloadPhoto(photo)}
                        disabled={downloadingId === photo.id}
                        className="bg-green-600 hover:bg-green-700 text-white text-[10px] h-7 px-2"
                      >
                        {downloadingId === photo.id ? (
                          <Loader2 size={11} className="animate-spin" />
                        ) : (
                          <Download size={11} />
                        )}{" "}
                        {downloadingId === photo.id ? "Baixando..." : "Baixar"}
                      </Button>
                    ) : (
                      <span className="text-[10px] text-muted-foreground">Aguardando</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* LIGHTBOX */}
      {lightboxIndex !== null && photos[lightboxIndex] && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex flex-col justify-between" onClick={() => setLightboxIndex(null)}>
          <div className="p-4 flex items-center justify-between text-white bg-gradient-to-b from-black/80 to-transparent">
            <div>
              <p className="font-body text-xs text-zinc-400">{photos[lightboxIndex].filename}</p>
              <p className="font-body text-[10px] text-zinc-500">{lightboxIndex + 1} de {photos.length}</p>
            </div>
            <button onClick={() => setLightboxIndex(null)} className="p-1.5 bg-zinc-900 rounded-full hover:bg-zinc-800 text-zinc-300">
              <XIcon size={20} />
            </button>
          </div>

          <div className="flex-1 flex items-center justify-center px-4 relative">
            <button onClick={(e) => { e.stopPropagation(); setLightboxIndex(lightboxIndex === 0 ? photos.length - 1 : lightboxIndex - 1); }} className="p-2.5 bg-zinc-900/60 rounded-full hover:bg-zinc-900 text-zinc-300 absolute left-4">
              <ChevronLeft size={24} />
            </button>
            <img src={photos[lightboxIndex].original_url} alt="Ampliada" className="max-w-[90%] max-h-[80vh] object-contain rounded shadow-2xl" onClick={(e) => e.stopPropagation()} />
            <button onClick={(e) => { e.stopPropagation(); setLightboxIndex(lightboxIndex === photos.length - 1 ? 0 : lightboxIndex + 1); }} className="p-2.5 bg-zinc-900/60 rounded-full hover:bg-zinc-900 text-zinc-300 absolute right-4">
              <ChevronRight size={24} />
            </button>
          </div>

          <div className="p-6 bg-gradient-to-t from-black/85 to-transparent flex items-center justify-center gap-4" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => toggleLike(photos[lightboxIndex].id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-body font-semibold text-xs transition-all ${
                photos[lightboxIndex].status === "liked"
                  ? "bg-rose-600 text-white"
                  : "bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-rose-500"
              }`}
            >
              <Heart size={14} className={photos[lightboxIndex].status === "liked" ? "fill-white" : ""} />
              {photos[lightboxIndex].status === "liked" ? "Escolhida" : "Escolher"}
            </button>
            {photos[lightboxIndex].released && (
              <Button
                onClick={() => downloadPhoto(photos[lightboxIndex])}
                disabled={downloadingId === photos[lightboxIndex].id}
                className="bg-green-600 hover:bg-green-700 text-white font-body text-xs px-5 py-2.5 rounded-full"
              >
                {downloadingId === photos[lightboxIndex].id ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Download size={14} />
                )}{" "}
                {downloadingId === photos[lightboxIndex].id ? "Baixando..." : "Baixar Original"}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientGallery;
