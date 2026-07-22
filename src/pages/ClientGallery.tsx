import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { X as XIcon, Download, ArrowLeft, ChevronLeft, ChevronRight, Loader2, Send, CheckCircle2, Lock, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";

const ClientGallery = () => {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();

  const [client, setClient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [needsPassword, setNeedsPassword] = useState(false);
  const [nameInput, setNameInput] = useState(() => localStorage.getItem("liurecord_client_name") || "");
  const [passwordInput, setPasswordInput] = useState("");
  const [authenticating, setAuthenticating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [requestingIds, setRequestingIds] = useState<Set<string>>(new Set());

  const tokenRef = useRef<string | null>(null);

  const photos = client?.photos || [];
  const maxPhotos = client?.max_photos || 0;
  const downloadedCount = photos.filter((p: any) => p.downloaded).length;
  const hasReachedLimit = maxPhotos > 0 && downloadedCount >= maxPhotos;
  const pendingRequests = client?.pending_requests || [];
  const hasPendingRequest = pendingRequests.length > 0;

  const loadSession = useCallback(async (token: string) => {
    tokenRef.current = token;
    const { data, error } = await supabase.functions.invoke("client-portal", {
      body: { action: "session", token },
    });
    if (error || !data?.client) {
      tokenRef.current = null;
      sessionStorage.removeItem(`client_token_${clientId}`);
      setNeedsPassword(true);
      setClient(null);
      setLoading(false);
      return;
    }
    if (data.client.id !== clientId) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    setClient(data.client);
    setNeedsPassword(false);
    setLoading(false);
  }, [clientId]);

  useEffect(() => {
    if (!clientId) return;
    const token = sessionStorage.getItem(`client_token_${clientId}`);
    if (!token) {
      setNeedsPassword(true);
      setLoading(false);
      return;
    }
    loadSession(token);
  }, [clientId, loadSession]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput || !passwordInput) { toast.error("Preencha nome e senha."); return; }
    setAuthenticating(true);
    try {
      const { data, error } = await supabase.functions.invoke("client-portal", {
        body: { action: "login", name: nameInput.trim(), password: passwordInput.trim() },
      });
      if (error || !data?.token) {
        toast.error(data?.error || "Nome ou senha incorretos.");
        setAuthenticating(false);
        return;
      }
      if (data.client.id !== clientId) {
        toast.error("Essa galeria não pertence a este cliente.");
        setAuthenticating(false);
        return;
      }
      sessionStorage.setItem(`client_token_${clientId}`, data.token);
      localStorage.setItem("liurecord_client_name", nameInput.trim());
      tokenRef.current = data.token;
      setClient(data.client);
      setNeedsPassword(false);
      toast.success("Acesso liberado!");
    } catch (err: any) {
      toast.error("Erro: " + (err?.message || "desconhecido"));
    } finally {
      setAuthenticating(false);
    }
  };

  const triggerBrowserDownload = (url: string, filename: string) => {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.rel = "noopener";
    a.target = "_self";
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { try { document.body.removeChild(a); } catch { /* noop */ } }, 5000);
  };

  const downloadPhoto = useCallback(async (photo: any) => {
    const token = tokenRef.current;
    if (!token) return;
    const downloadCount = typeof photo.download_count === 'number' ? photo.download_count : (photo.downloaded ? 1 : 0);
    if (downloadCount >= 2 && !photo.released) {
      toast.error("Limite de 2 downloads atingido para esta foto.");
      return;
    }
    setDownloadingId(photo.id);
    try {
      const { data, error } = await supabase.functions.invoke("client-portal", {
        body: { action: "mark_downloaded", token, photoId: photo.id },
      });
      if (error || !data?.ok) {
        toast.error(data?.error || "Não foi possível registrar o download.");
        setDownloadingId(null);
        return;
      }
      // Update local state
      setClient((c: any) => c ? {
        ...c,
        photos: c.photos.map((p: any) => p.id === photo.id ? { ...p, ...data.photo, downloaded: true } : p),
      } : c);

      const signedUrl = data.photo.original_url;
      if (!signedUrl) {
        toast.error("URL da foto indisponível.");
        setDownloadingId(null);
        return;
      }
      triggerBrowserDownload(signedUrl, photo.filename || "foto.jpg");
      toast.success("Download iniciado.");
    } catch (err: any) {
      toast.error("Erro no download: " + (err?.message || ""));
    } finally {
      setTimeout(() => setDownloadingId(null), 1500);
    }
  }, []);

  const toggleFavorite = useCallback(async (photoId: string) => {
    const token = tokenRef.current;
    if (!token) return;
    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke("client-portal", {
        body: { action: "toggle_favorite", token, photoId },
      });
      if (error || !data?.ok) {
        toast.error(data?.error || "Erro ao favoritar.");
        return;
      }
      setClient((c: any) => c ? {
        ...c,
        photos: c.photos.map((p: any) => p.id === photoId ? { ...p, ...data.photo } : p),
      } : c);
    } catch (err: any) {
      toast.error("Erro: " + (err?.message || ""));
    } finally {
      setSaving(false);
    }
  }, []);

  const toggleRequest = (photoId: string) => {
    setRequestingIds((prev) => {
      const next = new Set(prev);
      if (next.has(photoId)) next.delete(photoId); else next.add(photoId);
      return next;
    });
  };

  const sendRequest = useCallback(async () => {
    const token = tokenRef.current;
    if (!token || requestingIds.size === 0) return;
    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke("client-portal", {
        body: { action: "request", token, photoIds: Array.from(requestingIds) },
      });
      if (error || !data?.ok) {
        toast.error(data?.error || "Erro ao enviar solicitação.");
        return;
      }
      setClient((c: any) => c ? { ...c, pending_requests: data.pending_requests } : c);
      setRequestingIds(new Set());
      toast.success("Solicitação enviada! Aguarde autorização.");
    } finally {
      setSaving(false);
    }
  }, [requestingIds]);

  const sendWhatsApp = () => {
    const text = `Olá! Concluí a seleção. Tenho ${photos.length} fotos na galeria.`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, "_blank");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0c0a09] flex flex-col items-center justify-center text-muted-foreground font-body">
        <Loader2 className="animate-spin text-primary mb-4" size={36} />
        <p>Carregando galeria...</p>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-[#0c0a09] flex flex-col items-center justify-center px-4 text-center">
        <h1 className="font-display text-2xl text-foreground mb-2">Galeria não encontrada</h1>
        <p className="font-body text-muted-foreground mb-6">Link incorreto ou removido.</p>
        <Button onClick={() => navigate("/")} className="bg-gradient-gold text-primary-foreground font-body">Voltar</Button>
      </div>
    );
  }

  if (needsPassword || !client) {
    return (
      <div className="min-h-screen bg-[#0c0a09] flex items-center justify-center px-4 relative overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
        <div className="w-full max-w-md bg-card/60 border border-border backdrop-blur-md shadow-2xl rounded-lg p-8 relative z-10">
          <h1 className="font-display text-2xl tracking-wider text-gradient-gold text-center mb-1">LIU RECORD</h1>
          <p className="font-display text-lg text-foreground text-center mt-4 mb-1">Acesso à Galeria</p>
          <p className="font-body text-xs text-muted-foreground text-center mb-6">
            Informe seu nome e senha para acessar.
          </p>
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="text"
              placeholder="Nome"
              className="w-full bg-card/50 border border-border font-body text-center py-3 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              required
            />
            <input
              type="password"
              autoComplete="new-password"
              placeholder="Insira a senha"
              className="w-full bg-card/50 border border-border font-body text-center tracking-widest text-lg py-3 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              required
            />
            <Button type="submit" disabled={authenticating} className="w-full bg-gradient-gold text-primary-foreground font-body font-semibold py-5">
              {authenticating ? <><Loader2 className="animate-spin" size={16} /> Acessando...</> : "Acessar"}
            </Button>
          </form>
        </div>
      </div>
    );
  }

  const canDownload = (photo: any) => {
    const count = typeof photo.download_count === 'number' ? photo.download_count : (photo.downloaded ? 1 : 0);
    if (count >= 2 && !photo.released) return false;
    return true;
  };
  const isLocked = (photo: any) => {
    const count = typeof photo.download_count === 'number' ? photo.download_count : (photo.downloaded ? 1 : 0);
    if (count >= 2 && !photo.released) return true;
    if (hasReachedLimit && count === 0 && !photo.released) return true;
    return false;
  };
  const needsRequest = (photo: any) => {
    const count = typeof photo.download_count === 'number' ? photo.download_count : (photo.downloaded ? 1 : 0);
    return hasReachedLimit && count === 0 && !photo.released;
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
          <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg border bg-card/50 border-border text-sm font-body">
              <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2"><Download size={16} className="text-primary"/> Seus Downloads</h3>
              <div className="space-y-1.5 text-muted-foreground">
                <p className="flex justify-between"><span>Fotos liberadas:</span> <strong className="text-foreground">{maxPhotos}</strong></p>
                <p className="flex justify-between"><span>Fotos já baixadas:</span> <strong className="text-foreground">{downloadedCount}</strong></p>
                <p className="flex justify-between border-t border-border/50 pt-1.5 mt-1.5">
                  <span>Fotos restantes:</span> 
                  <strong className={maxPhotos - downloadedCount <= 0 ? "text-amber-500" : "text-primary"}>
                    {Math.max(0, maxPhotos - downloadedCount)}
                  </strong>
                </p>
              </div>
            </div>
            <div className="p-4 rounded-lg border bg-card/20 border-border/50 text-xs font-body text-muted-foreground space-y-2">
              <h3 className="font-semibold text-foreground mb-2 text-sm">Informações sobre seus downloads</h3>
              <ul className="space-y-1 ml-4 list-disc marker:text-primary/50">
                <li>Você pode baixar até <strong>{maxPhotos} fotos</strong> desta galeria.</li>
                <li>Para baixar uma foto, primeiro clique no botão de <strong>Favoritar</strong> (coração).</li>
                <li>O botão <strong>Download</strong> aparecerá somente após a foto ser favoritada.</li>
                <li>Cada foto pode ser baixada <strong>até 2 vezes</strong>.</li>
                <li>O segundo download da mesma foto não consome uma nova vaga do seu limite.</li>
                <li>Após atingir <strong>2 downloads</strong>, a foto será bloqueada automaticamente.</li>
              </ul>
            </div>
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
              const downloadCount = typeof photo.download_count === 'number' ? photo.download_count : (photo.downloaded ? 1 : 0);
              return (
                <div key={photo.id} className="bg-card border border-border overflow-hidden rounded-lg flex flex-col transition-all duration-300 hover:border-primary/30">
                  <div className="aspect-square bg-muted relative overflow-hidden cursor-pointer" onClick={() => setLightboxIndex(index)}>
                    <img src={photo.thumbnail_url} alt={photo.filename} className="object-cover w-full h-full" loading="lazy" />
                    {photo.status === "liked" && (
                      <div className="absolute top-2 left-2 bg-rose-500 text-white rounded-full p-1 shadow"><Heart size={10} className="fill-white" /></div>
                    )}
                    {isDownloaded && photo.released && (
                      <div className="absolute top-2 right-2 bg-green-500 text-white rounded-full p-1 shadow"><CheckCircle2 size={10} /></div>
                    )}
                    {isDownloaded && !photo.released && downloadCount < 2 && (
                      <div className="absolute top-2 right-2 bg-amber-600 text-white rounded-full p-1 shadow"><Lock size={10} /></div>
                    )}
                    {isPending && (
                      <div className="absolute top-2 right-2 bg-blue-500 text-white rounded-full p-1 shadow"><Send size={10} /></div>
                    )}
                    {isNeedRequest && !isPending && (
                      <div className="absolute top-2 right-2 bg-zinc-700 text-white rounded-full p-1 shadow"><Lock size={10} /></div>
                    )}
                  </div>
                  <div className="px-2 py-1.5 flex flex-col gap-1.5 bg-card/80 border-t border-border/50">
                    <div className="flex items-center justify-between w-full">
                      <div className="text-[9px] text-muted-foreground font-medium">
                        {downloadCount >= 2 && !photo.released ? (
                          <span className="text-amber-500">Downloads: 2/2</span>
                        ) : (
                          <span>Downloads: {downloadCount}/2</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Button 
                          size="sm" 
                          onClick={() => toggleFavorite(photo.id)} 
                          disabled={saving}
                          variant="ghost"
                          className={`h-7 px-2 ${photo.status === "liked" ? "text-rose-500 hover:text-rose-600 hover:bg-rose-500/10" : "text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800"}`}
                        >
                          <Heart size={14} className={photo.status === "liked" ? "fill-rose-500" : ""} />
                        </Button>

                        {photo.status === "liked" && downloadCount < 2 && (
                          isNeedRequest && !isPending ? (
                            <Button size="sm" onClick={() => toggleRequest(photo.id)} disabled={saving}
                              className={`text-[10px] h-7 px-2 ${isRequested ? "bg-primary text-primary-foreground" : "bg-zinc-800 hover:bg-zinc-700 text-zinc-300"}`}>
                              {isRequested ? <CheckCircle2 size={11} /> : <Lock size={11} />} {isRequested ? "Selecionada" : "Solicitar"}
                            </Button>
                          ) : isPending && !isDownloaded ? (
                            <span className="text-[10px] text-blue-400 flex items-center gap-1"><Send size={10} /> Solicitada</span>
                          ) : (
                            <Button size="sm" onClick={() => downloadPhoto(photo)} disabled={downloadingId === photo.id}
                              className="bg-green-600 hover:bg-green-700 text-white text-[10px] h-7 px-2">
                              {downloadingId === photo.id ? <Loader2 size={11} className="animate-spin" /> : <Download size={11} />}{" "}
                              {downloadingId === photo.id ? "Baixando..." : "Baixar"}
                            </Button>
                          )
                        )}
                      </div>
                    </div>
                    {downloadCount >= 2 && !photo.released && (
                      <div className="text-[9px] text-amber-500 text-center bg-amber-500/10 rounded p-1">
                        Você atingiu o limite de downloads desta foto. Solicite um novo download ao fotógrafo.
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {lightboxIndex !== null && photos[lightboxIndex] && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex flex-col justify-between" onClick={() => setLightboxIndex(null)}>
          <div className="p-4 flex items-center justify-between text-white bg-gradient-to-b from-black/80 to-transparent">
            <div>
              <p className="font-body text-xs text-zinc-400">{photos[lightboxIndex].filename}</p>
              <p className="font-body text-[10px] text-zinc-500">{lightboxIndex + 1} de {photos.length}</p>
            </div>
            <button onClick={() => setLightboxIndex(null)} className="p-1.5 bg-zinc-900 rounded-full hover:bg-zinc-800 text-zinc-300"><XIcon size={20} /></button>
          </div>

          <div className="flex-1 flex items-center justify-center px-4 relative">
            <button onClick={(e) => { e.stopPropagation(); setLightboxIndex(lightboxIndex === 0 ? photos.length - 1 : lightboxIndex - 1); }} className="p-2.5 bg-zinc-900/60 rounded-full hover:bg-zinc-900 text-zinc-300 absolute left-4"><ChevronLeft size={24} /></button>
            <img src={photos[lightboxIndex].thumbnail_url} alt="Ampliada" className="max-w-[90%] max-h-[80vh] object-contain rounded shadow-2xl" onClick={(e) => e.stopPropagation()} />
            <button onClick={(e) => { e.stopPropagation(); setLightboxIndex(lightboxIndex === photos.length - 1 ? 0 : lightboxIndex + 1); }} className="p-2.5 bg-zinc-900/60 rounded-full hover:bg-zinc-900 text-zinc-300 absolute right-4"><ChevronRight size={24} /></button>
          </div>

          <div className="p-6 flex flex-col items-center justify-end gap-3 pointer-events-none" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-center gap-4 pointer-events-auto bg-black/60 backdrop-blur-md p-3 rounded-full border border-white/10">
              <Button 
                onClick={() => toggleFavorite(photos[lightboxIndex].id)} 
                disabled={saving}
                variant="ghost"
                className={`rounded-full h-10 w-10 p-0 flex items-center justify-center ${photos[lightboxIndex].status === "liked" ? "bg-rose-500/20 text-rose-500 hover:bg-rose-500/30 hover:text-rose-400" : "bg-white/10 text-white hover:bg-white/20"}`}
              >
                <Heart size={18} className={photos[lightboxIndex].status === "liked" ? "fill-rose-500" : ""} />
              </Button>
              
              {photos[lightboxIndex].status === "liked" && (
                (typeof photos[lightboxIndex].download_count === 'number' ? photos[lightboxIndex].download_count : (photos[lightboxIndex].downloaded ? 1 : 0)) >= 2 && !photos[lightboxIndex].released ? (
                  <span className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-amber-900/50 border border-amber-700 text-amber-400 font-body text-xs">
                    <Lock size={14} /> Limite de downloads atingido
                  </span>
                ) : (
                  needsRequest(photos[lightboxIndex]) && !pendingRequests.includes(photos[lightboxIndex].id) ? (
                    <Button onClick={() => toggleRequest(photos[lightboxIndex].id)} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-body text-xs px-5 py-2.5 rounded-full">
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
                    <Button onClick={() => downloadPhoto(photos[lightboxIndex])} disabled={downloadingId === photos[lightboxIndex].id}
                      className="bg-green-600 hover:bg-green-700 text-white font-body text-xs px-5 py-2.5 rounded-full">
                      {downloadingId === photos[lightboxIndex].id ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}{" "}
                      {downloadingId === photos[lightboxIndex].id ? "Baixando..." : "Baixar"}
                    </Button>
                  )
                )
              )}
            </div>
            {photos[lightboxIndex].status === "liked" && (typeof photos[lightboxIndex].download_count === 'number' ? photos[lightboxIndex].download_count : (photos[lightboxIndex].downloaded ? 1 : 0)) >= 2 && !photos[lightboxIndex].released && (
              <div className="bg-black/80 text-amber-400 text-xs py-2 px-4 rounded-full border border-amber-500/30 pointer-events-auto">
                Você atingiu o limite de downloads desta foto. Solicite um novo download ao fotógrafo.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientGallery;
