import { useState } from "react";
import { useAllPortfolioMedia, useUpsertMedia, useDeleteMedia } from "@/hooks/useSiteContent";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, Upload, Music, Film, Image } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const mediaTypeIcon = { audio: Music, video: Film, image: Image };
const categoryOptions = ["Spot Rádio", "Carro de Som", "Captação Aérea", "Filmagens", "Social Media", "Outro"];

const AdminMediaTab = () => {
  const { data: media, isLoading } = useAllPortfolioMedia();
  const upsertMutation = useUpsertMedia();
  const deleteMutation = useDeleteMedia();
  const [showForm, setShowForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    title: "",
    category: "Spot Rádio",
    media_type: "audio" as "audio" | "video" | "image",
    file_url: "",
    sort_order: 0,
    is_active: true,
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${form.media_type}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("media").upload(path, file);
      if (error) throw error;
      const { data } = supabase.storage.from("media").getPublicUrl(path);
      setForm((prev) => ({ ...prev, file_url: data.publicUrl }));
      toast.success("Arquivo enviado!");
    } catch (err: any) {
      toast.error("Erro no upload: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!form.title || !form.file_url) {
      toast.error("Preencha o título e envie o arquivo.");
      return;
    }
    try {
      await upsertMutation.mutateAsync(form);
      toast.success("Mídia salva!");
      setForm({ title: "", category: "Spot Rádio", media_type: "audio", file_url: "", sort_order: 0, is_active: true });
      setShowForm(false);
    } catch {
      toast.error("Erro ao salvar mídia.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir esta mídia?")) return;
    try {
      await deleteMutation.mutateAsync(id);
      toast.success("Mídia excluída!");
    } catch {
      toast.error("Erro ao excluir.");
    }
  };

  if (isLoading) return <p className="text-muted-foreground font-body">Carregando...</p>;

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-display text-2xl tracking-wider text-foreground">Portfólio de Mídia</h2>
        <Button onClick={() => setShowForm(!showForm)} className="bg-gradient-gold">
          <Plus size={16} /> Adicionar
        </Button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="bg-card border border-border rounded-lg p-5 mb-6 space-y-4">
          <div className="flex gap-2">
            {(["audio", "video", "image"] as const).map((type) => {
              const Icon = mediaTypeIcon[type];
              return (
                <button
                  key={type}
                  onClick={() => setForm((prev) => ({ ...prev, media_type: type }))}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-body transition-colors ${
                    form.media_type === type ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
                  }`}
                >
                  <Icon size={14} /> {type === "audio" ? "Áudio" : type === "video" ? "Vídeo" : "Imagem"}
                </button>
              );
            })}
          </div>
          <Input placeholder="Título" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
          <select
            value={form.category}
            onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
            className="w-full bg-card border border-border rounded-md px-3 py-2 text-sm font-body text-foreground"
          >
            {categoryOptions.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>

          <div>
            <label className="flex items-center gap-2 cursor-pointer bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors rounded-md px-4 py-2 text-sm font-body w-fit">
              <Upload size={14} /> {uploading ? "Enviando..." : "Enviar arquivo"}
              <input type="file" className="hidden" onChange={handleFileUpload} accept="audio/*,video/*,image/*" disabled={uploading} />
            </label>
            {form.file_url && <p className="text-xs text-muted-foreground mt-1 truncate">{form.file_url}</p>}
          </div>

          <Input
            placeholder="Ordem (número)"
            type="number"
            value={form.sort_order}
            onChange={(e) => setForm((p) => ({ ...p, sort_order: Number(e.target.value) }))}
          />

          <div className="flex gap-2">
            <Button onClick={handleSave} className="bg-gradient-gold" disabled={upsertMutation.isPending}>
              Salvar
            </Button>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
          </div>
        </div>
      )}

      {/* List */}
      <div className="space-y-3">
        {media?.length === 0 && (
          <p className="text-muted-foreground font-body text-sm">Nenhuma mídia cadastrada ainda.</p>
        )}
        {media?.map((item: any) => {
          const Icon = mediaTypeIcon[item.media_type as keyof typeof mediaTypeIcon] || Music;
          return (
            <div key={item.id} className="flex items-center gap-4 bg-card border border-border rounded-lg p-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Icon className="text-primary" size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-body font-medium text-foreground text-sm truncate">{item.title}</h4>
                <p className="font-body text-xs text-muted-foreground">{item.category} · {item.media_type}</p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded ${item.is_active ? "bg-green-900/30 text-green-400" : "bg-red-900/30 text-red-400"}`}>
                {item.is_active ? "Ativo" : "Inativo"}
              </span>
              <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)} className="text-destructive hover:text-destructive">
                <Trash2 size={16} />
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AdminMediaTab;
