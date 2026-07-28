"use client"

import Link from "next/link"
import {
  IconClock,
  IconMail,
  IconMapPin,
} from "@tabler/icons-react"

import { CampusCareLogo } from "@/components/campuscare-logo"
import { Reveal, ScrollFadeSection } from "@/components/landing/motion"
import {
  footerBlurb,
  footerContact,
  navLinks,
} from "@/lib/landing/content"

export function LandingFooter() {
  return (
    <ScrollFadeSection id="contact" className="scroll-mt-20 bg-foreground text-background">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-2 lg:grid-cols-4 lg:gap-8 lg:py-16">
        <Reveal className="min-w-0 space-y-3 lg:col-span-1">
          <div className="flex items-center gap-2">
            <CampusCareLogo
              variant="white"
              alt=""
              className="h-8 w-auto"
              width={48}
              height={32}
            />
            <span className="font-semibold tracking-tight">CampusCare</span>
          </div>
          <p className="text-sm leading-relaxed text-background/75">
            {footerBlurb}
          </p>
        </Reveal>

        <Reveal delay={0.06} className="min-w-0 space-y-3">
          <h3 className="text-sm font-semibold tracking-wide uppercase">
            Explore
          </h3>
          <ul className="space-y-2 text-sm text-background/75">
            {navLinks.map((link) => (
              <li key={link.id}>
                <a
                  href={link.href}
                  className="transition-colors hover:text-background"
                >
                  {link.label}
                </a>
              </li>
            ))}
            <li>
              <Link
                href="/login"
                className="transition-colors hover:text-background"
              >
                Staff login
              </Link>
            </li>
          </ul>
        </Reveal>

        <Reveal delay={0.1} className="min-w-0 space-y-3 md:col-span-2 lg:col-span-2">
          <h3 className="text-sm font-semibold tracking-wide uppercase">
            Contact
          </h3>
          <ul className="space-y-3 text-sm text-background/75">
            <li className="flex items-start gap-2">
              <IconMapPin className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span>{footerContact.location}</span>
            </li>
            <li className="flex items-start gap-2">
              <IconClock className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span>{footerContact.hours}</span>
            </li>
            <li className="flex items-start gap-2">
              <IconMail className="mt-0.5 size-4 shrink-0" aria-hidden />
              <a
                href={`mailto:${footerContact.email}`}
                className="break-all transition-colors hover:text-background"
              >
                {footerContact.email}
              </a>
            </li>
          </ul>
        </Reveal>
      </div>

      <div className="border-t border-background/15">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-6 text-xs text-background/60 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>© {new Date().getFullYear()} CampusCare · NU Dasmariñas HSO</p>
          <div className="flex gap-4">
            <a href="#" className="hover:text-background">
              Terms of Service
            </a>
            <a href="#" className="hover:text-background">
              Privacy Policy
            </a>
          </div>
        </div>
      </div>
    </ScrollFadeSection>
  )
}
