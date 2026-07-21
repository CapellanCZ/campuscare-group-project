import { IconBuildingCommunity, IconNurse, IconSchool, IconUserStar } from "@tabler/icons-react"

import { Card, CardContent } from "@/components/ui/card"
import { FadeIn } from "@/components/landing/fade-in"
import { SectionHeading } from "@/components/landing/section-heading"
import { userTypes } from "@/lib/landing/content"

const userTypeIcons = [IconSchool, IconUserStar, IconBuildingCommunity, IconNurse]

export function UserTypesSection() {
  return (
    <section className="bg-slate-50 px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-7xl">
        <FadeIn>
          <SectionHeading
            eyebrow="User Types"
            title="Designed for the entire NU Dasmarinas community"
            description="CampusCare provides role-based support to ensure each user group can access relevant healthcare services efficiently."
          />
        </FadeIn>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {userTypes.map((userType, index) => {
            const Icon = userTypeIcons[index]
            return (
              <FadeIn key={userType.title} delay={index * 0.05}>
                <Card className="h-full rounded-2xl border border-slate-200 bg-white shadow-[0_12px_28px_-24px_rgba(15,23,42,0.35)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_34px_-24px_rgba(15,23,42,0.45)]">
                  <CardContent className="space-y-3">
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-[#2563EB]">
                      <Icon className="size-4.5" aria-hidden />
                    </span>
                    <h3 className="text-base font-semibold text-slate-900">
                      {userType.title}
                    </h3>
                    <p className="text-sm leading-7 text-slate-600">
                      {userType.description}
                    </p>
                  </CardContent>
                </Card>
              </FadeIn>
            )
          })}
        </div>
      </div>
    </section>
  )
}
