"use client"

import { type MouseEvent, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { IconMenu2, IconX } from "@tabler/icons-react"

import { CampusCareLogoStatic } from "@/components/campuscare-logo-static"
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
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <header
      className={cn(
        "sticky top-0 z-50 border-b border-transparent bg-background/80 backdrop-blur-xl transition-[border-color,box-shadow,background-color] duration-300",
        scrolled && "border-border/80 shadow-sm bg-background/95"
      )}
    >
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <a
          href="#home"
          className="flex min-w-0 items-center gap-2 font-semibold tracking-tight text-foreground"
          aria-label="CampusCare home"
          onClick={(event) => handleSectionNav(event, "home")}
        >
          <CampusCareLogoStatic
            variant="blue"
            alt="CampusCare"
            className="h-8 w-auto"
            width={48}
            priority
          />
          <span className="truncate">CampusCare</span>
        </a>

        <nav aria-label="Primary">
          <Scrollspy
            offset={88}
            className="hidden items-center gap-1 lg:flex"
            history={false}
            smooth
            targetRef={scrollRootRef}
          >
            {navLinks.map((link) => (
              <a
                key={link.id}
                href={link.href}
                data-scrollspy-anchor={link.id}
                className="rounded-full px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground data-[active=true]:bg-primary/10 data-[active=true]:text-primary"
              >
                {link.label}
              </a>
            ))}
          </Scrollspy>
        </nav>

        <div className="flex items-center gap-2">
          <Button
            render={<Link href={siteRoutes.login} />}
            nativeButton={false}
            className="hidden sm:inline-flex"
          >
            Login
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
                  <CampusCareLogoStatic
                    variant="blue"
                    alt=""
                    className="h-6 w-auto"
                    width={36}
                  />
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
                    className="rounded-xl px-3 py-3 text-sm font-medium text-foreground hover:bg-muted"
                    onClick={(event) =>
                      handleSectionNav(event, link.id, () => setOpen(false))
                    }
                  >
                    {link.label}
                  </a>
                ))}
                <Button
                  className="mt-4 w-full"
                  render={<Link href={siteRoutes.login} />}
                  nativeButton={false}
                  onClick={() => setOpen(false)}
                >
                  Login
                </Button>
              </nav>
            </DrawerContent>
          </Drawer>
        </div>
      </div>
    </header>
  )
}
