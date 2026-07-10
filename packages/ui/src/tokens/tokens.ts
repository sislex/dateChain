/**
 * JS mirror of the design tokens for consumers that need values in code
 * (e.g. Framer Motion animations, canvas). CSS variables remain the source of
 * truth for styling; keep these in sync with tokens.css.
 */
export const colors = {
  flameStart: "#FD267A",
  flameEnd: "#FF6036",
  like: "#22E39C",
  nope: "#FD5068",
  superlike: "#1EC8FF",
  boost: "#B04AF6",
} as const;

export const gradients = {
  flame: "linear-gradient(135deg, #FD267A 0%, #FF6036 100%)",
} as const;

export const space = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  6: 24,
  8: 32,
} as const;

export const radii = {
  sm: 4,
  md: 8,
  lg: 16,
  pill: 999,
} as const;

export const breakpoints = {
  mobile: 0,
  tablet: 768,
  desktop: 1024,
} as const;

export const motion = {
  durationFast: 0.15,
  durationBase: 0.25,
  easeStandard: [0.2, 0, 0, 1] as const,
};

export type ThemeName = "light" | "dark";
