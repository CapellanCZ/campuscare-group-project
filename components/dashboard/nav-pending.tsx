"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useEffectEvent,
  useMemo,
  useState,
} from "react"
import { usePathname, useRouter } from "next/navigation"

type NavPendingContextValue = {
  /** Pathname used for active UI (optimistic while navigation is in flight). */
  activePath: string
  isPending: boolean
  navigate: (href: string) => void
  /** Mark a native <Link> navigation as in-flight so the active tab flips immediately. */
  markPending: (href: string) => void
  prefetch: (href: string) => void
}

const NavPendingContext = createContext<NavPendingContextValue | null>(null)

function hrefPath(href: string): string {
  return href.split("?")[0] || href
}

export function NavPendingProvider({
  children,
}: {
  children: React.ReactNode
  /**
   * @deprecated Unused — idle prefetch of all role routes pulled unused RSCs
   * on every shell mount. Kept optional for call-site compatibility only.
   */
  prefetchHrefs?: string[]
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [pendingHref, setPendingHref] = useState<string | null>(null)

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

  const markPending = useCallback(
    (href: string) => {
      const next = hrefPath(href)
      if (!next || next === pathname) return
      setPendingHref(next)
    },
    [pathname]
  )

  /** Fallback when a control cannot use a native <Link>. Prefer markPending + Link. */
  const navigate = useCallback(
    (href: string) => {
      if (hrefPath(href) === pathname) return
      markPending(href)
      router.push(href)
    },
    [markPending, pathname, router]
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
      isPending: pendingHref !== null,
      navigate,
      markPending,
      prefetch,
    }),
    [activePath, markPending, navigate, pendingHref, prefetch]
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

export function useOptionalNavPending() {
  return useContext(NavPendingContext)
}
