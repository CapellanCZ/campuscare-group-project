import Link from "next/link"

import { LandingLogo } from "@/components/landing/landing-logo"
import { Button } from "@/components/ui/button"
import { siteRoutes } from "@/lib/site/routes"

/** Slim sticky chrome matching the landing nav — no scrollspy on this page. */
export function DownloadHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 backdrop-blur-xl">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:h-16 sm:max-w-7xl sm:px-6 lg:px-8">
        <Link
          href={siteRoutes.home}
          className="inline-flex items-center gap-2 font-semibold tracking-tight text-slate-900 transition-opacity hover:opacity-90"
          aria-label="CampusCare home"
        >
          <LandingLogo priority className="h-8 w-auto sm:h-9" />
        </Link>
        <div className="flex items-center gap-2 sm:gap-3">
          <Button
            size="sm"
            variant="outline"
            className="hidden rounded-full border-slate-200 bg-white text-slate-800 hover:bg-slate-50 sm:inline-flex"
            render={<Link href={siteRoutes.home} />}
            nativeButton={false}
          >
            Home
          </Button>
          <Button
            size="sm"
            className="rounded-full bg-blue-600 px-4 hover:bg-blue-700"
            render={<Link href={siteRoutes.login} />}
            nativeButton={false}
          >
            Access Portal
          </Button>
        </div>
      </div>
    </header>
  )
}
