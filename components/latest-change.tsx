"use client"

import { useState } from "react"
import Link from "next/link"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { IconX } from "@tabler/icons-react"

const latestChange = {
  badge: "CAMPUS TIP",
  title: "Queue & records",
  description: "Keep walk-ins moving.",
  readMore: { href: "/docs", label: "Open docs" },
} as const

export function LatestChange() {
  const [isOpen, setIsOpen] = useState(true)

  if (!isOpen) {
    return null
  }

  return (
    <div
      className={cn(
        "group/latest-change size-full min-h-27 justify-center border-t",
        "relative flex size-full flex-col gap-1 overflow-hidden px-4 pt-3 pb-1 *:text-nowrap",
        "transition-opacity group-data-[collapsible=icon]:pointer-events-none group-data-[collapsible=icon]:opacity-0"
      )}
    >
      <span className="font-light font-mono text-[10px] text-muted-foreground">
        {latestChange.badge}
      </span>
      <p className="font-medium text-xs">{latestChange.title}</p>
      <span className="text-[10px] text-muted-foreground">
        {latestChange.description}
      </span>
      <Button
        className="w-max px-0 font-light text-xs"
        size="sm"
        variant="link"
        render={<Link href={latestChange.readMore.href} />}
        nativeButton={false}
      >
        {latestChange.readMore.label}
      </Button>
      <Button
        className="absolute top-2 right-2 z-10 size-6 rounded-full opacity-0 transition-opacity group-hover/latest-change:opacity-100"
        onClick={() => setIsOpen(false)}
        size="icon-sm"
        variant="ghost"
      >
        <IconX className="size-3.5 text-muted-foreground" />
      </Button>
    </div>
  )
}
