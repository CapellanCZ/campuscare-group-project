"use client"

type NotifyPrefs = {
  notifyConsultationRequests: boolean
  notifyQueue: boolean
  notifyAnnouncements: boolean
}

const DEFAULT_PREFS: NotifyPrefs = {
  notifyConsultationRequests: true,
  notifyQueue: true,
  notifyAnnouncements: true,
}

let cached: NotifyPrefs | null = null

export function getSessionNotifyPrefs(): NotifyPrefs | null {
  return cached
}

export function getSessionNotifyPrefsOrDefault(): NotifyPrefs {
  return cached ?? DEFAULT_PREFS
}

export function saveSessionNotifyPrefs(prefs: NotifyPrefs) {
  cached = prefs
}

export function clearSessionNotifyPrefs() {
  cached = null
}
