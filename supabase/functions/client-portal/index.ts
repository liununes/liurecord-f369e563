// Client portal edge function
// Handles server-side authentication and gallery access for client photo galleries.
// Uses service role to read/write private client data — nothing is ever exposed to
// unauthenticated visitors via the Data API.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const SESSION_TTL_HOURS = 12;
const CLIENT_PHOTOS_BUCKET = "client-photos";
const SIGNED_URL_SECONDS = 60 * 60; // 1h

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function loadClients() {
  const { data, error } = await admin
    .from("site_content")
    .select("content")
    .eq("section_key", "clients")
    .maybeSingle();
  if (error) throw error;
  const content = (data?.content ?? []) as unknown;
  return Array.isArray(content) ? (content as any[]) : [];
}

async function saveClients(clients: any[]) {
  const { error } = await admin
    .from("site_content")
    .upsert(
      { section_key: "clients", content: clients },
      { onConflict: "section_key" },
    );
  if (error) throw error;
}

async function getSessionClientId(token: string): Promise<string | null> {
  if (!token) return null;
  // Clean expired sessions opportunistically
  await admin.from("client_sessions").delete().lt("expires_at", new Date().toISOString());
  const { data, error } = await admin
    .from("client_sessions")
    .select("client_id, expires_at")
    .eq("token", token)
    .maybeSingle();
  if (error || !data) return null;
  if (new Date(data.expires_at) < new Date()) return null;
  return data.client_id as string;
}

async function signPhoto(photo: any) {
  const out: any = {
    id: photo.id,
    filename: photo.filename,
    status: photo.status,
    released: !!photo.released,
    downloaded: !!photo.downloaded,
    downloaded_at: photo.downloaded_at,
  };
  // New style: private bucket paths
  if (photo.storage_path) {
    const { data: s1 } = await admin.storage
      .from(CLIENT_PHOTOS_BUCKET)
      .createSignedUrl(photo.storage_path, SIGNED_URL_SECONDS);
    out.original_url = s1?.signedUrl ?? null;
  } else if (photo.original_url) {
    out.original_url = photo.original_url; // legacy public URL
  }
  if (photo.thumbnail_path) {
    const { data: s2 } = await admin.storage
      .from(CLIENT_PHOTOS_BUCKET)
      .createSignedUrl(photo.thumbnail_path, SIGNED_URL_SECONDS);
    out.thumbnail_url = s2?.signedUrl ?? null;
  } else if (photo.thumbnail_url) {
    out.thumbnail_url = photo.thumbnail_url;
  }
  return out;
}

function sanitizeClient(client: any, includePhotos = true) {
  const { password, ...rest } = client;
  if (!includePhotos) {
    const { photos, ...noPhotos } = rest;
    return noPhotos;
  }
  return rest;
}

async function buildClientResponse(client: any) {
  const sanitized = sanitizeClient(client);
  const photos = Array.isArray(client.photos) ? client.photos : [];
  sanitized.photos = await Promise.all(photos.map(signPhoto));
  return sanitized;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const action = body?.action as string | undefined;

    if (action === "login") {
      const name = String(body?.name ?? "").trim();
      const password = String(body?.password ?? "").trim();
      if (!name || !password) return json({ error: "Nome e senha são obrigatórios." }, 400);

      const clients = await loadClients();
      const match = clients.find(
        (c: any) =>
          typeof c?.name === "string" &&
          c.name.toLowerCase().trim().includes(name.toLowerCase()) &&
          String(c?.password ?? "").trim() === password,
      );
      if (!match) return json({ error: "Nome ou senha incorretos." }, 401);

      const token = crypto.randomUUID() + "-" + crypto.randomUUID();
      const expires_at = new Date(Date.now() + SESSION_TTL_HOURS * 3600_000).toISOString();
      const { error } = await admin
        .from("client_sessions")
        .insert({ token, client_id: match.id, expires_at });
      if (error) return json({ error: "Erro criando sessão." }, 500);

      return json({
        token,
        client: await buildClientResponse(match),
      });
    }

    // All other actions require a valid session token
    const token = String(body?.token ?? "");
    const clientId = await getSessionClientId(token);
    if (!clientId) return json({ error: "Sessão inválida ou expirada." }, 401);

    const clients = await loadClients();
    const client = clients.find((c: any) => c.id === clientId);
    if (!client) return json({ error: "Cliente não encontrado." }, 404);

    if (action === "session") {
      return json({ client: await buildClientResponse(client) });
    }

    if (action === "mark_downloaded") {
      const photoId = String(body?.photoId ?? "");
      const photo = (client.photos || []).find((p: any) => p.id === photoId);
      if (!photo) return json({ error: "Foto não encontrada." }, 404);
      if (photo.downloaded && !photo.released) {
        return json({ error: "Já baixada. Aguarde liberação." }, 403);
      }
      // Enforce max_photos limit server-side
      const currentDownloaded = (client.photos || []).filter((p: any) => p.downloaded).length;
      if (
        typeof client.max_photos === "number" &&
        client.max_photos > 0 &&
        !photo.downloaded &&
        !photo.released &&
        currentDownloaded >= client.max_photos
      ) {
        return json({ error: "Limite atingido." }, 403);
      }
      const updatedPhotos = (client.photos || []).map((p: any) =>
        p.id === photoId ? { ...p, downloaded: true, downloaded_at: new Date().toISOString() } : p,
      );
      const updatedClient = { ...client, photos: updatedPhotos };
      const updatedClients = clients.map((c: any) => (c.id === client.id ? updatedClient : c));
      await saveClients(updatedClients);

      const signed = await signPhoto(updatedPhotos.find((p: any) => p.id === photoId));
      return json({ ok: true, photo: signed });
    }

    if (action === "request") {
      const photoIds = Array.isArray(body?.photoIds) ? body.photoIds.map(String) : [];
      if (photoIds.length === 0) return json({ error: "Nenhuma foto." }, 400);
      const currentPending: string[] = Array.isArray(client.pending_requests)
        ? client.pending_requests
        : [];
      const merged = Array.from(new Set([...currentPending, ...photoIds]));
      const updatedClient = { ...client, pending_requests: merged };
      const updatedClients = clients.map((c: any) => (c.id === client.id ? updatedClient : c));
      await saveClients(updatedClients);
      return json({ ok: true, pending_requests: merged });
    }

    if (action === "logout") {
      await admin.from("client_sessions").delete().eq("token", token);
      return json({ ok: true });
    }

    return json({ error: "Ação desconhecida." }, 400);
  } catch (err) {
    console.error("client-portal error", err);
    return json({ error: (err as Error).message ?? "Erro interno." }, 500);
  }
});
