import { IconAlertTriangle, IconDatabaseOff } from "@tabler/icons-react"

import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"

type StateBlockProps =
  | { state: "loading" }
  | { state: "empty"; title: string; description: string }
  | { state: "error"; title: string; description: string }

export function StateBlock(props: StateBlockProps) {
  if (props.state === "loading") {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    )
  }

  if (props.state === "error") {
    return (
      <Empty className="border border-destructive/30 bg-destructive/5">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <IconAlertTriangle />
          </EmptyMedia>
          <EmptyTitle>{props.title}</EmptyTitle>
          <EmptyDescription>{props.description}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <Empty className="border border-dashed border-border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <IconDatabaseOff />
        </EmptyMedia>
        <EmptyTitle>{props.title}</EmptyTitle>
        <EmptyDescription>{props.description}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent />
    </Empty>
  )
}
