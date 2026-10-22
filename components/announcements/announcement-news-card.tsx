"use client"

import type { ComponentType } from "react"
import {
  IconCalendarEvent,
  IconPhoto,
  IconSpeakerphone,
  IconUsers,
} from "@tabler/icons-react"

import {
  announcementCoverUrl,
  announcementExcerpt,
} from "@/features/announcements/lib/display"
import { formatAnnouncementDate } from "@/features/announcements/lib/format"
import { announcementImages } from "@/components/announcements/announcement-image-gallery"
import { cn } from "@/lib/utils"
import type { Announcement } from "@/types/announcement"

export type AnnouncementCardDensity = "card" | "dense" | "list"

function MetaChip({
  icon: Icon,
  label,
}: {
  icon: ComponentType<{ className?: string; stroke?: number }>
  label: string
}) {
  return (
    <span className="inline-flex max-w-full items-center gap-1 rounded-md bg-muted/50 px-1.5 py-0.5 text-[11px] text-muted-foreground">
      <Icon className="size-3.5 shrink-0 opacity-70" stroke={1.75} aria-hidden />
      <span className="truncate">{label}</span>
    </span>
  )
}

export function AnnouncementNewsCard({
  announcement,
  onClick,
  className,
  density = "card",
  entranceIndex = 0,
  /** @deprecated Use density="list" */
  compact = false,
}: {
  announcement: Announcement
  onClick?: () => void
  className?: string
  density?: AnnouncementCardDensity
  /** Stagger entrance delay index (capped). */
  entranceIndex?: number
  compact?: boolean
}) {
  const layout: AnnouncementCardDensity = compact ? "list" : density
  const cover = announcementCoverUrl(announcement)
  const imageCount = announcementImages(announcement.attachments).length
  const excerpt = announcementExcerpt(
    announcement.body,
    layout === "card" ? 140 : layout === "dense" ? 80 : 90
  )
  const dateLabel = formatAnnouncementDate(
    announcement.publishedAt ?? announcement.updatedAt
  )
  const isList = layout === "list"
  const isDense = layout === "dense"
  const staggerMs = Math.min(entranceIndex, 8) * 45

  return (
    <button
      type="button"
      onClick={onClick}
      style={{ animationDelay: `${staggerMs}ms` }}
      className={cn(
        "group flex w-full overflow-hidden rounded-xl border border-border bg-card text-left shadow-none",
        "transition-[border-color,box-shadow,transform,opacity] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]",
        "hover:border-foreground/15 hover:shadow-sm active:scale-[0.985]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:fill-mode-both",
        isList ? "flex-row items-stretch" : "flex-col",
        className
      )}
    >
      <div
        className={cn(
          "relative shrink-0 overflow-hidden bg-muted",
          isList && "aspect-square w-20 sm:w-28 sm:aspect-[5/4]",
          isDense && "aspect-[16/11] w-full",
          layout === "card" && "aspect-[16/10] w-full"
        )}
      >
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover}
            alt=""
            className="size-full object-cover transition-transform duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:scale-[1.03]"
          />
        ) : (
          <div
            className={cn(
              "flex size-full flex-col items-center justify-center bg-gradient-to-br from-muted via-muted to-muted/70",
              isList ? "gap-1" : "gap-2"
            )}
          >
            <span
              className={cn(
                "flex items-center justify-center rounded-full bg-background text-muted-foreground shadow-sm ring-1 ring-border",
                isList ? "size-8" : "size-10"
              )}
            >
              <IconSpeakerphone
                className={isList ? "size-4" : "size-5"}
                stroke={1.75}
                aria-hidden
              />
            </span>
            {!isList ? (
              <span className="text-[10px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
                CampusCare
              </span>
            ) : null}
          </div>
        )}
        {imageCount > 1 ? (
          <span className="absolute right-1.5 bottom-1.5 inline-flex items-center gap-1 rounded-md bg-background/90 px-1.5 py-0.5 text-[10px] font-medium text-foreground shadow-sm backdrop-blur">
            <IconPhoto className="size-3 opacity-80" aria-hidden />
            {imageCount}
          </span>
        ) : null}
      </div>
      <div
        className={cn(
          "flex min-w-0 flex-1 flex-col",
          isList ? "justify-center gap-1 px-3 py-2.5" : "gap-2 p-3.5",
          isDense && "gap-1.5 p-3"
        )}
      >
        <div className="flex flex-wrap items-center gap-1.5">
          <MetaChip icon={IconUsers} label={announcement.audience} />
          {!isList ? (
            <MetaChip icon={IconCalendarEvent} label={dateLabel} />
          ) : (
            <span className="text-[11px] text-muted-foreground">{dateLabel}</span>
          )}
        </div>
        <h3
          className={cn(
            "font-semibold tracking-tight text-foreground transition-colors duration-150 group-hover:text-primary",
            isList || isDense
              ? "line-clamp-1 text-sm"
              : "line-clamp-2 text-base text-balance"
          )}
        >
          {announcement.title}
        </h3>
        {excerpt && !isList ? (
          <p
            className={cn(
              "text-pretty text-muted-foreground",
              isDense
                ? "line-clamp-2 text-xs leading-relaxed"
                : "line-clamp-3 text-sm leading-relaxed"
            )}
          >
            {excerpt}
          </p>
        ) : null}
        {excerpt && isList ? (
          <p className="line-clamp-1 text-xs text-muted-foreground">{excerpt}</p>
        ) : null}
      </div>
    </button>
  )
}
