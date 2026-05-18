import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { OpsSidebar } from "@/components/ops/Sidebar";
import { OpsHeader } from "@/components/ops/Header";
import { Onboarding } from "@/components/ops/Onboarding";
import { useTenant } from "@/hooks/useTenant";
import { useOps } from "@/hooks/useOps";
import { useI18n } from "@/hooks/useI18n";
import { 
  MapPin, 
  Layers, 
  Navigation, 
  Map as MapIcon, 
  Activity, 
  ShieldAlert, 
  Compass, 
  Radio, 
  PenTool, 
  Sparkles,
  Trash2,
  Sliders,
  Check,
  Plus
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/mapa")({
  component: MapaLivePage,
});

type RegionType = "Premium" | "Crítica" | "Congestionada" | "Prioritária" | "Bloqueada" | "Expansão";

type OperationalRegion = {
  id: string;
  name: string;
  type: RegionType;
  color: string;
  capacity: number;
  demand: number;
  congestion: number; // %
  avgSla: number; // minutes
  efficiency: number; // %
  activeDrivers: number;
  risk: "Baixo" | "Médio" | "Alto" | "Muito Alto" | "Bloqueado";
  // Simulated polygon coordinates mapped relative to simulated radar canvas (width: 800, height: 600)
  points: [number, number][];
};

function MapaLivePage() {
  const { current, loading } = useTenant();
  const { t } = useI18n();
  const { tick } = useOps();

  return (
    <div className="min-h-screen flex bg-[#06080b]">
      <OpsSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <OpsHeader tick={tick} />
        {loading ? (
          <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">{t("common", "loading")}</div>
        ) : !current ? (
          <Onboarding />
        ) : (
          <TacticalMapView tenantId={current.id} />
        )}
      </div>
    </div>
  );
}

function TacticalMapView({ tenantId }: { tenantId: string }) {
  const { t } = useI18n();
  const { orders, drivers } = useOps();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Operational regions states
  const [regions, setRegions] = useState<OperationalRegion[]>([
    {
      id: "r-1",
      name: "Centro - Jardins",
      type: "Premium",
      color: "#d97706", // amber
      capacity: 50,
      demand: 28,
      congestion: 15,
      avgSla: 24,
      efficiency: 98,
      activeDrivers: 6,
      risk: "Baixo",
      points: [[150, 80], [300, 100], [280, 250], [120, 220]]
    },
    {
      id: "r-2",
      name: "Setor Sul - Brooklin",
      type: "Crítica",
      color: "#ef4444", // red
      capacity: 30,
      demand: 42,
      congestion: 85,
      avgSla: 41,
      efficiency: 74,
      activeDrivers: 2,
      risk: "Muito Alto",
      points: [[280, 300], [450, 280], [500, 480], [320, 500]]
    },
    {
      id: "r-3",
      name: "Vila Madalena",
      type: "Congestionada",
      color: "#f97316", // orange
      capacity: 40,
      demand: 38,
      congestion: 68,
      avgSla: 36,
      efficiency: 82,
      activeDrivers: 3,
      risk: "Alto",
      points: [[80, 250], [220, 260], [250, 380], [90, 400]]
    },
    {
      id: "r-4",
      name: "Itaim Bibi",
      type: "Prioritária",
      color: "#a855f7", // purple
      capacity: 45,
      demand: 31,
      congestion: 44,
      avgSla: 28,
      efficiency: 92,
      activeDrivers: 4,
      risk: "Médio",
      points: [[400, 80], [550, 110], [580, 250], [380, 230]]
    },
    {
      id: "r-5",
      name: "Setor Norte",
      type: "Expansão",
      color: "#06b6d4", // cyan
      capacity: 25,
      demand: 12,
      congestion: 18,
      avgSla: 21,
      efficiency: 95,
      activeDrivers: 5,
      risk: "Baixo",
      points: [[580, 280], [720, 290], [700, 420], [550, 400]]
    },
    {
      id: "r-6",
      name: "Periferia Sul Extrema",
      type: "Bloqueada",
      color: "#4b5563", // charcoal gray
      capacity: 0,
      demand: 0,
      congestion: 100,
      avgSla: 0,
      efficiency: 0,
      activeDrivers: 0,
      risk: "Bloqueado",
      points: [[520, 480], [750, 460], [780, 580], [480, 570]]
    }
  ]);

  const [selectedRegionId, setSelectedRegionId] = useState<string>("r-2");
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [drawRegionType, setDrawRegionType] = useState<RegionType>("Premium");
  const [drawPoints, setDrawPoints] = useState<[number, number][]>([]);
  const [drawRegionName, setDrawRegionName] = useState<string>("");
  const [heatmapOpacity, setHeatmapOpacity] = useState<number>(0.35);
  const [showRadarGrid, setShowRadarGrid] = useState<boolean>(true);

  const selectedRegion = useMemo(() => {
    return regions.find(r => r.id === selectedRegionId) || regions[0];
  }, [regions, selectedRegionId]);

  // Main Canvas render loop for simulated military radar screen
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;

    const render = () => {
      // Clear with high-tech charcoal military background
      ctx.fillStyle = "#07090d";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 1. Draw Radar Grid Lines (Military layout)
      if (showRadarGrid) {
        ctx.strokeStyle = "rgba(255, 255, 255, 0.03)";
        ctx.lineWidth = 1;
        
        // Horizontal & Vertical ticks
        for (let x = 0; x < canvas.width; x += 40) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, canvas.height);
          ctx.stroke();
        }
        for (let y = 0; y < canvas.height; y += 40) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(canvas.width, y);
          ctx.stroke();
        }

        // Circular concentric tactical radar rings
        ctx.strokeStyle = "rgba(99, 102, 241, 0.05)";
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        for (let r = 100; r < Math.max(canvas.width, canvas.height); r += 120) {
          ctx.beginPath();
          ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Compass crosshairs ticks
        ctx.strokeStyle = "rgba(99, 102, 241, 0.15)";
        ctx.beginPath();
        ctx.moveTo(centerX - 30, centerY);
        ctx.lineTo(centerX + 30, centerY);
        ctx.moveTo(centerX, centerY - 30);
        ctx.lineTo(centerX, centerY + 30);
        ctx.stroke();
      }

      // 2. Draw Evolved Geofencing Regions (Polygons with smooth ambient pulse gradients)
      const tVal = Date.now() / 1500;
      const pulseFactor = Math.sin(tVal) * 0.12 + 0.88; // Pulsing opacity overlay scale

      regions.forEach(r => {
        if (r.points.length < 3) return;

        ctx.beginPath();
        ctx.moveTo(r.points[0][0], r.points[0][1]);
        for (let i = 1; i < r.points.length; i++) {
          ctx.lineTo(r.points[i][0], r.points[i][1]);
        }
        ctx.closePath();

        // Polygon Fill with glowing heat opacity
        const fillOpacity = r.id === selectedRegionId ? heatmapOpacity * 1.5 : heatmapOpacity;
        ctx.fillStyle = `${r.color}${Math.floor(fillOpacity * 255 * pulseFactor).toString(16).padStart(2, "0")}`;
        ctx.fill();

        // Polygon Stroke Border
        ctx.strokeStyle = r.color;
        ctx.lineWidth = r.id === selectedRegionId ? 2.5 : 1.2;
        ctx.stroke();

        // Small translucent label in the center of the region
        const center = r.points.reduce((acc, p) => [acc[0] + p[0], acc[1] + p[1]], [0, 0]);
        const cx = center[0] / r.points.length;
        const cy = center[1] / r.points.length;
        
        ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
        ctx.fillRect(cx - 40, cy - 8, 80, 16);
        ctx.strokeStyle = `${r.color}50`;
        ctx.strokeRect(cx - 40, cy - 8, 80, 16);

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 8px monospace";
        ctx.textAlign = "center";
        ctx.fillText(r.name.slice(0, 14), cx, cy + 3);
      });

      // 3. Draw currently active DRAW POINTS if geofencing drawing is active!
      if (isDrawing && drawPoints.length > 0) {
        ctx.strokeStyle = "#e11d48"; // Rose/Red boundary
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(drawPoints[0][0], drawPoints[0][1]);
        drawPoints.forEach(p => ctx.lineTo(p[0], p[1]));
        ctx.stroke();

        // Draw point dots
        drawPoints.forEach(p => {
          ctx.fillStyle = "#ffffff";
          ctx.beginPath();
          ctx.arc(p[0], p[1], 4, 0, Math.PI * 2);
          ctx.fill();
        });
      }

      // 4. Draw Floating Simulated Orders (Pulsing glowing dots)
      orders.forEach((o, index) => {
        if (["entregue", "cancelado"].includes(o.status)) return;

        // Map simulated orders safely to coordinates on radar canvas (using deterministic seed mapping)
        const codeNum = Number(o.code.replace("#", "")) || 4820;
        const ox = 100 + (codeNum * 4921) % 600;
        const oy = 80 + (codeNum * 8273) % 440;

        // Pulsing halo based on order priority
        const glowColor = o.priority === "critica" ? "#ef4444" : o.priority === "alta" ? "#f59e0b" : "#6366f1";
        ctx.fillStyle = `${glowColor}25`;
        ctx.beginPath();
        ctx.arc(ox, oy, 12 + Math.sin(tVal * 3 + index) * 3, 0, Math.PI * 2);
        ctx.fill();

        // Main core dot
        ctx.fillStyle = glowColor;
        ctx.beginPath();
        ctx.arc(ox, oy, 4, 0, Math.PI * 2);
        ctx.fill();

        // Tiny text code tags
        ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
        ctx.font = "8px JetBrains Mono, monospace";
        ctx.textAlign = "left";
        ctx.fillText(o.code, ox + 6, oy + 3);
      });

      // 5. Draw Floating Active Drivers (Directional pointer indicators)
      drivers.forEach((d, index) => {
        if (d.status === "offline") return;

        // Map drivers dynamically onto radar canvas
        const dIdNum = Number(d.id.replace("d-", "")) || 0;
        const dx = 120 + (dIdNum * 9821 + Math.sin(tVal * 0.1) * 30) % 580;
        const dy = 100 + (dIdNum * 3829 + Math.cos(tVal * 0.1) * 30) % 400;

        const driverColor = d.status === "em_rota" ? "#10b981" : "#a855f7"; // active green vs ocioso purple

        ctx.strokeStyle = driverColor;
        ctx.fillStyle = `${driverColor}20`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(dx, dy, 14, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fill();

        // Draw pointer arrow pointer
        ctx.fillStyle = driverColor;
        ctx.beginPath();
        ctx.arc(dx, dy, 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#ffffff";
        ctx.font = "7px JetBrains Mono, monospace";
        ctx.textAlign = "center";
        ctx.fillText(d.name.slice(3, 7), dx, dy - 16);
      });

      animationId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [regions, selectedRegionId, orders, drivers, isDrawing, drawPoints, heatmapOpacity, showRadarGrid]);

  // Handle clicking on Canvas to draw points
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = Math.round(e.clientX - rect.left);
    const y = Math.round(e.clientY - rect.top);

    setDrawPoints(prev => [...prev, [x, y]]);
  };

  const handleStartDrawing = () => {
    setIsDrawing(true);
    setDrawPoints([]);
    setDrawRegionName(`Zona Customizada #${regions.length + 1}`);
    toast.info("Modo de desenho ativado! Clique na tela para delimitar os vértices do polígono.");
  };

  const handleSaveDrawing = () => {
    if (drawPoints.length < 3) {
      toast.error("Desenho inválido! O polígono precisa ter pelo menos 3 vértices.");
      return;
    }

    const typeColors: Record<RegionType, string> = {
      Premium: "#d97706",
      Crítica: "#ef4444",
      Congestionada: "#f97316",
      Prioritária: "#a855f7",
      Bloqueada: "#4b5563",
      Expansão: "#06b6d4"
    };

    const newRegion: OperationalRegion = {
      id: `r-${Date.now()}`,
      name: drawRegionName || `Setor Novo #${regions.length + 1}`,
      type: drawRegionType,
      color: typeColors[drawRegionType],
      capacity: 35,
      demand: 10,
      congestion: 12,
      avgSla: 23,
      efficiency: 94,
      activeDrivers: 2,
      risk: "Baixo",
      points: drawPoints
    };

    setRegions(prev => [...prev, newRegion]);
    setSelectedRegionId(newRegion.id);
    setIsDrawing(false);
    setDrawPoints([]);
    toast.success(`Região '${newRegion.name}' desenhada e georreferenciada com sucesso!`);
  };

  const handleCancelDrawing = () => {
    setIsDrawing(false);
    setDrawPoints([]);
    toast.info("Desenho de região cancelado.");
  };

  return (
    <main className="flex-1 p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-hidden max-h-[calc(100vh-64px)]">
      
      {/* Left Column: Regions Stats side panel */}
      <div className="lg:col-span-4 flex flex-col space-y-4 h-full overflow-y-auto pr-1">
        <div>
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-primary-glow animate-pulse" />
            <span className="text-[10px] uppercase font-mono tracking-widest text-muted-foreground font-bold">Zonas Georreferenciadas</span>
          </div>
          <h1 className="text-2xl font-display font-semibold mt-1 text-white">
            Regiões <span className="text-gradient">Inteligentes</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Engine de geofencing ativo. Delimite e audite regiões críticas de delivery em tempo real.
          </p>
        </div>

        {/* Region stats metrics dashboard card */}
        <div className="bg-[#0b0e14] border border-border rounded-2xl p-5 space-y-4">
          <div className="flex justify-between items-center border-b border-border/40 pb-2">
            <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider font-bold">KPI da Região Selecionada</span>
            <span 
              style={{ color: selectedRegion.color, borderColor: `${selectedRegion.color}40`, backgroundColor: `${selectedRegion.color}15` }}
              className="text-[9px] font-mono font-bold px-2 py-0.5 rounded border uppercase"
            >
              {selectedRegion.type}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 font-mono text-xs text-white">
            <div className="space-y-1">
              <span className="text-[10px] text-muted-foreground uppercase">Nome da Região</span>
              <div className="font-bold text-sm truncate">{selectedRegion.name}</div>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] text-muted-foreground uppercase">Risco Operacional</span>
              <div className={`font-bold text-sm ${
                selectedRegion.risk === "Muito Alto" || selectedRegion.risk === "Alto" ? "text-danger" : "text-success"
              }`}>{selectedRegion.risk}</div>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] text-muted-foreground uppercase">Capacidade Operacional</span>
              <div className="font-bold text-sm">{selectedRegion.capacity} un</div>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] text-muted-foreground uppercase">Demanda Atual</span>
              <div className="font-bold text-sm">{selectedRegion.demand} pedidos</div>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] text-muted-foreground uppercase">Tráfego / Congestionamento</span>
              <div className="font-bold text-sm">{selectedRegion.congestion}%</div>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] text-muted-foreground uppercase">Tempo Médio SLA</span>
              <div className="font-bold text-sm">{selectedRegion.avgSla > 0 ? `${selectedRegion.avgSla} min` : "—"}</div>
            </div>
          </div>

          {/* Simple capacity bar */}
          <div className="space-y-1 pt-2">
            <div className="flex justify-between font-mono text-[9px] text-muted-foreground uppercase">
              <span>Saturação de Capacidade</span>
              <span>{Math.round((selectedRegion.demand / (selectedRegion.capacity || 1)) * 100)}%</span>
            </div>
            <div className="h-1.5 bg-surface rounded-full overflow-hidden">
              <div 
                className="h-full transition-all duration-500" 
                style={{ 
                  width: `${Math.min(100, Math.round((selectedRegion.demand / (selectedRegion.capacity || 1)) * 100))}%`,
                  backgroundColor: selectedRegion.color
                }} 
              />
            </div>
          </div>
        </div>

        {/* Region selector list */}
        <div className="bg-[#0b0e14] border border-border rounded-2xl p-4 flex-1 flex flex-col overflow-hidden min-h-[220px]">
          <div className="border-b border-border/40 pb-2 flex justify-between items-center shrink-0">
            <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider font-bold">Zonas Configuradas ({regions.length})</span>
            {!isDrawing && (
              <button 
                onClick={handleStartDrawing}
                className="p-1 rounded bg-primary/20 text-primary-glow hover:bg-primary/30 transition text-xs font-semibold flex items-center gap-1 cursor-pointer"
              >
                <PenTool className="size-3" /> Desenhar
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto mt-4 pr-1 space-y-2">
            {regions.map(r => (
              <div 
                key={r.id} 
                onClick={() => setSelectedRegionId(r.id)}
                className={`p-2.5 rounded-xl border flex items-center justify-between transition cursor-pointer relative ${
                  selectedRegionId === r.id 
                    ? "bg-white/[0.02] border-white/25 shadow-glow" 
                    : "bg-surface/10 border-transparent hover:bg-surface/30 text-muted-foreground hover:text-white"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="size-3 rounded-full shrink-0 animate-pulse" style={{ backgroundColor: r.color }} />
                  <div>
                    <h4 className="text-xs font-bold text-white leading-snug">{r.name}</h4>
                    <span className="text-[8px] text-muted-foreground font-mono block uppercase">
                      {r.activeDrivers} motoristas · SLA {r.avgSla > 0 ? `${r.avgSla}m` : "N/A"}
                    </span>
                  </div>
                </div>

                <span className={`text-[8px] font-mono font-bold px-1.5 py-0.2 rounded border ${
                  r.risk === "Muito Alto" || r.risk === "Alto" ? "text-danger border-danger/20 bg-danger/10" : "text-success border-success/20 bg-success/10"
                }`}>
                  {r.risk}
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Right Column: Interactive Canvas Military Map board */}
      <div className="lg:col-span-8 flex flex-col space-y-4 h-full overflow-hidden">
        
        {/* Canvas panel wrapper */}
        <div className="bg-[#0b0e14] border border-border rounded-2xl flex-1 relative overflow-hidden flex flex-col shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
          <div className="bg-[#0f131a] px-4 py-3 border-b border-border/60 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <Radio className="size-4 text-primary-glow animate-pulse" />
              <div>
                <h3 className="text-xs font-bold text-white uppercase font-mono">Radar Tático de São Paulo</h3>
                <p className="text-[9px] text-muted-foreground leading-none">MONITORAMENTO DE GEOFENCES LOGÍSTICOS</p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <button 
                onClick={() => setShowRadarGrid(!showRadarGrid)}
                className={`px-3 py-1 rounded text-[10px] font-mono border transition cursor-pointer ${
                  showRadarGrid ? "bg-primary/20 border-primary/45 text-primary-glow" : "border-border text-muted-foreground"
                }`}
              >
                GRELHA TÁTICA
              </button>
            </div>
          </div>

          {/* Interactive HTML5 canvas viewport */}
          <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
            <canvas
              ref={canvasRef}
              width={800}
              height={550}
              onClick={handleCanvasClick}
              className="max-w-full max-h-full aspect-[800/550] cursor-crosshair bg-[#07090d]"
            />

            {/* Drawing mode header box */}
            {isDrawing && (
              <div className="absolute top-4 inset-x-4 glass-strong p-3.5 rounded-xl border border-rose-500/30 flex items-center justify-between z-20 animate-in fade-in slide-in-from-top duration-300">
                <div className="flex items-center gap-2">
                  <PenTool className="size-4 text-rose-500 animate-pulse" />
                  <div className="font-mono text-xs text-white">
                    <span className="font-bold text-rose-400">MODO DESENHO GEOFENCE</span> · {drawPoints.length} pontos clicados
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button 
                    onClick={handleCancelDrawing}
                    className="px-3 py-1 border border-border text-muted-foreground text-[10px] font-bold rounded transition hover:text-white cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={handleSaveDrawing}
                    className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-bold rounded transition flex items-center gap-1 shadow-glow cursor-pointer"
                  >
                    <Check className="size-3" /> Concluir Polígono
                  </button>
                </div>
              </div>
            )}

            {/* Floating Telemetry legend overlay */}
            <div className="absolute bottom-4 left-4 glass-strong rounded-xl px-4 py-3 flex items-center gap-5 text-[9px] pointer-events-none z-10 font-mono text-white/90">
              <div className="flex items-center gap-1.5"><span className="size-2 rounded-full animate-pulse" style={{ backgroundColor: "#d97706" }} /> Premium</div>
              <div className="flex items-center gap-1.5"><span className="size-2 rounded-full animate-pulse" style={{ backgroundColor: "#ef4444" }} /> Crítica</div>
              <div className="flex items-center gap-1.5"><span className="size-2 rounded-full animate-pulse" style={{ backgroundColor: "#f97316" }} /> Congestionada</div>
              <div className="flex items-center gap-1.5"><span className="size-2 rounded-full animate-pulse" style={{ backgroundColor: "#a855f7" }} /> Prioritária</div>
              <div className="flex items-center gap-1.5"><span className="size-2 rounded-full animate-pulse" style={{ backgroundColor: "#06b6d4" }} /> Expansão</div>
            </div>
          </div>
        </div>

        {/* Map Calibration & Controls Panel */}
        <div className="bg-[#0b0e14] border border-border rounded-2xl p-5 shrink-0 space-y-4">
          <div className="flex items-center gap-2 border-b border-border/40 pb-2">
            <Sliders className="size-4 text-primary-glow" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Calibrador de Visualizações do Radar
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs font-mono">
            {/* Control 1 */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-[10px] text-muted-foreground uppercase">
                <span>Opacidade Overlay de Calor</span>
                <span className="text-white font-bold">{Math.round(heatmapOpacity * 100)}%</span>
              </div>
              <input 
                type="range" 
                min="0.10" 
                max="0.80" 
                step="0.05"
                value={heatmapOpacity}
                onChange={e => setHeatmapOpacity(Number(e.target.value))}
                className="w-full h-1 bg-surface rounded-lg appearance-none cursor-pointer accent-primary"
              />
            </div>

            {/* Control 2 */}
            {isDrawing ? (
              <div className="space-y-1.5 col-span-2 grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <span className="text-[10px] text-muted-foreground uppercase">Tipo de Região</span>
                  <select 
                    value={drawRegionType}
                    onChange={e => setDrawRegionType(e.target.value as RegionType)}
                    className="w-full p-1.5 bg-surface border border-border rounded text-white text-[10px] font-mono"
                  >
                    <option value="Premium">Premium</option>
                    <option value="Crítica">Crítica</option>
                    <option value="Congestionada">Congestionada</option>
                    <option value="Prioritária">Prioritária</option>
                    <option value="Expansão">Expansão</option>
                    <option value="Bloqueada">Bloqueada</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-muted-foreground uppercase">Nome da Região</span>
                  <input 
                    type="text"
                    value={drawRegionName}
                    onChange={e => setDrawRegionName(e.target.value)}
                    placeholder="Setor X"
                    className="w-full p-1 bg-surface border border-border rounded text-white text-[10px] font-mono"
                  />
                </div>
              </div>
            ) : (
              <div className="col-span-2 text-[10px] text-muted-foreground leading-relaxed font-mono flex items-center justify-center border border-dashed border-border/40 rounded-xl p-3 bg-surface/10">
                <Sparkles className="size-3.5 text-primary-glow mr-1.5 shrink-0" />
                DICA TÁTICA: Desenhe polígonos customizados clicando no botão "Desenhar" acima e clicando nos limites do radar!
              </div>
            )}
          </div>
        </div>

      </div>

    </main>
  );
}
