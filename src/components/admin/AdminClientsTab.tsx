import { useState } from "react";
import { useClients } from "@/hooks/useSiteContent";
import { supabase } from "@/integrations/supabase/client";
import { createWatermarkedThumbnail } from "@/lib/watermark";
import { toast } from "sonner";
import { Plus, Trash2, Upload, Link as LinkIcon, Search, ChevronLeft, Users, Key, Eye, EyeOff, Heart, X as XIcon, Unlock, Lock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useQueryClient } from "@tanstack/react-query";

const AdminClientsTab = () => {
  const { data: clients = [], isLoading } = useClients();
  const qc = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [view, setView] = useState<"list" | "edit">("list");
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [selectedPhotos, setSelectedPhotos] = useState<any[]>([]);

  // Create form
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newWatermark, setNewWatermark] = useState("LIU RECORD");
  const [newMaxPhotos, setNewMaxPhotos] = useState("");

  // Edit state
  const [editName, setEditName] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editWatermark, setEditWatermark] = useState("");
  const [editMaxPhotos, setEditMaxPhotos] = useState("");
  const [showPassword, setShowPassword] = useState<Record<string, boolean>>({});
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const refetch = () => qc.invalidateQueries({ queryKey: ["clients_data"] });

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newPassword) { toast.error("Preencha nome e senha."); return; }

    const { error } = await supabase.from("clients").insert({
      name: newName,
      password: newPassword,
      watermark_text: newWatermark || "LIU RECORD",
      max_photos: newMaxPhotos ? parseInt(newMaxPhotos) : null,
    });
    if (error) { toast.error("Erro: " + error.message); return; }

    toast.success("Cliente criado!");
    setNewName(""); setNewPassword(""); setNewWatermark("LIU RECORD"); setNewMaxPhotos("");
    setShowCreateForm(false);
    refetch();
  };

  const handleDeleteClient = async (id: string, name: string) => {
    if (!confirm(`Excluir "${name}"? Todas as fotos serão perdidas.`)) return;
    const { error } = await supabase.from("clients").delete().eq("id", id);
    if (error) { toast.error("Erro: " + error.message); return; }
    toast.success("Cliente excluído.");
    if (selectedClient?.id === id) { setView("list"); setSelectedClient(null); }
    refetch();
  };

  const copyLink = (id: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/galeria/${id}`);
    toast.success("Link copiado!");
  };

  const loadClientPhotos = async (client: any) => {
    const { data } = await supabase.from("client_photos").select("*").eq("client_id", client.id).order("sort_order");
    setSelectedClient(client);
    setSelectedPhotos(data || []);
    setEditName(client.name);
    setEditPassword(client.password);
    setEditWatermark(client.watermark_text || "LIU RECORD");
    setEditMaxPhotos(client.max_photos?.toString() || "");
    setView("edit");
  };

  const handleSaveSettings = async () => {
    if (!selectedClient) return;
    const { error } = await supabase.from("clients").update({
      name: editName.trim(),
      password: editPassword.trim(),
      watermark_text: editWatermark.trim() || "LIU RECORD",
      max_photos: editMaxPhotos ? parseInt(editMaxPhotos) : null,
    }).eq("id", selectedClient.id);
    if (error) { toast.error("Erro: " + error.message); return; }
    setSelectedClient({ ...selectedClient, name: editName.trim(), password: editPassword.trim() });
    toast.success("Configurações salvas!");
    refetch();
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !selectedClient) return;

    const MAX_SIZE = 10 * 1024 * 1024;
    const ALLOWED = ["image/jpeg", "image/png", "image/webp"];
    setUploading(true);
    setUploadProgress(0);

    const total = files.length;
    let done = 0;
    const newPhotos: any[] = [];

    for (let i = 0; i < total; i++) {
      const file = files[i];
      if (!ALLOWED.includes(file.type) || file.size > MAX_SIZE) {
        toast.error(`"${file.name}" inválido (máx 10MB, JPG/PNG/WebP).`);
        done++; setUploadProgress(Math.round((done / total) * 100));
        continue;
      }
      try {
        const thumb = await createWatermarkedThumbnail(file, editWatermark || "LIU RECORD", 900, 900);
        const ts = Date.now();
        const rand = Math.round(Math.random() * 1e6);
        const safe = file.name.replace(/[^a-zA-Z0-9.]/g, "_");

        const origPath = `clients/${selectedClient.id}/originals/${ts}-${rand}-${safe}`;
        const { error: e1 } = await supabase.storage.from("media").upload(origPath, file);
        if (e1) throw e1;
        const orig = supabase.storage.from("media").getPublicUrl(origPath).data.publicUrl;

        const thumbPath = `clients/${selectedClient.id}/thumbnails/${ts}-${rand}-thumb.jpg`;
        const { error: e2 } = await supabase.storage.from("media").upload(thumbPath, thumb);
        if (e2) throw e2;
        const thumbUrl = supabase.storage.from("media").getPublicUrl(thumbPath).data.publicUrl;

        const { data: inserted, error: e3 } = await supabase.from("client_photos").insert({
          client_id: selectedClient.id, original_url: orig, thumbnail_url: thumbUrl, filename: file.name,
        }).select();
        if (e3) throw e3;
        if (inserted) newPhotos.push(inserted[0]);
      } catch (err: any) {
        toast.error(`Erro "${file.name}": ${err.message}`);
      }
      done++; setUploadProgress(Math.round((done / total) * 100));
    }

    setSelectedPhotos(prev => [...prev, ...newPhotos]);
    setUploading(false); setUploadProgress(0);
    if (newPhotos.length > 0) toast.success(`${newPhotos.length} foto(s) enviada(s)!`);
  };

  const togglePhotoRelease = async (photoId: string, current: boolean) => {
    const { error } = await supabase.from("client_photos").update({ released: !current }).eq("id", photoId);
    if (error) { toast.error("Erro"); return; }
    setSelectedPhotos(prev => prev.map(p => p.id === photoId ? { ...p, released: !current } : p));
    toast.success(!current ? "Liberada!" : "Bloqueada.");
  };

  const handleBulkRelease = async (type: "all" | "liked" | "block") => {
    if (!selectedClient) return;
    const updates = selectedPhotos.map(p => {
      if (type === "all") return supabase.from("client_photos").update({ released: true }).eq("id", p.id);
      if (type === "liked") return p.status === "liked" ? supabase.from("client_photos").update({ released: true }).eq("id", p.id) : Promise.resolve({ error: null } as any);
      return supabase.from("client_photos").update({ released: false }).eq("id", p.id);
    });
    await Promise.all(updates);
    setSelectedPhotos(prev => prev.map(p => {
      if (type === "all") return { ...p, released: true };
      if (type === "liked") return p.status === "liked" ? { ...p, released: true } : p;
      return { ...p, released: false };
    }));
    toast.success("Atualizado!");
  };

  const handleDeletePhoto = async (photoId: string) => {
    if (!confirm("Excluir esta foto?")) return;
    const photo = selectedPhotos.find(p => p.id === photoId);
    if (photo) {
      const origPath = photo.original_url.split("/storage/v1/object/public/media/")[1];
      const thumbPath = photo.thumbnail_url.split("/storage/v1/object/public/media/")[1];
      if (origPath) await supabase.storage.from("media").remove([origPath]);
      if (thumbPath) await supabase.storage.from("media").remove([thumbPath]);
    }
    await supabase.from("client_photos").delete().eq("id", photoId);
    setSelectedPhotos(prev => prev.filter(p => p.id !== photoId));
    toast.success("Foto excluída.");
  };

  const filtered = clients.filter((c: any) => c.name.toLowerCase().includes(searchTerm.toLowerCase()));

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground font-body">
        <Loader2 className="animate-spin mb-4" size={32} />
        <p>Carregando clientes...</p>
      </div>
    );
  }

  // ─── LIST VIEW ────────────────────────────────────────────────
  if (view === "list") {
    return (
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-card/50 border-border"><CardHeader className="pb-2">
            <CardDescription className="font-body text-xs text-muted-foreground uppercase">Clientes</CardDescription>
            <CardTitle className="font-display text-3xl text-gradient-gold flex items-center gap-2"><Users size={24} /> {clients.length}</CardTitle>
          </CardHeader></Card>
          <Card className="bg-card/50 border-border"><CardHeader className="pb-2">
            <CardDescription className="font-body text-xs text-muted-foreground uppercase">Total Fotos</CardDescription>
            <CardTitle className="font-display text-3xl text-gradient-gold">{selectedPhotos.length}</CardTitle>
          </CardHeader></Card>
          <Card className="bg-card/50 border-border"><CardHeader className="pb-2">
            <CardDescription className="font-body text-xs text-muted-foreground uppercase">Pendentes</CardDescription>
            <CardTitle className="font-display text-3xl text-rose-500">{clients.filter((c: any) => !c.photos?.length).length}</CardTitle>
          </CardHeader></Card>
        </div>

        {/* Search + Create */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Pesquisar cliente..." className="pl-9 bg-card border-border font-body" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <Button onClick={() => setShowCreateForm(!showCreateForm)} className="w-full sm:w-auto bg-gradient-gold text-primary-foreground font-body font-semibold flex items-center gap-2">
            <Plus size={16} /> Novo Cliente
          </Button>
        </div>

        {/* Create Form */}
        {showCreateForm && (
          <Card className="bg-card border-border shadow-lg max-w-lg">
            <CardHeader><CardTitle className="font-display text-lg">Novo Cliente</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={handleCreateClient} className="space-y-4">
                <Input placeholder="Nome do cliente" value={newName} onChange={(e) => setNewName(e.target.value)} required />
                <div className="flex gap-2">
                  <Input placeholder="Senha" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
                  <Button type="button" variant="outline" onClick={() => setNewPassword(Math.random().toString(36).substring(2, 10))} className="text-xs">Gerar</Button>
                </div>
                <Input placeholder="Texto da marca d'água" value={newWatermark} onChange={(e) => setNewWatermark(e.target.value)} />
                <Input type="number" min="0" placeholder="Limite de fotos (0 = ilimitado)" value={newMaxPhotos} onChange={(e) => setNewMaxPhotos(e.target.value)} />
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="ghost" onClick={() => setShowCreateForm(false)}>Cancelar</Button>
                  <Button type="submit" className="bg-gradient-gold">Salvar</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Client List */}
        <div className="space-y-4">
          {filtered.length === 0 ? (
            <p className="text-muted-foreground font-body text-sm py-4">Nenhum cliente encontrado.</p>
          ) : filtered.map((client: any) => (
            <Card key={client.id} className="bg-card/40 border-border hover:border-primary/40 transition-colors">
              <CardContent className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <h3 className="font-display text-lg font-semibold">{client.name}</h3>
                    <Badge variant="outline" className="text-[10px] border-primary/20 text-primary">{client.max_photos ? `Max ${client.max_photos}` : "Ilimitado"}</Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground font-body">
                    <span className="flex items-center gap-1">
                      <Key size={13} />
                      <span className="font-mono bg-secondary px-1.5 py-0.5 rounded text-[11px] flex items-center gap-1">
                        {showPassword[client.id] ? client.password : "••••••••"}
                        <button onClick={() => setShowPassword(p => ({ ...p, [client.id]: !p[client.id] }))}>
                          {showPassword[client.id] ? <EyeOff size={11} /> : <Eye size={11} />}
                        </button>
                      </span>
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => copyLink(client.id)} className="text-xs flex items-center gap-1.5"><LinkIcon size={13} /> Copiar Link</Button>
                  <Button variant="outline" size="sm" onClick={() => loadClientPhotos(client)} className="text-xs bg-secondary flex items-center gap-1.5">Gerenciar</Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDeleteClient(client.id, client.name)} className="text-destructive hover:bg-destructive/10"><Trash2 size={16} /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // ─── EDIT VIEW ────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setView("list")} className="text-muted-foreground"><ChevronLeft size={20} /></Button>
          <div>
            <h2 className="font-display text-2xl font-semibold">{selectedClient?.name}</h2>
            <p className="text-xs text-muted-foreground font-body">Gerenciando galeria</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => copyLink(selectedClient.id)} className="text-xs flex items-center gap-1.5"><LinkIcon size={14} /> Link</Button>
          <Button variant="outline" size="sm" onClick={() => window.open(`/galeria/${selectedClient.id}`, "_blank")} className="text-xs bg-secondary">Ver como Cliente</Button>
        </div>
      </div>

      {/* Settings */}
      <Card className="bg-card border-border">
        <CardHeader className="py-4"><CardTitle className="font-display text-base">Configurações</CardTitle></CardHeader>
        <CardContent className="space-y-4 pb-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Nome" />
            <Input value={editPassword} onChange={(e) => setEditPassword(e.target.value)} placeholder="Senha" />
            <Input value={editWatermark} onChange={(e) => setEditWatermark(e.target.value)} placeholder="Marca d'água" />
            <Input type="number" min="0" value={editMaxPhotos} onChange={(e) => setEditMaxPhotos(e.target.value)} placeholder="Limite (0=ilimitado)" />
          </div>
          <div className="flex justify-end"><Button onClick={handleSaveSettings} className="bg-gradient-gold font-body">Salvar</Button></div>
        </CardContent>
      </Card>

      {/* Upload */}
      <Card className="bg-card/50 border-dashed border-2 border-border p-6 text-center hover:border-primary/40 transition-colors">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary"><Upload size={24} /></div>
          <p className="font-body text-sm font-semibold">Carregar fotos</p>
          <p className="font-body text-xs text-muted-foreground">JPG, PNG, WebP. Máx 10MB. Marca d'água automática.</p>
          <label className="cursor-pointer bg-gradient-gold text-primary-foreground font-body font-semibold text-sm px-4 py-2 rounded shadow hover:opacity-90">
            {uploading ? "Enviando..." : "Selecionar Arquivos"}
            <input type="file" multiple accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={uploading} />
          </label>
          {uploading && <div className="w-full max-w-xs"><Progress value={uploadProgress} className="h-1.5" /><p className="text-xs text-muted-foreground mt-1">{uploadProgress}%</p></div>}
        </div>
      </Card>

      {/* Photos */}
      <div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
          <h3 className="font-display text-lg font-semibold">Fotos ({selectedPhotos.length})</h3>
          {selectedPhotos.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => handleBulkRelease("liked")} className="text-xs text-rose-400 border-rose-900/30 bg-rose-950/10">Liberar Curtidas</Button>
              <Button variant="outline" size="sm" onClick={() => handleBulkRelease("all")} className="text-xs text-green-400 border-green-900/30 bg-green-950/10">Liberar Todas</Button>
              <Button variant="outline" size="sm" onClick={() => handleBulkRelease("block")} className="text-xs">Bloquear Todas</Button>
            </div>
          )}
        </div>

        {selectedPhotos.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground bg-card/20 border border-border rounded-lg">Nenhuma foto. Faça upload acima.</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {selectedPhotos.map((photo) => (
              <Card key={photo.id} className="bg-card border-border overflow-hidden flex flex-col">
                <div className="relative aspect-square bg-muted overflow-hidden">
                  <img src={photo.thumbnail_url} alt={photo.filename} className="object-cover w-full h-full" loading="lazy" />
                  <div className="absolute top-2 left-2 flex gap-1.5">
                    {photo.status === "liked" && <Badge className="bg-rose-600 text-white border-none text-[10px]"><Heart size={10} className="fill-white" /> Escolhida</Badge>}
                    {photo.status === "disliked" && <Badge className="bg-red-600 text-white border-none text-[10px]"><XIcon size={10} /> Não</Badge>}
                  </div>
                  <div className="absolute top-2 right-2">
                    {photo.released
                      ? <div className="bg-green-600 text-white rounded-full p-1"><Unlock size={12} /></div>
                      : <div className="bg-black/50 text-muted-foreground rounded-full p-1"><Lock size={12} /></div>}
                  </div>
                </div>
                <CardContent className="p-3 space-y-2">
                  <div className="text-[11px] text-muted-foreground truncate">{photo.filename}</div>
                  <div className="flex items-center justify-between border-t border-border/50 pt-2">
                    <div className="flex items-center gap-1.5">
                      <Switch checked={photo.released} onCheckedChange={() => togglePhotoRelease(photo.id, photo.released)} className="h-4 w-7 data-[state=checked]:bg-green-500 scale-75 origin-left" />
                      <span className="text-[10px] text-muted-foreground">Liberar</span>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => handleDeletePhoto(photo.id)} className="h-7 w-7 text-destructive hover:bg-destructive/10"><Trash2 size={13} /></Button>
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
