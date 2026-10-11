"use client"

import { useEffect, useId, useRef } from "react"

import { LoginPreviewSlideBody } from "@/components/auth/login-preview-slide-card"
import {
  loginPreviewSlides,
  type LoginPreviewSlide,
} from "@/lib/auth/login-preview-slides"
import { cn } from "@/lib/utils"

/** Pixels per second — continuous leftward loop. */
const SCROLL_SPEED_PX = 48

/** Continuous looping marquee of demo workspace cards (not paginated). */
export function LoginPreviewCarousel() {
  const labelId = useId()
  const trackRef = useRef<HTMLDivElement>(null)
  const offsetRef = useRef(0)
  const pausedRef = useRef(false)
  const loopSlides = [...loginPreviewSlides, ...loginPreviewSlides]

  useEffect(() => {
    const track = trackRef.current
    if (!track) return

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches
    if (reduceMotion) return

    let frame = 0
    let lastTime = performance.now()

    const tick = (now: number) => {
      const delta = Math.min(0.05, (now - lastTime) / 1000)
      lastTime = now

      if (!pausedRef.current) {
        const loopWidth = track.scrollWidth / 2
        if (loopWidth > 0) {
          offsetRef.current -= SCROLL_SPEED_PX * delta
          if (-offsetRef.current >= loopWidth) {
            offsetRef.current += loopWidth
          }
          track.style.transform = `translate3d(${offsetRef.current}px, 0, 0)`
        }
      }

      frame = window.requestAnimationFrame(tick)
    }

    frame = window.requestAnimationFrame(tick)
    return () => window.cancelAnimationFrame(frame)
  }, [])

  return (
    <div className="space-y-3">
      <p
        id={labelId}
        className="text-center text-[11px] font-semibold tracking-[0.16em] text-white/90 uppercase"
      >
        CampusCare workspace preview
      </p>

      <div
        role="region"
        aria-roledescription="carousel"
        aria-labelledby={labelId}
        aria-live="off"
        className="relative"
        onMouseEnter={() => {
          pausedRef.current = true
        }}
        onMouseLeave={() => {
          pausedRef.current = false
        }}
        onFocusCapture={() => {
          pausedRef.current = true
        }}
        onBlurCapture={(event) => {
          if (
            !event.currentTarget.contains(event.relatedTarget as Node | null)
          ) {
            pausedRef.current = false
          }
        }}
      >
        <div className="overflow-hidden">
          <div
            ref={trackRef}
            className="flex w-max gap-4 py-1 will-change-transform"
          >
            {loopSlides.map((slide, slideIndex) => (
              <PreviewCard
                key={`${slide.id}-${slideIndex}`}
                slide={slide}
                ariaHidden={slideIndex >= loginPreviewSlides.length}
              />
            ))}
          </div>
        </div>
      </div>

      <p className="text-center text-xs text-blue-100/90">
        Illustrative staff views — not live clinic data.
      </p>
    </div>
  )
}

function PreviewCard({
  slide,
  ariaHidden,
}: {
  slide: LoginPreviewSlide
  ariaHidden?: boolean
}) {
  return (
    <article
      aria-hidden={ariaHidden || undefined}
      className="w-[min(20.5rem,78vw)] shrink-0 overflow-hidden rounded-2xl border border-white/25 bg-white text-slate-900 shadow-2xl sm:w-[22rem]"
    >
      <div className="flex min-h-[17.5rem]">
        <span
          className={cn("w-1.5 shrink-0 sm:w-2", slide.barClass)}
          aria-hidden
        />
        <div className="min-w-0 flex-1 p-3.5 sm:p-4">
          {slide.id === "display" ? (
            <LoginPreviewSlideBody slideId={slide.id} />
          ) : (
            <>
              <div className="pr-1">
                <h3 className="text-base font-bold tracking-tight text-slate-900 sm:text-lg">
                  {slide.title}
                </h3>
                <p className="text-xs text-slate-500">{slide.subtitle}</p>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-1.5 sm:gap-2">
                {slide.stats.map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-xl border border-slate-200/90 bg-white px-1.5 py-2 text-center"
                  >
                    <p
                      className={cn(
                        "text-base font-bold tabular-nums sm:text-lg",
                        slide.accentClass
                      )}
                    >
                      {stat.value}
                    </p>
                    <p className="text-[10px] font-medium text-slate-500">
                      {stat.label}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-3">
                <LoginPreviewSlideBody slideId={slide.id} />
              </div>
            </>
          )}
        </div>
      </div>
    </article>
  )
}
