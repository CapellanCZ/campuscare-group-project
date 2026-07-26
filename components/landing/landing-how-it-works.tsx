"use client"

import { useEffect, useRef, useState } from "react"
import { useInView } from "motion/react"

import { Reveal, ScrollFadeSection } from "@/components/landing/motion"
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

export function LandingHowItWorks() {
  const [activeStep, setActiveStep] = useState(1)

  return (
    <ScrollFadeSection
      id="how-it-works"
      className="scroll-mt-20 border-b border-border/60"
    >
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24">
        <div className="mx-auto max-w-2xl space-y-3 text-center">
          <Reveal>
            <p className="text-sm font-semibold tracking-wide text-primary uppercase">
              How it works
            </p>
          </Reveal>
          <Reveal delay={0.06}>
            <h2 className="text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
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

        <Reveal delay={0.12} className="mt-12 min-w-0">
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
        </Reveal>
      </div>
    </ScrollFadeSection>
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
  const inView = useInView(ref, { amount: 0.55 })

  useEffect(() => {
    if (inView) onActive(step)
  }, [inView, onActive, step])

  return (
    <TimelineItem ref={ref} step={step}>
      <TimelineHeader>
        <TimelineSeparator />
        <TimelineDate>{label}</TimelineDate>
        <TimelineTitle>{title}</TimelineTitle>
        <TimelineIndicator />
      </TimelineHeader>
      <TimelineContent>{description}</TimelineContent>
    </TimelineItem>
  )
}
