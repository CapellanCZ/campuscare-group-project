import { cn } from "@/lib/utils"

/** Soft page wash so elevated cards read clearly on admin surfaces. */
export const adminPageClassName = "flex flex-1 flex-col gap-6 bg-transparent"

/** Elevated card chrome — admin ops only (clinical layouts stay flush). */
export const adminElevatedCardClassName =
  "rounded-xl border bg-card shadow-sm dark:ring-0"

export function adminPageShellClassName(...parts: Array<string | undefined>) {
  return cn(adminPageClassName, ...parts)
}
