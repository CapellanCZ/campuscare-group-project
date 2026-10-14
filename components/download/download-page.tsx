import { DownloadHeader } from "@/components/download/download-header"
import { DownloadMotion } from "@/components/download/download-motion"
import { LandingFooter } from "@/components/landing/landing-footer"
import { getAndroidApkUrl } from "@/lib/download/apk"

/**
 * Single-focus download handoff — centered QR, short copy, one primary action.
 */
export function DownloadPage() {
  const apkUrl = getAndroidApkUrl()

  return (
    <div className="landing-theme flex min-h-screen w-full flex-col overflow-x-clip bg-white text-slate-900">
      <a
        href="#main-content"
        className="sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:inline-flex focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:shadow-md focus:outline-none focus:ring-2 focus:ring-ring"
      >
        Skip to main content
      </a>
      <DownloadHeader />

      <main
        id="main-content"
        className="relative flex flex-1 flex-col justify-center border-b border-slate-200/80"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(700px_360px_at_50%_0%,rgba(59,130,246,0.1),transparent_60%)]"
        />
        <DownloadMotion apkUrl={apkUrl} />
      </main>

      <LandingFooter />
    </div>
  )
}
