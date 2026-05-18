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
          status: d.status === "disponivel" ? "online" as const : d.status === "em_rota" ? "rota" as const : d.status === "pausado" ? "ocioso" as const : "offline" as const,
          deliveries: d.active_orders ?? 0,
          x,
          y,
        };
      })
    : localDrivers;

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
        {routes.map((r) => {
          const isCritical = r.priority === "critica" || r.priority === "crit";
          const strokeColor = isCritical ? "oklch(0.65 0.24 25)" : "oklch(0.72 0.22 280)";
          return (
            <g key={r.id}>
              {/* Pulsing route line */}
              <line
                x1={`${r.x1}%`}
                y1={`${r.y1}%`}
                x2={`${r.x2}%`}
                y2={`${r.y2}%`}
                stroke={strokeColor}
                strokeWidth="1.5"
                strokeDasharray="4 4"
                className="opacity-70"
              />
              <line
                x1={`${r.x1}%`}
                y1={`${r.y1}%`}
                x2={`${r.x2}%`}
                y2={`${r.y2}%`}
                stroke={strokeColor}
                strokeWidth="4"
                className="opacity-10 blur-xs"
              />
              {/* Traveling dot along route */}
              <circle r="3" fill={strokeColor} className="route-anim">
                <animateMotion
                  path={`M ${r.x1},${r.y1} L ${r.x2},${r.y2}`}
                  dur="4s"
                  repeatCount="indefinite"
                />
              </circle>
            </g>
          );
        })}
      </svg>

      {/* Demand Hotspots */}
      {[{x:32,y:28,c:"oklch(0.65 0.24 25 / 0.22)"},{x:68,y:52,c:"oklch(0.82 0.16 80 / 0.18)"},{x:48,y:72,c:"oklch(0.74 0.17 155 / 0.2)"}].map((b,i)=>(
        <div key={i} className="absolute rounded-full blur-3xl pointer-events-none" style={{left:`${b.x}%`,top:`${b.y}%`,width:160,height:160,background:b.c,transform:"translate(-50%,-50%)"}} />
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
            <div className={`flex items-center justify-center p-1 rounded-md border text-[9px] font-mono font-semibold tracking-tight transition shadow-lg ${
              isCritical ? "bg-danger/80 border-danger text-white shadow-danger/20" : "bg-surface/90 border-border text-foreground hover:border-primary-glow"
            }`}>
              <MapPin className="size-2.5 mr-0.5" />
              {o.code.replace("#", "")}
            </div>
          </div>
        );
      })}

      {/* Drivers online */}
      {liveDrivers.map((d) => (
        <div
          key={d.id}
          className="absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-1000 ease-linear z-30 group/driver cursor-pointer"
          style={{ left: `${d.x}%`, top: `${d.y}%` }}
        >
          {/* Driver Glow and Dot */}
          <div className={`size-3 rounded-full driver-pulse flex items-center justify-center ${
            d.status === "rota" ? "bg-success" : d.status === "ocioso" ? "bg-warning" : "bg-primary-glow"
          }`} />
          {/* Mini HUD on hover */}
          <div className="absolute left-1/2 -translate-x-1/2 bottom-5 bg-surface-elevated/95 border border-border px-2 py-1 rounded text-[10px] font-mono whitespace-nowrap opacity-0 pointer-events-none group-hover/driver:opacity-100 transition-opacity z-50 shadow-2xl">
            <span className="font-semibold text-foreground">{d.name}</span> · <span className="uppercase text-[9px] text-muted-foreground">{d.status}</span>
          </div>
        </div>
      ))}

      {/* HUD Header */}
      <div className="absolute top-4 left-4 flex items-center gap-2 pointer-events-none">
        <div className="glass-strong rounded-lg px-3 py-1.5 text-xs font-mono flex items-center gap-2">
          <Navigation className="size-3 text-primary-glow animate-bounce" />
          São Paulo · Torre Central
        </div>
      </div>
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <button className="glass-strong rounded-lg size-9 flex items-center justify-center hover:border-primary/40 transition" title="Camadas"><Layers className="size-4" /></button>
        <button className="glass-strong rounded-lg size-9 flex items-center justify-center hover:border-primary/40 transition" title="Maximizar"><Maximize2 className="size-4" /></button>
      </div>

      {/* HUD Bottom Panel */}
      <div className="absolute bottom-4 left-4 glass-strong rounded-xl px-4 py-3 flex items-center gap-5 text-xs pointer-events-none">
        <div className="flex items-center gap-2"><span className="size-2 rounded-full bg-success" /> Em rota <b className="font-mono">{liveDrivers.filter(d=>d.status==="rota").length}</b></div>
        <div className="flex items-center gap-2"><span className="size-2 rounded-full bg-primary-glow" /> Online <b className="font-mono">{liveDrivers.filter(d=>d.status==="online").length}</b></div>
        <div className="flex items-center gap-2"><span className="size-2 rounded-full bg-warning" /> Ocioso <b className="font-mono">{liveDrivers.filter(d=>d.status==="ocioso").length}</b></div>
      </div>

      <div className="absolute bottom-4 right-4 glass-strong rounded-xl px-4 py-3 text-xs pointer-events-none">
        <div className="text-muted-foreground uppercase tracking-widest text-[9px] leading-none">Eficiência logística</div>
        <div className="text-xl font-display font-semibold mt-1 text-gradient">94,2%</div>
      </div>
    </div>
  );
}
