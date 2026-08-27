"use client"

import { ISSUE_DOCUMENT_TYPE_OPTIONS } from "@/features/medical-documents/lib/document-labels"
import type { MedicalDocumentType } from "@/types/medicalDocument"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export function IssueDocumentTypeDialog({
  open,
  onOpenChange,
  onSelect,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (type: MedicalDocumentType) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Issue Medical Document</DialogTitle>
          <DialogDescription>
            Choose the official HSO document type to issue for this consultation.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          {ISSUE_DOCUMENT_TYPE_OPTIONS.map((option) => (
            <button
              key={option.type}
              type="button"
              className="w-full rounded-xl border border-border/70 p-4 text-left transition hover:border-primary/40 hover:bg-muted/40"
              onClick={() => {
                onSelect(option.type)
                onOpenChange(false)
              }}
            >
              <p className="font-medium">{option.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {option.description}
              </p>
            </button>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
