"use client"

import { Reveal, ScrollFadeSection } from "@/components/landing/motion"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { faqs } from "@/lib/landing/content"

export function LandingFaq() {
  return (
    <ScrollFadeSection
      id="faq"
      className="scroll-mt-20 border-b border-border/60 bg-muted/30"
    >
      <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-16 md:py-24">
        <div className="mx-auto max-w-2xl space-y-3 text-center">
          <Reveal>
            <p className="text-sm font-semibold tracking-wide text-primary uppercase">
              FAQ
            </p>
          </Reveal>
          <Reveal delay={0.06}>
            <h2 className="text-balance text-2xl font-bold tracking-tight text-foreground sm:text-3xl md:text-4xl">
              Frequently asked questions
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="text-pretty text-muted-foreground">
              Quick answers about clinic access, queues, certificates, and
              CampusCare accounts.
            </p>
          </Reveal>
        </div>

        <Reveal delay={0.12} className="mx-auto mt-10 max-w-2xl">
          <Accordion
            multiple={false}
            defaultValue={[faqs[0]?.id ?? "who"]}
            className="space-y-2 border-0"
          >
            {faqs.map((item) => (
              <AccordionItem
                key={item.id}
                value={item.id}
                className="rounded-lg border border-border px-3 not-last:border-b"
              >
                <AccordionTrigger className="items-center py-3 text-left text-sm font-medium hover:no-underline sm:text-base">
                  <span className="min-w-0 text-pretty">{item.question}</span>
                </AccordionTrigger>
                <AccordionContent className="pt-0 pb-4 text-pretty text-muted-foreground">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Reveal>
      </div>
    </ScrollFadeSection>
  )
}
