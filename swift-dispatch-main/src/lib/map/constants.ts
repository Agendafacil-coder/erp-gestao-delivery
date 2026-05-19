/** Centro de São Paulo (Pinheiros) — padrão operacional */
export const SP_CENTER = { lng: -46.6558, lat: -23.5614 } as const;

export const SP_BOUNDS = {
  minLat: -23.62,
  maxLat: -23.5,
  minLng: -46.72,
  maxLng: -46.58,
} as const;

export function getMapboxToken(): string | null {
  const token = import.meta.env.VITE_MAPBOX_TOKEN;
  return typeof token === "string" && token.length > 10 ? token : null;
}
