"use client"

import { ReportPeriodFilter } from "@/features/reports/components/report-period-filter"
import { catalogFor } from "@/features/reports/role-catalog"
import type { ReportFilters } from "@/features/reports/types"
import type { ClinicDesignation } from "@/lib/auth/types"

const selectClass =
  "h-9 w-full min-w-0 rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"

export function ReportsFilterBar({
  designation,
  filters,
  personnelOptions,
  statusOptions,
  onChange,
  hidePersonnel = false,
  pending = false,
  onApplyCustom,
}: {
  designation: ClinicDesignation
  filters: ReportFilters
  personnelOptions: string[]
  statusOptions: string[]
  onChange: (next: Partial<ReportFilters>) => void
  hidePersonnel?: boolean
  pending?: boolean
  onApplyCustom?: (next: Pick<ReportFilters, "reportPeriod" | "dateFrom" | "dateTo">) => void
}) {
  const catalog = catalogFor(designation)

  return (
    <div className="flex flex-col gap-4">
      <ReportPeriodFilter
        filters={filters}
        pending={pending}
        onChange={onChange}
        onApplyCustom={onApplyCustom}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <label className="flex min-w-0 flex-col gap-1.5 text-xs text-muted-foreground">
          Consultation type
          <select
            className={selectClass}
            value={filters.consultationType}
            disabled={catalog.lockConsultationType || pending}
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
            disabled={pending}
            onChange={(e) =>
              onChange({
                patientType: e.target.value as ReportFilters["patientType"],
              })
            }
          >
            <option value="all">All</option>
            <option value="student">Student</option>
            <option value="faculty">Faculty</option>
            <option value="employee">Employee</option>
          </select>
        </label>
        {hidePersonnel ? null : (
          <label className="flex min-w-0 flex-col gap-1.5 text-xs text-muted-foreground">
            Assigned personnel
            <select
              className={selectClass}
              value={filters.assignedPersonnel}
              disabled={pending}
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
        )}
        <label className="flex min-w-0 flex-col gap-1.5 text-xs text-muted-foreground">
          Status
          <select
            className={selectClass}
            value={filters.status}
            disabled={pending}
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
