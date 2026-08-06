import Link from "next/link"

import { CampusCareLogo } from "@/components/campuscare-logo"
import { Button } from "@/components/ui/button"
import type { LegalDocument } from "@/lib/legal/content"

export function LegalDocumentPage({ document }: { document: LegalDocument }) {
  return (
    <div className="min-h-svh bg-background text-foreground">
      <header className="border-b border-border/80">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link
            href="/landing"
            className="flex items-center gap-2 font-semibold tracking-tight"
          >
            <CampusCareLogo
              alt="CampusCare"
              className="h-8 w-auto"
              width={48}
              height={32}
            />
            <span>CampusCare</span>
          </Link>
          <Button
            size="sm"
            variant="outline"
            render={<Link href="/landing" />}
            nativeButton={false}
          >
            Back to home
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Legal
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          {document.title}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Last updated {document.lastUpdated}
        </p>
        <p className="mt-6 text-base leading-relaxed text-muted-foreground">
          {document.intro}
        </p>

        <div className="mt-10 space-y-8">
          {document.sections.map((section) => {
            const [lead, ...rest] = section.paragraphs
            const hasBullets = Boolean(section.bullets?.length)

            return (
              <section key={section.heading} className="space-y-3">
                <h2 className="text-lg font-semibold tracking-tight">
                  {section.heading}
                </h2>
                {lead ? (
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {lead}
                  </p>
                ) : null}
                {hasBullets ? (
                  <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-muted-foreground">
                    {section.bullets!.map((bullet) => (
                      <li key={bullet}>{bullet}</li>
                    ))}
                  </ul>
                ) : null}
                {rest.map((paragraph) => (
                  <p
                    key={paragraph}
                    className="text-sm leading-relaxed text-muted-foreground"
                  >
                    {paragraph}
                  </p>
                ))}
              </section>
            )
          })}
        </div>
      </main>
    </div>
  )
}
