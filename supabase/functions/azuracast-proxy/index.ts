import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
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
    const body = await req.json().catch(() => ({}));
    const action = body?.action as string | undefined;
    if (!action) return json({ error: "action é obrigatório." }, 400);

    const settings = await loadSettings();
    const azuracastUrl = settings.azuracast_url;
    const azuracastApiKey = settings.azuracast_api_key;
    const azuracastStationId = settings.azuracast_station_id;

    if (!azuracastUrl || !azuracastApiKey) {
      return json({ error: "Configurações do AzuraCast não preenchidas. Vá em Configurações > Rádio." }, 400);
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

      default:
        return json({ error: `Ação desconhecida: ${action}` }, 400);
    }
  } catch (err) {
    console.error("azuracast-proxy error", err);
    return json({ error: (err as Error).message ?? "Erro interno." }, 500);
  }
});
