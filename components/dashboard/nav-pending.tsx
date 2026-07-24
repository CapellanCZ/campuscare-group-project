"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useEffectEvent,
  useMemo,
  useState,
  useTransition,
} from "react"
import { usePathname, useRouter } from "next/navigation"

type NavPendingContextValue = {
  /** Pathname used for active UI (optimistic while navigation is in flight). */
  activePath: string
  isPending: boolean
  navigate: (href: string) => void
  prefetch: (href: string) => void
}

const NavPendingContext = createContext<NavPendingContextValue | null>(null)

function hrefPath(href: string): string {
  return href.split("?")[0] || href
}

export function NavPendingProvider({
  children,
  prefetchHrefs = [],
}: {
  children: React.ReactNode
  /** Warm the client router cache for these routes after idle. */
  prefetchHrefs?: string[]
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [pendingHref, setPendingHref] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const onPathnameChange = useEffectEvent((next: string) => {
    setPendingHref((current) => {
      if (!current) return null
      const pendingPath = hrefPath(current)
      if (next === pendingPath || next.startsWith(`${pendingPath}/`)) {
        return null
      }
      return current
    })
  })

  useEffect(() => {
    onPathnameChange(pathname)
  }, [pathname])

  useEffect(() => {
    if (prefetchHrefs.length === 0) return

    const unique = [...new Set(prefetchHrefs.map(hrefPath))]
    let cancelled = false
    const run = () => {
      if (cancelled) return
      for (const href of unique) {
        router.prefetch(href)
      }
    }

    let idleHandle: number | ReturnType<typeof setTimeout>
    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      idleHandle = window.requestIdleCallback(run, { timeout: 1500 })
    } else {
      idleHandle = setTimeout(run, 200)
    }

    return () => {
      cancelled = true
      if (typeof window !== "undefined" && "cancelIdleCallback" in window) {
        window.cancelIdleCallback(idleHandle as number)
      } else {
        clearTimeout(idleHandle as ReturnType<typeof setTimeout>)
      }
    }
  }, [prefetchHrefs, router])

  const navigate = useCallback(
    (href: string) => {
      if (hrefPath(href) === pathname) return
      setPendingHref(href)
      startTransition(() => {
        router.push(href)
      })
    },
    [pathname, router]
  )

  const prefetch = useCallback(
    (href: string) => {
      router.prefetch(hrefPath(href))
    },
    [router]
  )

  const activePath = pendingHref ? hrefPath(pendingHref) : pathname

  const value = useMemo(
    () => ({
      activePath,
      isPending: isPending || pendingHref !== null,
      navigate,
      prefetch,
    }),
    [activePath, isPending, navigate, pendingHref, prefetch]
  )

  return (
    <NavPendingContext.Provider value={value}>
      {children}
    </NavPendingContext.Provider>
  )
}

export function useNavPending(): NavPendingContextValue {
  const ctx = useContext(NavPendingContext)
  if (!ctx) {
    throw new Error("useNavPending must be used within NavPendingProvider")
  }
  return ctx
}
