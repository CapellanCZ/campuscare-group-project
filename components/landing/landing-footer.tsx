import Link from "next/link"
import {
  IconMail,
  IconMapPin,
  IconPhone,
} from "@tabler/icons-react"
import Image from "next/image"

import { CampusCareLogoStatic } from "@/components/campuscare-logo-static"
import {
  footerBlurb,
  footerContact,
  footerLegalLinks,
  footerQuickLinks,
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

/** Server-rendered footer — no motion/JS; NU logo lazy below the fold. */
export function LandingFooter() {
  const year = new Date().getFullYear()

  return (
    <section
      id="contact"
      className="scroll-mt-20 border-t border-border/60 bg-muted/40 text-foreground"
    >
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-2 lg:grid-cols-4 lg:gap-8 lg:py-16">
        <div className="min-w-0 space-y-5">
          <div className="flex flex-wrap items-center gap-3">
            <a
              href="#home"
              className="inline-flex items-center gap-2 font-semibold tracking-tight text-foreground transition-opacity hover:opacity-90"
              aria-label="CampusCare home"
            >
              <CampusCareLogoStatic
                variant="blue"
                alt="CampusCare"
                className="h-10 w-auto"
                width={56}
              />
              <span>CampusCare</span>
            </a>
            <Image
              src="/images/NU-Logo.png"
              alt="National University"
              width={40}
              height={40}
              sizes="40px"
              loading="lazy"
              style={{ width: "auto" }}
              className="h-10 w-auto object-contain"
            />
          </div>

          <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
            {footerBlurb}
          </p>
        </div>

        <FooterLinkList title="Quick Links" links={footerQuickLinks} />
        <FooterLinkList title="Legal" links={footerLegalLinks} />

        <div className="min-w-0 space-y-4">
          <h3 className="text-xs font-semibold tracking-[0.14em] text-foreground uppercase">
            Contact
          </h3>
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
              <div className="min-w-0">
                <a
                  href={`tel:${footerContact.phoneTel}`}
                  className="transition-colors hover:text-foreground"
                >
                  {footerContact.phone}
                </a>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  Local {footerContact.phoneLocal}
                </span>
              </div>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-border/70">
        <div className="mx-auto max-w-6xl px-4 py-6 text-center text-xs text-muted-foreground sm:px-6">
          <p>
            © {year} CampusCare · NU Dasmariñas HSO · All Rights Reserved.
          </p>
        </div>
      </div>
    </section>
  )
}
