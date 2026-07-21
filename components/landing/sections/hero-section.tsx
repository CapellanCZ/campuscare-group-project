import Link from "next/link"
import { IconArrowRight, IconCheck } from "@tabler/icons-react"

import { buttonVariants } from "@/components/ui/button"
import { FadeIn } from "@/components/landing/fade-in"
import { PlaceholderFrame } from "@/components/landing/placeholder-frame"
import { heroHighlights } from "@/lib/landing/content"
import { cn } from "@/lib/utils"

export function HeroSection() {
  return (
    <section
      id="home"
      className="relative overflow-hidden px-4 pt-16 pb-16 sm:px-6 lg:px-8 lg:pt-20 lg:pb-20"
    >
      <div className="hero-glow pointer-events-none absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-sky-200/70 via-blue-100/40 to-transparent" />
      <div className="hero-orb pointer-events-none absolute -top-24 -right-10 h-72 w-72 rounded-full bg-sky-300/50 blur-3xl" />
      <div className="hero-orb-alt pointer-events-none absolute top-20 -left-20 h-60 w-60 rounded-full bg-blue-400/35 blur-3xl" />
      <div className="hero-orb-slow pointer-events-none absolute bottom-0 right-[16%] h-52 w-52 rounded-full bg-cyan-300/45 blur-3xl" />
      <div className="hero-dot pointer-events-none absolute top-28 right-[32%] h-2.5 w-2.5 rounded-full bg-sky-500" />
      <div className="hero-dot pointer-events-none absolute top-40 right-[12%] h-3 w-3 rounded-full bg-[#2563EB]/80 [animation-delay:.9s]" />

      <div className="relative mx-auto grid w-full max-w-7xl gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <FadeIn>
          <div>
            <p className="text-xs font-semibold tracking-[0.16em] text-[#2563EB] uppercase">
              CampusCare
            </p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
              Keep HSO operations organized, responsive, and service-ready
            </h1>
            <p className="mt-5 max-w-xl text-base leading-8 text-slate-700">
              CampusCare helps Health Services Office personnel coordinate
              consultations, patient records, certificates, and clinic workflows
              through one structured platform built for daily operational use.
            </p>
            <ul className="mt-6 space-y-2">
              {heroHighlights.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-slate-700">
                  <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-sky-100 text-[#2563EB]">
                    <IconCheck className="size-3.5" aria-hidden />
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="#about"
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "rounded-xl bg-[#2563EB] px-6 text-white shadow-[0_12px_28px_-12px_rgba(37,99,235,0.65)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-blue-700"
                )}
              >
                Learn More
                <IconArrowRight data-icon="inline-end" />
              </Link>
              <Link
                href="/login"
                className={cn(
                  buttonVariants({ size: "lg", variant: "outline" }),
                  "rounded-xl border-sky-200 bg-white/80 px-6 text-slate-800 transition-all duration-300 hover:-translate-y-0.5 hover:border-sky-300 hover:bg-sky-50"
                )}
              >
                Login
              </Link>
            </div>
          </div>
        </FadeIn>

        <FadeIn delay={0.08}>
          <PlaceholderFrame
            title="HSO Operations Overview"
            subtitle="Consultations, queue status, and patient service tracking"
          />
        </FadeIn>
      </div>
    </section>
  )
}
