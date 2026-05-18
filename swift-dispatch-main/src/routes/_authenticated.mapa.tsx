import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { OpsSidebar } from "@/components/ops/Sidebar";
import { OpsHeader } from "@/components/ops/Header";
import { Onboarding } from "@/components/ops/Onboarding";
import { useTenant } from "@/hooks/useTenant";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, KeyRound, Layers, Navigation } from "lucide-react";

export const Route = createFileRoute("/_authenticated/mapa")({
  component: MapaLivePage,
});

type Driver = {
  id: string; name: string; status: "online"|"offline"|"rota"|"ocioso";
  vehicle: "moto"|"bike"|"carro"|"a_pe"; lat: number|null; lng: number|null;
  active_orders: number; rating: number|null;
};
type Order = {
  id: string; code: string; status: string; priority: string;
  customer_name: string; address: string; lat: number|null; lng: number|null;
  total_amount: number; sla_minutes: number; placed_at: string;
};

const SP_CENTER: [number, number] = [-46.6388, -23.5489];
const TOKEN_KEY = "mapbox_public_token";

// Deterministic jitter for orders/drivers missing coords — keeps positions stable across re-renders.
function fallbackCoord(seed: string): [number, number] {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  const r1 = ((h & 0xffff) / 0xffff - 0.5) * 0.12;
  const r2 = (((h >> 16) & 0xffff) / 0xffff - 0.5) * 0.12;
  return [SP_CENTER[0] + r1, SP_CENTER[1] + r2];
}

function MapaLivePage() {
  const { current, loading } = useTenant();
  const [token, setToken] = useState<string>(() =>
    typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) ?? "" : "",
  );

  return (
    <div className="min-h-screen flex">
      <OpsSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <OpsHeader tick={0} />
        {loading ? (
          <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">Carregando…</div>
        ) : !current ? (
          <Onboarding />
        ) : !token ? (
          <TokenGate onSave={(t) => { localStorage.setItem(TOKEN_KEY, t); setToken(t); }} />
        ) : (
          <MapView tenantId={current.id} token={token} onResetToken={() => { localStorage.removeItem(TOKEN_KEY); setToken(""); }} />
        )}
      </div>
    </div>
  );
}

function TokenGate({ onSave }: { onSave: (t: string) => void }) {
  const [v, setV] = useState("");
  return (
    <main className="flex-1 p-6 flex items-center justify-center">
      <div className="glass-strong rounded-2xl p-8 max-w-lg w-full">
        <div className="flex items-center gap-3 mb-4">
          <div className="size-10 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center">
            <KeyRound className="size-5 text-primary-glow" />
          </div>
          <div>
            <h2 className="font-display text-xl font-semibold">Conectar Mapbox</h2>
            <p className="text-xs text-muted-foreground">Cole seu <b>public token</b> para ativar o mapa live</p>
          </div>
        </div>
        <ol className="text-xs text-muted-foreground space-y-1 mb-4 list-decimal list-inside">
          <li>Acesse <a className="text-primary-glow underline" href="https://account.mapbox.com/access-tokens/" target="_blank" rel="noreferrer">mapbox.com/access-tokens</a></li>
          <li>Copie seu <b>Default public token</b> (começa com <code className="font-mono">pk.</code>)</li>
          <li>Cole abaixo — fica salvo apenas neste navegador</li>
        </ol>
        <input
          value={v}
          onChange={(e) => setV(e.target.value)}
          placeholder="pk.eyJ1Ijoi..."
          className="w-full px-4 py-3 rounded-lg bg-surface border border-border focus:border-primary/50 outline-none font-mono text-xs"
        />
        <button
          onClick={() => v.startsWith("pk.") && onSave(v.trim())}
          disabled={!v.startsWith("pk.")}
          className="mt-4 w-full px-4 py-3 rounded-lg bg-primary text-primary-foreground font-medium disabled:opacity-40 hover:opacity-90 transition"
        >
          Ativar Mapa Live
        </button>
      </div>
    </main>
  );
}

function MapView({ tenantId, token, onResetToken }: { tenantId: string; token: string; onResetToken: () => void }) {
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const driverMarkersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const orderMarkersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [style, setStyle] = useState<"dark"|"streets">("dark");
  const [error, setError] = useState<string | null>(null);

  // Init map
  useEffect(() => {
    if (!containerRef.current) return;
    mapboxgl.accessToken = token;
    try {
      const map = new mapboxgl.Map({
        container: containerRef.current,
        style: style === "dark" ? "mapbox://styles/mapbox/dark-v11" : "mapbox://styles/mapbox/streets-v12",
        center: SP_CENTER,
        zoom: 11.2,
        pitch: 35,
        attributionControl: false,
      });
      map.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), "bottom-right");
      map.addControl(new mapboxgl.AttributionControl({ compact: true }));
      mapRef.current = map;
    } catch (e: any) {
      setError(e?.message ?? "Falha ao iniciar o mapa");
    }
    return () => {
      driverMarkersRef.current.forEach((m) => m.remove());
      orderMarkersRef.current.forEach((m) => m.remove());
      driverMarkersRef.current.clear();
      orderMarkersRef.current.clear();
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line
  }, [token, style]);

  // Initial fetch
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [{ data: ds }, { data: os }] = await Promise.all([
        supabase.from("drivers").select("id,name,status,vehicle,lat,lng,active_orders,rating").eq("tenant_id", tenantId),
        supabase.from("orders").select("id,code,status,priority,customer_name,address,lat,lng,total_amount,sla_minutes,placed_at")
          .eq("tenant_id", tenantId).not("status", "in", "(entregue,cancelado)"),
      ]);
      if (cancelled) return;
      setDrivers((ds ?? []) as Driver[]);
      setOrders((os ?? []) as Order[]);
    })();
    return () => { cancelled = true; };
  }, [tenantId]);

  // Realtime subscriptions
  useEffect(() => {
    const ch = supabase
      .channel(`mapa-${tenantId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "drivers", filter: `tenant_id=eq.${tenantId}` },
        (p) => setDrivers((curr) => upsertOrRemove(curr, p)))
      .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `tenant_id=eq.${tenantId}` },
        (p) => setOrders((curr) => {
          const next = upsertOrRemove(curr, p);
          return next.filter((o: any) => o.status !== "entregue" && o.status !== "cancelado");
        }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [tenantId]);

  // Render order markers
  useEffect(() => {
    const map = mapRef.current; if (!map) return;
    const seen = new Set<string>();
    for (const o of orders) {
      const [lng, lat] = o.lng != null && o.lat != null ? [o.lng, o.lat] : fallbackCoord(o.id);
      seen.add(o.id);
      const existing = orderMarkersRef.current.get(o.id);
      const el = existing?.getElement() ?? buildOrderEl(o);
      if (!existing) {
        const m = new mapboxgl.Marker({ element: el, anchor: "bottom" })
          .setLngLat([lng, lat])
          .setPopup(new mapboxgl.Popup({ offset: 18, closeButton: false }).setHTML(orderPopup(o)))
          .addTo(map);
        orderMarkersRef.current.set(o.id, m);
      } else {
        existing.setLngLat([lng, lat]);
        existing.getPopup()?.setHTML(orderPopup(o));
        el.dataset.priority = o.priority;
      }
    }
    for (const [id, m] of orderMarkersRef.current) {
      if (!seen.has(id)) { m.remove(); orderMarkersRef.current.delete(id); }
    }
  }, [orders]);

  // Render driver markers
  useEffect(() => {
    const map = mapRef.current; if (!map) return;
    const seen = new Set<string>();
    for (const d of drivers) {
      const [lng, lat] = d.lng != null && d.lat != null ? [d.lng, d.lat] : fallbackCoord(d.id);
      seen.add(d.id);
      const existing = driverMarkersRef.current.get(d.id);
      const el = existing?.getElement() ?? buildDriverEl(d);
      el.dataset.status = d.status;
      if (!existing) {
        const m = new mapboxgl.Marker({ element: el, anchor: "center" })
          .setLngLat([lng, lat])
          .setPopup(new mapboxgl.Popup({ offset: 14, closeButton: false }).setHTML(driverPopup(d)))
          .addTo(map);
        driverMarkersRef.current.set(d.id, m);
      } else {
        existing.setLngLat([lng, lat]);
        existing.getPopup()?.setHTML(driverPopup(d));
      }
    }
    for (const [id, m] of driverMarkersRef.current) {
      if (!seen.has(id)) { m.remove(); driverMarkersRef.current.delete(id); }
    }
  }, [drivers]);

  const counts = useMemo(() => ({
    rota: drivers.filter((d) => d.status === "rota").length,
    online: drivers.filter((d) => d.status === "online").length,
    ocioso: drivers.filter((d) => d.status === "ocioso").length,
    orders: orders.length,
  }), [drivers, orders]);

  return (
    <main className="flex-1 p-4 lg:p-6 space-y-4">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Geolocalização Live</div>
          <h1 className="text-2xl lg:text-3xl font-display font-semibold mt-1">
            Mapa <span className="text-gradient">Operacional</span>
          </h1>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={() => setStyle((s) => s === "dark" ? "streets" : "dark")}
            className="px-3 py-2 rounded-lg border border-border hover:border-border-strong text-muted-foreground hover:text-foreground transition flex items-center gap-2"
          >
            <Layers className="size-3.5" /> {style === "dark" ? "Modo claro" : "Modo dark"}
          </button>
          <button
            onClick={onResetToken}
            className="px-3 py-2 rounded-lg border border-border hover:border-danger/40 text-muted-foreground hover:text-danger transition flex items-center gap-2"
          >
            <KeyRound className="size-3.5" /> Trocar token
          </button>
        </div>
      </div>

      <div className="relative glass rounded-2xl overflow-hidden h-[calc(100vh-220px)] min-h-[520px]">
        <div ref={containerRef} className="absolute inset-0" />
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 text-sm text-danger">{error}</div>
        )}

        <div className="absolute top-4 left-4 glass-strong rounded-xl px-4 py-3 flex items-center gap-2 text-xs pointer-events-none">
          <Navigation className="size-3.5 text-primary-glow" />
          <span className="font-mono">{counts.orders} pedidos ativos · {drivers.length} entregadores</span>
        </div>

        <div className="absolute bottom-4 left-4 glass-strong rounded-xl px-4 py-3 flex items-center gap-5 text-xs pointer-events-none">
          <div className="flex items-center gap-2"><span className="size-2 rounded-full bg-success" /> Em rota <b className="font-mono">{counts.rota}</b></div>
          <div className="flex items-center gap-2"><span className="size-2 rounded-full bg-primary-glow" /> Online <b className="font-mono">{counts.online}</b></div>
          <div className="flex items-center gap-2"><span className="size-2 rounded-full bg-warning" /> Ocioso <b className="font-mono">{counts.ocioso}</b></div>
          <div className="flex items-center gap-2"><MapPin className="size-3 text-accent" /> Pedidos <b className="font-mono">{counts.orders}</b></div>
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground/70 uppercase tracking-widest text-center">
        Mapa atualizado em realtime · drivers + pedidos do tenant atual
      </p>

      <style>{markerCSS}</style>
    </main>
  );
}

// ---------- helpers ----------

function upsertOrRemove<T extends { id: string }>(curr: T[], payload: any): T[] {
  if (payload.eventType === "DELETE") return curr.filter((x) => x.id !== payload.old.id);
  const next = payload.new as T;
  const idx = curr.findIndex((x) => x.id === next.id);
  if (idx === -1) return [...curr, next];
  const copy = [...curr]; copy[idx] = next; return copy;
}

function buildDriverEl(d: Driver) {
  const el = document.createElement("div");
  el.className = "driver-marker";
  el.dataset.status = d.status;
  el.innerHTML = `<div class="dm-ring"></div><div class="dm-core"></div>`;
  return el;
}

function buildOrderEl(o: Order) {
  const el = document.createElement("div");
  el.className = "order-marker";
  el.dataset.priority = o.priority;
  el.innerHTML = `<div class="om-pin"><span>${o.code.replace("#","")}</span></div>`;
  return el;
}

function driverPopup(d: Driver) {
  return `<div style="font-family:DM Sans,system-ui;font-size:12px;color:#fff">
    <div style="font-weight:600;margin-bottom:4px">${escape(d.name)}</div>
    <div style="opacity:.7;text-transform:uppercase;letter-spacing:.1em;font-size:10px">${d.vehicle} · ${d.status}</div>
    <div style="margin-top:6px;font-family:JetBrains Mono,monospace">⭐ ${d.rating ?? "—"} · ${d.active_orders} pedidos</div>
  </div>`;
}
function orderPopup(o: Order) {
  return `<div style="font-family:DM Sans,system-ui;font-size:12px;color:#fff;max-width:220px">
    <div style="display:flex;justify-content:space-between;gap:8px">
      <b>${escape(o.code)}</b>
      <span style="font-family:JetBrains Mono,monospace;opacity:.8">R$ ${o.total_amount.toFixed(2)}</span>
    </div>
    <div style="margin-top:4px">${escape(o.customer_name)}</div>
    <div style="opacity:.7;margin-top:2px;font-size:11px">${escape(o.address)}</div>
    <div style="margin-top:6px;text-transform:uppercase;letter-spacing:.1em;font-size:10px;opacity:.7">${o.status} · ${o.priority}</div>
  </div>`;
}
function escape(s: string) { return s.replace(/[&<>"]/g, (c) => ({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;" }[c]!)); }

const markerCSS = `
.driver-marker { position: relative; width: 22px; height: 22px; }
.driver-marker .dm-core { position:absolute; inset:6px; border-radius:9999px; background: oklch(0.74 0.17 155); box-shadow: 0 0 0 2px oklch(0.14 0.04 270); }
.driver-marker .dm-ring { position:absolute; inset:0; border-radius:9999px; background: oklch(0.74 0.17 155 / 0.35); animation: dm-pulse 1.8s ease-out infinite; }
.driver-marker[data-status="rota"] .dm-core { background: oklch(0.74 0.17 155); }
.driver-marker[data-status="rota"] .dm-ring { background: oklch(0.74 0.17 155 / 0.4); }
.driver-marker[data-status="online"] .dm-core { background: oklch(0.72 0.22 280); }
.driver-marker[data-status="online"] .dm-ring { background: oklch(0.72 0.22 280 / 0.4); }
.driver-marker[data-status="ocioso"] .dm-core { background: oklch(0.82 0.16 80); }
.driver-marker[data-status="ocioso"] .dm-ring { background: oklch(0.82 0.16 80 / 0.4); }
.driver-marker[data-status="offline"] .dm-core { background: oklch(0.55 0.02 270); }
.driver-marker[data-status="offline"] .dm-ring { display:none; }
@keyframes dm-pulse { 0% { transform: scale(.6); opacity:.9 } 100% { transform: scale(2.2); opacity: 0 } }

.order-marker .om-pin {
  width: 30px; height: 38px; position: relative;
  display:flex; align-items:flex-start; justify-content:center; padding-top:5px;
  color:#fff; font-size:10px; font-family: JetBrains Mono, monospace; font-weight:600;
  background: oklch(0.62 0.21 275);
  clip-path: path('M15 0 C23 0 30 6 30 15 C30 26 15 38 15 38 C15 38 0 26 0 15 C0 6 7 0 15 0 Z');
  box-shadow: 0 4px 12px oklch(0 0 0 / 0.4);
}
.order-marker[data-priority="critica"] .om-pin { background: oklch(0.65 0.24 25); }
.order-marker[data-priority="alta"] .om-pin { background: oklch(0.82 0.16 80); color: #1a1a1a; }
.order-marker[data-priority="baixa"] .om-pin { background: oklch(0.55 0.08 270); }

.mapboxgl-popup-content { background: oklch(0.18 0.045 270) !important; border:1px solid oklch(1 0 0 / 0.1); border-radius: 10px !important; padding: 10px 12px !important; }
.mapboxgl-popup-tip { border-top-color: oklch(0.18 0.045 270) !important; border-bottom-color: oklch(0.18 0.045 270) !important; }
.mapboxgl-ctrl-bottom-right .mapboxgl-ctrl { margin-right:12px; margin-bottom:12px; }
`;
