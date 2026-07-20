export function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

export function maskEmail(email: string) {
  const [local, domain] = email.split("@")
  if (!local || !domain) return email

  if (local.length <= 2) {
    return `${local[0] ?? ""}*@${domain}`
  }

  return `${local.slice(0, 2)}${"*".repeat(Math.min(local.length - 2, 4))}@${domain}`
}
