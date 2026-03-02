import { useState, useEffect } from "react";
import { useSiteContent, useUpdateSiteContent } from "@/hooks/useSiteContent";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Save, Plus, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const sections = [
  { key: "hero", label: "Hero (Início)" },
  { key: "contact", label: "Contato" },
  { key: "footer", label: "Rodapé" },
  { key: "services", label: "Serviços" },
  { key: "testimonials", label: "Depoimentos" },
  { key: "how_it_works", label: "Como Funciona" },
];

const AdminContentTab = () => {
  const [activeSection, setActiveSection] = useState("hero");
  const { data: content, isLoading } = useSiteContent(activeSection);
  const updateMutation = useUpdateSiteContent();
  const [formData, setFormData] = useState<any>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (content) {
      setFormData(typeof content === "string" ? JSON.parse(content) : content);
    }
  }, [content]);

  const handleSave = async () => {
    try {
      await updateMutation.mutateAsync({ sectionKey: activeSection, content: formData });
      toast.success("Conteúdo salvo com sucesso!");
    } catch {
      toast.error("Erro ao salvar conteúdo.");
    }
  };

  const updateField = (key: string, value: string) => {
    setFormData((prev: any) => ({ ...prev, [key]: value }));
  };

  const updateArrayField = (index: number, key: string, value: string) => {
    setFormData((prev: any[]) =>
      prev.map((item: any, i: number) => (i === index ? { ...item, [key]: value } : item))
    );
  };

  const addArrayItem = (template: any) => {
    setFormData((prev: any[]) => [...(prev || []), template]);
  };

  const removeArrayItem = (index: number) => {
    setFormData((prev: any[]) => prev.filter((_: any, i: number) => i !== index));
  };

  const uploadImage = async (file: File, index: number) => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `services/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("media").upload(path, file);
      if (error) throw error;
      const { data } = supabase.storage.from("media").getPublicUrl(path);
      updateArrayField(index, "image_url", data.publicUrl);
      toast.success("Imagem enviada!");
    } catch (err: any) {
      toast.error("Erro: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  if (isLoading) return <p className="text-muted-foreground font-body">Carregando...</p>;

  const renderArrayEditor = (fields: { key: string; label: string; textarea?: boolean }[], itemLabel: string, template: any, showImageUpload = false) => (
    <div className="space-y-6">
      {Array.isArray(formData) && formData.map((item: any, i: number) => (
        <div key={i} className="bg-card border border-border rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-body font-medium text-foreground text-sm">{itemLabel} {i + 1}</h4>
            <Button variant="ghost" size="icon" onClick={() => removeArrayItem(i)} className="text-destructive h-8 w-8">
              <Trash2 size={14} />
            </Button>
          </div>
          {fields.map((f) => (
            <div key={f.key}>
              <label className="block text-xs font-body text-muted-foreground uppercase tracking-wider mb-1">{f.label}</label>
              {f.textarea ? (
                <Textarea value={item[f.key] || ""} onChange={(e) => updateArrayField(i, f.key, e.target.value)} rows={2} />
              ) : (
                <Input value={item[f.key] || ""} onChange={(e) => updateArrayField(i, f.key, e.target.value)} />
              )}
            </div>
          ))}
          {showImageUpload && (
            <div>
              <label className="block text-xs font-body text-muted-foreground uppercase tracking-wider mb-1">Imagem</label>
              {item.image_url && (
                <img src={item.image_url} alt="" className="h-24 object-cover rounded mb-2" />
              )}
              <label className="flex items-center gap-2 cursor-pointer bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors rounded-md px-3 py-1.5 text-xs font-body w-fit">
                <Upload size={12} /> {uploading ? "Enviando..." : "Upload imagem"}
                <input type="file" className="hidden" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage(f, i); }} disabled={uploading} />
              </label>
            </div>
          )}
        </div>
      ))}
      <div className="flex gap-3">
        <Button variant="outline" onClick={() => addArrayItem(template)} className="gap-2">
          <Plus size={14} /> Adicionar {itemLabel}
        </Button>
        <Button onClick={handleSave} disabled={updateMutation.isPending} className="bg-gradient-gold gap-2">
          <Save size={16} /> Salvar
        </Button>
      </div>
    </div>
  );

  return (
    <div className="max-w-3xl">
      <div className="flex gap-2 mb-6 flex-wrap">
        {sections.map((s) => (
          <button
            key={s.key}
            onClick={() => setActiveSection(s.key)}
            className={`px-3 py-1.5 rounded text-sm font-body transition-colors ${
              activeSection === s.key
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {formData && activeSection === "services" && Array.isArray(formData) ? (
        renderArrayEditor(
          [
            { key: "title", label: "Título" },
            { key: "iconName", label: "Ícone (Radio, Volume2, Camera, Film, Share2)" },
            { key: "description", label: "Descrição", textarea: true },
          ],
          "Serviço",
          { id: `service-${Date.now()}`, title: "", iconName: "Radio", description: "", image_url: "" },
          true
        )
      ) : formData && activeSection === "testimonials" && Array.isArray(formData) ? (
        renderArrayEditor(
          [
            { key: "name", label: "Nome" },
            { key: "role", label: "Cargo / Cidade" },
            { key: "text", label: "Depoimento", textarea: true },
          ],
          "Depoimento",
          { name: "", role: "", text: "" }
        )
      ) : formData && activeSection === "how_it_works" && Array.isArray(formData) ? (
        renderArrayEditor(
          [
            { key: "step", label: "Número do passo" },
            { key: "title", label: "Título" },
            { key: "description", label: "Descrição", textarea: true },
          ],
          "Passo",
          { step: "", title: "", description: "" }
        )
      ) : formData && typeof formData === "object" ? (
        <div className="space-y-4">
          {Object.entries(formData).map(([key, value]) => (
            <div key={key}>
              <label className="block text-xs font-body text-muted-foreground uppercase tracking-wider mb-1">{key}</label>
              {String(value).length > 80 ? (
                <Textarea value={String(value)} onChange={(e) => updateField(key, e.target.value)} rows={3} />
              ) : (
                <Input value={String(value)} onChange={(e) => updateField(key, e.target.value)} />
              )}
            </div>
          ))}
          <Button onClick={handleSave} disabled={updateMutation.isPending} className="bg-gradient-gold">
            <Save size={16} /> Salvar
          </Button>
        </div>
      ) : null}
    </div>
  );
};

export default AdminContentTab;
