"use client"

import { useCallback, useMemo, useRef } from "react"

import type { PatientRecordListResult } from "@/types/patientRecord"

type PageFetcher = (page: number) => Promise<PatientRecordListResult | null>

/**
 * In-memory page cache + adjacent prefetch for patient directories.
 * UI reads cached pages first so pagination feels instant (local-first).
 */
export function useCachedPatientPages() {
  const cacheRef = useRef(new Map<string, PatientRecordListResult>())
  const inflightRef = useRef(new Map<string, Promise<PatientRecordListResult | null>>())
  const scopeRef = useRef("")

  const setScope = useCallback((scope: string) => {
    if (scopeRef.current === scope) return
    scopeRef.current = scope
    cacheRef.current.clear()
    inflightRef.current.clear()
  }, [])

  const invalidate = useCallback(() => {
    cacheRef.current.clear()
    inflightRef.current.clear()
  }, [])

  const cacheKey = useCallback((page: number) => `${scopeRef.current}::${page}`, [])

  const getCached = useCallback((page: number) => {
    return cacheRef.current.get(cacheKey(page)) ?? null
  }, [cacheKey])

  const put = useCallback(
    (result: PatientRecordListResult) => {
      cacheRef.current.set(cacheKey(result.page), result)
    },
    [cacheKey]
  )

  const fetchPage = useCallback(
    async (
      page: number,
      fetcher: PageFetcher,
      options: { bypassCache?: boolean } = {}
    ) => {
      const key = cacheKey(page)
      if (!options.bypassCache) {
        const cached = cacheRef.current.get(key)
        if (cached) return cached

        const existing = inflightRef.current.get(key)
        if (existing) return existing
      }

      const request = fetcher(page)
        .then((result) => {
          if (result) cacheRef.current.set(key, result)
          return result
        })
        .finally(() => {
          inflightRef.current.delete(key)
        })

      inflightRef.current.set(key, request)
      return request
    },
    [cacheKey]
  )

  const prefetchAdjacent = useCallback(
    (page: number, totalPages: number, fetcher: PageFetcher) => {
      const targets = [page - 1, page + 1].filter(
        (p) => p >= 1 && p <= totalPages && !cacheRef.current.has(cacheKey(p))
      )
      for (const target of targets) {
        void fetchPage(target, fetcher)
      }
    },
    [cacheKey, fetchPage]
  )

  return useMemo(
    () => ({
      setScope,
      invalidate,
      getCached,
      put,
      fetchPage,
      prefetchAdjacent,
    }),
    [setScope, invalidate, getCached, put, fetchPage, prefetchAdjacent]
  )
}
