import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useClients, useUpdateClients } from "@/hooks/useSiteContent";
import { toast } from "sonner";
import {
  Heart,
  X as XIcon,
  Download,
  Lock,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Check,
  Send,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface DownloadLog {
  id: string;
  photoId: string;
  filename: string;
  timestamp: string;
  ip: string;
}

interface ClientPhoto {
  id: string;
  original_url: string;
  thumbnail_url: string;
  filename: string;
  status: "pending" | "liked" | "disliked";
  released: boolean;
}

interface Client {
  id: string;
  name: string;
  password: string;
  watermarkText?: string;
  maxPhotos?: number;
  photos: ClientPhoto[];
  created_at: string;
  downloadLogs?: DownloadLog[];
}

const ClientGallery = () => {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const { data: clients = [], isLoading } = useClients();
  const updateClientsMutation = useUpdateClients();

  const [client, setClient] = useState<Client | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [saving, setSaving] = useState(false);

  // Lightbox / Zoom state
  const [zoomIndex, setZoomIndex] = useState<number | null>(null);

  useEffect(() => {
    if (clients.length > 0 && clientId) {
      const found = clients.find((c) => c.id === clientId);
      if (found) {
        setClient(found);
        // Check if already logged in (temp storage for current session)
        const sessionAuth = sessionStorage.getItem(`auth_client_${clientId}`);
        if (sessionAuth === "true") {
          setIsAuthenticated(true);
        }
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
      toast.error("Senha incorreta. Tente novamente.");
    }
  };

  const handlePhotoAction = async (photoId: string, action: "liked" | "disliked" | "pending") => {
    if (!client) return;

    if (action === "liked" && client.maxPhotos) {
      const photoToLike = client.photos.find((p) => p.id === photoId);
      if (photoToLike && !photoToLike.released) {
        const unreleasedLikedCount = client.photos.filter((p) => p.status === "liked" && !p.released).length;
        const currentlyLiked = photoToLike.status === "liked";
        if (!currentlyLiked && unreleasedLikedCount >= client.maxPhotos) {
          toast.error(`Você atingiu o limite de ${client.maxPhotos} fotos escolhidas.`);
          return;
        }
      }
    }

    // optimistic update
    const updatedPhotos = client.photos.map((p) =>
      p.id === photoId ? { ...p, status: action } : p
    );
    const updatedClient = { ...client, photos: updatedPhotos };
    setClient(updatedClient);

    setSaving(true);
    try {
      const updatedClients = clients.map((c) =>
        c.id === client.id ? updatedClient : c
      );
      await updateClientsMutation.mutateAsync(updatedClients);
    } catch (err) {
      toast.error("Erro ao salvar sua escolha. Verifique sua conexão.");
    } finally {
      setSaving(false);
    }
  };

  const notifySelection = () => {
    if (!client) return;
    const likedPhotos = client.photos.filter((p) => p.status === "liked");
    const total = client.photos.length;
    const text = `Olá! Concluí a seleção de fotos na galeria "${client.name}". Escolhi ${likedPhotos.length} fotos de um total de ${total}.`;
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(whatsappUrl, "_blank");
  };

  const fetchIp = async (): Promise<string> => {
    try {
      const res = await fetch("https://api.ipify.org?format=json");
      const data = await res.json();
      return data.ip || "IP Indisponível";
    } catch {
      return "IP Indisponível";
    }
  };

  const triggerDownload = async (photo: ClientPhoto) => {
    if (!client) return;

    const confirmDownload = window.confirm(
      `Deseja baixar a foto original "${photo.filename || "foto.jpg"}" em alta resolução?`
    );
    if (!confirmDownload) return;

    setSaving(true);
    const ip = await fetchIp();
    const timestamp = new Date().toLocaleString("pt-BR");

    const logEntry: DownloadLog = {
      id: crypto.randomUUID(),
      photoId: photo.id,
      filename: photo.filename,
      timestamp,
      ip
    };

    const currentLogs = client.downloadLogs || [];
    const updatedClient = {
      ...client,
      downloadLogs: [logEntry, ...currentLogs]
    };

    setClient(updatedClient);

    try {
      const updatedClients = clients.map((c) =>
        c.id === client.id ? updatedClient : c
      );
      await updateClientsMutation.mutateAsync(updatedClients);
    } catch (err) {
      console.error("Erro ao registrar log de download:", err);
    } finally {
      setSaving(false);
    }

    try {
      // Direct file download trick by opening original url
      const link = document.createElement("a");
      link.href = photo.original_url;
      link.target = "_blank";
      link.download = photo.filename || "foto.jpg";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Download iniciado.");
    } catch {
      window.open(photo.original_url, "_blank");
    }
  };

  // Lightbox Navigation
  const handlePrevPhoto = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (zoomIndex === null || !client) return;
    const nextIdx = zoomIndex === 0 ? client.photos.length - 1 : zoomIndex - 1;
    setZoomIndex(nextIdx);
  };

  const handleNextPhoto = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (zoomIndex === null || !client) return;
    const nextIdx = zoomIndex === client.photos.length - 1 ? 0 : zoomIndex + 1;
    setZoomIndex(nextIdx);
  };

  // Keyboard navigation for Lightbox
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (zoomIndex === null) return;
      if (e.key === "ArrowLeft") handlePrevPhoto();
      if (e.key === "ArrowRight") handleNextPhoto();
      if (e.key === "Escape") setZoomIndex(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [zoomIndex]);

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
        <p className="font-body text-muted-foreground mb-6">O link que você acessou está incorreto ou foi removido.</p>
        <Button onClick={() => navigate("/")} className="bg-gradient-gold text-primary-foreground font-body">
          Voltar ao site
        </Button>
      </div>
    );
  }

  // PASSWORD LOGIN VIEW
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0c0a09] flex items-center justify-center px-4 relative overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-[120px] pointer-events-none" />

        <Card className="w-full max-w-md bg-card/60 border-border backdrop-blur-md shadow-2xl relative z-10">
          <CardHeader className="text-center">
            <h1 className="font-display text-2xl tracking-wider text-gradient-gold mb-2">LIU RECORD</h1>
            <CardTitle className="font-display text-lg text-foreground mt-4">Acesso à Galeria</CardTitle>
            <CardDescription className="font-body text-xs text-muted-foreground mt-1">
              Olá, <span className="text-foreground font-medium">{client.name}</span>.<br />
              Por favor, insira a senha fornecida pelo fotógrafo para visualizar e escolher suas fotos.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Input
                  type="password"
                  placeholder="Insira a senha"
                  className="bg-card/50 border-border font-body text-center tracking-widest text-lg py-5"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  autoFocus
                />
              </div>
              <Button type="submit" className="w-full bg-gradient-gold text-primary-foreground font-body font-semibold py-5">
                Acessar Minhas Fotos
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // GALLERY VIEW (AUTHENTICATED)
  const photosCount = client.photos?.length || 0;
  const likedPhotos = client.photos?.filter((p) => p.status === "liked") || [];
  const unreleasedLikedPhotos = client.photos?.filter((p) => p.status === "liked" && !p.released) || [];
  const dislikedPhotos = client.photos?.filter((p) => p.status === "disliked") || [];
  const releasedPhotos = client.photos?.filter((p) => p.released) || [];

  return (
    <div className="min-h-screen bg-[#0c0a09] text-foreground font-body pb-12">
      {/* HEADER */}
      <header className="border-b border-border bg-card/50 sticky top-0 z-40 backdrop-blur">
        <div className="container mx-auto px-4 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 self-start md:self-auto">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="text-muted-foreground hover:text-foreground">
              <ArrowLeft size={18} />
            </Button>
            <div>
              <h1 className="font-display text-lg tracking-wider text-gradient-gold leading-none">LIU RECORD</h1>
              <p className="text-[11px] font-body text-muted-foreground mt-1">Cliente: {client.name}</p>
            </div>
          </div>

          {/* Sync status */}
          <div className="flex items-center gap-4">
            {saving ? (
              <span className="text-xs text-muted-foreground flex items-center gap-1.5 font-body">
                <Loader2 className="animate-spin text-primary" size={12} /> Salvando escolha...
              </span>
            ) : (
              <span className="text-xs text-green-400 flex items-center gap-1.5 font-body">
                <Check size={12} /> Escolhas salvas
              </span>
            )}

            <Button
              onClick={notifySelection}
              className="bg-green-600 hover:bg-green-700 text-white font-body font-medium text-xs flex items-center gap-1.5"
            >
              <Send size={12} /> Concluir e Enviar
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* WELCOME / STATS CARD */}
        <Card className="bg-card/30 border-border backdrop-blur">
          <CardContent className="p-6 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <h2 className="font-display text-xl text-foreground">Sua Seleção de Fotos</h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Navegue pelas miniaturas abaixo. Use o botão de <strong>Coração (❤️)</strong> nas fotos que você mais gostou e deseja que sejam editadas/entregues. Use o <strong>X (❌)</strong> para dispensar. Clique em qualquer foto para ampliá-la em tela cheia.
              </p>
              {client.maxPhotos && (
                <p className="text-xs text-amber-500 font-medium font-body">
                  Atenção: Você pode escolher no máximo <strong>{client.maxPhotos}</strong> foto{client.maxPhotos !== 1 && "s"}.
                </p>
              )}
              <p className="text-[11px] text-primary bg-primary/5 px-2.5 py-1.5 rounded-md border border-primary/10 max-w-fit mt-2">
                As fotos possuem marca d'água provisória. Quando o fotógrafo liberar, o botão de download ficará disponível para baixar o original de alta resolução sem marca d'água.
              </p>
            </div>

            {/* QUICK COUNTERS */}
            <div className="flex flex-wrap gap-3 w-full lg:w-auto">
              <div className="bg-secondary/40 border border-border rounded-lg px-4 py-3 text-center min-w-[90px] flex-1 lg:flex-none">
                <span className="block text-[10px] text-muted-foreground uppercase font-semibold">Total</span>
                <span className="text-xl font-display font-bold text-foreground">{photosCount}</span>
              </div>
              <div className="bg-rose-950/20 border border-rose-900/30 rounded-lg px-4 py-3 text-center min-w-[90px] flex-1 lg:flex-none">
                <span className="block text-[10px] text-rose-400 uppercase font-semibold">Escolhidas</span>
                <span className="text-xl font-display font-bold text-rose-500">
                  {client.maxPhotos ? unreleasedLikedPhotos.length : likedPhotos.length}
                  {client.maxPhotos ? ` / ${client.maxPhotos}` : ""}
                </span>
              </div>
              <div className="bg-red-950/15 border border-red-900/20 rounded-lg px-4 py-3 text-center min-w-[90px] flex-1 lg:flex-none">
                <span className="block text-[10px] text-red-400 uppercase font-semibold">Recusadas</span>
                <span className="text-xl font-display font-bold text-red-400">{dislikedPhotos.length}</span>
              </div>
              <div className="bg-green-950/20 border border-green-900/30 rounded-lg px-4 py-3 text-center min-w-[90px] flex-1 lg:flex-none">
                <span className="block text-[10px] text-green-400 uppercase font-semibold">Liberadas</span>
                <span className="text-xl font-display font-bold text-green-400">{releasedPhotos.length}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* PHOTO GRID */}
        {photosCount === 0 ? (
          <div className="text-center py-16 text-muted-foreground border border-border bg-card/10 rounded-lg">
            Nenhuma foto disponível nesta galeria no momento. Entre em contato com o fotógrafo.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {client.photos.map((photo, index) => {
              const isLiked = photo.status === "liked";
              const isDisliked = photo.status === "disliked";

              return (
                <Card
                  key={photo.id}
                  className={`bg-card border overflow-hidden relative flex flex-col justify-between group/card transition-all duration-300 ${
                    isLiked
                      ? "border-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.1)]"
                      : isDisliked
                      ? "border-border/30 opacity-50"
                      : "border-border hover:border-primary/30"
                  }`}
                >
                  {/* Thumbnail Container */}
                  <div
                    className="aspect-square bg-muted relative overflow-hidden cursor-zoom-in"
                    onClick={() => setZoomIndex(index)}
                  >
                    <img
                      src={photo.thumbnail_url}
                      alt={photo.filename}
                      className="object-cover w-full h-full transition-transform duration-300 group-hover/card:scale-105"
                      loading="lazy"
                    />

                    {/* Magnifier overlay button */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/card:opacity-100 flex items-center justify-center transition-opacity duration-200">
                      <Maximize2 className="text-white drop-shadow" size={20} />
                    </div>

                    {/* Left corner status badge */}
                    <div className="absolute top-2 left-2">
                      {isLiked && (
                        <Badge className="bg-rose-600 hover:bg-rose-600 border-none text-[9px] py-0 px-1.5 flex items-center gap-0.5">
                          <Heart size={8} className="fill-white" /> Escolhida
                        </Badge>
                      )}
                      {isDisliked && (
                        <Badge className="bg-zinc-800 hover:bg-zinc-800 text-zinc-400 border-none text-[9px] py-0 px-1.5">
                          Recusada
                        </Badge>
                      )}
                    </div>

                    {/* Released for download badge icon */}
                    {photo.released && (
                      <div className="absolute top-2 right-2 bg-green-500 text-white rounded-full p-1 shadow animate-pulse">
                        <Download size={10} />
                      </div>
                    )}
                  </div>

                  {/* Actions buttons */}
                  <div className="p-2.5 flex items-center gap-1.5 justify-between bg-card/80 border-t border-border/50">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handlePhotoAction(photo.id, isLiked ? "pending" : "liked")}
                        className={`p-1.5 rounded-full border transition-all duration-200 ${
                          isLiked
                            ? "bg-rose-600 border-rose-600 text-white"
                            : "bg-secondary border-border text-muted-foreground hover:text-rose-500 hover:bg-rose-950/20"
                        }`}
                        title="Quero esta foto (Gostei)"
                      >
                        <Heart size={14} className={isLiked ? "fill-white" : ""} />
                      </button>
                      <button
                        onClick={() => handlePhotoAction(photo.id, isDisliked ? "pending" : "disliked")}
                        className={`p-1.5 rounded-full border transition-all duration-200 ${
                          isDisliked
                            ? "bg-zinc-700 border-zinc-700 text-white"
                            : "bg-secondary border-border text-muted-foreground hover:text-red-400 hover:bg-red-950/20"
                        }`}
                        title="Não quero esta foto"
                      >
                        <XIcon size={14} />
                      </button>
                    </div>

                    {/* Download option */}
                    {photo.released ? (
                      <Button
                        size="sm"
                        onClick={() => triggerDownload(photo)}
                        className="bg-green-600 hover:bg-green-700 text-white font-body text-[10px] h-7 px-2 flex items-center gap-1"
                      >
                        <Download size={11} /> Baixar
                      </Button>
                    ) : (
                      <span className="text-[10px] text-muted-foreground font-body select-none">
                        Aguardando liberação
                      </span>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      {/* FULL SCREEN LIGHTBOX MODAL */}
      {zoomIndex !== null && client.photos[zoomIndex] && (
        <div
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex flex-col justify-between select-none"
          onClick={() => setZoomIndex(null)}
        >
          {/* Top Bar inside modal */}
          <div className="p-4 flex items-center justify-between text-white bg-gradient-to-b from-black/80 to-transparent">
            <div>
              <p className="font-body text-xs text-zinc-400">{client.photos[zoomIndex].filename}</p>
              <p className="font-body text-[10px] text-zinc-500">
                Foto {zoomIndex + 1} de {photosCount}
              </p>
            </div>
            <button
              onClick={() => setZoomIndex(null)}
              className="p-1.5 bg-zinc-900 rounded-full hover:bg-zinc-800 text-zinc-300 hover:text-white"
            >
              <XIcon size={20} />
            </button>
          </div>

          {/* Core Image Slide area */}
          <div className="flex-1 flex items-center justify-between px-4 relative max-h-[80vh] md:max-h-[85vh]">
            {/* Left navigation arrow */}
            <button
              onClick={handlePrevPhoto}
              className="p-2.5 bg-zinc-900/60 rounded-full hover:bg-zinc-900 text-zinc-300 hover:text-white transition-colors absolute left-4 z-10"
            >
              <ChevronLeft size={24} />
            </button>

            {/* Image display */}
            <div className="mx-auto max-w-[90%] max-h-full flex items-center justify-center relative">
              <img
                src={client.photos[zoomIndex].thumbnail_url}
                alt="Ampliada"
                className="max-w-full max-h-[75vh] object-contain rounded select-none shadow-2xl"
                onClick={(e) => e.stopPropagation()} // Prevent closing on image click
              />
            </div>

            {/* Right navigation arrow */}
            <button
              onClick={handleNextPhoto}
              className="p-2.5 bg-zinc-900/60 rounded-full hover:bg-zinc-900 text-zinc-300 hover:text-white transition-colors absolute right-4 z-10"
            >
              <ChevronRight size={24} />
            </button>
          </div>

          {/* Bottom Bar inside modal: Actions */}
          <div
            className="p-6 bg-gradient-to-t from-black/85 to-transparent flex flex-col items-center gap-3"
            onClick={(e) => e.stopPropagation()} // Prevent close
          >
            <div className="flex items-center gap-4">
              {/* Liked state */}
              <button
                onClick={() =>
                  handlePhotoAction(
                    client.photos[zoomIndex].id,
                    client.photos[zoomIndex].status === "liked" ? "pending" : "liked"
                  )
                }
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-body font-semibold text-xs transition-all ${
                  client.photos[zoomIndex].status === "liked"
                    ? "bg-rose-600 border border-rose-600 text-white shadow-lg shadow-rose-600/20"
                    : "bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-rose-500 hover:bg-rose-950/20"
                }`}
              >
                <Heart size={14} className={client.photos[zoomIndex].status === "liked" ? "fill-white" : ""} />
                {client.photos[zoomIndex].status === "liked" ? "Escolhida" : "Escolher esta foto"}
              </button>

              {/* Disliked state */}
              <button
                onClick={() =>
                  handlePhotoAction(
                    client.photos[zoomIndex].id,
                    client.photos[zoomIndex].status === "disliked" ? "pending" : "disliked"
                  )
                }
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-body font-semibold text-xs transition-all ${
                  client.photos[zoomIndex].status === "disliked"
                    ? "bg-zinc-700 border border-zinc-700 text-white"
                    : "bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-red-400 hover:bg-red-950/20"
                }`}
              >
                <XIcon size={14} />
                {client.photos[zoomIndex].status === "disliked" ? "Recusada" : "Recusar esta foto"}
              </button>

              {/* Download option */}
              {client.photos[zoomIndex].released && (
                <Button
                  onClick={() => triggerDownload(client.photos[zoomIndex])}
                  className="bg-green-600 hover:bg-green-700 text-white font-body font-semibold text-xs px-5 py-2.5 rounded-full flex items-center gap-1.5"
                >
                  <Download size={14} /> Baixar Original
                </Button>
              )}
            </div>

            {/* Quick Helper text */}
            <p className="text-[10px] text-zinc-500 font-body">
              Você também pode usar as setas ◄ e ► do teclado para navegar. ESC para fechar.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientGallery;
