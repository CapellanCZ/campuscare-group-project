"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  REPORT_PERIOD_LABELS,
  REPORT_PERIOD_PRESETS,
  resolveReportPeriod,
  validateCustomRange,
  type ReportPeriodPreset,
} from "@/features/reports/lib/report-period"
import type { ReportFilters } from "@/features/reports/types"

type PeriodChange = Pick<ReportFilters, "reportPeriod" | "dateFrom" | "dateTo">

export function ReportPeriodFilter({
  filters,
  onChange,
  onApplyCustom,
  pending = false,
}: {
  filters: ReportFilters
  onChange: (next: PeriodChange) => void
  onApplyCustom?: (next: PeriodChange) => void
  pending?: boolean
}) {
  const customError =
    filters.reportPeriod === "custom"
      ? validateCustomRange(filters.dateFrom, filters.dateTo)
      : null

  function selectPreset(preset: ReportPeriodPreset) {
    if (preset === "custom") {
      onChange({
        reportPeriod: "custom",
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
      })
      return
    }
    const resolved = resolveReportPeriod(preset)
    onChange({
      reportPeriod: preset,
      dateFrom: resolved.dateFrom,
      dateTo: resolved.dateTo,
    })
  }

  function applyCustom() {
    const resolved = resolveReportPeriod(
      "custom",
      filters.dateFrom,
      filters.dateTo
    )
    if (resolved.error) return
    const next = {
      reportPeriod: "custom" as const,
      dateFrom: resolved.dateFrom,
      dateTo: resolved.dateTo,
    }
    if (onApplyCustom) onApplyCustom(next)
    else onChange(next)
  }

  function clearCustom() {
    const resolved = resolveReportPeriod("this_month")
    onChange({
      reportPeriod: "this_month",
      dateFrom: resolved.dateFrom,
      dateTo: resolved.dateTo,
    })
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {REPORT_PERIOD_PRESETS.map((preset) => (
          <Button
            key={preset}
            type="button"
            size="sm"
            variant={filters.reportPeriod === preset ? "default" : "outline"}
            disabled={pending}
            onClick={() => selectPreset(preset)}
          >
            {REPORT_PERIOD_LABELS[preset]}
          </Button>
        ))}
      </div>

      {filters.reportPeriod === "custom" ? (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="flex min-w-0 flex-col gap-1.5 text-xs text-muted-foreground">
              From Date
              <Input
                type="date"
                value={filters.dateFrom}
                disabled={pending}
                onChange={(event) =>
                  onChange({
                    reportPeriod: "custom",
                    dateFrom: event.target.value,
                    dateTo: filters.dateTo,
                  })
                }
              />
            </label>
            <label className="flex min-w-0 flex-col gap-1.5 text-xs text-muted-foreground">
              To Date
              <Input
                type="date"
                value={filters.dateTo}
                disabled={pending}
                onChange={(event) =>
                  onChange({
                    reportPeriod: "custom",
                    dateFrom: filters.dateFrom,
                    dateTo: event.target.value,
                  })
                }
              />
            </label>
          </div>
          {customError ? (
            <p className="text-sm text-destructive" role="alert">
              {customError}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              disabled={pending || Boolean(customError)}
              onClick={applyCustom}
            >
              Apply Filter
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={clearCustom}
            >
              Clear Filter
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
