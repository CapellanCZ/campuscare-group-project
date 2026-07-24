"use client"

import { IconDownload, IconFileSpreadsheet } from "@tabler/icons-react"

import { downloadExcelTemplate } from "@/features/admin/lib/excel"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type BulkExcelImportCardProps = {
  title: string
  description: string
  templateFilename: string
  templateHeaders: string[]
  templateSampleRows?: string[][]
  action: (formData: FormData) => void | Promise<void>
}

export function BulkExcelImportCard({
  title,
  description,
  templateFilename,
  templateHeaders,
  templateSampleRows = [],
  action,
}: BulkExcelImportCardProps) {
  return (
    <div className="space-y-3 rounded-2xl border border-border bg-muted/20 p-4">
      <div className="space-y-1">
        <h3 className="text-sm font-semibold tracking-wide">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            void downloadExcelTemplate(
              templateFilename,
              templateHeaders,
              templateSampleRows
            )
          }}
        >
          <IconDownload data-icon="inline-start" aria-hidden />
          Download template
        </Button>
      </div>

      <form action={action} className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
        <div className="space-y-2">
          <Label htmlFor={`excel-${templateFilename}`}>Excel file (.xlsx)</Label>
          <Input
            id={`excel-${templateFilename}`}
            name="file"
            type="file"
            accept=".xlsx,.xls,.csv"
            required
          />
        </div>
        <Button type="submit">
          <IconFileSpreadsheet data-icon="inline-start" aria-hidden />
          Import
        </Button>
      </form>
    </div>
  )
}
