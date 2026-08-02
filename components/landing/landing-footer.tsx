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
  footerLegalLinks,
  footerQuickLinks,
} from "@/lib/landing/content"

export function LandingFooter() {
  return (
    <ScrollFadeSection
      id="contact"
      className="scroll-mt-20 bg-primary text-primary-foreground"
    >
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-3 md:gap-8 lg:py-16">
        <Reveal className="min-w-0 space-y-3 md:col-span-1">
          <Link
            href="#home"
            className="inline-flex items-center gap-2 font-semibold tracking-tight transition-opacity hover:opacity-90"
          >
            <CampusCareLogo
              variant="white"
              alt=""
              className="h-8 w-auto"
              width={48}
              height={32}
            />
            <span>CampusCare</span>
          </Link>
          <p className="max-w-sm text-sm leading-relaxed text-primary-foreground/80">
            {footerBlurb}
          </p>
        </Reveal>

        <Reveal delay={0.06} className="min-w-0 space-y-3">
          <h3 className="text-sm font-semibold tracking-wide text-primary-foreground">
            Clinic
          </h3>
          <ul className="space-y-3 text-sm text-primary-foreground/80">
            <li className="flex items-start gap-2">
              <IconMapPin className="mt-0.5 size-4 shrink-0 opacity-90" aria-hidden />
              <a
                href={footerContact.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors hover:text-primary-foreground"
              >
                {footerContact.location}
                <span className="sr-only"> (opens in Google Maps)</span>
              </a>
            </li>
            <li className="flex items-start gap-2">
              <IconClock className="mt-0.5 size-4 shrink-0 opacity-90" aria-hidden />
              <span>{footerContact.hours}</span>
            </li>
            <li className="flex items-start gap-2">
              <IconMail className="mt-0.5 size-4 shrink-0 opacity-90" aria-hidden />
              <a
                href={`mailto:${footerContact.email}`}
                className="break-all transition-colors hover:text-primary-foreground"
              >
                {footerContact.email}
              </a>
            </li>
          </ul>
        </Reveal>

        <Reveal delay={0.1} className="min-w-0 space-y-3">
          <h3 className="text-sm font-semibold tracking-wide text-primary-foreground">
            Links
          </h3>
          <ul className="space-y-2 text-sm text-primary-foreground/80">
            {footerQuickLinks.map((link) => (
              <li key={link.href}>
                {link.href.startsWith("/") ? (
                  <Link
                    href={link.href}
                    className="transition-colors hover:text-primary-foreground"
                  >
                    {link.label}
                  </Link>
                ) : (
                  <a
                    href={link.href}
                    className="transition-colors hover:text-primary-foreground"
                  >
                    {link.label}
                  </a>
                )}
              </li>
            ))}
          </ul>
        </Reveal>
      </div>

      <div className="border-t border-primary-foreground/15">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-6 text-xs text-primary-foreground/65 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>© {new Date().getFullYear()} CampusCare · NU Dasmariñas HSO</p>
          <div className="flex flex-wrap gap-4">
            {footerLegalLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="transition-colors hover:text-primary-foreground"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </ScrollFadeSection>
  )
}
