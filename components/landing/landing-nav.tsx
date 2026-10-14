"use client"

import { type MouseEvent, useEffect, useRef, useState } from "react"
import Link from "next/link"
import {
  motion,
  useMotionTemplate,
  useScroll,
  useTransform,
} from "motion/react"
import { IconMenu2, IconX } from "@tabler/icons-react"

import { LandingLogo } from "@/components/landing/landing-logo"
import { scrollToId } from "@/components/landing/scroll-to-id"
import { useMotionReady } from "@/components/landing/use-motion-ready"
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
  const [activeId, setActiveId] = useState(navLinks[0]?.id ?? "home")
  const [open, setOpen] = useState(false)
  const scrollRootRef = useRef<Document | null>(
    typeof document !== "undefined" ? document : null
  )
  const { allowMotion } = useMotionReady()
  const { scrollY } = useScroll()

  const headerAlpha = useTransform(scrollY, [0, 72], [0.88, 0.97])
  const blurPx = useTransform(scrollY, [0, 72], [10, 18])
  const shadowAlpha = useTransform(scrollY, [0, 72], [0, 0.1])
  const borderAlpha = useTransform(scrollY, [0, 72], [0, 0.8])

  const headerBackground = useMotionTemplate`rgb(255 255 255 / ${headerAlpha})`
  const headerFilter = useMotionTemplate`blur(${blurPx}px)`
  const headerShadow = useMotionTemplate`0 1px 0 rgb(15 23 42 / ${shadowAlpha}), 0 8px 24px -16px rgb(15 23 42 / ${shadowAlpha})`
  const headerBorder = useMotionTemplate`rgb(226 232 240 / ${borderAlpha})`

  useEffect(() => {
    scrollRootRef.current = document
  }, [])

  return (
    <motion.header
      className={cn(
        "sticky top-0 z-50 border-b backdrop-blur-xl",
        !allowMotion && "border-slate-200/80 bg-white/95 shadow-sm"
      )}
      style={
        allowMotion
          ? {
              backgroundColor: headerBackground,
              borderColor: headerBorder,
              boxShadow: headerShadow,
              backdropFilter: headerFilter,
              WebkitBackdropFilter: headerFilter,
            }
          : undefined
      }
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
            className="relative flex items-center gap-1"
            history={false}
            smooth
            scrollOnClick={false}
            targetRef={scrollRootRef}
            onUpdate={setActiveId}
          >
            {navLinks.map((link) => {
              const isActive = activeId === link.id
              return (
                <a
                  key={link.id}
                  href={link.href}
                  data-scrollspy-anchor={link.id}
                  className={cn(
                    "relative z-10 rounded-full px-3.5 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "text-blue-700"
                      : "text-slate-500 hover:text-slate-900"
                  )}
                  onClick={(event) => handleSectionNav(event, link.id)}
                >
                  {isActive ? (
                    allowMotion ? (
                      <motion.span
                        layoutId="landing-nav-pill"
                        className="absolute inset-0 -z-10 rounded-full bg-blue-50"
                        transition={{
                          type: "spring",
                          stiffness: 420,
                          damping: 34,
                          mass: 0.7,
                        }}
                      />
                    ) : (
                      <span className="absolute inset-0 -z-10 rounded-full bg-blue-50" />
                    )
                  ) : null}
                  {link.label}
                </a>
              )
            })}
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
                    className={cn(
                      "rounded-xl px-3 py-3 text-sm font-medium hover:bg-slate-100",
                      activeId === link.id
                        ? "bg-blue-50 text-blue-700"
                        : "text-slate-800"
                    )}
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
    </motion.header>
  )
}
