"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { IconMenu2, IconX } from "@tabler/icons-react"

import { CampusCareLogo } from "@/components/campuscare-logo"
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
import { cn } from "@/lib/utils"

export function LandingNav() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const scrollRootRef = useRef<Document | null>(null)

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
        <Link
          href="#home"
          className="flex min-w-0 items-center gap-2 font-semibold tracking-tight text-foreground"
        >
          <CampusCareLogo
            alt="CampusCare"
            className="h-8 w-auto"
            width={48}
            height={32}
          />
          <span className="truncate">CampusCare</span>
        </Link>

        <Scrollspy
          offset={88}
          className="hidden items-center gap-1 lg:flex"
          history
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

        <div className="flex items-center gap-2">
          <Button
            render={<Link href="/login" />}
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
                <DrawerTitle>Menu</DrawerTitle>
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
              <nav className="flex flex-col gap-1 px-4 pb-6">
                {navLinks.map((link) => (
                  <a
                    key={link.id}
                    href={link.href}
                    className="rounded-xl px-3 py-3 text-sm font-medium text-foreground hover:bg-muted"
                    onClick={() => setOpen(false)}
                  >
                    {link.label}
                  </a>
                ))}
                <Button
                  className="mt-4 w-full"
                  render={<Link href="/login" />}
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
