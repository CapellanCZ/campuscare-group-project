import Link from "next/link"

import { FloatingPaths } from "@/components/floating-paths"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { heroCopy, heroRotatingPhrases } from "@/lib/landing/content"
import { siteRoutes } from "@/lib/site/routes"

/**
 * Server-rendered hero — LCP headline is in the initial HTML with no client JS.
 * Decorative paths/orbs are CSS-animated; mock cards use CSS float.
 */
export function LandingHero() {
  return (
    <section
      id="home"
      className="relative overflow-hidden border-b border-border/60"
    >
      <div className="absolute inset-0 opacity-40" aria-hidden>
        <FloatingPaths position={1} />
        <FloatingPaths position={-1} />
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute -left-16 top-24 size-48 rounded-full bg-primary/15 blur-3xl motion-safe:animate-pulse"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute right-0 top-40 size-64 rounded-full bg-primary/10 blur-3xl motion-safe:animate-pulse"
      />

      <div className="relative mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 md:py-24 lg:grid-cols-2 lg:items-center lg:gap-12 lg:py-28">
        <div className="min-w-0 space-y-6">
          <p className="text-sm font-semibold tracking-wide text-primary uppercase">
            {heroCopy.brand}
          </p>
          <h1 className="text-balance text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            {heroCopy.headline}
          </h1>
          <p className="text-sm font-medium text-primary md:text-base">
            {heroRotatingPhrases[0]}
          </p>
          <p className="max-w-xl text-pretty text-base text-muted-foreground sm:text-lg">
            {heroCopy.description}
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              size="lg"
              className="w-full sm:w-auto"
              render={<Link href={siteRoutes.login} />}
              nativeButton={false}
            >
              Login
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="w-full sm:w-auto"
              render={<a href="#about" />}
              nativeButton={false}
            >
              Learn More
            </Button>
          </div>
        </div>

        <div className="relative min-w-0">
          <div className="relative motion-safe:cc-float-slow">
            <Card className="shadow-lg ring-border/20">
              <CardHeader className="border-b border-border/60">
                <CardTitle className="text-lg">Clinic queue overview</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Live mockup of CampusCare staff view
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  {
                    name: "Consultation desk",
                    status: "3 waiting",
                    tone: "primary" as const,
                  },
                  {
                    name: "Certificate requests",
                    status: "2 in review",
                    tone: "muted" as const,
                  },
                  {
                    name: "Announcements",
                    status: "Vaccine drive Fri",
                    tone: "muted" as const,
                  },
                ].map((row) => (
                  <div
                    key={row.name}
                    className="flex min-w-0 items-center justify-between gap-3 rounded-xl bg-muted/60 px-3 py-3"
                  >
                    <span className="truncate font-medium text-foreground">
                      {row.name}
                    </span>
                    <span
                      className={
                        row.tone === "primary"
                          ? "shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
                          : "shrink-0 truncate text-xs text-muted-foreground"
                      }
                    >
                      {row.status}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <div className="absolute -right-2 -bottom-4 hidden w-44 motion-safe:cc-float-fast sm:block md:-right-4">
            <Card size="sm" className="shadow-md">
              <CardContent className="space-y-1 pt-(--card-spacing)">
                <p className="text-xs font-medium text-muted-foreground">
                  Next patient
                </p>
                <p className="truncate font-semibold text-foreground">
                  Ticket A-18
                </p>
                <p className="text-xs text-primary">Ready in ~8 min</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  )
}
