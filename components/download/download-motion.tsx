"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { motion } from "motion/react"
import { IconDownload } from "@tabler/icons-react"

import { DownloadQrPanel } from "@/components/download/download-qr-card"
import { useMotionReady } from "@/components/landing/use-motion-ready"
import { Button } from "@/components/ui/button"
import { siteRoutes } from "@/lib/site/routes"

const ease = [0.22, 1, 0.36, 1] as const

const steps = [
  "Scan the code with your phone camera.",
  "Install CampusCare when prompted by Android.",
  "Sign in with your campus email when invited.",
] as const

type DownloadMotionProps = {
  /** Absolute APK/app URL, or null when not configured. */
  apkUrl: string | null
}

/** Animated download page body — QR + CTA share the same configured URL. */
export function DownloadMotion({ apkUrl }: DownloadMotionProps) {
  const { allowMotion } = useMotionReady()
  const ready = Boolean(apkUrl)

  return (
    <div className="relative mx-auto flex w-full max-w-lg flex-col items-center px-4 py-12 text-center sm:px-6 sm:py-16 md:py-20">
      <MotionBlock allowMotion={allowMotion} delay={0}>
        <h1 className="text-balance text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl md:text-4xl">
          Download CampusCare
        </h1>
        <p className="mt-3 max-w-sm text-pretty text-sm text-slate-600 sm:text-base md:text-lg">
          Android app for NU Dasmariñas students and faculty.
        </p>
      </MotionBlock>

      <motion.div
        className="mt-10 w-full"
        initial={allowMotion ? { opacity: 0, scale: 0.9, y: 18 } : false}
        animate={allowMotion ? { opacity: 1, scale: 1, y: 0 } : undefined}
        transition={{ duration: 0.55, delay: 0.12, ease }}
      >
        <motion.div
          animate={allowMotion ? { y: [0, -7, 0] } : undefined}
          transition={
            allowMotion
              ? {
                  duration: 4.8,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 0.6,
                }
              : undefined
          }
        >
          <DownloadQrPanel
            downloadUrl={apkUrl}
            caption={
              ready
                ? "Point your camera here"
                : "Preview code · APK coming soon"
            }
          />
        </motion.div>
      </motion.div>

      <MotionBlock allowMotion={allowMotion} delay={0.22} className="mt-8 w-full">
        <div className="flex w-full flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-center">
          {ready && apkUrl ? (
            <Button
              size="lg"
              className="h-11 w-full rounded-full bg-blue-600 px-7 text-base hover:bg-blue-700 sm:h-12 sm:w-auto"
              render={
                <a href={apkUrl} target="_blank" rel="noopener noreferrer" />
              }
              nativeButton={false}
            >
              <IconDownload data-icon="inline-start" className="size-4" />
              Download APK
            </Button>
          ) : (
            <Button
              size="lg"
              disabled
              className="h-11 w-full rounded-full bg-blue-600 px-7 text-base opacity-60 sm:h-12 sm:w-auto"
            >
              APK coming soon
            </Button>
          )}
          <Button
            size="lg"
            variant="outline"
            className="h-11 w-full rounded-full border-slate-200 bg-white text-base text-slate-800 hover:bg-slate-50 sm:h-12 sm:w-auto"
            render={<Link href={siteRoutes.home} />}
            nativeButton={false}
          >
            Back to home
          </Button>
        </div>
      </MotionBlock>

      <ol className="mt-10 w-full max-w-md space-y-3 px-1 text-left text-sm text-slate-600 sm:mt-12">
        {steps.map((step, index) => (
          <motion.li
            key={step}
            className="flex gap-3"
            initial={allowMotion ? { opacity: 0, y: 8 } : false}
            animate={allowMotion ? { opacity: 1, y: 0 } : undefined}
            transition={{
              duration: 0.4,
              delay: 0.32 + index * 0.08,
              ease,
            }}
          >
            <span className="font-semibold text-blue-600">{index + 1}</span>
            <span className="text-pretty">{step}</span>
          </motion.li>
        ))}
      </ol>
    </div>
  )
}

function MotionBlock({
  children,
  allowMotion,
  delay,
  className,
}: {
  children: ReactNode
  allowMotion: boolean
  delay: number
  className?: string
}) {
  if (!allowMotion) {
    return <div className={className}>{children}</div>
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease }}
    >
      {children}
    </motion.div>
  )
}
