import { useEffect, useRef, useState } from "react";
import { Maximize2, Layers, Navigation, MapPin } from "lucide-react";
import { seedDrivers, type Driver } from "@/lib/ops/mock";

type LiveMapProps = {
  tick: number;
  drivers?: any[];
  orders?: any[];
};

// Map real coordinates to 0-100 canvas percentages
function mapCoords(lat: number | null, lng: number | null, id: string): { x: number; y: number } {
  if (lat === null || lng === null) {
    // Deterministic fallback coordinates based on ID hash
    let h = 0;
    for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
    const x = 15 + Math.abs((h & 0xffff) % 70); // 15% to 85%
    const y = 15 + Math.abs(((h >> 16) & 0xffff) % 70);
    return { x, y };
  }

  // Bounding box for São Paulo center region (Itaim, Pinheiros, Vila Madalena, etc.)
  const minLat = -23.62;
  const maxLat = -23.50;
  const minLng = -46.72;
  const maxLng = -46.58;

  let x = ((lng - minLng) / (maxLng - minLng)) * 80 + 10;
  let y = (1 - (lat - minLat) / (maxLat - minLat)) * 80 + 10; // invert Y since screen 0 is top

  // Restrict to safe borders
  x = Math.max(8, Math.min(92, x));
  y = Math.max(8, Math.min(92, y));

  return { x, y };
}

export function LiveMap({ tick, drivers: propDrivers, orders: propOrders }: LiveMapProps) {
  const [localDrivers, setLocalDrivers] = useState<Driver[]>(() => seedDrivers());

  // If live data isn't active, run local simulation for demo purposes
  useEffect(() => {
    if (propDrivers) return;
    setLocalDrivers((curr) =>
      curr.map((d) => {
        let nx = d.x + d.vx;
        let ny = d.y + d.vy;
        let vx = d.vx, vy = d.vy;
        if (nx < 4 || nx > 96) { vx = -vx; nx = d.x + vx; }
        if (ny < 6 || ny > 92) { vy = -vy; ny = d.y + vy; }
        return { ...d, x: nx, y: ny, vx, vy };
      })
    );
  }, [tick, propDrivers]);

  // Combine live data or fall back to simulated
  const liveDrivers = propDrivers
    ? propDrivers.map((d) => {
        const { x, y } = mapCoords(d.lat, d.lng, d.id);
        return {
          id: d.id,
          name: d.name,
          status: d.status === "disponivel" ? "online" as const : d.status === "em_rota" ? "rota" as const : d.status === "ocioso" ? "ocioso" as const : "offline" as const,
          deliveries: d.active_orders ?? 0,
          x,
          y,
          heading: d.heading ?? 0,
        };
      })
    : localDrivers.map(d => ({ ...d, heading: d.heading ?? 0 }));

  const liveOrders = propOrders
    ? propOrders
        .filter((o) => o.status !== "entregue" && o.status !== "cancelado")
        .map((o) => {
          const { x, y } = mapCoords(o.lat, o.lng, o.id);
          return { id: o.id, code: o.code, status: o.status, priority: o.priority, driver_id: o.driver_id, x, y };
        })
    : [];

  // Find active assignments to draw route lines
  const routes = liveOrders
    .filter((o) => o.driver_id)
    .map((o) => {
      const driver = liveDrivers.find((d) => d.id === o.driver_id);
      if (!driver) return null;
      return {
        id: `r-${o.id}`,
        x1: driver.x,
        y1: driver.y,
        x2: o.x,
        y2: o.y,
        priority: o.priority,
      };
    })
    .filter(Boolean) as Array<{ id: string; x1: number; y1: number; x2: number; y2: number; priority: string }>;

  return (
    <div className="glass rounded-2xl overflow-hidden relative h-[420px] lg:h-[520px]">
      <div className="absolute inset-0 grid-bg opacity-60 pointer-events-none" />
      <div className="absolute inset-0 pointer-events-none" style={{
        background: "radial-gradient(60% 70% at 30% 40%, oklch(0.62 0.21 275 / 0.15), transparent 60%), radial-gradient(50% 60% at 80% 70%, oklch(0.74 0.17 155 / 0.12), transparent 60%)"
      }} />

      {/* Fake Streets / Grid network */}
      <svg className="absolute inset-0 w-full h-full opacity-20 pointer-events-none">
        {[15, 35, 55, 75, 90].map((y) => (
          <line key={`h${y}`} x1="0" x2="100%" y1={`${y}%`} y2={`${y}%`} stroke="oklch(1 0 0 / 0.15)" strokeWidth="1" />
        ))}
        {[10, 30, 50, 70, 85].map((x) => (
          <line key={`v${x}`} y1="0" y2="100%" x1={`${x}%`} x2={`${x}%`} stroke="oklch(1 0 0 / 0.15)" strokeWidth="1" />
        ))}
      </svg>

      {/* Active Route Connections */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
        <defs>
          <filter id="laser-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>
        {routes.map((r) => {
          const isCritical = r.priority === "critica" || r.priority === "crit";
          const strokeColor = isCritical ? "oklch(0.65 0.24 25)" : "oklch(0.72 0.22 280)";
          return (
            <g key={r.id}>
              {/* Pulsing glow background line */}
              <line
                x1={`${r.x1}%`}
                y1={`${r.y1}%`}
                x2={`${r.x2}%`}
                y2={`${r.y2}%`}
                stroke={strokeColor}
                strokeWidth="4"
                className="opacity-25 blur-[3px]"
                filter="url(#laser-glow)"
              />
              {/* Core fiber-optic route line */}
              <line
                x1={`${r.x1}%`}
                y1={`${r.y1}%`}
                x2={`${r.x2}%`}
                y2={`${r.y2}%`}
                stroke={strokeColor}
                strokeWidth="1.5"
                strokeDasharray={isCritical ? "6 3" : "4 4"}
                className={`opacity-80 ${isCritical ? "animate-pulse" : ""}`}
              />
              {/* Traveling dot along route */}
              <circle r={isCritical ? "4.5" : "3.5"} fill={isCritical ? "#ff4a4a" : strokeColor} className="route-anim drop-shadow-[0_0_8px_currentColor]">
                <animateMotion
                  path={`M ${r.x1},${r.y1} L ${r.x2},${r.y2}`}
                  dur={isCritical ? "2.5s" : "4s"}
                  repeatCount="indefinite"
                />
              </circle>
            </g>
          );
        })}
      </svg>

      {/* Dynamic Heatmap Operacional (Pulse animated) */}
      {[
        {x:32, y:28, c:"oklch(0.65 0.24 25 / 0.25)", label: "ALTO ATRASO"},
        {x:68, y:52, c:"oklch(0.82 0.16 80 / 0.22)", label: "CONGESTIONADO"},
        {x:48, y:72, c:"oklch(0.74 0.17 155 / 0.22)", label: "ALTA DEMANDA"}
      ].map((b,i)=>(
        <div 
          key={i} 
          className="absolute rounded-full blur-3xl pointer-events-none animate-pulse" 
          style={{
            left: `${b.x}%`,
            top: `${b.y}%`,
            width: 150,
            height: 150,
            background: b.c,
            transform: "translate(-50%,-50%)",
            animationDuration: `${3 + i * 1.5}s`
          }} 
        />
      ))}

      {/* Active Orders Pinpoints */}
      {liveOrders.map((o) => {
        const isCritical = o.priority === "critica" || o.priority === "crit";
        return (
          <div
            key={o.id}
            className="absolute -translate-x-1/2 -translate-y-1/2 group/marker z-20 cursor-pointer"
            style={{ left: `${o.x}%`, top: `${o.y}%` }}
          >
            {/* Glowing ring under critical order pins */}
            {isCritical && (
              <span className="absolute -inset-1 rounded-md bg-danger/25 blur-sm animate-ping" />
            )}
            <div className={`flex items-center justify-center px-1.5 py-1 rounded-md border text-[9px] font-mono font-semibold tracking-tight transition shadow-lg ${
              isCritical 
                ? "bg-danger/90 border-danger text-white shadow-danger/20 scale-105" 
                : "bg-surface/90 border-border text-foreground hover:border-primary-glow hover:scale-105"
            }`}>
              <MapPin className="size-2.5 mr-0.5" />
              {o.code.replace("#", "")}
            </div>
          </div>
        );
      })}

      {/* Drivers online with Directional Rotations */}
      {liveDrivers.map((d) => (
        <div
          key={d.id}
          className="absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-1000 ease-linear z-30 group/driver cursor-pointer"
          style={{ left: `${d.x}%`, top: `${d.y}%` }}
        >
          {/* Rotating directional arrow pointer */}
          <div 
            className="transition-transform duration-500 hover:scale-115 drop-shadow-[0_0_6px_rgba(0,0,0,0.6)]"
            style={{ transform: `rotate(${d.heading ?? 0}deg)` }}
          >
            <svg viewBox="0 0 24 24" className={`size-5 transition-all ${
              d.status === "rota" ? "text-success fill-success/15" : d.status === "ocioso" ? "text-warning fill-warning/15" : "text-primary-glow fill-primary/15"
            }`} style={{ width: 20, height: 20 }}>
              <path d="M12 2L2 22L12 18L22 22L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
            </svg>
          </div>
          
          {/* Signal active radar halo ring */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className={`absolute size-5 rounded-full animate-ping opacity-35 ${
              d.status === "rota" ? "bg-success" : d.status === "ocioso" ? "bg-warning" : "bg-primary-glow"
            }`} style={{ animationDuration: "2.4s" }} />
          </div>

          {/* Mini HUD on hover */}
          <div className="absolute left-1/2 -translate-x-1/2 bottom-6 bg-surface-elevated/95 border border-border px-2 py-1.5 rounded text-[10px] font-mono whitespace-nowrap opacity-0 pointer-events-none group-hover/driver:opacity-100 transition-all z-50 shadow-2xl scale-95 group-hover/driver:scale-100">
            <div className="font-bold text-foreground flex items-center gap-1.5">
              <span className={`size-1.5 rounded-full ${
                d.status === "rota" ? "bg-success" : d.status === "ocioso" ? "bg-warning" : "bg-primary-glow"
              }`} />
              {d.name}
            </div>
            <div className="uppercase text-[8px] text-muted-foreground mt-0.5 tracking-wider">
              {d.status} · {d.deliveries} entregas
            </div>
          </div>
        </div>
      ))}

      {/* HUD Header */}
      <div className="absolute top-4 left-4 flex items-center gap-2 pointer-events-none z-25">
        <div className="glass-strong rounded-lg px-3 py-1.5 text-xs font-mono flex items-center gap-2 border border-border/80 shadow-lg">
          <Navigation className="size-3 text-primary-glow animate-pulse" />
          São Paulo · Torre Central
        </div>
      </div>
      <div className="absolute top-4 right-4 flex items-center gap-2 z-25">
        <button className="glass-strong rounded-lg size-9 flex items-center justify-center hover:border-primary/40 hover:text-foreground transition text-muted-foreground cursor-pointer shadow-lg" title="Camadas"><Layers className="size-4" /></button>
        <button className="glass-strong rounded-lg size-9 flex items-center justify-center hover:border-primary/40 hover:text-foreground transition text-muted-foreground cursor-pointer shadow-lg" title="Maximizar"><Maximize2 className="size-4" /></button>
      </div>

      {/* HUD Bottom Panel */}
      <div className="absolute bottom-4 left-4 glass-strong rounded-xl px-4 py-3 flex items-center gap-5 text-xs pointer-events-none z-25 border border-border/80 shadow-lg">
        <div className="flex items-center gap-2"><span className="size-2.5 rounded-full bg-success animate-pulse" /> Em rota <b className="font-mono">{liveDrivers.filter(d=>d.status==="rota").length}</b></div>
        <div className="flex items-center gap-2"><span className="size-2.5 rounded-full bg-primary-glow" /> Online <b className="font-mono">{liveDrivers.filter(d=>d.status==="online").length}</b></div>
        <div className="flex items-center gap-2"><span className="size-2.5 rounded-full bg-warning" /> Ocioso <b className="font-mono">{liveDrivers.filter(d=>d.status==="ocioso").length}</b></div>
      </div>

      <div className="absolute bottom-4 right-4 glass-strong rounded-xl px-4 py-3 text-xs pointer-events-none z-25 border border-border/80 shadow-lg">
        <div className="text-muted-foreground uppercase tracking-widest text-[9px] leading-none">Eficiência logística</div>
        <div className="text-xl font-display font-semibold mt-1 text-gradient">96,8%</div>
      </div>
    </div>
  );
}
