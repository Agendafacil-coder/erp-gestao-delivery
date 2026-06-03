export function buildGoogleMapsDirectionsUrl(opts: {
  address?: string;
  lat?: number | null;
  lng?: number | null;
}): string {
  const dest =
    opts.lat != null && opts.lng != null
      ? `${opts.lat},${opts.lng}`
      : encodeURIComponent(opts.address ?? "");
  return `https://www.google.com/maps/dir/?api=1&destination=${dest}&travelmode=driving`;
}

export function buildWazeUrl(opts: {
  address?: string;
  lat?: number | null;
  lng?: number | null;
}): string {
  if (opts.lat != null && opts.lng != null) {
    return `https://waze.com/ul?ll=${opts.lat},${opts.lng}&navigate=yes`;
  }
  return `https://waze.com/ul?q=${encodeURIComponent(opts.address ?? "")}&navigate=yes`;
}
