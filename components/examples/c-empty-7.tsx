import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { IconInbox } from "@tabler/icons-react"

export function Pattern() {
  return (
    <div className="flex items-center justify-center p-4">
      <Empty className="py-16">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <IconInbox
            />
          </EmptyMedia>
          <EmptyTitle>Inbox zero</EmptyTitle>
          <EmptyDescription>
            You&apos;re all caught up. No new messages.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    </div>
  )
}