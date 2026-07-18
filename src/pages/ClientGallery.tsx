import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useClients, useUpdateClients } from "@/hooks/useSiteContent";
import { toast } from "sonner";
import { X as XIcon, Download, ArrowLeft, ChevronLeft, ChevronRight, Loader2, Send, CheckCircle2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

const ClientGallery = () => {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: clients = [], isLoading } = useClients();
  const updateClients = useUpdateClients();

  const [client, setClient] = useState<any>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [requestingIds, setRequestingIds] = useState<Set<string>>(new Set());

  const clientRef = useRef(client);
  const clientIdRef = useRef(clientId);
  const clientsRef = useRef(clients);
  const maxPhotosRef = useRef(0);

  useEffect(() => { clientRef.current = client; }, [client]);
  useEffect(() => { clientIdRef.current = clientId; }, [clientId]);
  useEffect(() => { clientsRef.current = clients; }, [clients]);
  useEffect(() => { maxPhotosRef.current = client?.max_photos || 0; }, [client?.max_photos]);

  const photos = client?.photos || [];
  const maxPhotos = client?.max_photos || 0;
  const downloadedCount = photos.filter((p: any) => p.downloaded).length;
  const hasReachedLimit = maxPhotos > 0 && downloadedCount >= maxPhotos;
  const pendingRequests = client?.pending_requests || [];
  const hasPendingRequest = pendingRequests.length > 0;

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

  const markDownloaded = useCallback(async (photoId: string): Promise<boolean> => {
    const freshClients = queryClient.getQueryData<any[]>(["clients_data"]);
    if (!freshClients) return false;

    const freshClient = freshClients.find((c: any) => c.id === clientIdRef.current);
    if (!freshClient) return false;

    const photoData = freshClient.photos?.find((p: any) => p.id === photoId);
    if (photoData?.downloaded) return true;

    const newPhotos = (freshClient.photos || []).map((p: any) =>
      p.id === photoId ? { ...p, downloaded: true } : p
    );
    const updatedClient = { ...freshClient, photos: newPhotos };
    const updatedClients = freshClients.map((c: any) => c.id === updatedClient.id ? updatedClient : c);

    queryClient.setQueryData(["clients_data"], updatedClients);
    setClient(updatedClient);

    try {
      await updateClients.mutateAsync(updatedClients);
      return true;
    } catch {
      toast.error("Erro ao salvar registro de download.");
      queryClient.setQueryData(["clients_data"], freshClients);
      setClient(freshClient);
      return false;
    }
  }, [queryClient, updateClients]);

  const downloadPhoto = useCallback(async (photo: any) => {
    if (!photo.original_url) {
      toast.error("URL da foto não disponível.");
      return;
    }

    if (photo.downloaded && !photo.released) {
      toast.error("Essa foto já foi baixada. Aguarde liberação do administrador para baixar novamente.");
      return;
    }

    const currentMax = maxPhotosRef.current;
    if (currentMax > 0 && !photo.downloaded && !photo.released) {
      const currentClient = clientRef.current;
      const currentDownloaded = (currentClient?.photos || []).filter((p: any) => p.downloaded).length;
      if (currentDownloaded >= currentMax) {
        toast.error(`Limite de ${currentMax} foto${currentMax !== 1 ? "s" : ""} atingido. Solicite autorização para baixar mais.`);
        return;
      }
    }

    setDownloadingId(photo.id);

    try {
      const saved = await markDownloaded(photo.id);
      if (!saved) {
        setDownloadingId(null);
        return;
      }

      const fileName = photo.filename || "foto.jpg";
      const separator = photo.original_url.includes("?") ? "&" : "?";
      const downloadUrl = `${photo.original_url}${separator}download=${encodeURIComponent(fileName)}`;
      window.location.href = downloadUrl;

      toast.success("Download iniciado.");
    } catch (err) {
      console.error("Erro no download:", err);
      toast.error("Erro ao processar download. Tente novamente.");
    } finally {
      setTimeout(() => setDownloadingId(null), 2000);
    }
  }, [markDownloaded]);

  const toggleRequest = (photoId: string) => {
    setRequestingIds((prev) => {
      const next = new Set(prev);
      if (next.has(photoId)) {
        next.delete(photoId);
      } else {
        next.add(photoId);
      }
      return next;
    });
  };

  const sendRequest = useCallback(async () => {
    const currentClient = clientRef.current;
    const currentClientId = clientIdRef.current;
    const currentClients = clientsRef.current;

    if (!currentClient || requestingIds.size === 0) return;

    const freshClients = queryClient.getQueryData<any[]>(["clients_data"]) || currentClients;
    const freshClient = freshClients.find((c: any) => c.id === currentClientId) || currentClient;
    const currentPending = freshClient.pending_requests || [];

    const newPending = [...new Set([...currentPending, ...requestingIds])];
    const updated = { ...freshClient, pending_requests: newPending };
    const updatedClients = freshClients.map((c: any) => c.id === updated.id ? updated : c);

    setSaving(true);
    queryClient.setQueryData(["clients_data"], updatedClients);
    setClient(updated);
    setRequestingIds(new Set());

    try {
      await updateClients.mutateAsync(updatedClients);
      toast.success("Solicitação enviada! Aguarde autorização do administrador.");
    } catch {
      queryClient.setQueryData(["clients_data"], freshClients);
      setClient(currentClient);
      toast.error("Erro ao enviar solicitação.");
    } finally {
      setSaving(false);
    }
  }, [requestingIds, queryClient, updateClients]);

  const sendWhatsApp = () => {
    const text = `Olá! Concluí a seleção. Tenho ${photos.length} fotos na galeria.`;
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

  const canDownload = (photo: any) => {
    if (!photo.downloaded) return true;
    if (photo.released) return true;
    return false;
  };

  const isLocked = (photo: any) => {
    if (photo.downloaded && !photo.released) return true;
    if (hasReachedLimit && !photo.downloaded && !photo.released) return true;
    return false;
  };

  const needsRequest = (photo: any) => {
    return hasReachedLimit && !photo.downloaded && !photo.released;
  };

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
            <Button onClick={sendWhatsApp} className="bg-green-600 hover:bg-green-700 text-white font-body text-xs flex items-center gap-1.5">
              Enviar Seleção
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {maxPhotos > 0 && (
          <div className={`mb-4 p-3 rounded-lg border text-xs font-body flex items-center gap-2 ${
            hasReachedLimit
              ? "bg-amber-950/30 border-amber-800/50 text-amber-400"
              : "bg-card/50 border-border text-muted-foreground"
          }`}>
            {hasReachedLimit ? <Lock size={14} /> : <Download size={14} />}
            <span>
              Downloads: <strong className="text-foreground">{downloadedCount}</strong> de <strong className="text-foreground">{maxPhotos}</strong> foto{maxPhotos !== 1 ? "s" : ""}
            </span>
            {hasReachedLimit && (
              <span className="ml-auto text-amber-500">Limite atingido</span>
            )}
          </div>
        )}

        {hasPendingRequest && (
          <div className="mb-4 p-3 rounded-lg border bg-blue-950/30 border-blue-800/50 text-blue-400 text-xs font-body flex items-center gap-2">
            <Send size={14} />
            <span>Solicitação de <strong>{pendingRequests.length}</strong> foto{pendingRequests.length !== 1 ? "s" : ""} enviada. Aguarde autorização.</span>
          </div>
        )}

        {requestingIds.size > 0 && (
          <div className="mb-4 p-3 rounded-lg border bg-primary/10 border-primary/30 text-primary text-xs font-body flex items-center justify-between">
            <span>{requestingIds.size} foto{requestingIds.size !== 1 ? "s" : ""} selecionada{requestingIds.size !== 1 ? "s" : ""} para solicitação</span>
            <Button size="sm" onClick={sendRequest} disabled={saving} className="bg-gradient-gold text-primary-foreground text-[10px] h-7">
              <Send size={11} /> Enviar Solicitação
            </Button>
          </div>
        )}

        {photos.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground border border-border bg-card/10 rounded-lg">
            Nenhuma foto disponível.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {photos.map((photo: any, index: number) => {
              const isDownloaded = photo.downloaded;
              const isRequested = requestingIds.has(photo.id);
              const isPending = pendingRequests.includes(photo.id);
              const isPhotoLocked = isLocked(photo);
              const isPhotoCanDownload = canDownload(photo);
              const isNeedRequest = needsRequest(photo);
              return (
                <div
                  key={photo.id}
                  className="bg-card border border-border overflow-hidden rounded-lg flex flex-col transition-all duration-300 hover:border-primary/30"
                >
                  <div className="aspect-square bg-muted relative overflow-hidden cursor-pointer" onClick={() => setLightboxIndex(index)}>
                    <img src={photo.thumbnail_url} alt={photo.filename} className="object-cover w-full h-full" loading="lazy" />
                    {isDownloaded && photo.released && (
                      <div className="absolute top-2 right-2 bg-green-500 text-white rounded-full p-1 shadow">
                        <CheckCircle2 size={10} />
                      </div>
                    )}
                    {isDownloaded && !photo.released && (
                      <div className="absolute top-2 right-2 bg-amber-600 text-white rounded-full p-1 shadow">
                        <Lock size={10} />
                      </div>
                    )}
                    {isPending && (
                      <div className="absolute top-2 left-2 bg-blue-500 text-white rounded-full p-1 shadow">
                        <Send size={10} />
                      </div>
                    )}
                    {isNeedRequest && !isPending && (
                      <div className="absolute top-2 right-2 bg-zinc-700 text-white rounded-full p-1 shadow">
                        <Lock size={10} />
                      </div>
                    )}
                  </div>
                  <div className="p-2 flex items-center justify-end bg-card/80 border-t border-border/50">
                    {isNeedRequest && !isPending ? (
                      <Button
                        size="sm"
                        onClick={() => toggleRequest(photo.id)}
                        disabled={saving}
                        className={`text-[10px] h-7 px-2 ${
                          isRequested
                            ? "bg-primary text-primary-foreground"
                            : "bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                        }`}
                      >
                        {isRequested ? <CheckCircle2 size={11} /> : <Lock size={11} />}{" "}
                        {isRequested ? "Selecionada" : "Solicitar"}
                      </Button>
                    ) : isPending && !isDownloaded ? (
                      <span className="text-[10px] text-blue-400 flex items-center gap-1">
                        <Send size={10} /> Solicitada
                      </span>
                    ) : isPhotoLocked && !isPhotoCanDownload ? (
                      <span className="text-[10px] text-amber-400 flex items-center gap-1">
                        <Lock size={10} /> Aguardando liberação
                      </span>
                    ) : (
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
                        {downloadingId === photo.id ? "Baixando..." : isDownloaded ? "Baixar novamente" : "Baixar"}
                      </Button>
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
            <img src={photos[lightboxIndex].thumbnail_url} alt="Ampliada" className="max-w-[90%] max-h-[80vh] object-contain rounded shadow-2xl" onClick={(e) => e.stopPropagation()} />
            <button onClick={(e) => { e.stopPropagation(); setLightboxIndex(lightboxIndex === photos.length - 1 ? 0 : lightboxIndex + 1); }} className="p-2.5 bg-zinc-900/60 rounded-full hover:bg-zinc-900 text-zinc-300 absolute right-4">
              <ChevronRight size={24} />
            </button>
          </div>

          <div className="p-6 bg-gradient-to-t from-black/85 to-transparent flex items-center justify-center gap-4" onClick={(e) => e.stopPropagation()}>
            {needsRequest(photos[lightboxIndex]) && !pendingRequests.includes(photos[lightboxIndex].id) ? (
              <Button
                onClick={() => toggleRequest(photos[lightboxIndex].id)}
                className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-body text-xs px-5 py-2.5 rounded-full"
              >
                <Lock size={14} /> Solicitar
              </Button>
            ) : pendingRequests.includes(photos[lightboxIndex].id) ? (
              <span className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-blue-900/50 border border-blue-700 text-blue-400 font-body text-xs">
                <Send size={14} /> Solicitada
              </span>
            ) : isLocked(photos[lightboxIndex]) && !canDownload(photos[lightboxIndex]) ? (
              <span className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-amber-900/50 border border-amber-700 text-amber-400 font-body text-xs">
                <Lock size={14} /> Aguardando liberação
              </span>
            ) : (
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
                {downloadingId === photos[lightboxIndex].id ? "Baixando..." : photos[lightboxIndex].downloaded ? "Baixar novamente" : "Baixar Original"}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientGallery;
