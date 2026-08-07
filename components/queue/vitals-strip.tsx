import type { QueueVitals } from "@/lib/health/types"
import { cn } from "@/lib/utils"

export function hasRecordedVitals(vitals: QueueVitals) {
  return (
    vitals.bpSystolic != null ||
    vitals.bpDiastolic != null ||
    vitals.heartRate != null ||
    vitals.temperatureC != null ||
    vitals.spo2 != null ||
    vitals.heightCm != null ||
    vitals.weightKg != null ||
    vitals.respiratoryRate != null
  )
}

export function formatBloodPressure(vitals: QueueVitals) {
  if (vitals.bpSystolic == null && vitals.bpDiastolic == null) return null
  return `${vitals.bpSystolic ?? "—"}/${vitals.bpDiastolic ?? "—"}`
}

export function formatVitalsLine(vitals: QueueVitals) {
  if (!hasRecordedVitals(vitals)) return null
  const parts: string[] = []
  const bp = formatBloodPressure(vitals)
  if (bp) parts.push(`BP ${bp}`)
  if (vitals.heartRate != null) parts.push(`HR ${vitals.heartRate}`)
  if (vitals.temperatureC != null) parts.push(`${vitals.temperatureC}°C`)
  if (vitals.spo2 != null) parts.push(`SpO₂ ${vitals.spo2}%`)
  if (vitals.heightCm != null) parts.push(`${vitals.heightCm} cm`)
  if (vitals.weightKg != null) parts.push(`${vitals.weightKg} kg`)
  if (vitals.respiratoryRate != null) parts.push(`RR ${vitals.respiratoryRate}`)
  return parts.join(" · ")
}

export function VitalsStrip({
  vitals,
  chiefComplaint,
  className,
  dense = false,
}: {
  vitals: QueueVitals
  chiefComplaint?: string | null
  className?: string
  dense?: boolean
}) {
  const items = [
    { label: "BP", value: formatBloodPressure(vitals) },
    {
      label: "HR",
      value: vitals.heartRate != null ? String(vitals.heartRate) : null,
    },
    {
      label: "Temp",
      value:
        vitals.temperatureC != null ? `${vitals.temperatureC}°C` : null,
    },
    {
      label: "SpO₂",
      value: vitals.spo2 != null ? `${vitals.spo2}%` : null,
    },
    {
      label: "Ht",
      value: vitals.heightCm != null ? `${vitals.heightCm}` : null,
    },
    {
      label: "Wt",
      value: vitals.weightKg != null ? `${vitals.weightKg}` : null,
    },
    {
      label: "RR",
      value:
        vitals.respiratoryRate != null ? String(vitals.respiratoryRate) : null,
    },
  ].filter((item) => item.value)

  if (items.length === 0 && !chiefComplaint?.trim()) {
    return (
      <p className={cn("text-xs text-muted-foreground", className)}>
        No nurse vitals yet
      </p>
    )
  }

  return (
    <div className={cn("space-y-1.5", className)}>
      {items.length > 0 ? (
        <div
          className={cn(
            "flex flex-wrap gap-1.5",
            dense ? "gap-1" : "gap-1.5"
          )}
        >
          {items.map((item) => (
            <span
              key={item.label}
              className={cn(
                "inline-flex items-center gap-1 rounded-md border border-border/70 bg-muted/40 px-2 py-0.5 font-medium tabular-nums text-foreground",
                dense ? "text-[11px]" : "text-xs"
              )}
            >
              <span className="text-muted-foreground">{item.label}</span>
              {item.value}
            </span>
          ))}
        </div>
      ) : null}
      {chiefComplaint?.trim() ? (
        <p
          className={cn(
            "text-muted-foreground",
            dense ? "text-[11px]" : "text-xs"
          )}
        >
          <span className="font-medium text-foreground/80">CC:</span>{" "}
          {chiefComplaint.trim()}
        </p>
      ) : null}
    </div>
  )
}
