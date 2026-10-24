export type QueueDisplayAppearance = "light" | "dark"

const STORAGE_KEY = "campuscare-queue-display-appearance"

export const QUEUE_DISPLAY_THEMES: Record<
  QueueDisplayAppearance,
  Record<string, string>
> = {
  light: {
    "--qd-ink": "#F3F5F8",
    "--qd-panel": "#FFFFFF",
    "--qd-ticket": "#0C1222",
    "--qd-fg": "#0C1222",
    "--qd-fg-soft": "rgba(12,18,34,0.72)",
    "--qd-fg-faint": "rgba(12,18,34,0.22)",
    "--qd-fg-dim": "rgba(12,18,34,0.45)",
    "--qd-signal": "#2563EB",
    "--qd-mute": "#64748B",
    "--qd-break": "#D97706",
    "--qd-line": "rgba(12,18,34,0.1)",
    "--qd-control": "rgba(12,18,34,0.06)",
    "--qd-glow": "rgba(37,99,235,0.18)",
  },
  dark: {
    "--qd-ink": "#0C1222",
    "--qd-panel": "#101828",
    "--qd-ticket": "#F3EFE6",
    "--qd-fg": "#F8FAFC",
    "--qd-fg-soft": "rgba(248,250,252,0.72)",
    "--qd-fg-faint": "rgba(248,250,252,0.22)",
    "--qd-fg-dim": "rgba(248,250,252,0.45)",
    "--qd-signal": "#3B82F6",
    "--qd-mute": "#8B93A7",
    "--qd-break": "#E8A317",
    "--qd-line": "rgba(255,255,255,0.1)",
    "--qd-control": "rgba(255,255,255,0.08)",
    "--qd-glow": "rgba(59,130,246,0.35)",
  },
}

export function readDisplayAppearance(): QueueDisplayAppearance {
  if (typeof window === "undefined") return "light"
  const stored = window.localStorage.getItem(STORAGE_KEY)
  return stored === "dark" ? "dark" : "light"
}

export function persistDisplayAppearance(appearance: QueueDisplayAppearance) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(STORAGE_KEY, appearance)
}
