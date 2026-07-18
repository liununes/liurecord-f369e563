import { useState, useEffect } from "react";
import { useClients, useUpdateClients } from "@/hooks/useSiteContent";
import { supabase } from "@/integrations/supabase/client";
import { createWatermarkedThumbnail } from "@/lib/watermark";
import { toast } from "sonner";
import { Plus, Trash2, Upload, Link as LinkIcon, Search, ChevronLeft, Users, Key, Eye, EyeOff, Heart, X as XIcon, Unlock, Lock, Loader2, Download, CheckCircle2, Send, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

const AdminClientsTab = () => {
  const { data: clients = [], isLoading } = useClients();
  const updateClients = useUpdateClients();
  const [searchTerm, setSearchTerm] = useState("");
  const [view, setView] = useState<"list" | "edit">("list");
  const [selectedClient, setSelectedClient] = useState<any>(null);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newWatermark, setNewWatermark] = useState("LIU RECORD");
  const [newMaxPhotos, setNewMaxPhotos] = useState("");

  const [editName, setEditName] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editWatermark, setEditWatermark] = useState("");
  const [editMaxPhotos, setEditMaxPhotos] = useState("");
  const [showPassword, setShowPassword] = useState<Record<string, boolean>>({});
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    if (view !== "edit" || uploading) return;
    setSelectedClient((current: any) => {
      if (!current) return current;
      const updated = clients.find((c: any) => c.id === current.id);
      if (!updated) return current;
      return JSON.stringify(updated) === JSON.stringify(current) ? current : updated;
    });
  }, [clients, view, uploading]);

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newPassword) { toast.error("Preencha nome e senha."); return; }

    const newClient = {
      id: crypto.randomUUID(),
      name: newName,
      password: newPassword,
      watermark_text: newWatermark || "LIU RECORD",
      max_photos: newMaxPhotos ? parseInt(newMaxPhotos) : undefined,
      photos: [],
      created_at: new Date().toISOString(),
    };

    try {
      await updateClients.mutateAsync([newClient, ...clients]);
      toast.success("Cliente criado!");
      setNewName(""); setNewPassword(""); setNewWatermark("LIU RECORD"); setNewMaxPhotos("");
      setShowCreateForm(false);
    } catch (err: any) {
      toast.error("Erro: " + err.message);
    }
  };

  const handleDeleteClient = async (id: string, name: string) => {
    if (!confirm(`Excluir "${name}"?`)) return;
    try {
      await updateClients.mutateAsync(clients.filter((c: any) => c.id !== id));
      toast.success("Cliente excluído.");
      if (selectedClient?.id === id) { setView("list"); setSelectedClient(null); }
    } catch (err: any) {
      toast.error("Erro: " + err.message);
    }
  };

  const copyLink = (id: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/galeria/${id}`);
    toast.success("Link copiado!");
  };

  const handleSelectClient = (client: any) => {
    setSelectedClient(client);
    setEditName(client.name);
    setEditPassword(client.password);
    setEditWatermark(client.watermark_text || "LIU RECORD");
    setEditMaxPhotos(client.max_photos?.toString() || "");
    setView("edit");
  };

  const handleSaveSettings = async () => {
    if (!selectedClient) return;
    if (!editName.trim() || !editPassword.trim()) { toast.error("Preencha nome e senha."); return; }

    const updated = {
      ...selectedClient,
      name: editName.trim(),
      password: editPassword.trim(),
      watermark_text: editWatermark.trim() || "LIU RECORD",
      max_photos: editMaxPhotos ? parseInt(editMaxPhotos) : undefined,
    };

    try {
      await updateClients.mutateAsync(clients.map((c: any) => c.id === selectedClient.id ? updated : c));
      setSelectedClient(updated);
      toast.success("Salvo!");
    } catch (err: any) {
      toast.error("Erro: " + err.message);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !selectedClient) return;

    const MAX_SIZE = 50 * 1024 * 1024;
    const ALLOWED = ["image/jpeg", "image/png", "image/webp"];
    setUploading(true);
    setUploadProgress(0);

    const existingNames = new Set((selectedClient.photos || []).map((p: any) => p.filename?.toLowerCase()));
    const duplicates: string[] = [];
    const allValid: File[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!ALLOWED.includes(file.type) || file.size > MAX_SIZE) {
        toast.error(`"${file.name}" inválido.`);
        continue;
      }
      allValid.push(file);
      if (existingNames.has(file.name.toLowerCase())) {
        duplicates.push(file.name);
      }
    }

    let filesToUpload = allValid;

    if (duplicates.length > 0) {
      const sendAll = window.confirm(
        `${duplicates.length} foto${duplicates.length !== 1 ? "s" : ""} com nome repetido:\n\n${duplicates.join("\n")}\n\nDeseja enviar mesmo assim?\n\nClique OK para enviar todas.\nClique Cancelar para enviar apenas as novas.`
      );
      if (!sendAll) {
        const dupSet = new Set(duplicates.map((d) => d.toLowerCase()));
        filesToUpload = allValid.filter((f) => !dupSet.has(f.name.toLowerCase()));
        if (filesToUpload.length === 0) {
          toast.info("Nenhuma nova foto para enviar.");
          setUploading(false);
          setUploadProgress(0);
          e.target.value = "";
          return;
        }
      }
    }

    const total = filesToUpload.length;
    let done = 0;
    const updatedPhotos = [...(selectedClient.photos || [])];

    for (let i = 0; i < total; i++) {
      const file = filesToUpload[i];
      try {
        const thumb = await createWatermarkedThumbnail(file, editWatermark || "LIU RECORD", 900, 900);
        const ts = Date.now();
        const rand = Math.round(Math.random() * 1e6);
        const safe = file.name.replace(/[^a-zA-Z0-9.]/g, "_");

        // Upload to PRIVATE client-photos bucket. Signed URLs are generated server-side.
        const origPath = `${selectedClient.id}/originals/${ts}-${rand}-${safe}`;
        const { error: e1 } = await supabase.storage.from("client-photos").upload(origPath, file);
        if (e1) throw e1;

        const thumbPath = `${selectedClient.id}/thumbnails/${ts}-${rand}-thumb.jpg`;
        const { error: e2 } = await supabase.storage.from("client-photos").upload(thumbPath, thumb);
        if (e2) throw e2;

        updatedPhotos.push({
          id: `${ts}-${rand}`,
          storage_path: origPath,
          thumbnail_path: thumbPath,
          filename: file.name,
          status: "pending",
          released: false,
        });
      } catch (err: any) {
        toast.error(`Erro "${file.name}": ${err.message}`);
      }
      done++; setUploadProgress(Math.round((done / total) * 100));
    }

    try {
      const updatedClients = clients.map((c: any) =>
        c.id === selectedClient.id ? { ...c, photos: updatedPhotos } : c
      );
      await updateClients.mutateAsync(updatedClients);
      setSelectedClient({ ...selectedClient, photos: updatedPhotos });
      toast.success("Foto(s) enviada(s)!");
    } catch (err: any) {
      toast.error("Erro ao salvar: " + err.message);
    }
    setUploading(false); setUploadProgress(0);
    e.target.value = "";
  };

  const togglePhotoRelease = async (photoId: string, current: boolean) => {
    if (!selectedClient) return;
    const updatedPhotos = selectedClient.photos.map((p: any) =>
      p.id === photoId ? { ...p, released: !current } : p
    );
    const updatedClient = { ...selectedClient, photos: updatedPhotos };
    try {
      await updateClients.mutateAsync(clients.map((c: any) => c.id === selectedClient.id ? updatedClient : c));
      setSelectedClient(updatedClient);
      toast.success(!current ? "Liberada!" : "Bloqueada.");
    } catch { toast.error("Erro"); }
  };

  const handleBulkRelease = async (type: "all" | "liked" | "block") => {
    if (!selectedClient) return;
    const updatedPhotos = selectedClient.photos.map((p: any) => {
      if (type === "all") return { ...p, released: true };
      if (type === "liked") return { ...p, released: p.status === "liked" };
      return { ...p, released: false };
    });
    const updatedClient = { ...selectedClient, photos: updatedPhotos };
    try {
      await updateClients.mutateAsync(clients.map((c: any) => c.id === selectedClient.id ? updatedClient : c));
      setSelectedClient(updatedClient);
      toast.success("Atualizado!");
    } catch { toast.error("Erro"); }
  };

  const handleDeletePhoto = async (photoId: string) => {
    if (!selectedClient || !confirm("Excluir foto?")) return;
    const photo = selectedClient.photos.find((p: any) => p.id === photoId);
    if (photo) {
      const origPath = photo.original_url?.split("/storage/v1/object/public/media/")[1];
      const thumbPath = photo.thumbnail_url?.split("/storage/v1/object/public/media/")[1];
      if (origPath) supabase.storage.from("media").remove([origPath]);
      if (thumbPath) supabase.storage.from("media").remove([thumbPath]);
    }
    const updatedPhotos = selectedClient.photos.filter((p: any) => p.id !== photoId);
    const updatedClient = { ...selectedClient, photos: updatedPhotos };
    try {
      await updateClients.mutateAsync(clients.map((c: any) => c.id === selectedClient.id ? updatedClient : c));
      setSelectedClient(updatedClient);
      toast.success("Foto excluída.");
    } catch { toast.error("Erro ao atualizar cliente."); }
  };

  const handleDeleteAllPhotos = async () => {
    if (!selectedClient || !selectedClient.photos?.length) return;
    if (!confirm(`Excluir TODAS as ${selectedClient.photos.length} fotos? Esta ação não pode ser desfeita.`)) return;

    for (const photo of selectedClient.photos) {
      const origPath = photo.original_url?.split("/storage/v1/object/public/media/")[1];
      const thumbPath = photo.thumbnail_url?.split("/storage/v1/object/public/media/")[1];
      if (origPath) supabase.storage.from("media").remove([origPath]);
      if (thumbPath) supabase.storage.from("media").remove([thumbPath]);
    }

    const updatedClient = { ...selectedClient, photos: [] };
    try {
      await updateClients.mutateAsync(clients.map((c: any) => c.id === selectedClient.id ? updatedClient : c));
      setSelectedClient(updatedClient);
      toast.success("Todas as fotos foram excluídas.");
    } catch { toast.error("Erro ao excluir fotos."); }
  };

  const handleApproveRequest = async (photoId: string) => {
    if (!selectedClient) return;
    const updatedPhotos = selectedClient.photos.map((p: any) =>
      p.id === photoId ? { ...p, released: true } : p
    );
    const updatedPending = (selectedClient.pending_requests || []).filter((id: string) => id !== photoId);
    const updatedClient = { ...selectedClient, photos: updatedPhotos, pending_requests: updatedPending };
    try {
      await updateClients.mutateAsync(clients.map((c: any) => c.id === selectedClient.id ? updatedClient : c));
      setSelectedClient(updatedClient);
      toast.success("Download autorizado!");
    } catch { toast.error("Erro"); }
  };

  const handleDenyRequest = async (photoId: string) => {
    if (!selectedClient) return;
    const updatedPending = (selectedClient.pending_requests || []).filter((id: string) => id !== photoId);
    const updatedClient = { ...selectedClient, pending_requests: updatedPending };
    try {
      await updateClients.mutateAsync(clients.map((c: any) => c.id === selectedClient.id ? updatedClient : c));
      setSelectedClient(updatedClient);
      toast.success("Solicitação recusada.");
    } catch { toast.error("Erro"); }
  };

  const handleApproveAllRequests = async () => {
    if (!selectedClient || !selectedClient.pending_requests?.length) return;
    const requestIds = selectedClient.pending_requests;
    const updatedPhotos = selectedClient.photos.map((p: any) =>
      requestIds.includes(p.id) ? { ...p, released: true } : p
    );
    const updatedClient = { ...selectedClient, photos: updatedPhotos, pending_requests: [] };
    try {
      await updateClients.mutateAsync(clients.map((c: any) => c.id === selectedClient.id ? updatedClient : c));
      setSelectedClient(updatedClient);
      toast.success(`${requestIds.length} download(s) autorizado(s)!`);
    } catch { toast.error("Erro"); }
  };

  const handleToggleDownloaded = async (photoId: string) => {
    if (!selectedClient) return;
    const updatedPhotos = selectedClient.photos.map((p: any) =>
      p.id === photoId
        ? p.downloaded
          ? { ...p, downloaded: false, downloaded_at: undefined }
          : { ...p, downloaded: true, downloaded_at: new Date().toISOString() }
        : p
    );
    const updatedClient = { ...selectedClient, photos: updatedPhotos };
    const previousClient = selectedClient;
    setSelectedClient(updatedClient);
    try {
      await updateClients.mutateAsync(clients.map((c: any) => c.id === selectedClient.id ? updatedClient : c));
      toast.success("Status de download atualizado.");
    } catch {
      setSelectedClient(previousClient);
      toast.error("Erro");
    }
  };

  const filtered = clients.filter((c: any) => c.name.toLowerCase().includes(searchTerm.toLowerCase()));

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground font-body">
        <Loader2 className="animate-spin mb-4" size={32} /> Carregando...
      </div>
    );
  }

  // ─── LIST ──────────────────────────────────────────────────────
  if (view === "list") {
    const totalPhotos = clients.reduce((acc: number, c: any) => acc + (c.photos?.length || 0), 0);
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-card/50 border-border"><CardHeader className="pb-2">
            <CardDescription className="font-body text-xs uppercase">Clientes</CardDescription>
            <CardTitle className="font-display text-3xl text-gradient-gold flex items-center gap-2"><Users size={24} /> {clients.length}</CardTitle>
          </CardHeader></Card>
          <Card className="bg-card/50 border-border"><CardHeader className="pb-2">
            <CardDescription className="font-body text-xs uppercase">Fotos</CardDescription>
            <CardTitle className="font-display text-3xl text-gradient-gold">{totalPhotos}</CardTitle>
          </CardHeader></Card>
          <Card className="bg-card/50 border-border"><CardHeader className="pb-2">
            <CardDescription className="font-body text-xs uppercase">Pendentes</CardDescription>
            <CardTitle className="font-display text-3xl text-rose-500">{clients.filter((c: any) => c.photos?.some((p: any) => p.status === "pending")).length}</CardTitle>
          </CardHeader></Card>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Pesquisar..." className="pl-9 bg-card border-border" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <Button onClick={() => setShowCreateForm(!showCreateForm)} className="bg-gradient-gold text-primary-foreground font-semibold flex items-center gap-2">
            <Plus size={16} /> Novo Cliente
          </Button>
        </div>

        {showCreateForm && (
          <Card className="bg-card border-border shadow-lg max-w-lg">
            <CardHeader><CardTitle className="font-display text-lg">Novo Cliente</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={handleCreateClient} className="space-y-4">
                <Input placeholder="Nome" value={newName} onChange={(e) => setNewName(e.target.value)} required />
                <div className="flex gap-2">
                  <Input placeholder="Senha" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
                  <Button type="button" variant="outline" onClick={() => setNewPassword(Math.random().toString(36).substring(2, 10))}>Gerar</Button>
                </div>
                <Input placeholder="Marca d'água" value={newWatermark} onChange={(e) => setNewWatermark(e.target.value)} />
                <Input type="number" min="0" placeholder="Limite (0=ilimitado)" value={newMaxPhotos} onChange={(e) => setNewMaxPhotos(e.target.value)} />
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="ghost" onClick={() => setShowCreateForm(false)}>Cancelar</Button>
                  <Button type="submit" className="bg-gradient-gold">Salvar</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <div className="space-y-4">
          {filtered.length === 0 ? (
            <p className="text-muted-foreground py-4">Nenhum cliente.</p>
          ) : filtered.map((client: any) => {
            const photosCount = client.photos?.length || 0;
            const likedCount = client.photos?.filter((p: any) => p.status === "liked").length || 0;
            const releasedCount = client.photos?.filter((p: any) => p.released).length || 0;
            const downloadedCount = client.photos?.filter((p: any) => p.downloaded).length || 0;
            const pendingRequestCount = client.pending_requests?.length || 0;
            const maxPhotos = client.max_photos || 0;
            return (
              <Card key={client.id} className="bg-card/40 border-border hover:border-primary/40 transition-colors">
                <CardContent className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-display text-lg font-semibold">{client.name}</h3>
                      <Badge variant="outline" className="text-[10px]">{photosCount} foto{photosCount !== 1 && "s"}</Badge>
                      {pendingRequestCount > 0 && (
                        <Badge className="bg-amber-950/30 text-amber-400 border-amber-800/50 text-[10px]">
                          <Send size={10} /> {pendingRequestCount} pedido{pendingRequestCount !== 1 ? "s" : ""}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="font-mono bg-secondary px-1.5 py-0.5 rounded text-[11px] flex items-center gap-1">
                        {showPassword[client.id] ? client.password : "••••••••"}
                        <button onClick={() => setShowPassword(p => ({ ...p, [client.id]: !p[client.id] }))}>
                          {showPassword[client.id] ? <EyeOff size={11} /> : <Eye size={11} />}
                        </button>
                      </span>
                    </div>
                    <div className="flex gap-2 pt-1 flex-wrap">
                      <Badge className="bg-rose-950/20 text-rose-500 border-rose-900/30 text-[10px]"><Heart size={10} className="fill-rose-500" /> {likedCount}</Badge>
                      <Badge className="bg-green-950/20 text-green-400 border-green-900/30 text-[10px]"><Download size={10} /> {downloadedCount}{maxPhotos > 0 ? `/${maxPhotos}` : ""}</Badge>
                      {releasedCount > 0 && <Badge className="bg-blue-950/20 text-blue-400 border-blue-900/30 text-[10px]"><Unlock size={10} /> {releasedCount}</Badge>}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => copyLink(client.id)} className="text-xs flex items-center gap-1.5"><LinkIcon size={13} /> Link</Button>
                    <Button variant="outline" size="sm" onClick={() => handleSelectClient(client)} className="text-xs bg-secondary">Gerenciar</Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDeleteClient(client.id, client.name)} className="text-destructive"><Trash2 size={16} /></Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );
  }

  // ─── EDIT ──────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setView("list")} className="text-muted-foreground"><ChevronLeft size={20} /></Button>
          <div>
            <h2 className="font-display text-2xl font-semibold">{selectedClient?.name}</h2>
            <p className="text-xs text-muted-foreground">Gerenciando galeria</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => copyLink(selectedClient.id)} className="text-xs flex items-center gap-1.5"><LinkIcon size={14} /> Link</Button>
          <Button variant="outline" size="sm" onClick={() => window.open(`/galeria/${selectedClient.id}`, "_blank")} className="text-xs bg-secondary">Ver como Cliente</Button>
        </div>
      </div>

      <Card className="bg-card border-border">
        <CardHeader className="py-4"><CardTitle className="font-display text-base">Configurações</CardTitle></CardHeader>
        <CardContent className="space-y-4 pb-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Nome" />
            <Input value={editPassword} onChange={(e) => setEditPassword(e.target.value)} placeholder="Senha" />
            <Input value={editWatermark} onChange={(e) => setEditWatermark(e.target.value)} placeholder="Marca d'água" />
            <Input type="number" min="0" value={editMaxPhotos} onChange={(e) => setEditMaxPhotos(e.target.value)} placeholder="Limite" />
          </div>
          <div className="flex justify-end"><Button onClick={handleSaveSettings} className="bg-gradient-gold">Salvar</Button></div>
        </CardContent>
      </Card>

      {selectedClient?.max_photos > 0 && (
        <Card className="bg-card/50 border-border">
          <CardHeader className="py-4">
            <CardTitle className="font-display text-base flex items-center gap-2">
              <Download size={16} /> Downloads
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-5">
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Baixadas:</span>
                <Badge className="bg-green-950/20 text-green-400 border-green-900/30">
                  {selectedClient.photos?.filter((p: any) => p.downloaded).length || 0}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Limite:</span>
                <Badge variant="outline">{selectedClient.max_photos}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {selectedClient?.pending_requests?.length > 0 && (
        <Card className="bg-amber-950/20 border-amber-800/50">
          <CardHeader className="py-4">
            <div className="flex items-center justify-between">
              <CardTitle className="font-display text-base flex items-center gap-2 text-amber-400">
                <Send size={16} /> Solicitações Pendentes ({selectedClient.pending_requests.length})
              </CardTitle>
              <Button size="sm" onClick={handleApproveAllRequests} className="bg-green-600 hover:bg-green-700 text-white text-xs">
                <Check size={12} /> Aprovar Todas
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pb-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {selectedClient.pending_requests.map((photoId: string) => {
                const photo = selectedClient.photos?.find((p: any) => p.id === photoId);
                if (!photo) return null;
                return (
                  <div key={photoId} className="flex items-center gap-3 bg-card/60 border border-amber-800/30 rounded-lg p-3">
                    <img src={photo.thumbnail_url} alt={photo.filename} className="w-12 h-12 rounded object-cover" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-foreground truncate">{photo.filename}</p>
                      <p className="text-[10px] text-muted-foreground">Solicitado pelo cliente</p>
                    </div>
                    <div className="flex gap-1">
                      <Button size="icon" onClick={() => handleApproveRequest(photoId)} className="h-7 w-7 bg-green-600 hover:bg-green-700 text-white">
                        <Check size={13} />
                      </Button>
                      <Button size="icon" onClick={() => handleDenyRequest(photoId)} className="h-7 w-7 bg-red-600/20 hover:bg-red-600/40 text-red-400">
                        <X size={13} />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="bg-card/50 border-dashed border-2 border-border p-6 text-center hover:border-primary/40">
        <div className="flex flex-col items-center space-y-3">
          <Upload size={24} className="text-primary" />
          <p className="font-semibold">Carregar fotos</p>
          <p className="text-xs text-muted-foreground">JPG, PNG, WebP. Máx 50MB.</p>
          <label className="cursor-pointer bg-gradient-gold text-primary-foreground font-semibold text-sm px-4 py-2 rounded shadow hover:opacity-90">
            {uploading ? "Enviando..." : "Selecionar"}
            <input type="file" multiple accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={uploading} />
          </label>
          {uploading && <div className="w-full max-w-xs"><Progress value={uploadProgress} className="h-1.5" /><p className="text-xs text-muted-foreground mt-1">{uploadProgress}%</p></div>}
        </div>
      </Card>

      <div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
          <h3 className="font-display text-lg font-semibold">Fotos ({selectedClient?.photos?.length || 0})</h3>
          {selectedClient?.photos?.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => handleBulkRelease("liked")} className="text-xs text-rose-400 border-rose-900/30">Liberar Curtidas</Button>
              <Button variant="outline" size="sm" onClick={() => handleBulkRelease("all")} className="text-xs text-green-400 border-green-900/30">Liberar Todas</Button>
              <Button variant="outline" size="sm" onClick={() => handleBulkRelease("block")} className="text-xs">Bloquear Todas</Button>
              <Button variant="outline" size="sm" onClick={handleDeleteAllPhotos} className="text-xs text-red-400 border-red-900/30">Deletar Todas</Button>
            </div>
          )}
        </div>

        {!selectedClient?.photos?.length ? (
          <div className="text-center py-12 text-muted-foreground bg-card/20 border border-border rounded-lg">Nenhuma foto. Faça upload acima.</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {selectedClient.photos.map((photo: any) => (
              <Card key={photo.id} className="bg-card border-border overflow-hidden flex flex-col">
                <div className="relative aspect-square bg-muted overflow-hidden">
                  <img src={photo.thumbnail_url} alt={photo.filename} className="object-cover w-full h-full" loading="lazy" />
                  <div className="absolute top-2 left-2 flex gap-1.5">
                    {photo.status === "liked" && <Badge className="bg-rose-600 text-white border-none text-[10px]"><Heart size={10} className="fill-white" /> Escolhida</Badge>}
                    {photo.status === "disliked" && <Badge className="bg-red-600 text-white border-none text-[10px]"><XIcon size={10} /> Não</Badge>}
                  </div>
                  <div className="absolute top-2 right-2 flex gap-1">
                    {photo.downloaded && (
                      <div className="bg-green-500 text-white rounded-full p-1"><CheckCircle2 size={12} /></div>
                    )}
                    {photo.released
                      ? <div className="bg-blue-500 text-white rounded-full p-1"><Unlock size={12} /></div>
                      : <div className="bg-black/50 text-muted-foreground rounded-full p-1"><Lock size={12} /></div>}
                  </div>
                </div>
                <CardContent className="p-3 space-y-2">
                  <div className="text-[11px] text-muted-foreground truncate">{photo.filename}</div>
                  {photo.downloaded && (
                    <div className="text-[10px] text-green-500 flex items-center gap-1">
                      <CheckCircle2 size={10} /> Baixada pelo cliente
                    </div>
                  )}
                  <div className="flex items-center justify-between border-t border-border/50 pt-2">
                    <div className="flex items-center gap-1.5">
                      <Switch checked={photo.released} onCheckedChange={() => togglePhotoRelease(photo.id, photo.released)} className="h-4 w-7 data-[state=checked]:bg-green-500 scale-75 origin-left" />
                      <span className="text-[10px] text-muted-foreground">Liberar</span>
                    </div>
                    <div className="flex gap-1">
                      {photo.downloaded && (
                        <Button variant="ghost" size="icon" onClick={() => handleToggleDownloaded(photo.id)} className="h-7 w-7 text-amber-400" title="Re-liberar download">
                          <Download size={13} />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => handleDeletePhoto(photo.id)} className="h-7 w-7 text-destructive"><Trash2 size={13} /></Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminClientsTab;
