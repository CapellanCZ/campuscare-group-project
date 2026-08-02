"use client"

import {
  announcementCoverUrl,
  announcementExcerpt,
} from "@/features/announcements/lib/display"
import { formatAnnouncementDateTime } from "@/features/announcements/lib/format"
import { cn } from "@/lib/utils"
import type { Announcement } from "@/types/announcement"

export function AnnouncementNewsCard({
  announcement,
  onClick,
  className,
  compact = false,
}: {
  announcement: Announcement
  onClick?: () => void
  className?: string
  compact?: boolean
}) {
  const cover = announcementCoverUrl(announcement)
  const dateLabel = formatAnnouncementDateTime(
    announcement.publishedAt ?? announcement.updatedAt
  )
  const excerpt = announcementExcerpt(
    announcement.body,
    compact ? 90 : 140
  )

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group flex w-full flex-col overflow-hidden rounded-xl border border-border/70 bg-background text-left transition-[border-color,box-shadow] hover:border-border hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        compact ? "sm:flex-row" : "",
        className
      )}
    >
      <div
        className={cn(
          "relative shrink-0 overflow-hidden bg-muted",
          compact
            ? "aspect-[16/10] w-full sm:aspect-auto sm:h-auto sm:w-28"
            : "aspect-[16/10] w-full"
        )}
      >
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover}
            alt=""
            className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex size-full items-center justify-center bg-gradient-to-br from-primary/15 via-muted to-muted">
            <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              CampusCare
            </span>
          </div>
        )}
      </div>
      <div className={cn("flex min-w-0 flex-1 flex-col gap-1 p-3", compact && "sm:py-2.5")}>
        <p className="text-[11px] text-muted-foreground">{dateLabel}</p>
        <h3
          className={cn(
            "font-semibold text-foreground group-hover:text-primary",
            compact ? "line-clamp-2 text-sm" : "line-clamp-2 text-base"
          )}
        >
          {announcement.title}
        </h3>
        {excerpt ? (
          <p
            className={cn(
              "text-muted-foreground",
              compact ? "line-clamp-2 text-xs" : "line-clamp-3 text-sm"
            )}
          >
            {excerpt}
          </p>
        ) : null}
        <p className="mt-auto pt-1 text-[11px] text-muted-foreground">
          {announcement.audience}
        </p>
      </div>
    </button>
  )
}
