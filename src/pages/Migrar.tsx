import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { decryptData } from "@/lib/crypto";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Loader2, Check, AlertTriangle } from "lucide-react";

const Migrar = () => {
  const [status, setStatus] = useState<"idle" | "running" | "done" | "error">("idle");
  const [log, setLog] = useState<string[]>([]);

  const addLog = (msg: string) => setLog((prev) => [...prev, msg]);

  const migrate = async () => {
    setStatus("running");
    setLog([]);

    try {
      addLog("Buscando dados antigos do site_content...");

      const { data: row, error: fetchErr } = await supabase
        .from("site_content")
        .select("content")
        .eq("section_key", "clients")
        .maybeSingle();

      if (fetchErr) throw fetchErr;
      if (!row || !row.content) {
        addLog("Nenhum dado encontrado no site_content. Nada a migrar.");
        setStatus("done");
        return;
      }

      const content = row.content as any;
      let clients: any[] = [];

      if (content.encrypted) {
        addLog("Descriptografando dados...");
        const decrypted = await decryptData(content.encrypted, "liu_record_proofing_vault");
        clients = Array.isArray(decrypted) ? decrypted : [];
      } else if (Array.isArray(content)) {
        clients = content;
      }

      addLog(`${clients.length} cliente(s) encontrado(s).`);

      if (clients.length === 0) {
        addLog("Nenhum cliente para migrar.");
        setStatus("done");
        return;
      }

      for (const oldClient of clients) {
        addLog(`Migrando cliente: ${oldClient.name}...`);

        const { data: newClient, error: clientErr } = await supabase
          .from("clients")
          .insert({
            id: oldClient.id,
            name: oldClient.name,
            password: oldClient.password,
            watermark_text: oldClient.watermarkText || "LIU RECORD",
            max_photos: oldClient.maxPhotos || null,
            created_at: oldClient.created_at || new Date().toISOString(),
          })
          .select()
          .single();

        if (clientErr) {
          addLog(`Erro ao criar cliente "${oldClient.name}": ${clientErr.message}`);
          continue;
        }

        if (oldClient.photos && oldClient.photos.length > 0) {
          addLog(`  -> ${oldClient.photos.length} foto(s) para migrar...`);

          const photoRows = oldClient.photos.map((p: any, i: number) => ({
            id: p.id,
            client_id: newClient.id,
            original_url: p.original_url,
            thumbnail_url: p.thumbnail_url,
            filename: p.filename || "foto.jpg",
            status: p.status || "pending",
            released: p.released || false,
            sort_order: i,
            created_at: oldClient.created_at || new Date().toISOString(),
          }));

          const { error: photosErr } = await supabase.from("client_photos").insert(photoRows);
          if (photosErr) {
            addLog(`  Erro ao migrar fotos: ${photosErr.message}`);
          } else {
            addLog(`  OK! ${photoRows.length} foto(s) migrada(s).`);
          }
        }
      }

      addLog("Migração concluída!");
      setStatus("done");
      toast.success("Migração concluída! Seus clientes voltaram.");
    } catch (err: any) {
      addLog(`Erro: ${err.message}`);
      setStatus("error");
      toast.error("Erro na migração.");
    }
  };

  return (
    <div className="min-h-screen bg-[#0c0a09] text-foreground flex items-center justify-center px-4">
      <div className="w-full max-w-lg bg-card border border-border rounded-lg p-8 space-y-6">
        <div className="text-center">
          <h1 className="font-display text-2xl text-gradient-gold mb-2">Migrar Dados</h1>
          <p className="text-sm text-muted-foreground font-body">
            Move os clientes do sistema antigo (criptografado) para o novo (tabelas diretas).
          </p>
        </div>

        {status === "idle" && (
          <Button onClick={migrate} className="w-full bg-gradient-gold text-primary-foreground font-body font-semibold py-5">
            Iniciar Migração
          </Button>
        )}

        {status === "running" && (
          <div className="flex items-center justify-center gap-2 text-primary">
            <Loader2 className="animate-spin" size={20} /> Migrando...
          </div>
        )}

        {status === "done" && (
          <div className="flex items-center justify-center gap-2 text-green-400">
            <Check size={20} /> Concluído!
          </div>
        )}

        {status === "error" && (
          <div className="flex items-center justify-center gap-2 text-red-400">
            <AlertTriangle size={20} /> Erro durante a migração.
          </div>
        )}

        {log.length > 0 && (
          <div className="bg-black/30 border border-border rounded p-4 max-h-60 overflow-y-auto font-mono text-xs space-y-1">
            {log.map((line, i) => (
              <div key={i} className={line.startsWith("Erro") ? "text-red-400" : "text-zinc-400"}>
                {line}
              </div>
            ))}
          </div>
        )}

        {status === "done" && (
          <p className="text-xs text-muted-foreground text-center font-body">
            Agora acesse <strong>/clientes</strong> normalmente. Pode apagar esta página.
          </p>
        )}
      </div>
    </div>
  );
};

export default Migrar;
