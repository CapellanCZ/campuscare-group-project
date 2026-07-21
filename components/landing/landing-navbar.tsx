"use client"

import { type MouseEvent, useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { IconMenu2 } from "@tabler/icons-react"

import { landingNavItems } from "@/lib/landing/content"
import { buttonVariants } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

export function LandingNavbar() {
  const [isOpen, setIsOpen] = useState(false)
  const [activeSection, setActiveSection] = useState("home")

  useEffect(() => {
    const ids = landingNavItems
      .map((item) => item.href.replace("#", ""))
      .filter((id) => id.length > 0)
    const elements = ids
      .map((id) => document.getElementById(id))
      .filter((element): element is HTMLElement => element !== null)

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
        if (visible?.target.id) {
          setActiveSection(visible.target.id)
        }
      },
      {
        rootMargin: "-35% 0px -45% 0px",
        threshold: [0.15, 0.3, 0.5, 0.7],
      }
    )

    elements.forEach((element) => observer.observe(element))
    return () => observer.disconnect()
  }, [])

  const handleAnchorClick = (
    event: MouseEvent<HTMLAnchorElement>,
    href: string
  ) => {
    if (!href.startsWith("#")) return
    event.preventDefault()
    const target = document.querySelector(href)
    if (!(target instanceof HTMLElement)) return
    target.scrollIntoView({ behavior: "smooth", block: "start" })
    setActiveSection(href.replace("#", ""))
    setIsOpen(false)
  }

  return (
    <header className="sticky top-0 z-50 border-b border-sky-100/90 bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          className="flex items-center gap-3"
          href="#home"
          onClick={(event) => handleAnchorClick(event, "#home")}
        >
          <Image
            src="/images/campuscare-logo.png"
            alt="CampusCare logo"
            width={34}
            height={34}
            className="h-8 w-8 transition-transform duration-300 hover:scale-105"
          />
          <span className="text-base font-semibold tracking-tight text-slate-900">
            CampusCare
          </span>
        </Link>

        <nav aria-label="Primary navigation" className="hidden items-center gap-7 md:flex">
          {landingNavItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={(event) => handleAnchorClick(event, item.href)}
              className={cn(
                "relative text-sm transition-colors duration-200 after:absolute after:-bottom-1 after:left-0 after:h-0.5 after:bg-[#2563EB] after:transition-all after:duration-300",
                item.href === `#${activeSection}`
                  ? "text-[#2563EB] after:w-full"
                  : "text-slate-600 after:w-0 hover:text-[#2563EB] hover:after:w-full"
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center md:flex">
          <Link
            href="/login"
            className={cn(
              buttonVariants({ size: "sm" }),
              "rounded-xl bg-[#2563EB] px-4 transition-all duration-300 hover:-translate-y-0.5 hover:bg-blue-700"
            )}
          >
            Login
          </Link>
        </div>

        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger
            className={cn(
              buttonVariants({ variant: "outline", size: "icon-sm" }),
              "border-slate-200 md:hidden"
            )}
            aria-label="Open menu"
          >
            <IconMenu2 />
          </SheetTrigger>
          <SheetContent side="right" className="w-[84vw] max-w-sm bg-white">
            <SheetHeader className="border-b border-slate-100 pb-4">
              <SheetTitle className="flex items-center gap-2 text-slate-900">
                <Image
                  src="/images/campuscare-logo.png"
                  alt="CampusCare logo"
                  width={26}
                  height={26}
                />
                CampusCare
              </SheetTitle>
            </SheetHeader>
            <nav aria-label="Mobile navigation" className="space-y-1 p-6">
              {landingNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={(event) => handleAnchorClick(event, item.href)}
                  className="block rounded-xl px-3 py-2 text-sm text-slate-700 transition-all duration-200 hover:translate-x-1 hover:bg-slate-50 hover:text-[#2563EB]"
                >
                  {item.label}
                </Link>
              ))}
              <Link
                href="/login"
                className={cn(
                  buttonVariants({ size: "sm" }),
                  "mt-4 w-full rounded-xl bg-[#2563EB]"
                )}
              >
                Login
              </Link>
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  )
}
