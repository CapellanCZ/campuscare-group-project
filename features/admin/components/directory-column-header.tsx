"use client"

import type { ReactNode } from "react"
import { IconArrowDown, IconArrowUp, IconSelector } from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

export type ColumnSortDirection = "asc" | "desc" | false

const chipClassName =
  "inline-flex h-8 items-center gap-1.5 rounded-md border-0 bg-transparent px-2.5 text-sm font-medium text-foreground shadow-none"

type DirectoryColumnHeaderProps = {
  title: string
  sortDirection?: ColumnSortDirection
  onSortAsc?: () => void
  onSortDesc?: () => void
  onClearSort?: () => void
  filterLabel?: string
  filterItems?: ReactNode
  className?: string
  align?: "start" | "end"
}

/** Static label chip — matches sortable headers (e.g. Actions). */
export function DirectoryColumnLabel({
  title,
  className,
}: {
  title: string
  className?: string
}) {
  return <span className={cn(chipClassName, className)}>{title}</span>
}

export function DirectoryColumnHeader({
  title,
  sortDirection = false,
  onSortAsc,
  onSortDesc,
  onClearSort,
  filterLabel = "Filter",
  filterItems,
  className,
  align = "start",
}: DirectoryColumnHeaderProps) {
  const canSort = Boolean(onSortAsc && onSortDesc)
  const hasFilter = Boolean(filterItems)

  const sortIcon =
    sortDirection === "desc" ? (
      <IconArrowDown className="size-3.5 opacity-70" aria-hidden="true" />
    ) : sortDirection === "asc" ? (
      <IconArrowUp className="size-3.5 opacity-70" aria-hidden="true" />
    ) : (
      <IconSelector className="size-3.5 opacity-60" aria-hidden="true" />
    )

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn(
              chipClassName,
              "hover:bg-muted/60 hover:text-foreground data-[popup-open]:bg-muted/60",
              className
            )}
          />
        }
      >
        <span>{title}</span>
        {sortIcon}
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-44">
        {canSort ? (
          <DropdownMenuGroup>
            <DropdownMenuLabel>Sort</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={onSortAsc}
              className={cn(sortDirection === "asc" && "bg-accent")}
            >
              <IconArrowUp aria-hidden="true" />
              Ascending
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={onSortDesc}
              className={cn(sortDirection === "desc" && "bg-accent")}
            >
              <IconArrowDown aria-hidden="true" />
              Descending
            </DropdownMenuItem>
            {sortDirection && onClearSort ? (
              <DropdownMenuItem onClick={onClearSort}>
                Clear sort
              </DropdownMenuItem>
            ) : null}
          </DropdownMenuGroup>
        ) : null}
        {canSort && hasFilter ? <DropdownMenuSeparator /> : null}
        {hasFilter ? (
          <DropdownMenuGroup>
            <DropdownMenuLabel>{filterLabel}</DropdownMenuLabel>
            {filterItems}
          </DropdownMenuGroup>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
