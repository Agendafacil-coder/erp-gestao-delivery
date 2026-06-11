import { useCallback, useEffect, useRef, useId } from "react";
import { getMapboxToken, SP_CENTER } from "@/lib/map/constants";
import { MapPin, Navigation } from "lucide-react";
import "mapbox-gl/dist/mapbox-gl.css";

export type MapMarker = {
  id: string;
  lng: number;
  lat: number;
  label?: string;
  color?: string;
  kind?: "driver" | "order" | "store";
};

export type RouteLine = {
  id: string;
  from: { lng: number; lat: number };
  to: { lng: number; lat: number };
  color?: string;
  width?: number;
  opacity?: number;
};

export type RoutePath = {
  id: string;
  coordinates: Array<{ lng: number; lat: number }>;
  color?: string;
  width?: number;
  opacity?: number;
};

type OpsMapboxProps = {
  className?: string;
  markers?: MapMarker[];
  center?: { lng: number; lat: number };
  zoom?: number;
  showRouteLine?: boolean;
  routeFrom?: { lng: number; lat: number };
  routeTo?: { lng: number; lat: number };
  routeLines?: RouteLine[];
  routePaths?: RoutePath[];
  trailCoordinates?: Array<{ lng: number; lat: number }>;
  showMarkerLabels?: boolean;
};

export function OpsMapbox({
  className = "h-[420px] w-full rounded-2xl overflow-hidden",
  markers = [],
  center,
  zoom = 12.5,
  showRouteLine,
  routeFrom,
  routeTo,
  routeLines = [],
  routePaths = [],
  trailCoordinates = [],
  showMarkerLabels = false,
}: OpsMapboxProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("mapbox-gl").Map | null>(null);
  const markersRef = useRef<import("mapbox-gl").Marker[]>([]);
  const mapLoadedRef = useRef(false);
  const mapId = useId();
  const token = getMapboxToken();

  const syncLines = useCallback(
    (map: import("mapbox-gl").Map) => {
      const upsertLine = (
        sourceId: string,
        layerId: string,
        coordinates: Array<[number, number]>,
        color: string,
        width: number,
        opacity: number,
      ) => {
        if (coordinates.length < 2) {
          if (map.getLayer(layerId)) map.removeLayer(layerId);
          if (map.getSource(sourceId)) map.removeSource(sourceId);
          return;
        }

        const geometry = {
          type: "LineString" as const,
          coordinates,
        };
        const feature = { type: "Feature" as const, properties: {}, geometry };

        if (map.getSource(sourceId)) {
          (map.getSource(sourceId) as import("mapbox-gl").GeoJSONSource).setData(feature);
        } else {
          map.addSource(sourceId, { type: "geojson", data: feature });
          map.addLayer({
            id: layerId,
            type: "line",
            source: sourceId,
            paint: {
              "line-color": color,
              "line-width": width,
              "line-opacity": opacity,
            },
          });
        }
      };

      if (showRouteLine && routeFrom && routeTo) {
        upsertLine(
          `route-${mapId}`,
          `route-${mapId}-line`,
          [
            [routeFrom.lng, routeFrom.lat],
            [routeTo.lng, routeTo.lat],
          ],
          "#6366f1",
          3,
          0.85,
        );
      }

      routeLines.forEach((line) => {
        upsertLine(
          `route-${mapId}-${line.id}`,
          `route-${mapId}-${line.id}-line`,
          [
            [line.from.lng, line.from.lat],
            [line.to.lng, line.to.lat],
          ],
          line.color ?? "#6366f1",
          line.width ?? 2.5,
          line.opacity ?? 0.7,
        );
      });

      routePaths.forEach((path) => {
        upsertLine(
          `path-${mapId}-${path.id}`,
          `path-${mapId}-${path.id}-line`,
          path.coordinates.map((p) => [p.lng, p.lat]),
          path.color ?? "#818cf8",
          path.width ?? 4,
          path.opacity ?? 0.85,
        );
      });

      if (trailCoordinates.length >= 2) {
        upsertLine(
          `trail-${mapId}`,
          `trail-${mapId}-line`,
          trailCoordinates.map((p) => [p.lng, p.lat]),
          "#22c55e",
          4,
          0.9,
        );
      }
    },
    [mapId, showRouteLine, routeFrom, routeTo, routeLines, routePaths, trailCoordinates],
  );

  useEffect(() => {
    if (!token || !containerRef.current) return;

    let cancelled = false;
    mapLoadedRef.current = false;

    void import("mapbox-gl").then((mapboxgl) => {
      if (cancelled || !containerRef.current) return;

      mapboxgl.default.accessToken = token;

      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }

      const map = new mapboxgl.default.Map({
        container: containerRef.current,
        style: "mapbox://styles/mapbox/dark-v11",
        center: center ? [center.lng, center.lat] : [SP_CENTER.lng, SP_CENTER.lat],
        zoom,
        attributionControl: false,
      });

      map.addControl(new mapboxgl.default.NavigationControl({ visualizePitch: false }), "top-right");
      mapRef.current = map;

      map.on("load", () => {
        mapLoadedRef.current = true;
      });
    });

    return () => {
      cancelled = true;
      mapLoadedRef.current = false;
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [token, mapId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const run = () => syncLines(map);
    if (mapLoadedRef.current && map.isStyleLoaded()) run();
    else map.once("load", () => {
      mapLoadedRef.current = true;
      run();
    });
  }, [syncLines]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !token) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    void import("mapbox-gl").then((mapboxgl) => {
      markers.forEach((mk) => {
        const el = document.createElement("div");
        el.className = "map-marker";
        const color =
          mk.color ??
          (mk.kind === "driver" ? "#22c55e" : mk.kind === "store" ? "#f59e0b" : "#6366f1");
        const dot = `<div style="width:14px;height:14px;border-radius:50%;background:${color};box-shadow:0 0 12px ${color};border:2px solid #fff"></div>`;
        const label =
          showMarkerLabels && mk.label
            ? `<span style="font-size:9px;font-weight:700;color:#fff;background:rgba(10,12,18,0.85);padding:2px 5px;border-radius:4px;white-space:nowrap;border:1px solid rgba(255,255,255,0.15)">${mk.label}</span>`
            : "";
        el.innerHTML = `<div style="display:flex;flex-direction:column;align-items:center;gap:3px">${dot}${label}</div>`;
        const marker = new mapboxgl.default.Marker({ element: el, anchor: "center" })
          .setLngLat([mk.lng, mk.lat])
          .addTo(map);
        markersRef.current.push(marker);
      });

      if (markers.length > 0) {
        const bounds = new mapboxgl.default.LngLatBounds();
        markers.forEach((m) => bounds.extend([m.lng, m.lat]));
        if (routeFrom) bounds.extend([routeFrom.lng, routeFrom.lat]);
        if (routeTo) bounds.extend([routeTo.lng, routeTo.lat]);
        trailCoordinates.forEach((p) => bounds.extend([p.lng, p.lat]));
        routePaths.forEach((path) =>
          path.coordinates.forEach((p) => bounds.extend([p.lng, p.lat])),
        );
        map.fitBounds(bounds, { padding: 48, maxZoom: 14, duration: 800 });
      } else if (center) {
        map.flyTo({ center: [center.lng, center.lat], zoom, duration: 600 });
      }
    });
  }, [markers, center, zoom, token, routeFrom, routeTo, trailCoordinates, routePaths, showMarkerLabels]);

  if (!token) {
    return (
      <div
        className={`${className} flex flex-col items-center justify-center bg-[#0b0e14] border border-border text-center p-6`}
      >
        <Navigation className="size-8 text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground max-w-sm">
          Copie <code className="text-primary">swift-dispatch-main/.env.example</code> para{" "}
          <code className="text-primary">swift-dispatch-main/.env</code> e defina{" "}
          <code className="text-primary">VITE_MAPBOX_TOKEN</code> (token público Mapbox, começa com{" "}
          <code>pk.</code>).
        </p>
        <a
          href="https://account.mapbox.com/access-tokens/"
          target="_blank"
          rel="noreferrer"
          className="text-xs text-primary mt-2 hover:underline"
        >
          Obter token Mapbox
        </a>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <div ref={containerRef} className="absolute inset-0" />
      <div className="absolute top-3 left-3 glass-strong rounded-lg px-3 py-1.5 text-[10px] font-mono flex items-center gap-1.5 border border-border/80 pointer-events-none z-10">
        <MapPin className="size-3 text-primary-glow" />
        Mapbox Live
      </div>
    </div>
  );
}
