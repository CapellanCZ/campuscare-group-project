/**
 * Session-scoped in-memory cache for staff list/detail payloads.
 * Survives client navigations so revisits / prefetched dialogs paint instantly.
 */

type CacheEntry<T> = {
  data: T
  savedAt: number
}

const store = new Map<string, CacheEntry<unknown>>()
const inflight = new Map<string, Promise<unknown>>()

const DEFAULT_TTL_MS = 5 * 60 * 1000

export function staffCacheGet<T>(key: string, ttlMs = DEFAULT_TTL_MS): T | null {
  const entry = store.get(key)
  if (!entry) return null
  if (Date.now() - entry.savedAt > ttlMs) {
    store.delete(key)
    return null
  }
  return entry.data as T
}

export function staffCacheSet<T>(key: string, data: T): void {
  store.set(key, { data, savedAt: Date.now() })
}

export function staffCacheInvalidate(prefix?: string): void {
  if (!prefix) {
    store.clear()
    inflight.clear()
    return
  }
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key)
  }
  for (const key of inflight.keys()) {
    if (key.startsWith(prefix)) inflight.delete(key)
  }
}

/** Dedupe concurrent fetches; always refresh the cache on success. */
export async function staffCacheLoad<T>(
  key: string,
  loader: () => Promise<T>,
  options?: { ttlMs?: number; force?: boolean }
): Promise<T> {
  if (!options?.force) {
    const cached = staffCacheGet<T>(key, options?.ttlMs)
    if (cached != null) return cached

    const pending = inflight.get(key)
    if (pending) return pending as Promise<T>
  }

  const request = loader()
    .then((data) => {
      staffCacheSet(key, data)
      return data
    })
    .finally(() => {
      inflight.delete(key)
    })

  inflight.set(key, request)
  return request
}

export function consultationsCacheKey(role: string): string {
  return `consultations:v1:${role}`
}

export function dashboardCacheKey(role: string): string {
  return `dashboard:v1:${role}`
}

export function queueCacheKey(role: string): string {
  return `queue:v1:${role}`
}

export function requestsCacheKey(role: string): string {
  return `requests:v1:${role}`
}

export function patientsCacheKey(role: string): string {
  return `patients:v1:${role}`
}

export function certificatesCacheKey(role: string): string {
  return `certificates:v1:${role}`
}

export function announcementsCacheKey(role: string): string {
  return `announcements:v1:${role}`
}

export function patientHistoryCacheKey(
  patientId: string,
  stationFilter: string,
  documentScope: string
): string {
  return `patient-history:v1:${patientId}:${stationFilter}:${documentScope}`
}

/** True when this route already has a session payload (including empty lists). */
export function staffRouteHasWarmCache(path: string, role: string): boolean {
  const parts = path.split("/").filter(Boolean)
  const segment = parts.length < 2 ? "dashboard" : (parts[1] ?? "dashboard")
  const kind = segment === "dashboard" ? "dashboard" : segment

  switch (kind) {
    case "queue":
      return staffCacheGet(queueCacheKey(role)) != null
    case "consultations":
      return staffCacheGet(consultationsCacheKey(role)) != null
    case "requests":
      return staffCacheGet(requestsCacheKey(role)) != null
    case "patients":
    case "bin":
      return staffCacheGet(patientsCacheKey(role)) != null
    case "certificates":
    case "medical-certificates":
      return staffCacheGet(certificatesCacheKey(role)) != null
    case "announcements":
      return staffCacheGet(announcementsCacheKey(role)) != null
    case "dashboard":
    default:
      if (parts.length < 2 || segment === "dashboard") {
        return staffCacheGet(dashboardCacheKey(role)) != null
      }
      return false
  }
}
