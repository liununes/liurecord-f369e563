import { useState } from "react";
import { useClients, useUpdateClients } from "@/hooks/useSiteContent";
import { supabase } from "@/integrations/supabase/client";
import { createWatermarkedThumbnail } from "@/lib/watermark";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  Upload,
  Link as LinkIcon,
  Search,
  ChevronLeft,
  Users,
  Copy,
  Calendar,
  Lock,
  Unlock,
  Key,
  Eye,
  EyeOff,
  Check,
  Heart,
  X as XIcon,
  RefreshCw,
  Download
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

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
  photos: ClientPhoto[];
  created_at: string;
}

const AdminClientsTab = () => {
  const { data: clients = [], isLoading } = useClients();
  const updateClientsMutation = useUpdateClients();

  const [searchTerm, setSearchTerm] = useState("");
  const [view, setView] = useState<"list" | "edit">("list");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  // Form states for creating a new client
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newClientName, setNewClientName] = useState("");
  const [newClientPassword, setNewClientPassword] = useState("");
  const [newClientWatermark, setNewClientWatermark] = useState("LIU RECORD");

  // Edit states
  const [showPassword, setShowPassword] = useState<Record<string, boolean>>({});
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const togglePasswordVisibility = (id: string) => {
    setShowPassword((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName || !newClientPassword) {
      toast.error("Por favor, preencha o nome e a senha.");
      return;
    }

    const newClient: Client = {
      id: crypto.randomUUID(),
      name: newClientName,
      password: newClientPassword,
      watermarkText: newClientWatermark || "LIU RECORD",
      photos: [],
      created_at: new Date().toISOString()
    };

    try {
      const updatedClients = [newClient, ...clients];
      await updateClientsMutation.mutateAsync(updatedClients);
      toast.success("Cliente criado com sucesso!");
      setNewClientName("");
      setNewClientPassword("");
      setNewClientWatermark("LIU RECORD");
      setShowCreateForm(false);
    } catch (err: any) {
      toast.error("Erro ao criar cliente: " + err.message);
    }
  };

  const handleDeleteClient = async (id: string, name: string) => {
    if (!confirm(`Tem certeza que deseja excluir o cliente "${name}"? Todas as fotos e seleções serão perdidas.`)) return;

    try {
      const updatedClients = clients.filter((c) => c.id !== id);
      await updateClientsMutation.mutateAsync(updatedClients);
      toast.success("Cliente excluído.");
      if (selectedClient?.id === id) {
        setView("list");
        setSelectedClient(null);
      }
    } catch (err: any) {
      toast.error("Erro ao excluir cliente: " + err.message);
    }
  };

  const copyLink = (id: string) => {
    const url = `${window.location.origin}/galeria/${id}`;
    navigator.clipboard.writeText(url);
    toast.success("Link da galeria copiado!");
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !selectedClient) return;

    setUploading(true);
    setUploadProgress(0);
    const total = files.length;
    let processed = 0;
    const updatedPhotos = [...(selectedClient.photos || [])];

    for (let i = 0; i < total; i++) {
      const file = files[i];
      try {
        const watermark = selectedClient.watermarkText || "LIU RECORD";
        
        // 1. Create compressed & watermarked thumbnail (max width 900px)
        const thumbBlob = await createWatermarkedThumbnail(file, watermark, 900, 900);

        const timestamp = Date.now();
        const rand = Math.round(Math.random() * 1e6);
        const safeName = file.name.replace(/[^a-zA-Z0-9.]/g, "_");

        // 2. Upload Original (unwatermarked) image to Supabase storage
        const originalPath = `clients/${selectedClient.id}/originals/${timestamp}-${rand}-${safeName}`;
        const { error: origErr } = await supabase.storage.from("media").upload(originalPath, file);
        if (origErr) throw origErr;
        const { data: origUrlData } = supabase.storage.from("media").getPublicUrl(originalPath);

        // 3. Upload Thumbnail (watermarked) image to Supabase storage
        const thumbnailPath = `clients/${selectedClient.id}/thumbnails/${timestamp}-${rand}-thumb.jpg`;
        const { error: thumbErr } = await supabase.storage.from("media").upload(thumbnailPath, thumbBlob);
        if (thumbErr) throw thumbErr;
        const { data: thumbUrlData } = supabase.storage.from("media").getPublicUrl(thumbnailPath);

        // 4. Push photo item
        updatedPhotos.push({
          id: `${timestamp}-${rand}`,
          original_url: origUrlData.publicUrl,
          thumbnail_url: thumbUrlData.publicUrl,
          filename: file.name,
          status: "pending",
          released: false
        });

      } catch (err: any) {
        console.error(err);
        toast.error(`Erro ao enviar "${file.name}": ${err.message}`);
      } finally {
        processed++;
        setUploadProgress(Math.round((processed / total) * 100));
      }
    }

    try {
      const updatedClients = clients.map((c) =>
        c.id === selectedClient.id ? { ...c, photos: updatedPhotos } : c
      );
      await updateClientsMutation.mutateAsync(updatedClients);
      
      const refreshedClient = updatedClients.find((c) => c.id === selectedClient.id);
      if (refreshedClient) setSelectedClient(refreshedClient);

      toast.success(`${processed} foto(s) carregada(s) com sucesso!`);
    } catch (err: any) {
      toast.error("Erro ao atualizar banco de dados: " + err.message);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleUpdateClientSettings = async (field: keyof Client, val: string) => {
    if (!selectedClient) return;
    try {
      const updatedClient = { ...selectedClient, [field]: val };
      const updatedClients = clients.map((c) =>
        c.id === selectedClient.id ? updatedClient : c
      );
      await updateClientsMutation.mutateAsync(updatedClients);
      setSelectedClient(updatedClient);
      toast.success("Configuração atualizada!");
    } catch (err: any) {
      toast.error("Erro ao atualizar: " + err.message);
    }
  };

  const togglePhotoRelease = async (photoId: string, currentState: boolean) => {
    if (!selectedClient) return;
    try {
      const updatedPhotos = selectedClient.photos.map((p) =>
        p.id === photoId ? { ...p, released: !currentState } : p
      );
      const updatedClient = { ...selectedClient, photos: updatedPhotos };
      const updatedClients = clients.map((c) =>
        c.id === selectedClient.id ? updatedClient : c
      );
      await updateClientsMutation.mutateAsync(updatedClients);
      setSelectedClient(updatedClient);
      toast.success(!currentState ? "Foto liberada para download!" : "Download bloqueado para esta foto.");
    } catch (err: any) {
      toast.error("Erro ao alterar liberação: " + err.message);
    }
  };

  const handleBulkRelease = async (type: "all" | "liked" | "block") => {
    if (!selectedClient) return;
    try {
      const updatedPhotos = selectedClient.photos.map((p) => {
        if (type === "all") return { ...p, released: true };
        if (type === "liked") return { ...p, released: p.status === "liked" };
        return { ...p, released: false };
      });
      
      const updatedClient = { ...selectedClient, photos: updatedPhotos };
      const updatedClients = clients.map((c) =>
        c.id === selectedClient.id ? updatedClient : c
      );
      await updateClientsMutation.mutateAsync(updatedClients);
      setSelectedClient(updatedClient);
      toast.success("Atualização em lote realizada com sucesso!");
    } catch (err: any) {
      toast.error("Erro na liberação em lote: " + err.message);
    }
  };

  const handleDeletePhoto = async (photoId: string) => {
    if (!selectedClient || !confirm("Excluir esta foto permanentemente?")) return;
    try {
      // Optioanlly delete from storage too. But to keep it simple, we just remove the reference.
      const updatedPhotos = selectedClient.photos.filter((p) => p.id !== photoId);
      const updatedClient = { ...selectedClient, photos: updatedPhotos };
      const updatedClients = clients.map((c) =>
        c.id === selectedClient.id ? updatedClient : c
      );
      await updateClientsMutation.mutateAsync(updatedClients);
      setSelectedClient(updatedClient);
      toast.success("Foto excluída do álbum.");
    } catch (err: any) {
      toast.error("Erro ao excluir foto: " + err.message);
    }
  };

  const filteredClients = clients.filter((c) =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground font-body">
        <RefreshCw className="animate-spin mb-4" size={32} />
        <p>Carregando clientes...</p>
      </div>
    );
  }

  // Dashboard Stats calculation
  const totalClients = clients.length;
  const totalPhotos = clients.reduce((acc, c) => acc + (c.photos?.length || 0), 0);
  const pendingChoices = clients.filter((c) => c.photos?.some((p) => p.status === "pending")).length;

  return (
    <div className="space-y-6">
      {view === "list" ? (
        <>
          {/* Dashboard Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-card/50 border-border backdrop-blur">
              <CardHeader className="pb-2">
                <CardDescription className="font-body text-xs text-muted-foreground uppercase tracking-wider">Clientes Cadastrados</CardDescription>
                <CardTitle className="font-display text-3xl text-gradient-gold flex items-center gap-2">
                  <Users size={24} className="text-primary" /> {totalClients}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card className="bg-card/50 border-border backdrop-blur">
              <CardHeader className="pb-2">
                <CardDescription className="font-body text-xs text-muted-foreground uppercase tracking-wider">Fotos Totais Enviadas</CardDescription>
                <CardTitle className="font-display text-3xl text-gradient-gold flex items-center gap-2">
                  <Upload size={24} className="text-primary" /> {totalPhotos}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card className="bg-card/50 border-border backdrop-blur">
              <CardHeader className="pb-2">
                <CardDescription className="font-body text-xs text-muted-foreground uppercase tracking-wider">Galerias com Escolhas Pendentes</CardDescription>
                <CardTitle className="font-display text-3xl text-rose-500 flex items-center gap-2">
                  <Lock size={24} className="text-rose-500" /> {pendingChoices}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>

          {/* Search and Action Bar */}
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="relative w-full sm:max-w-md">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Pesquisar cliente..."
                className="pl-9 bg-card border-border font-body"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="w-full sm:w-auto bg-gradient-gold text-primary-foreground font-body font-semibold flex items-center gap-2"
            >
              <Plus size={16} /> Novo Cliente
            </Button>
          </div>

          {/* Create Client Collapsible Card */}
          {showCreateForm && (
            <Card className="bg-card border-border shadow-lg max-w-lg">
              <CardHeader>
                <CardTitle className="font-display text-lg text-foreground">Novo Cliente</CardTitle>
                <CardDescription className="font-body text-xs text-muted-foreground">Crie um link e senha individuais para a seleção de fotos do seu cliente.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateClient} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-body font-medium text-foreground">Nome do Cliente</label>
                    <Input
                      placeholder="Ex: João e Maria - Casamento"
                      value={newClientName}
                      onChange={(e) => setNewClientName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-body font-medium text-foreground">Senha de Acesso</label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Ex: casorio2026"
                        value={newClientPassword}
                        onChange={(e) => setNewClientPassword(e.target.value)}
                        required
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setNewClientPassword(Math.random().toString(36).substring(2, 10))}
                        className="text-xs font-body"
                      >
                        Gerar Senha
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-body font-medium text-foreground flex items-center justify-between">
                      <span>Texto da Marca D'água</span>
                      <span className="text-[10px] text-muted-foreground font-normal">Será aplicada na miniatura das fotos</span>
                    </label>
                    <Input
                      placeholder="Ex: LIU RECORD"
                      value={newClientWatermark}
                      onChange={(e) => setNewClientWatermark(e.target.value)}
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="ghost" onClick={() => setShowCreateForm(false)} className="text-muted-foreground">
                      Cancelar
                    </Button>
                    <Button type="submit" className="bg-gradient-gold">
                      Salvar Cliente
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Client List */}
          <div className="space-y-4">
            {filteredClients.length === 0 ? (
              <p className="text-muted-foreground font-body text-sm py-4">Nenhum cliente cadastrado com esse nome.</p>
            ) : (
              filteredClients.map((client) => {
                const photosCount = client.photos?.length || 0;
                const likedCount = client.photos?.filter((p) => p.status === "liked").length || 0;
                const dislikedCount = client.photos?.filter((p) => p.status === "disliked").length || 0;
                const releasedCount = client.photos?.filter((p) => p.released).length || 0;

                return (
                  <Card key={client.id} className="bg-card/40 border-border hover:border-primary/40 transition-colors">
                    <CardContent className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-display text-lg text-foreground font-semibold leading-none">{client.name}</h3>
                          <Badge variant="outline" className="font-body text-[10px] border-primary/20 text-primary">
                            {photosCount} foto{photosCount !== 1 && "s"}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground font-body">
                          <span className="flex items-center gap-1">
                            <Calendar size={13} /> {new Date(client.created_at).toLocaleDateString("pt-BR")}
                          </span>
                          <span className="flex items-center gap-1">
                            <Key size={13} />
                            <span className="font-mono bg-secondary px-1.5 py-0.5 rounded text-[11px] flex items-center gap-1.5">
                              {showPassword[client.id] ? client.password : "••••••••"}
                              <button onClick={() => togglePasswordVisibility(client.id)} className="hover:text-foreground">
                                {showPassword[client.id] ? <EyeOff size={11} /> : <Eye size={11} />}
                              </button>
                            </span>
                          </span>
                        </div>
                        {/* Badges of Selection */}
                        <div className="flex items-center gap-2 pt-1">
                          <span className="text-xs font-body text-muted-foreground mr-1">Seleção:</span>
                          <Badge variant="secondary" className="bg-rose-950/20 hover:bg-rose-950/20 text-rose-500 border-rose-900/30 text-[10px] flex items-center gap-1 py-0 px-2">
                            <Heart size={10} className="fill-rose-500 text-rose-500" /> {likedCount}
                          </Badge>
                          <Badge variant="secondary" className="bg-red-950/20 hover:bg-red-950/20 text-red-400 border-red-900/30 text-[10px] flex items-center gap-1 py-0 px-2">
                            <XIcon size={10} /> {dislikedCount}
                          </Badge>
                          <Badge variant="secondary" className="bg-green-950/20 hover:bg-green-950/20 text-green-400 border-green-900/30 text-[10px] flex items-center gap-1 py-0 px-2">
                            <Unlock size={10} /> {releasedCount} liberada{releasedCount !== 1 && "s"}
                          </Badge>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex flex-wrap items-center gap-2 md:self-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyLink(client.id)}
                          className="font-body text-xs border-border flex items-center gap-1.5"
                        >
                          <LinkIcon size={13} /> Copiar Link
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedClient(client);
                            setView("edit");
                          }}
                          className="font-body text-xs border-border bg-secondary hover:bg-secondary/80 flex items-center gap-1.5"
                        >
                          Gerenciar Galeria
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteClient(client.id, client.name)}
                          className="text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </>
      ) : (
        /* EDIT CLIENT GALLERY VIEW */
        selectedClient && (
          <div className="space-y-6">
            {/* Header / Back */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-border pb-4">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" onClick={() => setView("list")} className="text-muted-foreground hover:text-foreground">
                  <ChevronLeft size={20} />
                </Button>
                <div>
                  <h2 className="font-display text-2xl text-foreground font-semibold leading-none">{selectedClient.name}</h2>
                  <p className="text-xs text-muted-foreground font-body mt-1">Gerenciando fotos e senhas do cliente.</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Button variant="outline" size="sm" onClick={() => copyLink(selectedClient.id)} className="font-body text-xs flex items-center gap-1.5">
                  <LinkIcon size={14} /> Link do Cliente
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(`/galeria/${selectedClient.id}`, "_blank")}
                  className="font-body text-xs bg-secondary flex items-center gap-1.5"
                >
                  Visualizar como Cliente
                </Button>
              </div>
            </div>

            {/* Quick configuration forms */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="bg-card border-border">
                <CardHeader className="py-4">
                  <CardTitle className="font-display text-sm">Alterar Nome</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 pb-4">
                  <Input
                    defaultValue={selectedClient.name}
                    onBlur={(e) => {
                      if (e.target.value && e.target.value !== selectedClient.name) {
                        handleUpdateClientSettings("name", e.target.value);
                      }
                    }}
                    placeholder="Nome do Cliente"
                  />
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardHeader className="py-4">
                  <CardTitle className="font-display text-sm">Alterar Senha</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 pb-4">
                  <Input
                    defaultValue={selectedClient.password}
                    onBlur={(e) => {
                      if (e.target.value && e.target.value !== selectedClient.password) {
                        handleUpdateClientSettings("password", e.target.value);
                      }
                    }}
                    placeholder="Senha de Acesso"
                  />
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardHeader className="py-4">
                  <CardTitle className="font-display text-sm">Marca D'água da Miniatura</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 pb-4">
                  <Input
                    defaultValue={selectedClient.watermarkText || "LIU RECORD"}
                    onBlur={(e) => {
                      if (e.target.value && e.target.value !== (selectedClient.watermarkText || "LIU RECORD")) {
                        handleUpdateClientSettings("watermarkText", e.target.value);
                      }
                    }}
                    placeholder="Texto Marca D'água"
                  />
                </CardContent>
              </Card>
            </div>

            {/* Photo Upload Area */}
            <Card className="bg-card/50 border-dashed border-2 border-border p-6 rounded-lg text-center hover:border-primary/40 transition-colors">
              <div className="flex flex-col items-center justify-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <Upload size={24} />
                </div>
                <div>
                  <p className="font-body text-sm font-semibold text-foreground">Carregar novas fotos</p>
                  <p className="font-body text-xs text-muted-foreground mt-1">Selecione arquivos JPG, PNG para enviar. A marca d'água será gerada e adicionada automaticamente.</p>
                </div>
                <label className="cursor-pointer bg-gradient-gold text-primary-foreground font-body font-semibold text-sm px-4 py-2 rounded shadow hover:opacity-90 transition-opacity">
                  {uploading ? "Processando fotos..." : "Selecionar Arquivos"}
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhotoUpload}
                    disabled={uploading}
                  />
                </label>
                {uploading && (
                  <div className="w-full max-w-xs space-y-2">
                    <Progress value={uploadProgress} className="h-1.5 bg-secondary" />
                    <p className="text-xs font-body text-muted-foreground">{uploadProgress}% concluído</p>
                  </div>
                )}
              </div>
            </Card>

            {/* Photos and Selections Management */}
            <div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
                <div>
                  <h3 className="font-display text-lg text-foreground font-semibold">Fotos no Álbum ({selectedClient.photos?.length || 0})</h3>
                  <p className="text-xs text-muted-foreground font-body mt-0.5">Veja as curtidas do cliente e libere as imagens originais para download.</p>
                </div>
                {/* Bulk Actions */}
                {selectedClient.photos?.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleBulkRelease("liked")} className="font-body text-xs text-rose-400 border-rose-900/30 bg-rose-950/10 hover:bg-rose-950/20">
                      Liberar Apenas Curtidas (❤️)
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleBulkRelease("all")} className="font-body text-xs text-green-400 border-green-900/30 bg-green-950/10 hover:bg-green-950/20">
                      Liberar Todas
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleBulkRelease("block")} className="font-body text-xs text-muted-foreground border-border">
                      Bloquear Todas
                    </Button>
                  </div>
                )}
              </div>

              {selectedClient.photos?.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground bg-card/20 border border-border rounded-lg font-body">
                  Nenhuma foto carregada para este cliente ainda. Faça upload de fotos acima.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {selectedClient.photos?.map((photo) => (
                    <Card key={photo.id} className="bg-card border-border overflow-hidden group relative flex flex-col justify-between">
                      {/* Photo Thumbnail */}
                      <div className="relative aspect-square bg-muted flex items-center justify-center overflow-hidden">
                        <img
                          src={photo.thumbnail_url}
                          alt={photo.filename}
                          className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                        {/* Status overlays */}
                        <div className="absolute top-2 left-2 flex gap-1.5">
                          {photo.status === "liked" && (
                            <Badge className="bg-rose-600 hover:bg-rose-600 text-white border-none text-[10px] flex items-center gap-1 py-0.5 px-2">
                              <Heart size={10} className="fill-white" /> Escolhida
                            </Badge>
                          )}
                          {photo.status === "disliked" && (
                            <Badge variant="destructive" className="bg-red-600 hover:bg-red-600 text-[10px] flex items-center gap-1 py-0.5 px-2">
                              <XIcon size={10} /> Não gostou
                            </Badge>
                          )}
                          {photo.status === "pending" && (
                            <Badge variant="secondary" className="bg-black/50 backdrop-blur border-none text-white text-[10px]">
                              Pendente
                            </Badge>
                          )}
                        </div>
                        {/* Download released overlay badge */}
                        <div className="absolute top-2 right-2">
                          {photo.released ? (
                            <div className="bg-green-600 text-white rounded-full p-1 shadow" title="Download Liberado">
                              <Unlock size={12} />
                            </div>
                          ) : (
                            <div className="bg-black/50 text-muted-foreground rounded-full p-1" title="Download Bloqueado">
                              <Lock size={12} />
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Photo Actions panel */}
                      <CardContent className="p-3 space-y-2.5">
                        <div className="text-[11px] font-body text-muted-foreground truncate" title={photo.filename}>
                          {photo.filename}
                        </div>
                        <div className="flex items-center justify-between border-t border-border/50 pt-2">
                          <div className="flex items-center gap-1.5">
                            <Switch
                              checked={photo.released}
                              onCheckedChange={() => togglePhotoRelease(photo.id, photo.released)}
                              id={`release-${photo.id}`}
                              className="h-4 w-7 data-[state=checked]:bg-green-500 scale-75 origin-left"
                            />
                            <label htmlFor={`release-${photo.id}`} className="text-[10px] font-body text-muted-foreground cursor-pointer select-none">
                              Liberar
                            </label>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => window.open(photo.original_url, "_blank")}
                              className="h-7 w-7 text-muted-foreground hover:text-foreground"
                              title="Ver original"
                            >
                              <Download size={13} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeletePhoto(photo.id)}
                              className="h-7 w-7 text-destructive hover:bg-destructive/10"
                              title="Excluir foto"
                            >
                              <Trash2 size={13} />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        )
      )}
    </div>
  );
};

export default AdminClientsTab;
