import Link from "next/link"
import { IconArrowRight } from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import { ctaCopy } from "@/lib/landing/content"
import { siteRoutes } from "@/lib/site/routes"

export function LandingCta() {
  return (
    <section
      id="get-started"
      className="scroll-mt-20 border-b border-slate-200/80 bg-gradient-to-b from-blue-600 to-blue-700"
    >
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-4 py-16 text-center sm:px-6 md:py-20">
        <h2 className="max-w-2xl text-balance text-3xl font-bold tracking-tight text-white sm:text-4xl">
          {ctaCopy.title}
        </h2>
        <p className="max-w-xl text-pretty text-base text-blue-100 sm:text-lg">
          {ctaCopy.description}
        </p>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <Button
            size="lg"
            className="rounded-full bg-white px-6 text-blue-700 hover:bg-blue-50"
            render={<Link href={siteRoutes.login} />}
            nativeButton={false}
          >
            {ctaCopy.primaryCta}
            <IconArrowRight data-icon="inline-end" className="size-4" />
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="rounded-full border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white"
            render={<Link href={siteRoutes.login} />}
            nativeButton={false}
          >
            {ctaCopy.secondaryCta}
          </Button>
        </div>
      </div>
    </section>
  )
}
