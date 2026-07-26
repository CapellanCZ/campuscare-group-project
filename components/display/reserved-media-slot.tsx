import { Card, CardContent } from "@/components/ui/card"

export function ReservedMediaSlot() {
  return (
    <section
      aria-label="Reserved announcement space"
      className="grid grid-cols-1 gap-3 md:grid-cols-3"
    >
      {[
        "Health announcements",
        "Emergency notices",
        "Health campaign posters",
      ].map((label) => (
        <Card
          key={label}
          className="border-dashed shadow-none dark:ring-0"
        >
          <CardContent className="flex min-h-24 items-center justify-center px-4 py-6 text-center text-sm text-muted-foreground">
            Reserved · {label}
          </CardContent>
        </Card>
      ))}
    </section>
  )
}
