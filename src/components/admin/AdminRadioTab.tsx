import { useRadioStatus, useNowPlaying, useStationInfo, useRadioActions, useAzuraCastSettings, useStations, useUpdateStation, useCreateStation, useDeleteStation } from "@/hooks/useAzuraCast";
import { useState } from "react";
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
  Check,
  Plus,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

const AdminRadioTab = () => {
  const { data: statusData, isLoading: statusLoading, error: statusError } = useRadioStatus();
  const { data: npData, isLoading: npLoading } = useNowPlaying();
  const { data: stationData } = useStationInfo();
  const { data: azuracastSettings } = useAzuraCastSettings();
  const { data: stationsData } = useStations();
  const updateStation = useUpdateStation();
  const createStation = useCreateStation();
  const deleteStation = useDeleteStation();
  const actions = useRadioActions();

  const [showCreateStation, setShowCreateStation] = useState(false);
  const [newStationName, setNewStationName] = useState("");
  const [newStationPort, setNewStationPort] = useState("8000");
  const [newStationMount, setNewStationMount] = useState("/live");
  const [newStationGenre, setNewStationGenre] = useState("");
  const [newStationDescription, setNewStationDescription] = useState("");

  const handleSelectStation = async (stationId: number) => {
    try {
      await updateStation.mutateAsync(stationId.toString());
      toast.success(`Estação ${stationId} selecionada!`);
    } catch (err: any) {
      toast.error("Erro ao selecionar estação: " + err.message);
    }
  };

  const handleCreateStation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStationName) {
      toast.error("Preencha o nome da estação.");
      return;
    }

    try {
      const result = await createStation.mutateAsync({
        name: newStationName,
        port: parseInt(newStationPort) || 8000,
        mount: newStationMount || "/live",
        genre: newStationGenre,
        description: newStationDescription,
        is_public: true,
      });

      if (result?.data?.id) {
        await updateStation.mutateAsync(result.data.id.toString());
        toast.success(`Estação "${newStationName}" criada e selecionada!`);
      } else {
        toast.success(`Estação "${newStationName}" criada!`);
      }

      setNewStationName("");
      setNewStationPort("8000");
      setNewStationMount("/live");
      setNewStationGenre("");
      setNewStationDescription("");
      setShowCreateStation(false);
    } catch (err: any) {
      toast.error("Erro ao criar estação: " + err.message);
    }
  };

  const handleDeleteStation = async (stationId: number, stationName: string) => {
    if (!confirm(`Excluir a estação "${stationName}"? Esta ação não pode ser desfeita.`)) {
      return;
    }

    try {
      await deleteStation.mutateAsync(stationId);
      toast.success(`Estação "${stationName}" excluída!`);
    } catch (err: any) {
      toast.error("Erro ao excluir estação: " + err.message);
    }
  };

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
      {stationsData?.data && Array.isArray(stationsData.data) && (
        <Card className="bg-card border-border">
          <CardHeader className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="font-display text-base flex items-center gap-2">
                  <Radio size={16} className="text-primary" /> Estações Disponíveis
                </CardTitle>
                <CardDescription className="font-body text-xs text-muted-foreground">
                  Selecione qual estação controlar ou crie uma nova.
                </CardDescription>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowCreateStation(!showCreateStation)}
                className="text-xs flex items-center gap-1.5"
              >
                <Plus size={14} /> Nova Estação
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pb-5">
            {/* Create Station Form */}
            {showCreateStation && (
              <form onSubmit={handleCreateStation} className="mb-4 p-4 bg-secondary/30 rounded-lg space-y-3">
                <h4 className="text-sm font-semibold text-foreground">Criar Nova Estação</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input 
                    placeholder="Nome da estação" 
                    value={newStationName} 
                    onChange={(e) => setNewStationName(e.target.value)} 
                    required 
                  />
                  <Input 
                    type="number" 
                    placeholder="Porta (ex: 8000)" 
                    value={newStationPort} 
                    onChange={(e) => setNewStationPort(e.target.value)} 
                  />
                  <Input 
                    placeholder="Mount point (ex: /live)" 
                    value={newStationMount} 
                    onChange={(e) => setNewStationMount(e.target.value)} 
                  />
                  <Input 
                    placeholder="Gênero (ex: Pop, Rock)" 
                    value={newStationGenre} 
                    onChange={(e) => setNewStationGenre(e.target.value)} 
                  />
                </div>
                <Input 
                  placeholder="Descrição (opcional)" 
                  value={newStationDescription} 
                  onChange={(e) => setNewStationDescription(e.target.value)} 
                />
                <div className="flex justify-end gap-2">
                  <Button 
                    type="button" 
                    variant="ghost" 
                    onClick={() => setShowCreateStation(false)}
                  >
                    Cancelar
                  </Button>
                  <Button 
                    type="submit" 
                    className="bg-gradient-gold"
                    disabled={createStation.isPending}
                  >
                    {createStation.isPending ? "Criando..." : "Criar Estação"}
                  </Button>
                </div>
              </form>
            )}

            {/* Stations List */}
            {stationsData.data.length > 0 ? (
              <div className="space-y-2">
                {stationsData.data.map((station: any) => {
                  const isSelected = station.id?.toString() === azuracastSettings?.azuracast_station_id?.toString();
                  return (
                    <div 
                      key={station.id} 
                      className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                        isSelected 
                          ? "bg-primary/10 border border-primary/30" 
                          : "bg-secondary/30 hover:bg-secondary/50"
                      }`}
                    >
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
                      <div className="flex items-center gap-2">
                        {isSelected ? (
                          <Badge className="bg-primary text-primary-foreground gap-1">
                            <Check size={12} /> Selecionada
                          </Badge>
                        ) : (
                          <>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => handleSelectStation(station.id)}
                              disabled={updateStation.isPending}
                              className="text-xs"
                            >
                              Selecionar
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => handleDeleteStation(station.id, station.name)}
                              disabled={deleteStation.isPending}
                              className="h-7 w-7 text-destructive"
                            >
                              <Trash2 size={14} />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhuma estação encontrada no AzuraCast. Crie uma nova estação acima.
              </p>
            )}
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
