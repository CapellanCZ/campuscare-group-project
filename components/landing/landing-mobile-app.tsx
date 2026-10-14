import Link from "next/link"
import { IconArrowRight } from "@tabler/icons-react"

import { FakeQr } from "@/components/landing/fake-qr"
import { Button } from "@/components/ui/button"
import { siteRoutes } from "@/lib/site/routes"

/**
 * Calm app handoff band — QR as the only visual, no badge chrome or glow cards.
 */
export function LandingMobileApp() {
  return (
    <section
      id="mobile-app"
      className="scroll-mt-20 border-b border-slate-200/80 bg-[linear-gradient(180deg,rgba(239,246,255,0.9)_0%,rgba(255,255,255,1)_100%)]"
    >
      <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-10 px-4 py-14 text-center sm:px-6 sm:py-18 md:py-20 lg:flex-row lg:items-center lg:gap-16 lg:text-left lg:px-8">
        <div className="min-w-0 flex-1">
          <h2 className="text-balance text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            CampusCare on Android
          </h2>
          <p className="mx-auto mt-3 max-w-md text-pretty text-base text-slate-600 sm:text-lg lg:mx-0">
            For NU Dasmariñas students and faculty. Scan the code on a phone, or
            open the download page.
          </p>
          <div className="mt-8 flex justify-center lg:justify-start">
            <Button
              size="lg"
              className="h-12 rounded-full bg-blue-600 px-7 text-base hover:bg-blue-700"
              render={<Link href={siteRoutes.download} />}
              nativeButton={false}
            >
              Get the app
              <IconArrowRight data-icon="inline-end" className="size-4" />
            </Button>
          </div>
        </div>

        <figure className="shrink-0">
          <div className="size-44 rounded-2xl border border-slate-200/90 bg-white p-4 sm:size-52 sm:p-5">
            <FakeQr />
          </div>
          <figcaption className="mt-3 text-sm text-slate-500">
            Preview code · APK coming soon
          </figcaption>
        </figure>
      </div>
    </section>
  )
}
