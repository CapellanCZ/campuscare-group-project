"use client"

import { useMemo, useState } from "react"
import { toast } from "sonner"

import {
  DemoPageHeader,
  DemoStatGrid,
  demoToast,
} from "@/components/demo/demo-page"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { can, getAccessLevel } from "@/lib/auth/permissions"
import type { StaffAccess } from "@/lib/auth/types"
import {
  demoCertificates,
  demoCertificateStats,
} from "@/lib/demo/fixtures"
import type { CertificateStatus } from "@/lib/demo/types"

export function CertificatesDemoPage({ access }: { access: StaffAccess }) {
  const [query, setQuery] = useState("")
  const d = access.designation
  const cardsLevel = getAccessLevel(d, "certificates.summary_cards")
  const canGenerate = can(d, "certificates.generate")

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return demoCertificates
    return demoCertificates.filter(
      (row) =>
        row.patientName.toLowerCase().includes(q) ||
        row.studentId.toLowerCase().includes(q) ||
        row.certificateType.toLowerCase().includes(q)
    )
  }, [query])

  function statusVariant(
    status: CertificateStatus
  ): "default" | "secondary" | "outline" {
    if (status === "issued") return "default"
    if (status === "printed") return "secondary"
    return "outline"
  }

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <DemoPageHeader
        title="Medical Certificates"
        description="Browse history and generate printable certificates"
        designation={d}
        actions={
          canGenerate ? (
            <Button
              onClick={() => toast.success(demoToast("Generate certificate"))}
            >
              Generate certificate
            </Button>
          ) : null
        }
      />

      {cardsLevel !== "none" ? (
        <DemoStatGrid stats={demoCertificateStats} />
      ) : null}

      <Card className="min-w-0 shadow-none dark:ring-0">
        <CardHeader className="flex flex-col gap-3 border-b sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base">
            Certificate history
            {cardsLevel === "view" ? (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                (view only)
              </span>
            ) : null}
          </CardTitle>
          {can(d, "certificates.search_patient") ? (
            <Input
              className="sm:w-72"
              placeholder="Search patient or certificate type"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          ) : null}
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Patient</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Issued</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <p className="font-medium">{row.patientName}</p>
                    <p className="text-xs text-muted-foreground">
                      {row.studentId}
                    </p>
                  </TableCell>
                  <TableCell>{row.certificateType}</TableCell>
                  <TableCell>
                    <p>{row.issuedAt}</p>
                    <p className="text-xs text-muted-foreground">
                      {row.issuedBy} · valid until {row.validUntil}
                    </p>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(row.status)}>
                      {row.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap justify-end gap-1">
                      {can(d, "certificates.view_history") ? (
                        <Button
                          size="xs"
                          variant="outline"
                          onClick={() =>
                            toast.info(demoToast("View certificate history"))
                          }
                        >
                          View
                        </Button>
                      ) : null}
                      {can(d, "certificates.preview") &&
                      row.status !== "draft" ? (
                        <Button
                          size="xs"
                          variant="outline"
                          onClick={() => toast.info(demoToast("Preview certificate"))}
                        >
                          Preview
                        </Button>
                      ) : null}
                      {can(d, "certificates.print") &&
                      row.status !== "draft" ? (
                        <Button
                          size="xs"
                          onClick={() => toast.success(demoToast("Print certificate"))}
                        >
                          Print
                        </Button>
                      ) : null}
                      {can(d, "certificates.download_pdf") &&
                      row.status !== "draft" ? (
                        <Button
                          size="xs"
                          variant="secondary"
                          onClick={() => toast.success(demoToast("Download PDF"))}
                        >
                          PDF
                        </Button>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
