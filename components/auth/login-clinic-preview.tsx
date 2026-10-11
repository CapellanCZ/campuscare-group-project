import { LoginPreviewCarousel } from "@/components/auth/login-preview-carousel"

/**
 * Decorative clinic workspace preview for the login panel.
 * Static demo carousel only — does not call APIs or invent live metrics.
 */
export function LoginClinicPreview() {
  return (
    <div className="relative flex h-full min-h-[28rem] flex-col justify-between overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-blue-700 to-sky-700 p-6 text-white shadow-2xl sm:p-8 lg:min-h-0 lg:rounded-none lg:bg-transparent lg:p-10 lg:shadow-none">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-30 lg:opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.25), transparent 45%), radial-gradient(circle at 80% 0%, rgba(125,211,252,0.35), transparent 40%)",
        }}
      />

      <div className="relative z-10 space-y-5">
        <div className="space-y-4">
          <p className="text-xs font-semibold tracking-[0.16em] text-blue-100 uppercase">
            NU Dasmariñas · Health Services
          </p>
          <h2 className="max-w-md text-balance text-3xl font-bold tracking-tight sm:text-4xl">
            Effortlessly coordinate campus clinic care.
          </h2>
          <p className="max-w-md text-pretty text-sm leading-relaxed text-blue-100 sm:text-base">
            Sign in to open your Health Services Office workspace—queues, patient
            records, certificates, and announcements stay in one secure,
            role-aware platform.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full border border-white/25 bg-white/10 px-3 py-1 text-[10px] font-semibold tracking-[0.14em] text-white uppercase">
            National University Dasmariñas
          </span>
          <span className="rounded-full border border-white/25 bg-white/10 px-3 py-1 text-[10px] font-semibold tracking-[0.14em] text-white uppercase">
            Health Services Office
          </span>
        </div>
      </div>

      <div className="relative z-10 mt-6 min-w-0 lg:mt-8">
        <LoginPreviewCarousel />
      </div>
    </div>
  )
}
