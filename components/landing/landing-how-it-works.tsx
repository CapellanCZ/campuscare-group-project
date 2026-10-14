"use client"

import { useEffect, useRef, useState } from "react"
import { motion, useInView } from "motion/react"

import { Reveal } from "@/components/landing/motion"
import { useMotionReady } from "@/components/landing/use-motion-ready"
import {
  Timeline,
  TimelineContent,
  TimelineDate,
  TimelineHeader,
  TimelineIndicator,
  TimelineItem,
  TimelineSeparator,
  TimelineTitle,
} from "@/components/reui/timeline"
import { howItWorksSteps } from "@/lib/landing/content"

const easeOut = [0.22, 1, 0.36, 1] as const

export function LandingHowItWorks() {
  const [activeStep, setActiveStep] = useState(1)

  return (
    <section
      id="how-it-works"
      className="scroll-mt-20 border-b border-border/60"
    >
      <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-16 md:py-24">
        <div className="mx-auto max-w-2xl space-y-3 text-center">
          <Reveal>
            <p className="text-sm font-semibold tracking-wide text-primary uppercase">
              How it works
            </p>
          </Reveal>
          <Reveal delay={0.06}>
            <h2 className="text-balance text-2xl font-bold tracking-tight text-foreground sm:text-3xl md:text-4xl">
              From request to completed consultation
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="text-pretty text-muted-foreground">
              A clear five-step path that keeps patients informed and clinic
              staff focused on care.
            </p>
          </Reveal>
        </div>

        <div className="mt-12 min-w-0">
          <Timeline
            value={activeStep}
            onValueChange={setActiveStep}
            orientation="vertical"
            className="mx-auto w-full max-w-2xl"
          >
            {howItWorksSteps.map((item) => (
              <HowItWorksItem
                key={item.step}
                step={item.step}
                label={item.label}
                title={item.title}
                description={item.description}
                onActive={setActiveStep}
              />
            ))}
          </Timeline>
        </div>
      </div>
    </section>
  )
}

function HowItWorksItem({
  step,
  label,
  title,
  description,
  onActive,
}: {
  step: number
  label: string
  title: string
  description: string
  onActive: (step: number) => void
}) {
  const ref = useRef<HTMLDivElement | null>(null)
  const inView = useInView(ref, {
    amount: 0.45,
    margin: "0px 0px -10% 0px",
  })
  const { allowMotion } = useMotionReady()

  useEffect(() => {
    if (inView) onActive(step)
  }, [inView, onActive, step])

  return (
    <TimelineItem ref={ref} step={step}>
      {allowMotion ? (
        <motion.div
          initial={{ opacity: 0, y: 26 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: false, amount: 0.35, margin: "0px 0px -8% 0px" }}
          transition={{
            duration: 0.5,
            ease: easeOut,
            delay: Math.min(0.1, (step - 1) * 0.03),
          }}
          className="flex flex-col gap-0.5"
        >
          <TimelineHeader>
            <TimelineSeparator />
            <TimelineDate>{label}</TimelineDate>
            <TimelineTitle>{title}</TimelineTitle>
            <TimelineIndicator />
          </TimelineHeader>
          <TimelineContent>{description}</TimelineContent>
        </motion.div>
      ) : (
        <>
          <TimelineHeader>
            <TimelineSeparator />
            <TimelineDate>{label}</TimelineDate>
            <TimelineTitle>{title}</TimelineTitle>
            <TimelineIndicator />
          </TimelineHeader>
          <TimelineContent>{description}</TimelineContent>
        </>
      )}
    </TimelineItem>
  )
}
