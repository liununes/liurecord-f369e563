import { useState, useEffect } from "react";
import { useSiteContent, useUpdateSiteContent } from "@/hooks/useSiteContent";
import { toast } from "sonner";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const sections = [
  { key: "hero", label: "Hero (Início)" },
  { key: "contact", label: "Contato" },
  { key: "footer", label: "Rodapé" },
  { key: "services", label: "Serviços" },
];

const AdminContentTab = () => {
  const [activeSection, setActiveSection] = useState("hero");
  const { data: content, isLoading } = useSiteContent(activeSection);
  const updateMutation = useUpdateSiteContent();
  const [formData, setFormData] = useState<any>(null);

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

  const updateServiceField = (index: number, key: string, value: string) => {
    setFormData((prev: any[]) =>
      prev.map((item: any, i: number) => (i === index ? { ...item, [key]: value } : item))
    );
  };

  if (isLoading) return <p className="text-muted-foreground font-body">Carregando...</p>;

  return (
    <div className="max-w-3xl">
      {/* Section selector */}
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
        <div className="space-y-6">
          {formData.map((service: any, i: number) => (
            <div key={i} className="bg-card border border-border rounded-lg p-4 space-y-3">
              <h4 className="font-body font-medium text-foreground text-sm">Serviço {i + 1}</h4>
              <Input value={service.title} onChange={(e) => updateServiceField(i, "title", e.target.value)} placeholder="Título" />
              <Input value={service.iconName} onChange={(e) => updateServiceField(i, "iconName", e.target.value)} placeholder="Ícone (Radio, Volume2, Camera, Film, Share2)" />
              <Textarea value={service.description} onChange={(e) => updateServiceField(i, "description", e.target.value)} placeholder="Descrição" rows={2} />
            </div>
          ))}
          <Button onClick={handleSave} disabled={updateMutation.isPending} className="bg-gradient-gold">
            <Save size={16} /> Salvar Serviços
          </Button>
        </div>
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
