"use client"

import { type MouseEvent, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { IconMenu2, IconX } from "@tabler/icons-react"

import { LandingLogo } from "@/components/landing/landing-logo"
import { scrollToId } from "@/components/landing/scroll-to-id"
import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import { Scrollspy } from "@/components/reui/scrollspy"
import { navLinks } from "@/lib/landing/content"
import { siteRoutes } from "@/lib/site/routes"
import { cn } from "@/lib/utils"

function handleSectionNav(
  event: MouseEvent<HTMLAnchorElement>,
  sectionId: string,
  onNavigated?: () => void
) {
  event.preventDefault()
  event.stopPropagation()
  scrollToId(sectionId)
  onNavigated?.()
}

export function LandingNav() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const scrollRootRef = useRef<Document | null>(
    typeof document !== "undefined" ? document : null
  )

  useEffect(() => {
    scrollRootRef.current = document
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <header
      className={cn(
        "sticky top-0 z-50 border-b border-transparent bg-white/90 backdrop-blur-xl transition-[border-color,box-shadow] duration-300",
        scrolled && "border-slate-200/80 shadow-sm bg-white/95"
      )}
    >
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-3 px-4 sm:h-16 sm:gap-4 sm:px-6">
        <a
          href="#home"
          className="flex min-w-0 max-w-[70%] items-center gap-2 sm:max-w-none sm:gap-2.5"
          aria-label="CampusCare home"
          onClick={(event) => handleSectionNav(event, "home")}
        >
          <LandingLogo alt="" priority className="h-7 w-auto sm:h-8 lg:h-9" />
          <span className="flex min-w-0 flex-col justify-center leading-none">
            <span className="truncate text-sm font-bold tracking-tight text-slate-900 sm:text-[15px]">
              CampusCare
            </span>
            <span className="mt-1 truncate text-[9px] font-semibold tracking-[0.14em] text-slate-400 uppercase sm:text-[10px]">
              NU Dasmariñas
            </span>
          </span>
        </a>

        <nav aria-label="Primary" className="hidden lg:block">
          <Scrollspy
            offset={88}
            className="flex items-center gap-1"
            history={false}
            smooth
            scrollOnClick={false}
            targetRef={scrollRootRef}
          >
            {navLinks.map((link) => (
              <a
                key={link.id}
                href={link.href}
                data-scrollspy-anchor={link.id}
                className="rounded-full px-3.5 py-2 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900 data-[active=true]:bg-blue-50 data-[active=true]:text-blue-600"
                onClick={(event) => handleSectionNav(event, link.id)}
              >
                {link.label}
              </a>
            ))}
          </Scrollspy>
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <Button
            render={<Link href={siteRoutes.login} />}
            nativeButton={false}
            className="hidden rounded-full bg-blue-600 px-4 hover:bg-blue-700 sm:inline-flex"
          >
            Sign In
          </Button>

          <Drawer swipeDirection="right" open={open} onOpenChange={setOpen}>
            <DrawerTrigger
              render={
                <Button
                  variant="outline"
                  size="icon"
                  className="lg:hidden"
                  aria-label="Open navigation menu"
                />
              }
            >
              <IconMenu2 />
            </DrawerTrigger>
            <DrawerContent className="max-w-xs">
              <DrawerHeader className="flex-row items-center justify-between">
                <DrawerTitle className="flex items-center gap-2">
                  <LandingLogo alt="" className="h-6 w-auto sm:h-6 lg:h-6" />
                  CampusCare
                </DrawerTitle>
                <DrawerClose
                  render={
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Close navigation menu"
                    />
                  }
                >
                  <IconX />
                </DrawerClose>
              </DrawerHeader>
              <nav aria-label="Mobile" className="flex flex-col gap-1 px-4 pb-6">
                {navLinks.map((link) => (
                  <a
                    key={link.id}
                    href={link.href}
                    className="rounded-xl px-3 py-3 text-sm font-medium text-slate-800 hover:bg-slate-100"
                    onClick={(event) =>
                      handleSectionNav(event, link.id, () => setOpen(false))
                    }
                  >
                    {link.label}
                  </a>
                ))}
                <Button
                  className="mt-4 w-full rounded-full bg-blue-600 hover:bg-blue-700"
                  render={<Link href={siteRoutes.login} />}
                  nativeButton={false}
                  onClick={() => setOpen(false)}
                >
                  Sign In
                </Button>
              </nav>
            </DrawerContent>
          </Drawer>
        </div>
      </div>
    </header>
  )
}
