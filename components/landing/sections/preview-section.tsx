import { FadeIn } from "@/components/landing/fade-in"
import { PlaceholderFrame } from "@/components/landing/placeholder-frame"
import { SectionHeading } from "@/components/landing/section-heading"

export function PreviewSection() {
  return (
    <section className="bg-white px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-7xl">
        <FadeIn>
          <SectionHeading
            eyebrow="System Preview"
            title="Built for web and mobile workflows"
            description="These placeholders represent where final CampusCare screenshots can be dropped in as soon as your production UI is ready."
          />
        </FadeIn>

        <div className="mt-10 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <FadeIn>
            <PlaceholderFrame
              title="Web App Preview"
              subtitle="Admin and HSO dashboard view placeholder"
            />
          </FadeIn>
          <FadeIn delay={0.08}>
            <PlaceholderFrame
              title="Mobile App Preview"
              subtitle="Student and employee mobile experience placeholder"
              className="mx-auto w-full max-w-sm"
            />
          </FadeIn>
        </div>
      </div>
    </section>
  )
}
