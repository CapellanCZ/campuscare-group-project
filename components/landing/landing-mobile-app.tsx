"use client"

import { motion } from "motion/react"

import { GoQrImage } from "@/components/download/go-qr-image"
import { FakeQr } from "@/components/landing/fake-qr"
import { useMotionReady } from "@/components/landing/use-motion-ready"
import { getConfiguredAndroidApkUrl } from "@/lib/download/apk"

const ease = [0.22, 1, 0.36, 1] as const

/**
 * Landing QR band — scan-only. No APK download button on the landing page.
 */
export function LandingMobileApp() {
  const { allowMotion } = useMotionReady()
  const downloadUrl = getConfiguredAndroidApkUrl()
  const ready = Boolean(downloadUrl)

  return (
    <section
      id="mobile-app"
      className="scroll-mt-20 border-b border-slate-200/80 bg-[linear-gradient(180deg,rgba(239,246,255,0.9)_0%,rgba(255,255,255,1)_100%)]"
    >
      <div className="mx-auto grid w-full max-w-5xl grid-cols-1 items-center gap-8 overflow-x-clip px-4 py-10 sm:gap-10 sm:px-6 sm:py-14 md:py-20 lg:grid-cols-2 lg:gap-14 lg:px-8">
        <motion.div
          className="min-w-0 text-center lg:text-left"
          initial={allowMotion ? { opacity: 0, y: 20 } : false}
          whileInView={allowMotion ? { opacity: 1, y: 0 } : undefined}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5, ease }}
        >
          <h2 className="text-balance text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl lg:text-4xl">
            CampusCare on Android
          </h2>
          <p className="mx-auto mt-3 max-w-md text-pretty text-sm text-slate-600 sm:text-base lg:mx-0 lg:text-lg">
            For NU Dasmariñas students and faculty. Scan the QR code with your
            phone to get the CampusCare app.
          </p>
        </motion.div>

        <motion.figure
          className="mx-auto w-fit shrink-0 justify-self-center text-center lg:justify-self-end"
          initial={allowMotion ? { opacity: 0, scale: 0.92, y: 16 } : false}
          whileInView={allowMotion ? { opacity: 1, scale: 1, y: 0 } : undefined}
          viewport={{ once: true, amount: 0.35 }}
          transition={{ duration: 0.55, delay: 0.12, ease }}
        >
          <motion.div
            className="size-40 overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-3.5 sm:size-52 sm:p-5"
            animate={allowMotion ? { y: [0, -6, 0] } : undefined}
            transition={
              allowMotion
                ? { duration: 4.5, repeat: Infinity, ease: "easeInOut" }
                : undefined
            }
          >
            {ready && downloadUrl ? (
              <GoQrImage data={downloadUrl} />
            ) : (
              <FakeQr />
            )}
          </motion.div>
          <figcaption className="mt-3 text-sm text-slate-500">
            {ready
              ? "Scan to download CampusCare"
              : "Preview code · APK coming soon"}
          </figcaption>
        </motion.figure>
      </div>
    </section>
  )
}
