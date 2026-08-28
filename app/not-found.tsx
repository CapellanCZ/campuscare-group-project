import Link from "next/link"

import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/**
 * Custom 404 — avoids Next.js default inline <style> tag that dark-mode
 * browser extensions mutate before hydration (native-dark-class-modified).
 */
export default function NotFound() {
  return (
    <div
      suppressHydrationWarning
      className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-6 py-16 text-center"
    >
      <p className="text-5xl font-semibold tracking-tight text-foreground">404</p>
      <div className="max-w-md space-y-2">
        <h1 className="text-lg font-semibold text-foreground">Page not found</h1>
        <p className="text-sm text-muted-foreground">
          This page does not exist, or the visit link may be invalid or no
          longer available.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <Link href="/" className={cn(buttonVariants({ variant: "outline" }))}>
          Home
        </Link>
        <Link
          href="/dentist/queue"
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          Dentist queue
        </Link>
      </div>
    </div>
  )
}
