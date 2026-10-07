"use client"

import { useTransition } from "react"
import { IconDownload } from "@tabler/icons-react"

import { downloadExcelWorkbook } from "@/features/admin/lib/excel"
import { exportPatientRecordsAction } from "@/features/patients/actions"
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

      if (result.data.patientCount === 0 || result.data.sheets.length === 0) {
        appToast.warning({
          title: "Nothing to export",
          description: "No patient records match the current filters.",
        })
        return
      }

      await downloadExcelWorkbook(result.data.filename, result.data.sheets)

      const sheetCount = result.data.sheets.length
      appToast.success({
        title: "Export ready",
        description: `Downloaded ${result.data.patientCount} patient record${
          result.data.patientCount === 1 ? "" : "s"
        } across ${sheetCount} sheet${sheetCount === 1 ? "" : "s"}.`,
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
