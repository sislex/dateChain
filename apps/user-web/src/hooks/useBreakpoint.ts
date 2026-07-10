import { useEffect, useState } from "react";

export type Breakpoint = "mobile" | "tablet" | "desktop";

export function breakpointForWidth(width: number): Breakpoint {
  if (width >= 1024) return "desktop";
  if (width >= 768) return "tablet";
  return "mobile";
}

/** Reactive breakpoint based on window width; SSR-safe default is mobile. */
export function useBreakpoint(): Breakpoint {
  const [bp, setBp] = useState<Breakpoint>(() =>
    typeof window === "undefined" ? "mobile" : breakpointForWidth(window.innerWidth),
  );

  useEffect(() => {
    const onResize = () => setBp(breakpointForWidth(window.innerWidth));
    window.addEventListener("resize", onResize);
    onResize();
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return bp;
}
