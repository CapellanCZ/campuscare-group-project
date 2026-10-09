"use client"

import { IconChevronDown } from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

export type PatientSelectionScope = "none" | "page" | "all"

export function PatientSelectScopeControl({
  pageCount,
  totalMatching,
  scope,
  allPageSelected,
  somePageSelected,
  selectingAll = false,
  disabled = false,
  noun = "patients",
  onSelectPage,
  onSelectAllMatching,
  onClear,
  className,
}: {
  pageCount: number
  totalMatching: number
  scope: PatientSelectionScope
  allPageSelected: boolean
  somePageSelected: boolean
  selectingAll?: boolean
  disabled?: boolean
  noun?: string
  onSelectPage: () => void
  onSelectAllMatching: () => void
  onClear: () => void
  className?: string
}) {
  const hasMoreThanPage = totalMatching > pageCount
  const checked = scope === "all" || allPageSelected

  return (
    <div className={cn("flex items-center gap-0.5", className)}>
      <Checkbox
        checked={checked}
        indeterminate={scope !== "all" && somePageSelected}
        disabled={disabled || pageCount === 0 || selectingAll}
        onCheckedChange={(value) => {
          if (value) onSelectPage()
          else onClear()
        }}
        aria-label={
          checked
            ? `Deselect ${noun}`
            : `Select ${noun} on this page`
        }
      />
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              className="size-6 text-muted-foreground"
              disabled={disabled || pageCount === 0 || selectingAll}
              aria-label={`Selection options for ${noun}`}
            />
          }
        >
          <IconChevronDown className="size-3.5" aria-hidden />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-56">
          <DropdownMenuItem
            onClick={onSelectPage}
            disabled={pageCount === 0}
          >
            Select this page
            <span className="ml-auto tabular-nums text-muted-foreground">
              {pageCount}
            </span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={onSelectAllMatching}
            disabled={totalMatching === 0 || selectingAll || !hasMoreThanPage}
          >
            {selectingAll ? "Selecting all…" : "Select all matching"}
            <span className="ml-auto tabular-nums text-muted-foreground">
              {totalMatching}
            </span>
          </DropdownMenuItem>
          {scope !== "none" || somePageSelected || allPageSelected ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onClear}>Clear selection</DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

export function PatientSelectAllBanner({
  pageCount,
  totalMatching,
  scope,
  selectingAll = false,
  noun = "patients",
  onSelectAllMatching,
  onClear,
}: {
  pageCount: number
  totalMatching: number
  scope: PatientSelectionScope
  selectingAll?: boolean
  noun?: string
  onSelectAllMatching: () => void
  onClear: () => void
}) {
  if (scope === "all") {
    return (
      <div className="border-b bg-muted/20 px-(--card-spacing) py-2 text-center text-sm">
        All{" "}
        <span className="font-medium tabular-nums">{totalMatching}</span> matching{" "}
        {noun} are selected.{" "}
        <button
          type="button"
          className="font-medium text-primary underline-offset-4 hover:underline"
          onClick={onClear}
        >
          Clear selection
        </button>
      </div>
    )
  }

  if (scope !== "page" || totalMatching <= pageCount) return null

  return (
    <div className="border-b bg-muted/20 px-(--card-spacing) py-2 text-center text-sm">
      All{" "}
      <span className="font-medium tabular-nums">{pageCount}</span> {noun} on
      this page are selected.{" "}
      <button
        type="button"
        className="font-medium text-primary underline-offset-4 hover:underline disabled:opacity-50"
        disabled={selectingAll}
        onClick={onSelectAllMatching}
      >
        {selectingAll
          ? "Selecting…"
          : `Select all ${totalMatching} matching ${noun}`}
      </button>
    </div>
  )
}
