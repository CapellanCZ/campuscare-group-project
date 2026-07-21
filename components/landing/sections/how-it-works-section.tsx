import { consultationSteps } from "@/lib/landing/content"
import { FadeIn } from "@/components/landing/fade-in"
import { SectionHeading } from "@/components/landing/section-heading"

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="landing-band px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-7xl">
        <FadeIn>
          <SectionHeading
            eyebrow="How It Works"
            title="From request to care in five simple steps"
            description="CampusCare guides each consultation through a clear process so users and HSO personnel always know what comes next."
          />
        </FadeIn>

        <ol className="mt-10 grid gap-4 lg:grid-cols-5">
          {consultationSteps.map((step, index) => (
            <FadeIn key={step.title} delay={index * 0.05}>
              <li className="landing-card rounded-2xl border p-5 transition-all duration-300 hover:-translate-y-1 hover:border-sky-300">
                <p className="text-xs font-semibold tracking-wide text-[#2563EB] uppercase">
                  Step {index + 1}
                </p>
                <h3 className="mt-2 text-sm font-semibold text-slate-900">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-700">{step.description}</p>
              </li>
            </FadeIn>
          ))}
        </ol>
      </div>
    </section>
  )
}
