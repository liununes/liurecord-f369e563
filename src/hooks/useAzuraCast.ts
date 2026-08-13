import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

async function invokeAzuraCast(action: string, extra?: Record<string, unknown>) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("Usuário não autenticado.");

  const { data, error } = await supabase.functions.invoke("azuracast-proxy", {
    body: { action, ...extra },
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });
  if (error) throw new Error(error.message || "Erro na comunicação com o AzuraCast.");
  if (data?.error) throw new Error(data.error + (data.details ? ` — ${JSON.stringify(data.details)}` : ""));
  return data;
}

export function useAzuraCastSettings() {
  return useQuery({
    queryKey: ["azuracast_settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_content")
        .select("content")
        .eq("section_key", "settings")
        .maybeSingle();
      if (error) throw error;
      return (data?.content ?? {}) as any;
    },
  });
}

export function useStations() {
  return useQuery({
    queryKey: ["azuracast_stations"],
    queryFn: () => invokeAzuraCast("stations"),
    retry: 1,
  });
}

export function useUpdateStation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (stationId: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Usuário não autenticado.");

      const { data: settingsData } = await supabase
        .from("site_content")
        .select("content")
        .eq("section_key", "settings")
        .maybeSingle();

      const settings = (settingsData?.content ?? {}) as any;
      const updatedSettings = { ...settings, azuracast_station_id: stationId };

      const { error } = await supabase
        .from("site_content")
        .update({ content: updatedSettings })
        .eq("section_key", "settings");

      if (error) throw error;
      return updatedSettings;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["site_content", "settings"] });
      qc.invalidateQueries({ queryKey: ["azuracast_settings"] });
      qc.invalidateQueries({ queryKey: ["azuracast_status"] });
      qc.invalidateQueries({ queryKey: ["azuracast_nowplaying"] });
      qc.invalidateQueries({ queryKey: ["azuracast_station"] });
    },
  });
}

export function useCreateStation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (stationConfig: any) => {
      return invokeAzuraCast("create_station", { station: stationConfig });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["azuracast_stations"] });
    },
  });
}

export function useDeleteStation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (stationId: number) => {
      return invokeAzuraCast("delete_station", { station_id: stationId });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["azuracast_stations"] });
    },
  });
}

export function useRadioStatus() {
  return useQuery({
    queryKey: ["azuracast_status"],
    queryFn: () => invokeAzuraCast("status"),
    refetchInterval: 15000,
    retry: 1,
  });
}

export function useNowPlaying() {
  return useQuery({
    queryKey: ["azuracast_nowplaying"],
    queryFn: () => invokeAzuraCast("nowplaying"),
    refetchInterval: 10000,
    retry: 1,
  });
}

export function useStationInfo() {
  return useQuery({
    queryKey: ["azuracast_station"],
    queryFn: () => invokeAzuraCast("station"),
    retry: 1,
  });
}

export function useRadioActions() {
  const qc = useQueryClient();

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["azuracast_status"] });
    qc.invalidateQueries({ queryKey: ["azuracast_nowplaying"] });
  };

  const startBackend = useMutation({
    mutationFn: () => invokeAzuraCast("start_backend"),
    onSuccess: () => setTimeout(invalidate, 2000),
  });

  const stopBackend = useMutation({
    mutationFn: () => invokeAzuraCast("stop_backend"),
    onSuccess: () => setTimeout(invalidate, 2000),
  });

  const restartBackend = useMutation({
    mutationFn: () => invokeAzuraCast("restart_backend"),
    onSuccess: () => setTimeout(invalidate, 2000),
  });

  const startFrontend = useMutation({
    mutationFn: () => invokeAzuraCast("start_frontend"),
    onSuccess: () => setTimeout(invalidate, 2000),
  });

  const stopFrontend = useMutation({
    mutationFn: () => invokeAzuraCast("stop_frontend"),
    onSuccess: () => setTimeout(invalidate, 2000),
  });

  const restartFrontend = useMutation({
    mutationFn: () => invokeAzuraCast("restart_frontend"),
    onSuccess: () => setTimeout(invalidate, 2000),
  });

  const restartAll = useMutation({
    mutationFn: () => invokeAzuraCast("restart_all"),
    onSuccess: () => setTimeout(invalidate, 2000),
  });

  return {
    startBackend,
    stopBackend,
    restartBackend,
    startFrontend,
    stopFrontend,
    restartFrontend,
    restartAll,
    isPending: startBackend.isPending || stopBackend.isPending || restartBackend.isPending ||
      startFrontend.isPending || stopFrontend.isPending || restartFrontend.isPending || restartAll.isPending,
  };
}
