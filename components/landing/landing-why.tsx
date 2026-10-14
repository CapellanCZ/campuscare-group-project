import { WhyPoints } from "@/components/landing/why-points"

/** Why Us — split lead + icon charter (richer than plain type, not a Claude card grid). */
export function LandingWhy() {
  return (
    <section
      id="why-us"
      className="scroll-mt-20 border-b border-slate-200/80 bg-slate-50/70"
    >
      <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 sm:py-16 md:py-24">
        <WhyPoints />
      </div>
    </section>
  )
}
