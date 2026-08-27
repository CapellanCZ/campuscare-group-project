"use client"

import Link from "next/link"

import { FloatingPaths } from "@/components/floating-paths"
import {
  Float,
  FloatingOrb,
  Reveal,
  TextRotator,
  scrollToId,
} from "@/components/landing/motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { heroCopy, heroRotatingPhrases } from "@/lib/landing/content"

export function LandingHero() {
  return (
    <section
      id="home"
      className="relative overflow-hidden border-b border-border/60"
    >
      <div className="absolute inset-0 opacity-40">
        <FloatingPaths position={1} />
        <FloatingPaths position={-1} />
      </div>
      <FloatingOrb className="bg-primary/15 -left-16 top-24 size-48 blur-3xl" />
      <FloatingOrb
        className="bg-primary/10 right-0 top-40 size-64 blur-3xl"
        duration={14}
      />

      <div className="relative mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 md:py-24 lg:grid-cols-2 lg:items-center lg:gap-12 lg:py-28">
        <div className="min-w-0 space-y-6">
          <Reveal>
            <p className="text-sm font-semibold tracking-wide text-primary uppercase">
              {heroCopy.brand}
            </p>
          </Reveal>
          <Reveal delay={0.08}>
            <h1 className="text-balance text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              {heroCopy.headline}
            </h1>
          </Reveal>
          <Reveal delay={0.14}>
            <TextRotator phrases={heroRotatingPhrases} />
          </Reveal>
          <Reveal delay={0.2}>
            <p className="max-w-xl text-pretty text-base text-muted-foreground sm:text-lg">
              {heroCopy.description}
            </p>
          </Reveal>
          <Reveal delay={0.26} className="flex flex-col gap-3 sm:flex-row">
            <Button
              size="lg"
              className="w-full sm:w-auto"
              onClick={() => scrollToId("about")}
            >
              Learn More
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="w-full sm:w-auto"
              render={<Link href="/login/login" />}
              nativeButton={false}
            >
              Login
            </Button>
          </Reveal>
        </div>

        <Reveal delay={0.18} className="relative min-w-0">
          <Float className="relative" duration={7} y={14}>
            <Card className="shadow-lg ring-border/20">
              <CardHeader className="border-b border-border/60">
                <CardTitle className="text-lg">Clinic queue overview</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Live mockup of CampusCare staff view
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { name: "Consultation desk", status: "3 waiting", tone: "primary" },
                  { name: "Certificate requests", status: "2 in review", tone: "muted" },
                  { name: "Announcements", status: "Vaccine drive Fri", tone: "muted" },
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
          </Float>

          <Float
            className="absolute -right-2 -bottom-4 hidden w-44 sm:block md:-right-4"
            duration={5.5}
            y={10}
          >
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
          </Float>
        </Reveal>
      </div>
    </section>
  )
}
