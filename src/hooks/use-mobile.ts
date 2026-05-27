import * as React from "react"

const MOBILE_BREAKPOINT = 768

/**
 * Returns true when the viewport is narrower than the mobile breakpoint.
 *
 * Lazy initial state reads `window.innerWidth` synchronously on the very first
 * client render, so components that branch on this (e.g. DataTable picking
 * mobile-card vs desktop-table layout) match the actual viewport on the
 * initial paint instead of flashing the desktop layout first.
 *
 * SSR-safe: returns `false` (treat as desktop) when `window` is undefined.
 * The post-hydration effect then corrects state if it disagrees with SSR.
 */
export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean>(() => {
    if (typeof window === "undefined") return false
    return window.innerWidth < MOBILE_BREAKPOINT
  })

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    // Re-sync once on mount in case innerWidth changed between render and effect.
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return isMobile
}
