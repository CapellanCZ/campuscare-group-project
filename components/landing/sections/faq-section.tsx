import { IconChevronDown } from "@tabler/icons-react"

import { FadeIn } from "@/components/landing/fade-in"
import { SectionHeading } from "@/components/landing/section-heading"
import { faqs } from "@/lib/landing/content"

export function FaqSection() {
  return (
    <section id="faq" className="landing-band px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-5xl">
        <FadeIn>
          <SectionHeading
            centered
            eyebrow="Frequently Asked Questions"
            title="Answers about CampusCare"
            description="Common questions from users and administrators before onboarding to the platform."
          />
        </FadeIn>

        <div className="mt-10 space-y-3">
          {faqs.map((faq, index) => (
            <FadeIn key={faq.question} delay={index * 0.04}>
              <details className="landing-card group rounded-2xl border p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-sky-300">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-left text-sm font-semibold text-slate-900">
                  {faq.question}
                  <IconChevronDown className="size-4 text-[#2563EB] transition-transform group-open:rotate-180" />
                </summary>
                <p className="mt-3 text-sm leading-7 text-slate-700">{faq.answer}</p>
              </details>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  )
}
