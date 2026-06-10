/** Ícone do PWA entregador (SVG compartilhado entre manifest, push e geração PNG). */
export const DRIVER_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-label="Delivery OS Entregador">
  <rect width="512" height="512" rx="108" fill="#6366f1"/>
  <path fill="#ffffff" d="M144 168h176c8 0 15 5 18 13l36 96c2 6 8 11 15 11h69v32h-64l-20 64H136l-20-64h-16v-32h20l28-88c3-10 12-17 22-17zm32 32l-20 64h152l-24-64H176zm-40 128a40 40 0 1 0 0.1 0zm240 0a40 40 0 1 0 0.1 0z"/>
  <circle cx="176" cy="360" r="36" fill="#4f46e5"/>
  <circle cx="376" cy="360" r="36" fill="#4f46e5"/>
  <path fill="#ffffff" d="M272 200h48l32 80h-80v-80z"/>
</svg>`;

export const DRIVER_PWA_ICON_PATHS = {
  svg: "/icons/driver-icon.svg",
  png192: "/icons/driver-192.png",
  png512: "/icons/driver-512.png",
} as const;
