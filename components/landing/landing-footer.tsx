"use client"

import Link from "next/link"
import {
  IconMail,
  IconMapPin,
  IconPhone,
} from "@tabler/icons-react"

import { CampusCareLogo } from "@/components/campuscare-logo"
import { Reveal, ScrollFadeSection } from "@/components/landing/motion"
import {
  footerBlurb,
  footerContact,
  footerLegalLinks,
  footerOverviewLinks,
  footerSupportLinks,
} from "@/lib/landing/content"

function FooterLinkList({
  title,
  links,
}: {
  title: string
  links: ReadonlyArray<{ label: string; href: string }>
}) {
  return (
    <div className="min-w-0 space-y-4">
      <h3 className="text-xs font-semibold tracking-[0.14em] text-foreground uppercase">
        {title}
      </h3>
      <ul className="space-y-3 text-sm text-muted-foreground">
        {links.map((link) => (
          <li key={`${title}-${link.href}-${link.label}`}>
            {link.href.startsWith("/") ? (
              <Link
                href={link.href}
                className="transition-colors hover:text-foreground"
              >
                {link.label}
              </Link>
            ) : (
              <a
                href={link.href}
                className="transition-colors hover:text-foreground"
              >
                {link.label}
              </a>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

export function LandingFooter() {
  return (
    <ScrollFadeSection
      id="contact"
      className="scroll-mt-20 border-t border-border/60 bg-muted/40 text-foreground"
    >
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-2 lg:grid-cols-4 lg:gap-8 lg:py-16">
        <Reveal className="min-w-0 space-y-5 md:col-span-2 lg:col-span-1">
          <Link
            href="#home"
            className="inline-flex items-center gap-2.5 font-semibold tracking-tight transition-opacity hover:opacity-90"
          >
            <CampusCareLogo
              variant="blue"
              alt=""
              className="h-8 w-auto"
              width={48}
              height={32}
            />
            <span className="text-base">CampusCare</span>
          </Link>

          <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
            {footerBlurb}
          </p>

          <ul className="space-y-3 text-sm text-muted-foreground">
            <li className="flex items-start gap-2.5">
              <IconMapPin
                className="mt-0.5 size-4 shrink-0 text-primary"
                aria-hidden
              />
              <a
                href={footerContact.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors hover:text-foreground"
              >
                <span className="block">{footerContact.location}</span>
                <span className="block text-xs text-muted-foreground">
                  {footerContact.locationDetail}
                </span>
                <span className="sr-only"> (opens in Google Maps)</span>
              </a>
            </li>
            <li className="flex items-start gap-2.5">
              <IconMail
                className="mt-0.5 size-4 shrink-0 text-primary"
                aria-hidden
              />
              <a
                href={`mailto:${footerContact.email}`}
                className="break-all transition-colors hover:text-foreground"
              >
                {footerContact.email}
              </a>
            </li>
            <li className="flex items-start gap-2.5">
              <IconPhone
                className="mt-0.5 size-4 shrink-0 text-primary"
                aria-hidden
              />
              <a
                href={`tel:${footerContact.phoneTel}`}
                className="transition-colors hover:text-foreground"
              >
                {footerContact.phone}
              </a>
            </li>
          </ul>
        </Reveal>

        <Reveal delay={0.05}>
          <FooterLinkList title="Overview" links={footerOverviewLinks} />
        </Reveal>

        <Reveal delay={0.08}>
          <FooterLinkList title="Legal" links={footerLegalLinks} />
        </Reveal>

        <Reveal delay={0.11}>
          <FooterLinkList title="Support" links={footerSupportLinks} />
        </Reveal>
      </div>

      <div className="border-t border-border/70">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>© {new Date().getFullYear()} CampusCare · NU Dasmariñas HSO</p>
          <p className="sm:text-right">{footerContact.hours}</p>
        </div>
      </div>
    </ScrollFadeSection>
  )
}
