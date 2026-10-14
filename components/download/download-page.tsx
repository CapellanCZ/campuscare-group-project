import Link from "next/link"
import { IconDownload } from "@tabler/icons-react"

import { DownloadHeader } from "@/components/download/download-header"
import { DownloadQrPanel } from "@/components/download/download-qr-card"
import { LandingFooter } from "@/components/landing/landing-footer"
import { Button } from "@/components/ui/button"
import { getAndroidApkUrl } from "@/lib/download/apk"
import { siteRoutes } from "@/lib/site/routes"

/**
 * Single-focus download handoff — centered QR, short copy, one primary action.
 * Matches landing type/color; no chip stacks or multi-section marketing dump.
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

        <div className="relative mx-auto flex w-full max-w-lg flex-col items-center px-4 py-16 text-center sm:px-6 sm:py-20">
          <h1 className="text-balance text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Download CampusCare
          </h1>
          <p className="mt-3 max-w-sm text-pretty text-base text-slate-600 sm:text-lg">
            Android app for NU Dasmariñas students and faculty.
          </p>

          <div className="mt-10 w-full">
            <DownloadQrPanel caption="Preview code · APK coming soon" />
          </div>

          <div className="mt-8 flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:items-center">
            <Button
              size="lg"
              className="h-12 rounded-full bg-blue-600 px-7 text-base hover:bg-blue-700"
              render={<a href={apkUrl} download />}
              nativeButton={false}
            >
              <IconDownload data-icon="inline-start" className="size-4" />
              Download APK
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-12 rounded-full border-slate-200 bg-white text-base text-slate-800 hover:bg-slate-50"
              render={<Link href={siteRoutes.home} />}
              nativeButton={false}
            >
              Back to home
            </Button>
          </div>

          <ol className="mt-12 w-full max-w-md space-y-3 text-left text-sm text-slate-600">
            <li className="flex gap-3">
              <span className="font-semibold text-blue-600">1</span>
              <span>Scan the code with your phone camera.</span>
            </li>
            <li className="flex gap-3">
              <span className="font-semibold text-blue-600">2</span>
              <span>Install CampusCare when prompted by Android.</span>
            </li>
            <li className="flex gap-3">
              <span className="font-semibold text-blue-600">3</span>
              <span>Sign in with your campus email when invited.</span>
            </li>
          </ol>
        </div>
      </main>

      <LandingFooter />
    </div>
  )
}
