import { IconAdjustmentsHorizontal, IconSearch } from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type SearchFilterBarProps = {
  searchPlaceholder?: string
}

export function SearchFilterBar({
  searchPlaceholder = "Search records, requests, or patients...",
}: SearchFilterBarProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative w-full max-w-xl">
        <IconSearch className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" placeholder={searchPlaceholder} />
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline">
          <IconAdjustmentsHorizontal data-icon="inline-start" />
          Filters
        </Button>
        <Button>New Entry</Button>
      </div>
    </div>
  )
}
