import type Lenis from "lenis"

const LENIS_WINDOW_KEY = "__campuscareLandingLenis"

type LenisWindow = Window & {
  [LENIS_WINDOW_KEY]?: Lenis | null
}

let lenisInstance: Lenis | null = null
let rafScrollFrame = 0

/** Register the active Lenis instance (landing page only). */
export function setLenisInstance(instance: Lenis | null) {
  lenisInstance = instance
  if (typeof window !== "undefined") {
    ;(window as LenisWindow)[LENIS_WINDOW_KEY] = instance
  }
}

export function getLenisInstance() {
  if (lenisInstance) return lenisInstance
  if (typeof window === "undefined") return null
  return (window as LenisWindow)[LENIS_WINDOW_KEY] ?? null
}

function easeOutExpo(t: number) {
  return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)
}

/** Always-animated rAF scroll — does not honor prefers-reduced-motion. */
function animateScrollWithRaf(targetY: number, durationMs = 1100) {
  if (rafScrollFrame) cancelAnimationFrame(rafScrollFrame)

  const startY = window.scrollY
  const delta = targetY - startY
  if (Math.abs(delta) < 1) return

  const start = performance.now()

  const tick = (now: number) => {
    const t = Math.min(1, (now - start) / durationMs)
    window.scrollTo(0, startY + delta * easeOutExpo(t))
    if (t < 1) {
      rafScrollFrame = requestAnimationFrame(tick)
    } else {
      rafScrollFrame = 0
    }
  }

  rafScrollFrame = requestAnimationFrame(tick)
}

/**
 * Smooth-scroll to an element.
 * Prefer Lenis; fall back to a JS rAF tween (never native `behavior: smooth`,
 * which Windows Reduced Motion turns into an instant jump).
 */
export function smoothScrollToElement(
  element: HTMLElement,
  offset = 0,
  options?: { immediate?: boolean }
) {
  const targetY = Math.max(
    0,
    element.getBoundingClientRect().top + window.scrollY - Math.abs(offset)
  )

  if (options?.immediate) {
    if (rafScrollFrame) cancelAnimationFrame(rafScrollFrame)
    const lenis = getLenisInstance()
    if (lenis) {
      lenis.scrollTo(targetY, { immediate: true, force: true })
    } else {
      window.scrollTo(0, targetY)
    }
    return
  }

  const lenis = getLenisInstance()
  if (lenis) {
    lenis.scrollTo(targetY, {
      duration: 1.35,
      easing: easeOutExpo,
      immediate: false,
      force: true,
      lock: true,
      programmatic: true,
    })
    return
  }

  animateScrollWithRaf(targetY, 1100)
}
