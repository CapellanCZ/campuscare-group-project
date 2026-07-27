"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { CertificatePrintView } from "@/components/certificates/certificate-print-view"
import {
  certificateStatusLabel,
  formatCertificateDate,
  formatCertificateDateTime,
} from "@/features/certificates/lib/format"
import type {
  MedicalCertificate,
  MedicalCertificateStatus,
} from "@/types/medicalCertificate"

function statusVariant(
  status: MedicalCertificateStatus
): "default" | "secondary" | "outline" {
  if (status === "issued") return "default"
  if (status === "printed") return "secondary"
  return "outline"
}

function DetailRow({
  label,
  value,
}: {
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="grid gap-1 border-b py-3 last:border-b-0 sm:grid-cols-[140px_1fr] sm:gap-4">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium break-words">{value}</dd>
    </div>
  )
}

export function CertificateDetailSheet({
  certificate,
  open,
  onOpenChange,
  canPrint,
}: {
  certificate: MedicalCertificate | null
  open: boolean
  onOpenChange: (open: boolean) => void
  canPrint: boolean
}) {
  function handlePrint() {
    if (!certificate) return
    window.print()
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="flex w-full flex-col gap-0 sm:max-w-lg print:hidden">
          <SheetHeader className="border-b">
            <SheetTitle>Certificate details</SheetTitle>
            <SheetDescription>
              Full medical certificate record
            </SheetDescription>
          </SheetHeader>

          {certificate ? (
            <div className="flex-1 overflow-y-auto px-6">
              <dl>
                <DetailRow
                  label="Patient"
                  value={certificate.patient.fullName}
                />
                <DetailRow
                  label="Student number"
                  value={certificate.patient.studentId ?? "—"}
                />
                <DetailRow
                  label="Certificate number"
                  value={certificate.certificateNumber}
                />
                <DetailRow
                  label="Certificate type"
                  value={certificate.certificateType}
                />
                <DetailRow
                  label="Purpose"
                  value={certificate.purpose ?? "—"}
                />
                <DetailRow
                  label="Doctor"
                  value={certificate.doctorName ?? "—"}
                />
                <DetailRow
                  label="Issue date"
                  value={formatCertificateDateTime(certificate.issuedAt)}
                />
                <DetailRow
                  label="Validity date"
                  value={formatCertificateDate(certificate.validUntil)}
                />
                <DetailRow
                  label="Status"
                  value={
                    <Badge variant={statusVariant(certificate.status)}>
                      {certificateStatusLabel(certificate.status)}
                    </Badge>
                  }
                />
                <DetailRow
                  label="Remarks"
                  value={certificate.remarks ?? "—"}
                />
                <DetailRow
                  label="Created"
                  value={formatCertificateDateTime(certificate.createdAt)}
                />
                <DetailRow
                  label="Updated"
                  value={formatCertificateDateTime(certificate.updatedAt)}
                />
              </dl>
            </div>
          ) : null}

          <SheetFooter className="border-t sm:flex-row">
            {canPrint &&
            certificate &&
            certificate.status !== "draft" ? (
              <Button onClick={handlePrint}>Print</Button>
            ) : null}
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {certificate ? (
        <CertificatePrintView certificate={certificate} />
      ) : null}
    </>
  )
}
