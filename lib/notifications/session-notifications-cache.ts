"use client"

import type { HeaderStaffNotification } from "@/lib/notifications/header-notifications"

/** Survives header remounts during soft navigations. */
let cachedItems: HeaderStaffNotification[] | null = null

export function getSessionNotifications(): HeaderStaffNotification[] | null {
  return cachedItems
}

export function saveSessionNotifications(items: HeaderStaffNotification[]) {
  cachedItems = items
}
