"use client"

import { useRef, useState, useTransition } from "react"
import {
  IconDownload,
  IconFileSpreadsheet,
  IconUpload,
} from "@tabler/icons-react"

import { appToast } from "@/lib/feedback/app-toast"
import { patientToasts } from "@/lib/feedback/toast-messages"
import { importPatientRecordsFromExcelAction } from "@/features/patients/actions"
import { downloadExcelTemplate } from "@/features/admin/lib/excel"
import { Button } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

const IMPORT_TOAST_ID = "patient-import-progress"

const TEMPLATE_HEADERS = [
  "patient_type",
  "id_number",
  "first_name",
  "middle_name",
  "last_name",
  "course",
  "year_level",
  "gender",
  "birth_date",
  "phone",
  "email",
] as const

const TEMPLATE_SAMPLE_ROWS = [
  [
    "student",
    "2024-001",
    "Juan",
    "Reyes",
    "Dela Cruz",
    "BSIT",
    "3",
    "male",
    "2004-05-12",
    "09171234567",
    "juan@example.com",
  ],
  [
    "faculty",
    "FAC-12",
    "Maria",
    "",
    "Santos",
    "",
    "",
    "female",
    "1988-02-01",
    "09179876543",
    "maria.santos@example.com",
  ],
  [
    "employee",
    "2026-00100",
    "Juan",
    "",
    "Reyes",
    "",
    "",
    "male",
    "1990-06-15",
    "09171234567",
    "juan.reyes@example.com",
  ],
]

type PatientImportSheetProps = {
  onImported: () => void
  toolbar?: boolean
}

function estimateImportDurationMs(file: File | null) {
  if (!file) return 8_000
  // Rough pacing: ~1.2s per 100KB, clamped for small/large files.
  return Math.min(45_000, Math.max(4_000, Math.round(file.size / 100_000) * 1_200))
}

export function PatientImportSheet({
  onImported,
  toolbar = false,
}: PatientImportSheetProps) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  function clearProgressTimer() {
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current)
      progressTimerRef.current = null
    }
  }

  function startProgressToast(file: File | null) {
    clearProgressTimer()
    const startedAt = Date.now()
    const durationMs = estimateImportDurationMs(file)
    let percent = 2

    appToast.progress(
      {
        title: "Importing patients",
        percent,
        hint: fileName
          ? `Uploading ${fileName}…`
          : "Please keep this tab open.",
      },
      IMPORT_TOAST_ID
    )

    progressTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - startedAt
      // Ease toward 92% while the server works; finish jumps to 100%.
      const target = Math.min(92, Math.round((elapsed / durationMs) * 92))
      percent = Math.max(percent, target)
      appToast.progress(
        {
          title: "Importing patients",
          percent,
          hint:
            percent < 40
              ? "Reading your Excel file…"
              : percent < 75
                ? "Saving patient records…"
                : "Almost done…",
        },
        IMPORT_TOAST_ID
      )
    }, 250)
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    const form = event.currentTarget
    const formData = new FormData(form)
    const file = formData.get("file")
    const upload = file instanceof File ? file : null

    startProgressToast(upload)

    startTransition(async () => {
      const result = await importPatientRecordsFromExcelAction(formData)
      clearProgressTimer()

      if (!result.ok) {
        appToast.error(
          {
            title: "Import failed",
            description: result.error,
          },
          IMPORT_TOAST_ID
        )
        setError(result.error)
        patientToasts.failed(result.error)
        return
      }

      appToast.progress(
        {
          title: "Importing patients",
          percent: 100,
          hint: "Finishing up…",
        },
        IMPORT_TOAST_ID
      )

      window.setTimeout(() => {
        appToast.success(
          {
            title: "Import complete",
            description: result.message.replace(/^Import complete:\s*/i, ""),
          },
          IMPORT_TOAST_ID
        )
        if (result.warning) {
          appToast.warning({
            title: "Some rows need attention",
            description: result.warning,
          })
        }
      }, 280)

      setOpen(false)
      setFileName(null)
      form.reset()
      onImported()
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (pending && !next) return
        setOpen(next)
        if (!next) {
          setError(null)
          setFileName(null)
        }
      }}
    >
      <DialogTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className={toolbar ? "shrink-0" : undefined}
          />
        }
      >
        <IconUpload data-icon="inline-start" aria-hidden="true" />
        Import patients
      </DialogTrigger>
      <DialogContent className="flex max-h-[min(90vh,640px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
        <DialogHeader className="border-b px-6 py-5 text-left">
          <DialogTitle>Import patients</DialogTitle>
          <DialogDescription>
            Add many patients at once from an Excel file. Download the template
            if you need a ready-made format.
          </DialogDescription>
        </DialogHeader>
        <form
          className="flex min-h-0 flex-1 flex-col gap-5 px-6 py-5"
          onSubmit={onSubmit}
        >
          <div className="space-y-3 rounded-xl border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
            <p>
              <span className="font-medium text-foreground">Campus roster</span>
              {" — "}
              Use the template or any campus Excel list with patient type, ID
              number, name, and course. Large files are imported in batches.
            </p>
            <p>
              <span className="font-medium text-foreground">
                CampusCare export
              </span>
              {" — "}
              Re-upload a file previously exported from Patient Records. Your
              role only restores the clinical details you are allowed to see.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full sm:w-fit"
              disabled={pending}
              onClick={() => {
                void downloadExcelTemplate(
                  "patient-records-import-template.xlsx",
                  [...TEMPLATE_HEADERS],
                  TEMPLATE_SAMPLE_ROWS
                )
              }}
            >
              <IconDownload data-icon="inline-start" aria-hidden="true" />
              Download template
            </Button>

            <Field data-invalid={error ? true : undefined}>
              <FieldLabel htmlFor="import-patient-records">
                Excel file (.xlsx)
              </FieldLabel>
              <Input
                id="import-patient-records"
                name="file"
                type="file"
                accept=".xlsx,.xls,.csv"
                required
                disabled={pending}
                onChange={(event) => {
                  const next = event.target.files?.[0]
                  setFileName(next?.name ?? null)
                  setError(null)
                }}
              />
              {fileName ? (
                <p className="text-xs text-muted-foreground">
                  Selected: {fileName}
                </p>
              ) : null}
            </Field>
          </div>

          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}

          <DialogFooter className="mt-auto gap-2 border-t px-0 pt-4 sm:justify-stretch">
            <Button
              type="submit"
              disabled={pending}
              className="w-full sm:flex-1"
            >
              <IconFileSpreadsheet
                data-icon="inline-start"
                aria-hidden="true"
              />
              {pending ? "Importing…" : "Start import"}
            </Button>
            <DialogClose
              render={
                <Button
                  type="button"
                  variant="outline"
                  className="w-full sm:w-auto"
                  disabled={pending}
                />
              }
            >
              Cancel
            </DialogClose>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
