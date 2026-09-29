"use client"

import { useCallback, useEffect, useState } from "react"
import {
  IconChevronLeft,
  IconChevronRight,
} from "@tabler/icons-react"

import { LoginFeaturePreview } from "@/components/auth/login-feature-preview"
import { Button } from "@/components/ui/button"
import {
  LOGIN_FEATURE_SLIDES,
  type LoginFeatureSlide,
} from "@/lib/auth/login-feature-slides"
import { cn } from "@/lib/utils"

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    setReduced(mq.matches)
    const onChange = () => setReduced(mq.matches)
    mq.addEventListener("change", onChange)
    return () => mq.removeEventListener("change", onChange)
  }, [])
  return reduced
}

export function LoginFeatureShowcase({ className }: { className?: string }) {
  const slides = LOGIN_FEATURE_SLIDES
  const [index, setIndex] = useState(0)
  const reducedMotion = usePrefersReducedMotion()
  const slide: LoginFeatureSlide = slides[index] ?? slides[0]

  const goTo = useCallback(
    (next: number) => {
      const n = slides.length
      setIndex(((next % n) + n) % n)
    },
    [slides.length]
  )

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === "ArrowLeft") {
        event.preventDefault()
        goTo(index - 1)
      } else if (event.key === "ArrowRight") {
        event.preventDefault()
        goTo(index + 1)
      } else if (event.key === "Home") {
        event.preventDefault()
        goTo(0)
      } else if (event.key === "End") {
        event.preventDefault()
        goTo(slides.length - 1)
      }
    },
    [goTo, index, slides.length]
  )

  return (
    <section
      className={cn(
        "relative flex flex-col justify-center px-6 py-10 sm:px-10 lg:px-12 xl:px-16",
        "bg-linear-to-br from-primary/8 via-background to-primary/5",
        "border-t border-border/60 lg:border-t-0 lg:border-l",
        className
      )}
      aria-labelledby="login-feature-title"
      aria-roledescription="carousel"
      onKeyDown={onKeyDown}
      tabIndex={0}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
        CampusCare features
      </p>

      <div
        className={cn(
          "mt-6 space-y-3",
          !reducedMotion && "duration-300 animate-in fade-in-0"
        )}
        key={slide.id}
      >
        <p className="text-sm font-medium text-muted-foreground">
          {slide.category}
        </p>
        <h2
          id="login-feature-title"
          className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
        >
          {slide.title}
        </h2>
        <p className="max-w-lg text-sm leading-relaxed text-muted-foreground sm:text-base">
          {slide.description}
        </p>
      </div>

      <div className="mt-8 min-h-[200px] flex-1 sm:min-h-[220px]">
        <LoginFeaturePreview slideId={slide.id} />
      </div>

      <div className="mt-8 flex items-center justify-center gap-4">
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          aria-label="Previous feature"
          onClick={() => goTo(index - 1)}
        >
          <IconChevronLeft aria-hidden />
        </Button>

        <div
          className="flex flex-wrap items-center justify-center gap-2"
          role="tablist"
          aria-label="Feature slides"
        >
          {slides.map((s, i) => {
            const selected = i === index
            return (
              <button
                key={s.id}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-label={`${s.title}, slide ${i + 1} of ${slides.length}`}
                className={cn(
                  "size-2.5 rounded-full transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  selected ? "bg-primary scale-110" : "bg-primary/25 hover:bg-primary/40"
                )}
                onClick={() => goTo(i)}
              />
            )
          })}
        </div>

        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          aria-label="Next feature"
          onClick={() => goTo(index + 1)}
        >
          <IconChevronRight aria-hidden />
        </Button>
      </div>

      <p className="sr-only" aria-live="polite">
        Slide {index + 1} of {slides.length}: {slide.title}
      </p>
    </section>
  )
}
