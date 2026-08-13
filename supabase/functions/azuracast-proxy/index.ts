import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ENCRYPTION_KEY = Deno.env.get("AZURACAST_ENCRYPTION_KEY") || "liu_record_azuracast_vault";

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function verifyAuth(req: Request): Promise<{ userId: string; isAdmin: boolean } | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error } = await admin.auth.getUser(token);
  if (error || !user) return null;

  const { data: roleData } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .maybeSingle();

  return { userId: user.id, isAdmin: !!roleData };
}

async function loadSettings() {
  const { data, error } = await admin
    .from("site_content")
    .select("content")
    .eq("section_key", "settings")
    .maybeSingle();
  if (error) throw error;
  return (data?.content ?? {}) as any;
}

const SALT = new Uint8Array([82, 101, 99, 111, 114, 100, 76, 105, 117, 83, 101, 99, 114, 101, 116, 83]);

async function getKey(password: string) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: SALT,
      iterations: 1000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

async function decryptApiKey(encryptedBase64: string): Promise<string> {
  try {
    const dec = new TextDecoder();
    const binary = atob(encryptedBase64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    
    const iv = bytes.slice(0, 12);
    const encrypted = bytes.slice(12);
    
    const key = await getKey(ENCRYPTION_KEY);
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv },
      key,
      encrypted
    );
    
    return dec.decode(decrypted);
  } catch (e) {
    console.error("Decryption failed:", e);
    throw new Error("Erro ao descriptografar API Key");
  }
}

async function azuracastRequest(baseUrl: string, apiKey: string, path: string, method = "GET", body?: unknown) {
  const url = `${baseUrl.replace(/\/+$/, "")}/api${path}`;
  const headers: Record<string, string> = {
    "Authorization": `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    "Accept": "application/json",
  };

  const opts: RequestInit = { method, headers };
  if (body && method !== "GET") {
    opts.body = JSON.stringify(body);
  }

  const res = await fetch(url, opts);
  const text = await res.text();
  let data: unknown;
  try { data = JSON.parse(text); } catch { data = text; }

  if (!res.ok) {
    return { error: `AzuraCast API error (${res.status})`, details: data, status: res.status };
  }
  return { data };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const auth = await verifyAuth(req);
    if (!auth || !auth.isAdmin) {
      return json({ error: "Acesso negado. Apenas administradores podem acessar." }, 403);
    }

    const body = await req.json().catch(() => ({}));
    const action = body?.action as string | undefined;
    if (!action) return json({ error: "action é obrigatório." }, 400);

    const settings = await loadSettings();
    const azuracastUrl = settings.azuracast_url;
    const azuracastApiKeyRaw = settings.azuracast_api_key;
    const azuracastStationId = settings.azuracast_station_id;

    if (!azuracastUrl || !azuracastApiKeyRaw) {
      return json({ error: "Configurações do AzuraCast não preenchidas. Vá em Configurações > Rádio." }, 400);
    }

    let azuracastApiKey: string;
    if (azuracastApiKeyRaw.startsWith("enc:")) {
      azuracastApiKey = await decryptApiKey(azuracastApiKeyRaw.slice(4));
    } else {
      azuracastApiKey = azuracastApiKeyRaw;
    }
    const stationId = azuracastStationId || 1;

    switch (action) {
      case "status": {
        const result = await azuracastRequest(azuracastUrl, azuracastApiKey, `/station/${stationId}/status`);
        return json(result);
      }

      case "nowplaying": {
        const result = await azuracastRequest(azuracastUrl, azuracastApiKey, `/nowplaying/${stationId}`);
        return json(result);
      }

      case "station": {
        const result = await azuracastRequest(azuracastUrl, azuracastApiKey, `/station/${stationId}`);
        return json(result);
      }

      case "start_backend": {
        const result = await azuracastRequest(azuracastUrl, azuracastApiKey, `/station/${stationId}/backend/start`, "POST");
        return json(result);
      }

      case "stop_backend": {
        const result = await azuracastRequest(azuracastUrl, azuracastApiKey, `/station/${stationId}/backend/stop`, "POST");
        return json(result);
      }

      case "restart_backend": {
        const result = await azuracastRequest(azuracastUrl, azuracastApiKey, `/station/${stationId}/backend/restart`, "POST");
        return json(result);
      }

      case "start_frontend": {
        const result = await azuracastRequest(azuracastUrl, azuracastApiKey, `/station/${stationId}/frontend/start`, "POST");
        return json(result);
      }

      case "stop_frontend": {
        const result = await azuracastRequest(azuracastUrl, azuracastApiKey, `/station/${stationId}/frontend/stop`, "POST");
        return json(result);
      }

      case "restart_frontend": {
        const result = await azuracastRequest(azuracastUrl, azuracastApiKey, `/station/${stationId}/frontend/restart`, "POST");
        return json(result);
      }

      case "restart_all": {
        const result = await azuracastRequest(azuracastUrl, azuracastApiKey, `/station/${stationId}/restart`, "POST");
        return json(result);
      }

      case "stations": {
        const result = await azuracastRequest(azuracastUrl, azuracastApiKey, `/stations`);
        return json(result);
      }

      case "create_station": {
        const stationConfig = body?.station || {};
        const defaultConfig = {
          name: stationConfig.name || "Nova Estação",
          description: stationConfig.description || "",
          genre: stationConfig.genre || "",
          url: stationConfig.url || "",
          mount: stationConfig.mount || "/live",
          port: stationConfig.port || 8000,
          is_public: stationConfig.is_public !== false,
          max_listeners: stationConfig.max_listeners || 0,
          type: stationConfig.type || "icecast",
          source_password: stationConfig.source_password || "",
          admin_password: stationConfig.admin_password || "",
        };
        const result = await azuracastRequest(azuracastUrl, azuracastApiKey, `/stations`, "POST", defaultConfig);
        return json(result);
      }

      case "delete_station": {
        const stationToDelete = body?.station_id;
        if (!stationToDelete) return json({ error: "station_id é obrigatório." }, 400);
        const result = await azuracastRequest(azuracastUrl, azuracastApiKey, `/station/${stationToDelete}`, "DELETE");
        return json(result);
      }

      default:
        return json({ error: `Ação desconhecida: ${action}` }, 400);
    }
  } catch (err) {
    console.error("azuracast-proxy error", err);
    return json({ error: (err as Error).message ?? "Erro interno." }, 500);
  }
});
