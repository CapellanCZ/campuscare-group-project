import { ScrollRevealLine } from "@/components/landing/scroll-reveal-line"

type SectionHeadingProps = {
  eyebrow?: string
  title: string
  description: string
  centered?: boolean
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  centered = false,
}: SectionHeadingProps) {
  return (
    <header className={centered ? "mx-auto max-w-3xl text-center" : "max-w-3xl"}>
      {eyebrow ? (
        <p className="text-xs font-semibold tracking-[0.16em] text-[#2563EB] uppercase">
          {eyebrow}
        </p>
      ) : null}
      <h2 className="mt-2 text-2xl font-semibold text-slate-900 sm:text-3xl">
        {title}
      </h2>
      <ScrollRevealLine centered={centered} />
      <p className="mt-3 text-sm leading-7 text-slate-600 sm:text-base">
        {description}
      </p>
    </header>
  )
}
