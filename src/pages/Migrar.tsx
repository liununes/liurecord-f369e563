import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { decryptData } from "@/lib/crypto";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Loader2, Check, AlertTriangle } from "lucide-react";

const db = supabase as any;

const MIGRATE_SQL = `
CREATE TABLE IF NOT EXISTS public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  password TEXT NOT NULL,
  watermark_text TEXT DEFAULT 'LIU RECORD',
  max_photos INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.client_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  original_url TEXT NOT NULL,
  thumbnail_url TEXT NOT NULL,
  filename TEXT,
  status TEXT DEFAULT 'pending',
  released BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_all_clients" ON public.clients;
CREATE POLICY "allow_all_clients" ON public.clients FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "allow_all_photos" ON public.client_photos;
CREATE POLICY "allow_all_photos" ON public.client_photos FOR ALL USING (true) WITH CHECK (true);

GRANT ALL ON public.clients TO anon;
GRANT ALL ON public.clients TO authenticated;
GRANT ALL ON public.client_photos TO anon;
GRANT ALL ON public.client_photos TO authenticated;
`;

const Migrar = () => {
  const [status, setStatus] = useState<"idle" | "running" | "done" | "error">("idle");
  const [log, setLog] = useState<string[]>([]);

  const addLog = (msg: string) => setLog((prev) => [...prev, msg]);

  const migrate = async () => {
    setStatus("running");
    setLog([]);

    try {
      // 1. Tentar criar tabela via RPC (Supabase SQL RPC)
      addLog("Verificando tabelas...");

      const { error: rpcErr } = await db.rpc("exec_sql", { query: MIGRATE_SQL }).single();

      if (rpcErr) {
        // Fallback: tentar criar via insert direto pra ver se a tabela existe
        addLog("Tentando via API...");
        const { error: testErr } = await db.from("clients").select("id").limit(1);

        if (testErr && testErr.message.includes("Could not find the table")) {
          addLog("Tabela não encontrada. Crie as tabelas pelo backend.");

          // Copiar SQL para clipboard
          await navigator.clipboard.writeText(MIGRATE_SQL);
          addLog("SQL copiado para a área de transferência!");
          addLog("Abra o backend → SQL Editor → Cole e rode o SQL.");
          addLog("Depois clique 'Rodar Migração' novamente.");
          setStatus("error");
          return;
        }
      }

      addLog("Tabelas OK! Buscando dados antigos...");

      // 2. Buscar dados antigos do site_content
      const { data: row, error: fetchErr } = await supabase
        .from("site_content")
        .select("content")
        .eq("section_key", "clients")
        .maybeSingle();

      if (fetchErr) throw fetchErr;
      if (!row || !row.content) {
        addLog("Nenhum dado antigo encontrado. Tabelas prontas!");
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

      for (const oldClient of clients) {
        addLog(`Migrando: ${oldClient.name}...`);

        // Upsert cliente
        const { data: existingClient } = await db
          .from("clients")
          .select("id")
          .eq("id", oldClient.id)
          .maybeSingle();

        let clientId = oldClient.id;

        if (existingClient) {
          addLog(`  Cliente já existe, pulando...`);
          clientId = existingClient.id;
        } else {
          const { data: newClient, error: clientErr } = await db
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
            addLog(`  Erro: ${clientErr.message}`);
            continue;
          }
          clientId = newClient.id;
          addLog(`  Cliente criado!`);
        }

        // Migrar fotos
        if (oldClient.photos && oldClient.photos.length > 0) {
          const { count } = await db
            .from("client_photos")
            .select("id", { count: "exact", head: true })
            .eq("client_id", clientId);

          if (count && count > 0) {
            addLog(`  ${count} foto(s) já migrada(s), pulando...`);
          } else {
            const photoRows = oldClient.photos.map((p: any, i: number) => ({
              id: p.id,
              client_id: clientId,
              original_url: p.original_url,
              thumbnail_url: p.thumbnail_url,
              filename: p.filename || "foto.jpg",
              status: p.status || "pending",
              released: p.released || false,
              sort_order: i,
              created_at: oldClient.created_at || new Date().toISOString(),
            }));

            const { error: photosErr } = await db.from("client_photos").insert(photoRows);
            if (photosErr) {
              addLog(`  Erro fotos: ${photosErr.message}`);
            } else {
              addLog(`  ${photoRows.length} foto(s) migrada(s)!`);
            }
          }
        }
      }

      addLog("Migração concluída!");
      setStatus("done");
      toast.success("Migração concluída!");
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
            <AlertTriangle size={20} /> Verifique as instruções abaixo.
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

        {status === "error" && log.some(l => l.includes("SQL copiado")) && (
          <Button onClick={migrate} className="w-full bg-gradient-gold text-primary-foreground font-body font-semibold py-5">
            Rodar Migração (depois de colar o SQL)
          </Button>
        )}

        {status === "done" && (
          <p className="text-xs text-muted-foreground text-center font-body">
            Acesse <strong>/clientes</strong> normalmente. Pode apagar <code>/migrar</code> do código.
          </p>
        )}
      </div>
    </div>
  );
};

export default Migrar;
