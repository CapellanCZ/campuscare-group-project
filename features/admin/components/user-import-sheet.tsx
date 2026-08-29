"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { appToast } from "@/lib/feedback/app-toast"
import { staffToasts } from "@/lib/feedback/toast-messages"
import { IconDownload, IconFileSpreadsheet, IconUpload } from "@tabler/icons-react"

import { importStaffUsersFromExcel } from "@/features/admin/actions/user-management"
import { downloadExcelTemplate } from "@/features/admin/lib/excel"
import type { DirectoryConfig } from "@/features/admin/lib/user-directory-config"
import { Button } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

type UserImportSheetProps = {
  config: DirectoryConfig
  onImported: () => void
  /** Compact outline trigger for card toolbars */
  toolbar?: boolean
}

export function UserImportSheet({
  config,
  onImported,
  toolbar = false,
}: UserImportSheetProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    const formData = new FormData(event.currentTarget)

    startTransition(async () => {
      const result = await importStaffUsersFromExcel(formData, {
        allowedRoles: [...config.roles],
      })

      if (!result.ok) {
        setError(result.error)
        staffToasts.failed(result.error)
        return
      }

      appToast.success({ title: result.message })
      if (result.warning) appToast.warning({ title: result.warning })
      setOpen(false)
      onImported()
      router.refresh()
    })
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setError(null)
      }}
    >
      <SheetTrigger
        render={
          <Button
            variant="outline"
            className={toolbar ? "shrink-0" : undefined}
          />
        }
      >
        <IconUpload data-icon="inline-start" aria-hidden="true" />
        {config.importTitle}
      </SheetTrigger>
      <SheetContent className="flex flex-col gap-0 sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{config.importTitle}</SheetTitle>
          <SheetDescription>{config.importDescription}</SheetDescription>
        </SheetHeader>
        <form
          className="flex min-h-0 flex-1 flex-col gap-4 px-4 py-4"
          onSubmit={onSubmit}
        >
          <p className="text-sm text-muted-foreground">
            Columns:{" "}
            <span className="font-medium text-foreground">
              {config.templateHeaders.join(", ")}
            </span>
            {config.importRoleHint ? (
              <>
                {" "}
                (Role: {config.importRoleHint})
              </>
            ) : null}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-fit"
            disabled={pending}
            onClick={() => {
              void downloadExcelTemplate(
                config.templateFilename,
                [...config.templateHeaders],
                config.templateSampleRows
              )
            }}
          >
            <IconDownload data-icon="inline-start" aria-hidden="true" />
            Download template
          </Button>
          <Field data-invalid={error ? true : undefined}>
            <FieldLabel htmlFor={`import-${config.templateFilename}`}>
              Excel file (.xlsx)
            </FieldLabel>
            <Input
              id={`import-${config.templateFilename}`}
              name="file"
              type="file"
              accept=".xlsx,.xls,.csv"
              required
              disabled={pending}
            />
          </Field>
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <SheetFooter className="mt-auto px-0">
            <Button type="submit" disabled={pending} className="w-full">
              <IconFileSpreadsheet data-icon="inline-start" aria-hidden="true" />
              {pending ? "Importing…" : "Import roster"}
            </Button>
            <SheetClose render={<Button type="button" variant="outline" />}>
              Cancel
            </SheetClose>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
