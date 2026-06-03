/** Tokens de design — espelham variáveis CSS em styles.css */
export const designTokens = {
  radius: {
    sm: "var(--radius-sm)",
    md: "var(--radius-md)",
    lg: "var(--radius-lg)",
    xl: "var(--radius-xl)",
    "2xl": "var(--radius-2xl)",
    full: "9999px",
  },
  shadow: {
    card: "var(--shadow-card)",
    lift: "var(--shadow-lift)",
    sidebar: "var(--shadow-sidebar)",
  },
  motion: {
    ease: "var(--ease-out)",
    normal: "var(--duration-normal)",
    slow: "var(--duration-slow)",
  },
} as const;
