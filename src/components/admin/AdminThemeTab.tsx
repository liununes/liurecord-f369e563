import { useSiteTheme, useUpdateThemeColor } from "@/hooks/useSiteContent";
import { useState } from "react";
import { toast } from "sonner";
import { Save, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function hslToHex(hslStr: string): string {
  const parts = hslStr.trim().split(/\s+/);
  if (parts.length < 3) return "#000000";
  const h = parseFloat(parts[0]);
  const s = parseFloat(parts[1]) / 100;
  const l = parseFloat(parts[2]) / 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function hexToHsl(hex: string): string {
  let r = parseInt(hex.slice(1, 3), 16) / 255;
  let g = parseInt(hex.slice(3, 5), 16) / 255;
  let b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) * 60; break;
      case g: h = ((b - r) / d + 2) * 60; break;
      case b: h = ((r - g) / d + 4) * 60; break;
    }
  }
  return `${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

const colorLabels: Record<string, string> = {
  background: "Fundo",
  foreground: "Texto",
  primary: "Cor Principal (Dourado)",
  "primary-foreground": "Texto sobre Principal",
  secondary: "Secundário",
  "secondary-foreground": "Texto sobre Secundário",
  card: "Fundo do Card",
  "card-foreground": "Texto do Card",
  muted: "Silenciado",
  "muted-foreground": "Texto Silenciado",
  accent: "Destaque",
  "accent-foreground": "Texto sobre Destaque",
  border: "Bordas",
};

const AdminThemeTab = () => {
  const { data: themes, isLoading } = useSiteTheme();
  const updateMutation = useUpdateThemeColor();
  const [changes, setChanges] = useState<Record<string, string>>({});

  if (isLoading) return <p className="text-muted-foreground font-body">Carregando...</p>;

  const handleChange = (key: string, hex: string) => {
    setChanges((prev) => ({ ...prev, [key]: hexToHsl(hex) }));
  };

  const handleSaveAll = async () => {
    try {
      for (const [key, value] of Object.entries(changes)) {
        await updateMutation.mutateAsync({ themeKey: key, value });
      }
      setChanges({});
      toast.success("Tema atualizado! Recarregue a página pública para ver as mudanças.");
    } catch {
      toast.error("Erro ao salvar tema.");
    }
  };

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-2 mb-6">
        <Palette className="text-primary" size={20} />
        <h2 className="font-display text-2xl tracking-wider text-foreground">Cores do Site</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {themes?.map((t) => {
          const currentValue = changes[t.theme_key] || t.value;
          const hex = hslToHex(currentValue);
          return (
            <div key={t.theme_key} className="bg-card border border-border rounded-lg p-4">
              <label className="block text-xs font-body text-muted-foreground uppercase tracking-wider mb-2">
                {colorLabels[t.theme_key] || t.theme_key}
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={hex}
                  onChange={(e) => handleChange(t.theme_key, e.target.value)}
                  className="w-10 h-10 rounded cursor-pointer border border-border"
                />
                <Input
                  value={currentValue}
                  onChange={(e) => setChanges((prev) => ({ ...prev, [t.theme_key]: e.target.value }))}
                  className="flex-1 text-xs"
                  placeholder="H S% L%"
                />
              </div>
            </div>
          );
        })}
      </div>

      {Object.keys(changes).length > 0 && (
        <Button onClick={handleSaveAll} className="mt-6 bg-gradient-gold" disabled={updateMutation.isPending}>
          <Save size={16} /> Salvar Alterações ({Object.keys(changes).length})
        </Button>
      )}
    </div>
  );
};

export default AdminThemeTab;
