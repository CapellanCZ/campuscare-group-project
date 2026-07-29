"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { catalogFor } from "@/features/reports/role-catalog"
import type { ReportFilters } from "@/features/reports/types"
import type { ClinicDesignation } from "@/lib/auth/types"

function rangeDaysActive(filters: ReportFilters): 7 | 30 | 90 | null {
  const to = new Date(`${filters.dateTo}T12:00:00`)
  const from = new Date(`${filters.dateFrom}T12:00:00`)
  if (Number.isNaN(to.getTime()) || Number.isNaN(from.getTime())) return null
  const days = Math.round((to.getTime() - from.getTime()) / 86_400_000) + 1
  if (days === 7) return 7
  if (days === 30) return 30
  if (days === 90) return 90
  return null
}

export function ReportsFilterBar({
  designation,
  filters,
  personnelOptions,
  statusOptions,
  onChange,
}: {
  designation: ClinicDesignation
  filters: ReportFilters
  personnelOptions: string[]
  statusOptions: string[]
  onChange: (next: Partial<ReportFilters>) => void
}) {
  const catalog = catalogFor(designation)
  const activeRange = rangeDaysActive(filters)
  const selectClass =
    "h-9 w-full min-w-0 rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"

  function setQuickRange(days: 7 | 30 | 90) {
    const to = new Date()
    const from = new Date()
    from.setDate(from.getDate() - (days - 1))
    onChange({
      dateFrom: from.toISOString().slice(0, 10),
      dateTo: to.toISOString().slice(0, 10),
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
        <label className="flex min-w-40 flex-1 flex-col gap-1.5 text-xs text-muted-foreground">
          From
          <Input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => onChange({ dateFrom: e.target.value })}
          />
        </label>
        <label className="flex min-w-40 flex-1 flex-col gap-1.5 text-xs text-muted-foreground">
          To
          <Input
            type="date"
            value={filters.dateTo}
            onChange={(e) => onChange({ dateTo: e.target.value })}
          />
        </label>
        <div className="flex flex-wrap gap-2 pb-0.5">
          {([7, 30, 90] as const).map((days) => (
            <Button
              key={days}
              size="sm"
              variant={activeRange === days ? "default" : "outline"}
              onClick={() => setQuickRange(days)}
            >
              Last {days}d
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <label className="flex min-w-0 flex-col gap-1.5 text-xs text-muted-foreground">
          Consultation type
          <select
            className={selectClass}
            value={filters.consultationType}
            disabled={catalog.lockConsultationType}
            onChange={(e) =>
              onChange({
                consultationType: e.target
                  .value as ReportFilters["consultationType"],
              })
            }
          >
            <option value="all">All</option>
            <option value="medical">Medical</option>
            <option value="dental">Dental</option>
          </select>
        </label>
        <label className="flex min-w-0 flex-col gap-1.5 text-xs text-muted-foreground">
          Patient type
          <select
            className={selectClass}
            value={filters.patientType}
            onChange={(e) =>
              onChange({
                patientType: e.target.value as ReportFilters["patientType"],
              })
            }
          >
            <option value="all">All</option>
            <option value="student">Student</option>
            <option value="faculty">Faculty / Employee</option>
          </select>
        </label>
        <label className="flex min-w-0 flex-col gap-1.5 text-xs text-muted-foreground">
          Assigned personnel
          <select
            className={selectClass}
            value={filters.assignedPersonnel}
            onChange={(e) => onChange({ assignedPersonnel: e.target.value })}
          >
            <option value="all">All</option>
            {personnelOptions.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-w-0 flex-col gap-1.5 text-xs text-muted-foreground">
          Status
          <select
            className={selectClass}
            value={filters.status}
            onChange={(e) => onChange({ status: e.target.value })}
          >
            <option value="all">All</option>
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  )
}
