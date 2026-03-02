import { useState, useEffect } from "react";
import { useSiteContent, useUpdateSiteContent } from "@/hooks/useSiteContent";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Save, Upload, Palette, MessageCircle, Image } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const AdminSettingsTab = () => {
  const { data: settings, isLoading } = useSiteContent("settings");
  const updateMutation = useUpdateSiteContent();
  const [form, setForm] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [logoPreview, setLogoPreview] = useState("");
  const [bgPreview, setBgPreview] = useState("");

  useEffect(() => {
    if (settings) {
      const s = typeof settings === "string" ? JSON.parse(settings) : settings;
      setForm(s);
      if (s.logo_url) setLogoPreview(s.logo_url);
      if (s.background_type === "image" && s.background_value) setBgPreview(s.background_value);
    }
  }, [settings]);

  const handleSave = async () => {
    try {
      await updateMutation.mutateAsync({ sectionKey: "settings", content: form });
      toast.success("Configurações salvas!");
    } catch {
      toast.error("Erro ao salvar.");
    }
  };

  const uploadFile = async (file: File, folder: string) => {
    const ext = file.name.split(".").pop();
    const path = `${folder}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("media").upload(path, file);
    if (error) throw error;
    const { data } = supabase.storage.from("media").getPublicUrl(path);
    return data.publicUrl;
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadFile(file, "logo");
      setForm((p: any) => ({ ...p, logo_url: url }));
      setLogoPreview(url);
      toast.success("Logo enviada!");
    } catch (err: any) {
      toast.error("Erro: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleBgImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadFile(file, "backgrounds");
      setForm((p: any) => ({ ...p, background_value: url }));
      setBgPreview(url);
      toast.success("Imagem de fundo enviada!");
    } catch (err: any) {
      toast.error("Erro: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const update = (key: string, value: string) => setForm((p: any) => ({ ...p, [key]: value }));

  if (isLoading || !form) return <p className="text-muted-foreground font-body">Carregando...</p>;

  return (
    <div className="max-w-3xl space-y-8">
      {/* LOGO */}
      <section className="bg-card border border-border rounded-lg p-6 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Image className="text-primary" size={18} />
          <h3 className="font-display text-xl tracking-wider text-foreground">Logo do Cabeçalho</h3>
        </div>
        {logoPreview && (
          <div className="bg-secondary/50 rounded-lg p-4 flex items-center justify-center">
            <img src={logoPreview} alt="Logo preview" className="max-h-20 object-contain" />
          </div>
        )}
        <label className="flex items-center gap-2 cursor-pointer bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors rounded-md px-4 py-2 text-sm font-body w-fit">
          <Upload size={14} /> {uploading ? "Enviando..." : "Enviar nova logo"}
          <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} disabled={uploading} />
        </label>
      </section>

      {/* BACKGROUND */}
      <section className="bg-card border border-border rounded-lg p-6 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Palette className="text-primary" size={18} />
          <h3 className="font-display text-xl tracking-wider text-foreground">Fundo do Site</h3>
        </div>
        <div className="flex gap-2 flex-wrap">
          {(["solid", "gradient", "image"] as const).map((t) => (
            <button
              key={t}
              onClick={() => update("background_type", t)}
              className={`px-3 py-1.5 rounded text-sm font-body transition-colors ${
                form.background_type === t
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              {t === "solid" ? "Cor Sólida" : t === "gradient" ? "Gradiente" : "Imagem"}
            </button>
          ))}
        </div>

        {form.background_type === "solid" && (
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={form.background_value || "#1a1714"}
              onChange={(e) => update("background_value", e.target.value)}
              className="w-10 h-10 rounded cursor-pointer border border-border"
            />
            <Input value={form.background_value || ""} onChange={(e) => update("background_value", e.target.value)} placeholder="Cor hex (#1a1714)" className="flex-1" />
          </div>
        )}

        {form.background_type === "gradient" && (
          <Input
            value={form.background_value || ""}
            onChange={(e) => update("background_value", e.target.value)}
            placeholder="Ex: linear-gradient(135deg, #1a1714, #2a2014)"
          />
        )}

        {form.background_type === "image" && (
          <div className="space-y-3">
            {bgPreview && (
              <div className="rounded-lg overflow-hidden h-32">
                <img src={bgPreview} alt="Background preview" className="w-full h-full object-cover" />
              </div>
            )}
            <label className="flex items-center gap-2 cursor-pointer bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors rounded-md px-4 py-2 text-sm font-body w-fit">
              <Upload size={14} /> {uploading ? "Enviando..." : "Enviar imagem de fundo"}
              <input type="file" className="hidden" accept="image/*" onChange={handleBgImageUpload} disabled={uploading} />
            </label>
          </div>
        )}
      </section>

      {/* CONTACT / WHATSAPP */}
      <section className="bg-card border border-border rounded-lg p-6 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <MessageCircle className="text-primary" size={18} />
          <h3 className="font-display text-xl tracking-wider text-foreground">Contato e WhatsApp</h3>
        </div>
        <div>
          <label className="block text-xs font-body text-muted-foreground uppercase tracking-wider mb-1">E-mail de contato</label>
          <Input value={form.contact_email || ""} onChange={(e) => update("contact_email", e.target.value)} placeholder="email@exemplo.com" />
        </div>
        <div>
          <label className="block text-xs font-body text-muted-foreground uppercase tracking-wider mb-1">Número do WhatsApp (apenas números, com DDD)</label>
          <Input value={form.whatsapp_number || ""} onChange={(e) => update("whatsapp_number", e.target.value)} placeholder="5533999837414" />
        </div>
        <div>
          <label className="block text-xs font-body text-muted-foreground uppercase tracking-wider mb-1">Mensagem padrão do WhatsApp</label>
          <Textarea value={form.whatsapp_message || ""} onChange={(e) => update("whatsapp_message", e.target.value)} rows={2} />
        </div>
      </section>

      <Button onClick={handleSave} disabled={updateMutation.isPending} className="bg-gradient-gold">
        <Save size={16} /> Salvar Configurações
      </Button>
    </div>
  );
};

export default AdminSettingsTab;
