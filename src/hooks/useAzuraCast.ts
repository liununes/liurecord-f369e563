import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

async function invokeAzuraCast(action: string, extra?: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("azuracast-proxy", {
    body: { action, ...extra },
  });
  if (error) throw new Error(error.message || "Erro na comunicação com o AzuraCast.");
  if (data?.error) throw new Error(data.error + (data.details ? ` — ${JSON.stringify(data.details)}` : ""));
  return data;
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
