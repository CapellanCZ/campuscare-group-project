"use client"

import Link from "next/link"
import { motion } from "motion/react"
import { IconArrowRight } from "@tabler/icons-react"

import { FakeQr } from "@/components/landing/fake-qr"
import { useMotionReady } from "@/components/landing/use-motion-ready"
import { Button } from "@/components/ui/button"
import { siteRoutes } from "@/lib/site/routes"

const ease = [0.22, 1, 0.36, 1] as const

/** Landing QR band — copy + QR enter with light motion. */
export function LandingMobileApp() {
  const { allowMotion } = useMotionReady()

  return (
    <section
      id="mobile-app"
      className="scroll-mt-20 border-b border-slate-200/80 bg-[linear-gradient(180deg,rgba(239,246,255,0.9)_0%,rgba(255,255,255,1)_100%)]"
    >
      <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-10 px-4 py-14 text-center sm:px-6 sm:py-16 md:py-20 lg:flex-row lg:items-center lg:gap-16 lg:px-8 lg:text-left">
        <motion.div
          className="min-w-0 flex-1"
          initial={allowMotion ? { opacity: 0, y: 20 } : false}
          whileInView={allowMotion ? { opacity: 1, y: 0 } : undefined}
          viewport={{ once: true, amount: 0.35 }}
          transition={{ duration: 0.5, ease }}
        >
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
        </motion.div>

        <motion.figure
          className="shrink-0"
          initial={allowMotion ? { opacity: 0, scale: 0.92, y: 16 } : false}
          whileInView={allowMotion ? { opacity: 1, scale: 1, y: 0 } : undefined}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.55, delay: 0.12, ease }}
        >
          <motion.div
            className="size-44 rounded-2xl border border-slate-200/90 bg-white p-4 sm:size-52 sm:p-5"
            animate={
              allowMotion
                ? { y: [0, -6, 0] }
                : undefined
            }
            transition={
              allowMotion
                ? { duration: 4.5, repeat: Infinity, ease: "easeInOut" }
                : undefined
            }
          >
            <FakeQr />
          </motion.div>
          <figcaption className="mt-3 text-sm text-slate-500">
            Preview code · APK coming soon
          </figcaption>
        </motion.figure>
      </div>
    </section>
  )
}
