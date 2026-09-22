"use client"

import { useTransition } from "react"
import { IconDownload } from "@tabler/icons-react"

import { downloadExcelData } from "@/features/admin/lib/excel"
import { exportPatientRecordsAction } from "@/features/patients/actions"
import {
  PATIENT_RECORD_EXPORT_HEADERS,
  patientRecordsExportFilename,
} from "@/features/patients/lib/export-patient-records"
import { Button } from "@/components/ui/button"
import { patientToasts } from "@/lib/feedback/toast-messages"
import { appToast } from "@/lib/feedback/app-toast"
import type { PatientType } from "@/types/patientRecord"

type PatientExportButtonProps = {
  query?: string
  patientType?: PatientType | "all"
  toolbar?: boolean
}

export function PatientExportButton({
  query = "",
  patientType = "all",
  toolbar = false,
}: PatientExportButtonProps) {
  const [pending, startTransition] = useTransition()

  function onExport() {
    startTransition(async () => {
      const result = await exportPatientRecordsAction({
        query,
        patientType,
      })

      if (!result.ok) {
        patientToasts.failed(result.error)
        return
      }

      if (result.data.rows.length === 0) {
        appToast.warning({
          title: "Nothing to export",
          description: "No patient records match the current filters.",
        })
        return
      }

      await downloadExcelData(
        patientRecordsExportFilename(patientType),
        [...PATIENT_RECORD_EXPORT_HEADERS],
        result.data.rows,
        "Patients"
      )

      appToast.success({
        title: "Export ready",
        description: `Downloaded ${result.data.rows.length} patient record${
          result.data.rows.length === 1 ? "" : "s"
        }.`,
      })
    })
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={toolbar ? "shrink-0" : undefined}
      disabled={pending}
      onClick={onExport}
    >
      <IconDownload data-icon="inline-start" aria-hidden="true" />
      {pending ? "Exporting…" : "Export"}
    </Button>
  )
}
