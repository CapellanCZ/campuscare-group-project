"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { catalogFor } from "@/features/reports/role-catalog"
import type { ReportFilters } from "@/features/reports/types"
import type { ClinicDesignation } from "@/lib/auth/types"

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
  const selectClass =
    "h-9 w-full min-w-0 rounded-4xl border border-border bg-input/30 px-3 text-sm sm:w-auto"

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <label className="flex min-w-0 flex-col gap-1 text-xs text-muted-foreground">
          From
          <Input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => onChange({ dateFrom: e.target.value })}
          />
        </label>
        <label className="flex min-w-0 flex-col gap-1 text-xs text-muted-foreground">
          To
          <Input
            type="date"
            value={filters.dateTo}
            onChange={(e) => onChange({ dateTo: e.target.value })}
          />
        </label>
        <label className="flex min-w-0 flex-col gap-1 text-xs text-muted-foreground">
          Consultation type
          <select
            className={selectClass}
            value={filters.consultationType}
            disabled={catalog.lockConsultationType}
            onChange={(e) =>
              onChange({
                consultationType: e.target.value as ReportFilters["consultationType"],
              })
            }
          >
            <option value="all">All</option>
            <option value="medical">Medical</option>
            <option value="dental">Dental</option>
          </select>
        </label>
        <label className="flex min-w-0 flex-col gap-1 text-xs text-muted-foreground">
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
        <label className="flex min-w-0 flex-col gap-1 text-xs text-muted-foreground">
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
        <label className="flex min-w-0 flex-col gap-1 text-xs text-muted-foreground">
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
      <div className="flex flex-wrap gap-2">
        {[7, 30, 90].map((days) => (
          <Button
            key={days}
            size="sm"
            variant="outline"
            onClick={() => {
              const to = new Date()
              const from = new Date()
              from.setDate(from.getDate() - days)
              onChange({
                dateFrom: from.toISOString().slice(0, 10),
                dateTo: to.toISOString().slice(0, 10),
              })
            }}
          >
            Last {days}d
          </Button>
        ))}
      </div>
    </div>
  )
}
