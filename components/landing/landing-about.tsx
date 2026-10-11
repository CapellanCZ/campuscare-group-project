import { aboutCopy } from "@/lib/landing/content"

/** Server-rendered About — CampusCare HSO content, reference card styling. */
export function LandingAbout() {
  return (
    <section id="about" className="scroll-mt-20 border-b border-slate-200/80 bg-white">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-16 sm:px-6 md:py-24 lg:grid-cols-2 lg:items-center lg:gap-14">
        <div className="min-w-0 space-y-4">
          <p className="text-xs font-semibold tracking-[0.16em] text-blue-600 uppercase">
            {aboutCopy.eyebrow}
          </p>
          <h2 className="text-balance text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            {aboutCopy.title}
          </h2>
          <div className="space-y-4">
            {aboutCopy.body.map((paragraph) => (
              <p
                key={paragraph.slice(0, 24)}
                className="text-pretty leading-relaxed text-slate-600"
              >
                {paragraph}
              </p>
            ))}
          </div>
        </div>

        <div className="min-w-0 rounded-3xl border border-blue-100 bg-slate-50/80 p-6 shadow-sm sm:p-7">
          <div className="rounded-2xl bg-blue-600 p-6 text-white">
            <p className="text-sm font-semibold text-blue-100">Mission</p>
            <p className="mt-2 text-base font-medium leading-relaxed">
              Accessible campus health care that keeps the Bulldog community ready
              to learn and serve.
            </p>
          </div>
          <ul className="mt-4 space-y-3 text-sm text-slate-600">
            <li className="rounded-xl border border-slate-200/80 bg-white px-4 py-3">
              Clinical consultations for students, faculty, and staff
            </li>
            <li className="rounded-xl border border-slate-200/80 bg-white px-4 py-3">
              Preventive services and health coordination
            </li>
            <li className="rounded-xl border border-slate-200/80 bg-white px-4 py-3">
              Documentation support including medical certificates
            </li>
          </ul>
        </div>
      </div>
    </section>
  )
}
