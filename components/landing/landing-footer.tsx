import Image from "next/image"
import Link from "next/link"
import { IconClockHour4, IconMail, IconMapPin, IconPhone } from "@tabler/icons-react"

import { FadeIn } from "@/components/landing/fade-in"
import {
  contactDetails,
  footerLinkGroups,
} from "@/lib/landing/content"

const contactItems = [
  {
    label: "Office Location",
    value: contactDetails.location,
    icon: IconMapPin,
  },
  {
    label: "Email",
    value: contactDetails.email,
    icon: IconMail,
  },
  {
    label: "Telephone",
    value: contactDetails.phone,
    icon: IconPhone,
  },
  {
    label: "Office Hours",
    value: contactDetails.officeHours,
    icon: IconClockHour4,
  },
]

export function LandingFooter() {
  return (
    <footer id="contact" className="landing-band border-t border-sky-100/80">
      <div className="h-1 w-full bg-gradient-to-r from-sky-400 via-[#2563EB] to-cyan-400" />
      <div className="px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-7xl">
          <FadeIn>
            <div className="grid gap-8 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
              <section>
                <div className="flex items-center gap-3">
                  <Image
                    src="/images/campuscare-logo.png"
                    alt="CampusCare logo"
                    width={38}
                    height={38}
                    className="logo-float"
                  />
                  <div>
                    <p className="text-2xl font-semibold tracking-tight text-[#2563EB]">
                      CampusCare
                    </p>
                    <p className="text-xs text-slate-500">
                      Health Services Office Digital Platform
                    </p>
                  </div>
                </div>
                <p className="mt-4 max-w-xs text-sm leading-7 text-slate-600">
                  Supporting National University - Dasmarinas with faster, more
                  accessible, and digitally managed healthcare services.
                </p>
              </section>

              {footerLinkGroups.map((group) => (
                <section key={group.title}>
                  <p className="text-xs font-semibold tracking-[0.12em] text-slate-500 uppercase">
                    {group.title}
                  </p>
                  {group.title === "Contact" ? (
                    <div className="mt-3 grid gap-3">
                      {contactItems.map((item) => (
                        <div
                          key={`${group.title}-${item.label}`}
                          className="grid grid-cols-[16px_1fr] items-start gap-x-2 gap-y-1 text-sm text-slate-600"
                        >
                          <item.icon className="mt-0.5 size-4 text-[#2563EB]" />
                          <div>
                            <p className="text-xs font-medium text-slate-500">
                              {item.label}
                            </p>
                            <p className="leading-6">{item.value}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <nav className="mt-3 flex flex-col gap-2" aria-label={`${group.title} links`}>
                      {group.links.map((link) => (
                        <Link
                          key={`${group.title}-${link.label}`}
                          href={link.href}
                          className="text-sm text-slate-700 transition-all duration-200 hover:translate-x-1 hover:text-[#2563EB]"
                        >
                          {link.label}
                        </Link>
                      ))}
                    </nav>
                  )}
                </section>
              ))}
            </div>
          </FadeIn>

          <FadeIn delay={0.1}>
            <div className="mt-8 border-t border-slate-200 pt-4 text-xs text-slate-500">
              <p>© {new Date().getFullYear()} CampusCare. All rights reserved.</p>
            </div>
          </FadeIn>
        </div>
      </div>
    </footer>
  )
}
