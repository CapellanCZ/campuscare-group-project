"use client"

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react"
import {
  IconChevronLeft,
  IconChevronRight,
  IconPhoto,
} from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { AnnouncementAttachment } from "@/types/announcement"

export function announcementImages(
  attachments: AnnouncementAttachment[] | undefined
): AnnouncementAttachment[] {
  return (attachments ?? []).filter((item) => item.kind === "image" && item.url)
}

export function AnnouncementImageGallery({
  images,
  className,
  aspectClassName = "aspect-[16/10]",
}: {
  images: AnnouncementAttachment[]
  className?: string
  aspectClassName?: string
}) {
  const listId = useId()
  const scrollerRef = useRef<HTMLDivElement>(null)
  const [index, setIndex] = useState(0)

  const count = images.length

  const scrollToIndex = useCallback((next: number) => {
    const scroller = scrollerRef.current
    if (!scroller || count === 0) return
    const clamped = ((next % count) + count) % count
    const width = scroller.clientWidth
    scroller.scrollTo({ left: clamped * width, behavior: "smooth" })
    setIndex(clamped)
  }, [count])

  useEffect(() => {
    const scroller = scrollerRef.current
    if (!scroller || count <= 1) return

    function onScroll() {
      if (!scroller) return
      const width = scroller.clientWidth
      if (width <= 0) return
      const next = Math.round(scroller.scrollLeft / width)
      setIndex(Math.min(count - 1, Math.max(0, next)))
    }

    scroller.addEventListener("scroll", onScroll, { passive: true })
    return () => scroller.removeEventListener("scroll", onScroll)
  }, [count])

  useEffect(() => {
    if (count <= 1) return
    function onKey(event: KeyboardEvent) {
      if (event.key === "ArrowLeft") {
        event.preventDefault()
        scrollToIndex(index - 1)
      }
      if (event.key === "ArrowRight") {
        event.preventDefault()
        scrollToIndex(index + 1)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [count, index, scrollToIndex])

  if (count === 0) return null

  return (
    <figure
      className={cn(
        "relative mx-auto w-full max-w-3xl overflow-hidden rounded-sm border border-border/60 bg-muted shadow-sm",
        className
      )}
      aria-roledescription="carousel"
      aria-label="Announcement images"
    >
      <div
        ref={scrollerRef}
        id={listId}
        className={cn(
          "flex snap-x snap-mandatory overflow-x-auto scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          aspectClassName
        )}
        tabIndex={0}
        role="region"
        aria-live="polite"
      >
        {images.map((image, imageIndex) => (
          <div
            key={image.id}
            className="relative min-w-full shrink-0 snap-center"
            role="group"
            aria-roledescription="slide"
            aria-label={`Image ${imageIndex + 1} of ${count}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={image.url!}
              alt={image.fileName || `Announcement image ${imageIndex + 1}`}
              className="size-full max-h-[520px] object-contain"
              draggable={false}
            />
          </div>
        ))}
      </div>

      {count > 1 ? (
        <>
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center p-2">
            <Button
              type="button"
              size="icon-sm"
              variant="secondary"
              className="pointer-events-auto bg-background/90 shadow-sm backdrop-blur"
              onClick={() => scrollToIndex(index - 1)}
              aria-label="Previous image"
              aria-controls={listId}
            >
              <IconChevronLeft className="size-4" aria-hidden />
            </Button>
          </div>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center p-2">
            <Button
              type="button"
              size="icon-sm"
              variant="secondary"
              className="pointer-events-auto bg-background/90 shadow-sm backdrop-blur"
              onClick={() => scrollToIndex(index + 1)}
              aria-label="Next image"
              aria-controls={listId}
            >
              <IconChevronRight className="size-4" aria-hidden />
            </Button>
          </div>

          <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 bg-gradient-to-t from-black/55 to-transparent px-3 py-2.5">
            <p
              className="inline-flex items-center gap-1.5 text-xs font-medium text-white"
              role="status"
            >
              <IconPhoto className="size-3.5" aria-hidden />
              {index + 1} / {count}
            </p>
            <div className="flex items-center gap-1.5">
              {images.map((image, dotIndex) => (
                <button
                  key={image.id}
                  type="button"
                  className={cn(
                    "size-1.5 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    dotIndex === index ? "bg-white" : "bg-white/45 hover:bg-white/70"
                  )}
                  aria-label={`Go to image ${dotIndex + 1}`}
                  aria-current={dotIndex === index ? "true" : undefined}
                  onClick={() => scrollToIndex(dotIndex)}
                />
              ))}
            </div>
          </div>
        </>
      ) : null}
    </figure>
  )
}
