import { useRadioStatus, useNowPlaying, useStationInfo, useRadioActions, useAzuraCastSettings, useStations } from "@/hooks/useAzuraCast";
import { toast } from "sonner";
import {
  Radio,
  Play,
  Square,
  RotateCcw,
  Power,
  Disc3,
  Music,
  Volume2,
  Wifi,
  WifiOff,
  Loader2,
  AlertTriangle,
  Settings,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const AdminRadioTab = () => {
  const { data: statusData, isLoading: statusLoading, error: statusError } = useRadioStatus();
  const { data: npData, isLoading: npLoading } = useNowPlaying();
  const { data: stationData } = useStationInfo();
  const { data: azuracastSettings } = useAzuraCastSettings();
  const { data: stationsData } = useStations();
  const actions = useRadioActions();

  const backendRunning = statusData?.data?.liquidsoap === "running";
  const frontendRunning = statusData?.data?.icecast === "running" || statusData?.data?.shoutcast === "running";
  const isOnline = backendRunning && frontendRunning;

  const np = npData?.data?.now_playing;
  const songTitle = np?.song?.title || "—";
  const songArtist = np?.song?.artist || "—";
  const songAlbum = np?.song?.album || "";
  const listeners = np?.listeners?.current ?? 0;
  const listenersTotal = np?.listeners?.total ?? 0;
  const listenersUnique = np?.listeners?.unique ?? 0;

  const handleAction = async (fn: () => Promise<any>, label: string) => {
    try {
      await fn();
      toast.success(`${label} executado com sucesso!`);
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`);
    }
  };

  if (statusLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground font-body">
        <Loader2 className="animate-spin mb-4" size={32} /> Conectando à rádio...
      </div>
    );
  }

  if (statusError) {
    return (
      <div className="max-w-2xl space-y-6">
        <div className="flex items-center gap-3">
          <Radio className="text-primary" size={24} />
          <h2 className="font-display text-2xl tracking-wider text-foreground">Rádio</h2>
        </div>
        <Card className="bg-red-950/20 border-red-800/50">
          <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
            <AlertTriangle className="text-red-400" size={40} />
            <div className="space-y-2">
              <h3 className="font-display text-lg text-foreground">Não foi possível conectar ao AzuraCast</h3>
              <p className="text-sm text-muted-foreground font-body max-w-md">
                Verifique se as configurações do AzuraCast estão preenchidas corretamente em{" "}
                <strong>Configurações &gt; Rádio (AzuraCast)</strong>.
              </p>
              <p className="text-xs text-red-400 font-body">{statusError.message}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Radio className="text-primary" size={24} />
          <h2 className="font-display text-2xl tracking-wider text-foreground">Rádio</h2>
        </div>
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-body ${
            isOnline
              ? "bg-emerald-950/30 text-emerald-400 border-emerald-800/50"
              : "bg-red-950/30 text-red-400 border-red-800/50"
          }`}>
            <span className={`h-1.5 w-1.5 rounded-full ${isOnline ? "bg-emerald-500 animate-pulse" : "bg-red-500"}`} />
            {isOnline ? "Ao Vivo" : "Offline"}
          </div>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card/50 border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className={`p-2.5 rounded-lg ${backendRunning ? "bg-emerald-950/30" : "bg-red-950/30"}`}>
              <Power size={18} className={backendRunning ? "text-emerald-400" : "text-red-400"} />
            </div>
            <div>
              <p className="text-[10px] uppercase text-muted-foreground font-body tracking-wider">Backend</p>
              <p className={`text-sm font-semibold ${backendRunning ? "text-emerald-400" : "text-red-400"}`}>
                {backendRunning ? "Liquidsoap Rodando" : "Parado"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className={`p-2.5 rounded-lg ${frontendRunning ? "bg-emerald-950/30" : "bg-red-950/30"}`}>
              {frontendRunning ? <Wifi size={18} className="text-emerald-400" /> : <WifiOff size={18} className="text-red-400" />}
            </div>
            <div>
              <p className="text-[10px] uppercase text-muted-foreground font-body tracking-wider">Frontend</p>
              <p className={`text-sm font-semibold ${frontendRunning ? "text-emerald-400" : "text-red-400"}`}>
                {frontendRunning ? "Icecast Rodando" : "Parado"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-primary/10">
              <Volume2 size={18} className="text-primary" />
            </div>
            <div>
              <p className="text-[10px] uppercase text-muted-foreground font-body tracking-wider">Ouvintes</p>
              <p className="text-sm font-semibold text-foreground">{listeners} agora</p>
              <p className="text-[10px] text-muted-foreground font-body">{listenersTotal} total · {listenersUnique} únicos</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-primary/10">
              <Disc3 size={18} className="text-primary" />
            </div>
            <div>
              <p className="text-[10px] uppercase text-muted-foreground font-body tracking-wider">Estação</p>
              <p className="text-sm font-semibold text-foreground truncate max-w-[100px]">
                {stationData?.data?.name || `ID ${stationData?.data?.id || "?"}`}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Now Playing */}
      <Card className="bg-card border-border">
        <CardHeader className="py-4">
          <CardTitle className="font-display text-base flex items-center gap-2">
            <Music size={16} className="text-primary" /> Tocando Agora
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-5">
          {npLoading ? (
            <p className="text-sm text-muted-foreground font-body">Carregando...</p>
          ) : np ? (
            <div className="flex items-center gap-4">
              {np.song?.art && (
                <img src={np.song.art} alt="Album Art" className="w-16 h-16 rounded-lg object-cover border border-border" />
              )}
              <div className="space-y-1 min-w-0">
                <p className="font-semibold text-foreground truncate">{songTitle}</p>
                <p className="text-sm text-muted-foreground truncate">{songArtist}</p>
                {songAlbum && <p className="text-xs text-muted-foreground/70 truncate italic">{songAlbum}</p>}
                {np.listeners && (
                  <p className="text-[10px] text-muted-foreground font-body">
                    {np.listeners.current} ouvinte(s) agora · {np.listeners.total} total · {np.listeners.unique} únicos
                  </p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground font-body">Nenhuma informação disponível.</p>
          )}
        </CardContent>
      </Card>

      {/* Stations List */}
      {stationsData?.data && Array.isArray(stationsData.data) && stationsData.data.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader className="py-4">
            <CardTitle className="font-display text-base flex items-center gap-2">
              <Radio size={16} className="text-primary" /> Estações Disponíveis
            </CardTitle>
            <CardDescription className="font-body text-xs text-muted-foreground">
              Lista de todas as estações configuradas no AzuraCast.
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-5">
            <div className="space-y-2">
              {stationsData.data.map((station: any) => (
                <div key={station.id} className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${station.is_public ? "bg-emerald-950/30" : "bg-yellow-950/30"}`}>
                      <Radio size={14} className={station.is_public ? "text-emerald-400" : "text-yellow-400"} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{station.name}</p>
                      <p className="text-[10px] text-muted-foreground font-body">
                        ID: {station.id} · Porta: {station.port} · {station.is_public ? "Pública" : "Privada"}
                      </p>
                    </div>
                  </div>
                  <Badge variant={station.id == azuracastSettings?.azuracast_station_id ? "default" : "secondary"}>
                    {station.id == azuracastSettings?.azuracast_station_id ? "Selecionada" : `ID ${station.id}`}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Controls */}
      <Card className="bg-card border-border">
        <CardHeader className="py-4">
          <CardTitle className="font-display text-base flex items-center gap-2">
            <Power size={16} className="text-primary" /> Controles de Transmissão
          </CardTitle>
          <CardDescription className="font-body text-xs text-muted-foreground">
            Ligue, deslige ou reinicie os serviços da rádio. As mudanças levam alguns segundos para serem aplicadas.
          </CardDescription>
        </CardHeader>
        <CardContent className="pb-5 space-y-4">
          {/* Backend Controls */}
          <div className="space-y-2">
            <p className="text-xs font-body uppercase tracking-wider text-muted-foreground">Backend (Liquidsoap / AutoDJ)</p>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                disabled={actions.isPending || backendRunning}
                onClick={() => handleAction(actions.startBackend.startAsync, "Backend iniciado")}
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
              >
                <Play size={14} /> Iniciar
              </Button>
              <Button
                size="sm"
                disabled={actions.isPending || !backendRunning}
                onClick={() => handleAction(actions.stopBackend.startAsync, "Backend parado")}
                variant="destructive"
                className="gap-1.5"
              >
                <Square size={14} /> Parar
              </Button>
              <Button
                size="sm"
                disabled={actions.isPending || !backendRunning}
                variant="outline"
                onClick={() => handleAction(actions.restartBackend.startAsync, "Backend reiniciado")}
                className="gap-1.5"
              >
                <RotateCcw size={14} /> Reiniciar
              </Button>
            </div>
          </div>

          {/* Frontend Controls */}
          <div className="space-y-2">
            <p className="text-xs font-body uppercase tracking-wider text-muted-foreground">Frontend (Icecast / Shoutcast)</p>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                disabled={actions.isPending || frontendRunning}
                onClick={() => handleAction(actions.startFrontend.startAsync, "Frontend iniciado")}
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
              >
                <Play size={14} /> Iniciar
              </Button>
              <Button
                size="sm"
                disabled={actions.isPending || !frontendRunning}
                onClick={() => handleAction(actions.stopFrontend.startAsync, "Frontend parado")}
                variant="destructive"
                className="gap-1.5"
              >
                <Square size={14} /> Parar
              </Button>
              <Button
                size="sm"
                disabled={actions.isPending || !frontendRunning}
                variant="outline"
                onClick={() => handleAction(actions.restartFrontend.startAsync, "Frontend reiniciado")}
                className="gap-1.5"
              >
                <RotateCcw size={14} /> Reiniciar
              </Button>
            </div>
          </div>

          {/* Restart All */}
          <div className="pt-2 border-t border-border/50">
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                disabled={actions.isPending}
                onClick={() => handleAction(actions.restartAll.startAsync, "Todos os serviços reiniciados")}
                className="bg-primary text-primary-foreground gap-1.5"
              >
                <RotateCcw size={14} /> Reiniciar Tudo
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        {azuracastSettings?.azuracast_url && (
          <a
            href={azuracastSettings.azuracast_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline font-body"
          >
            <ExternalLink size={12} /> Abrir Painel AzuraCast
          </a>
        )}
      </div>
    </div>
  );
};

export default AdminRadioTab;
