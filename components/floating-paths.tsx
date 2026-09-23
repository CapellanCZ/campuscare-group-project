/**
 * Decorative hero paths — Server Component (no JS motion library).
 * Animation is CSS-only; respects prefers-reduced-motion via globals.css.
 */
export function FloatingPaths({ position }: { position: number }) {
  const paths = Array.from({ length: 8 }, (_, i) => ({
    id: i,
    d: `M-${380 - i * 5 * position} -${189 + i * 6}C-${
      380 - i * 5 * position
    } -${189 + i * 6} -${312 - i * 5 * position} ${216 - i * 6} ${
      152 - i * 5 * position
    } ${343 - i * 6}C${616 - i * 5 * position} ${470 - i * 6} ${
      684 - i * 5 * position
    } ${875 - i * 6} ${684 - i * 5 * position} ${875 - i * 6}`,
    width: 0.5 + i * 0.04,
    opacity: 0.12 + i * 0.035,
    delay: `${(i % 4) * 0.9}s`,
  }))

  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden>
      <svg
        className="cc-floating-paths h-full w-full text-primary"
        fill="none"
        viewBox="0 0 696 316"
      >
        <title>Background Paths</title>
        {paths.map((path) => (
          <path
            key={path.id}
            d={path.d}
            stroke="currentColor"
            strokeOpacity={path.opacity}
            strokeWidth={path.width}
            style={{ animationDelay: path.delay }}
          />
        ))}
      </svg>
    </div>
  )
}
