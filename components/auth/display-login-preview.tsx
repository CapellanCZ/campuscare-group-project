"use client"

import { useEffect, useId, useState } from "react"
import {
  IconChevronLeft,
  IconChevronRight,
  IconMail,
  IconMapPin,
  IconPhone,
  IconPlus,
  IconTicket,
} from "@tabler/icons-react"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"

import Image from "next/image"

import { footerContact } from "@/lib/landing/content"
import { cn } from "@/lib/utils"

type PreviewSlide = {
  id: "serving" | "stations" | "live"
  title: string
  description: string
  metricLabel: string
  metricValue: string
  ringCenter: string
  ringCaption: string
  actionTitle: string
  actionHint: string
}

const slides: PreviewSlide[] = [
  {
    id: "serving",
    title: "Now serving",
    description:
      "Patients read the called ticket from across the waiting room.",
    metricLabel: "Now serving",
    metricValue: "M-014",
    ringCenter: "M-014",
    ringCaption: "Physician",
    actionTitle: "Open display",
    actionHint: "Waiting room TV",
  },
  {
    id: "stations",
    title: "All stations",
    description:
      "Nurse, physician, and dental lanes share one calm board.",
    metricLabel: "Waiting",
    metricValue: "12",
    ringCenter: "3",
    ringCaption: "Stations",
    actionTitle: "Station board",
    actionHint: "3 lanes live",
  },
  {
    id: "live",
    title: "Always current",
    description:
      "When staff call the next ticket, the TV updates on its own.",
    metricLabel: "Calling",
    metricValue: "M-014",
    ringCenter: "Live",
    ringCaption: "Synced",
    actionTitle: "Live board",
    actionHint: "No manual refresh",
  },
]

/**
 * Soft, slidable queue-display preview for the display login panel.
 * Decorative only — not live clinic data.
 */
export function DisplayLoginPreview() {
  const labelId = useId()
  const reduceMotion = useReducedMotion()
  const [index, setIndex] = useState(0)
  const slide = slides[index]!

  useEffect(() => {
    if (reduceMotion) return
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % slides.length)
    }, 5600)
    return () => window.clearInterval(timer)
  }, [reduceMotion, index])

  function go(delta: number) {
    setIndex((current) => (current + delta + slides.length) % slides.length)
  }

  return (
    <aside className="relative hidden min-h-screen flex-col overflow-hidden bg-[#EEF2F6] lg:flex">
      <div className="relative z-10 flex flex-1 flex-col px-12 py-11 xl:px-16">
        <div className="flex items-center gap-2.5">
          <Image
            src="/images/logo.png"
            alt=""
            width={40}
            height={21}
            unoptimized
            className="h-7 w-auto object-contain"
          />
          <span className="text-lg font-bold tracking-tight text-slate-900">
            CampusCare
          </span>
        </div>

        <div
          role="region"
          aria-roledescription="carousel"
          aria-labelledby={labelId}
          className="flex flex-1 flex-col justify-center"
        >
          <div className="relative mx-auto h-[16.5rem] w-[17.75rem]">
            <AnimatePresence mode="wait">
              <motion.div
                key={slide.id}
                initial={reduceMotion ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={reduceMotion ? undefined : { opacity: 0 }}
                transition={{ duration: 0.22 }}
                className="absolute inset-0"
              >
                <SlideCluster slide={slide} />
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="mx-auto mt-10 max-w-[18rem] text-center">
            <h2
              id={labelId}
              className="text-[1.65rem] font-bold tracking-tight text-slate-900"
            >
              {slide.title}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">
              {slide.description}
            </p>
          </div>

          <div className="mt-7 flex items-center justify-center gap-2.5">
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Previous preview"
              className="flex size-8 items-center justify-center rounded-full text-slate-400 transition-colors hover:text-slate-700"
            >
              <IconChevronLeft className="size-4" stroke={2} aria-hidden />
            </button>
            <div className="flex items-center gap-1.5" role="tablist">
              {slides.map((item, i) => (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={i === index}
                  aria-label={`Show ${item.title}`}
                  onClick={() => setIndex(i)}
                  className={cn(
                    "size-1.5 rounded-full transition-colors",
                    i === index ? "bg-slate-800" : "bg-slate-300"
                  )}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Next preview"
              className="flex size-8 items-center justify-center rounded-full text-slate-400 transition-colors hover:text-slate-700"
            >
              <IconChevronRight className="size-4" stroke={2} aria-hidden />
            </button>
          </div>
        </div>

        <div className="pt-2">
          <div className="mb-2 flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-300/70" />
            <p className="text-[0.65rem] font-semibold tracking-[0.14em] text-slate-400 uppercase">
              Health Services Office
            </p>
            <div className="h-px flex-1 bg-slate-300/70" />
          </div>
          <ul className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-slate-500">
            <li>
              <a
                href={`mailto:${footerContact.email}`}
                className="inline-flex items-center gap-1.5 hover:text-blue-600"
              >
                <IconMail className="size-3.5" stroke={1.75} aria-hidden />
                {footerContact.email}
              </a>
            </li>
            <li>
              <a
                href={`tel:${footerContact.phoneTel}`}
                className="inline-flex items-center gap-1.5 hover:text-blue-600"
              >
                <IconPhone className="size-3.5" stroke={1.75} aria-hidden />
                {footerContact.phone}
              </a>
            </li>
            <li>
              <a
                href={footerContact.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 hover:text-blue-600"
              >
                <IconMapPin className="size-3.5" stroke={1.75} aria-hidden />
                5F HSO
              </a>
            </li>
          </ul>
        </div>
      </div>
    </aside>
  )
}

/**
 * FINOTIC placement: upright cards, soft shadow, tight overlap.
 * Top-left metric → right hero (front) → bottom-left dashed action.
 */
function SlideCluster({ slide }: { slide: PreviewSlide }) {
  return (
    <>
      {/* Top-left metric */}
      <div className="absolute top-0 left-0 z-10 w-[9.25rem] rounded-[1.35rem] bg-white px-4 pt-3.5 pb-4 shadow-[0_10px_30px_rgba(15,23,42,0.08)]">
        <span className="mb-3 flex size-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
          <IconTicket className="size-3.5" stroke={1.75} aria-hidden />
        </span>
        <p className="text-[0.6rem] font-semibold tracking-[0.14em] text-slate-400 uppercase">
          {slide.metricLabel}
        </p>
        <p className="mt-1 text-[1.55rem] leading-none font-bold tabular-nums text-blue-600">
          {slide.metricValue}
        </p>
      </div>

      {/* Right hero — overlaps both */}
      <div className="absolute top-[2.6rem] left-[7.35rem] z-30 flex size-[10.5rem] items-center justify-center rounded-[1.35rem] bg-white shadow-[0_16px_40px_rgba(15,23,42,0.12)]">
        <div
          className="relative size-[7.25rem] rounded-full"
          style={{
            background:
              "conic-gradient(#2563eb 0 34%, #fb923c 34% 55%, #34d399 55% 78%, #f87171 78% 100%)",
          }}
          aria-hidden
        >
          <div className="absolute inset-[1.05rem] flex flex-col items-center justify-center rounded-full bg-white">
            <span className="text-lg font-bold tracking-tight text-slate-900 tabular-nums">
              {slide.ringCenter}
            </span>
            <span className="text-[0.65rem] font-medium text-slate-400">
              {slide.ringCaption}
            </span>
          </div>
        </div>
      </div>

      {/* Bottom-left dashed action */}
      <div className="absolute top-[9.35rem] left-1.5 z-20 w-[9.75rem] rounded-[1.35rem] border-[1.5px] border-dashed border-slate-300/90 bg-white/70 px-4 py-3.5 backdrop-blur-[2px]">
        <span className="mb-2.5 flex size-7 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm shadow-blue-600/30">
          <IconPlus className="size-3.5" stroke={2.5} aria-hidden />
        </span>
        <p className="text-[0.85rem] leading-tight font-semibold text-slate-800">
          {slide.actionTitle}
        </p>
        <p className="mt-0.5 text-[0.7rem] text-emerald-600">
          {slide.actionHint}
        </p>
      </div>
    </>
  )
}
