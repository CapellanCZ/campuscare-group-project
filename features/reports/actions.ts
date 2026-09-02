"use server"

import { loadReportsBundle } from "@/features/reports/data/queries"
import { getClinicReport } from "@/services/reports"
import { getStaffAccess } from "@/lib/auth/access"
import type { ClinicDesignation } from "@/lib/auth/types"
import type { ReportFilters, ReportsBundle } from "@/features/reports/types"
import {
  ReportServiceError,
  type ClinicReportBundle,
  type ReportRange,
} from "@/types/report"

export type ReportActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; code: string }

function toErrorResult(error: unknown): ReportActionResult<never> {
  if (error instanceof ReportServiceError) {
    return { ok: false, error: error.message, code: error.code }
  }
  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    if (
      message.includes("fetch failed") ||
      message.includes("network") ||
      message.includes("failed to fetch")
    ) {
      return {
        ok: false,
        error:
          "Unable to reach the database. Check your connection and try again.",
        code: "offline",
      }
    }
    return { ok: false, error: error.message, code: "unknown" }
  }
  return {
    ok: false,
    error: "Something went wrong while loading reports.",
    code: "unknown",
  }
}

export async function fetchReportsBundleAction(
  designation: ClinicDesignation,
  filters?: Partial<ReportFilters>
): Promise<ReportActionResult<ReportsBundle>> {
  try {
    const access = await getStaffAccess()
    if (!access?.hasClinicMembership) {
      return { ok: false, error: "Unauthorized.", code: "unauthorized" }
    }
    if (
      access.designation !== designation &&
      access.designation !== "admin"
    ) {
      return {
        ok: false,
        error: "You do not have access to these reports.",
        code: "forbidden",
      }
    }
    if (
      designation === "physician" &&
      filters?.consultationType &&
      filters.consultationType !== "medical"
    ) {
      return {
        ok: false,
        error: "Medical reports cannot include dental consultation data.",
        code: "forbidden",
      }
    }
    if (
      designation === "dentist" &&
      filters?.consultationType &&
      filters.consultationType !== "dental"
    ) {
      return {
        ok: false,
        error: "Dental reports cannot include medical consultation data.",
        code: "forbidden",
      }
    }

    const data = await loadReportsBundle(designation, filters)
    if (data.error) {
      return { ok: false, error: data.error, code: "database" }
    }
    return { ok: true, data }
  } catch (error) {
    return toErrorResult(error)
  }
}

export async function fetchClinicReportAction(
  range: ReportRange = "30d"
): Promise<ReportActionResult<ClinicReportBundle>> {
  try {
    const data = await getClinicReport(range)
    return { ok: true, data }
  } catch (error) {
    return toErrorResult(error)
  }
}
