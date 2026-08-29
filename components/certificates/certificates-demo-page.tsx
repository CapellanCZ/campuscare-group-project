"use client"

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react"
import { documentToasts } from "@/lib/feedback/toast-messages"
import { IconFileText, IconPrinter, IconFileTypePdf } from "@tabler/icons-react"

import { DocumentDetailSheet } from "@/components/medical-documents/document-detail-sheet"
import { DocumentPreviewDialog } from "@/components/medical-documents/document-preview-dialog"
import { documentTypeLabel } from "@/components/medical-documents/document-print-view"
import { MedicalDocumentPrintView } from "@/components/medical-documents/document-print-view"
import { CertificateDeleteDialog } from "@/components/certificates/certificate-delete-dialog"
import { CertificateFormSheet } from "@/components/certificates/certificate-form-sheet"
import { StudentIdSearchInput } from "@/components/shared/student-id-search-input"
import { DENTIST_PATIENT_SEARCH_PLACEHOLDER } from "@/lib/students/patient-search-copy"
import { DemoPageHeader, DemoStatGrid } from "@/components/demo/demo-page"
import {
  formatCertificateDateTime,
} from "@/features/certificates/lib/format"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  fetchMedicalCertificateStatsAction,
} from "@/features/certificates/actions"
import {
  fetchMedicalDocumentsAction,
  logMedicalDocumentViewAction,
} from "@/features/medical-documents/actions"
import { can, canMutate, getAccessLevel } from "@/lib/auth/permissions"
import type { StaffAccess } from "@/lib/auth/types"
import type { DemoStat } from "@/lib/demo/types"
import { cn } from "@/lib/utils"
import type {
  MedicalCertificate,
  MedicalCertificateStats,
} from "@/types/medicalCertificate"
import {
  DOCUMENT_STATUS_FILTER_OPTIONS,
  documentStatusLabel,
  documentStatusVariant,
} from "@/features/medical-documents/lib/document-status"
import { triggerMedicalDocumentPrint } from "@/lib/print/trigger-medical-document-print"
import {
  DOCUMENT_TYPE_LABELS,
  MEDICAL_DOCUMENT_TYPES,
  type MedicalDocument,
  type MedicalDocumentListResult,
  type MedicalDocumentStatus,
  type MedicalDocumentType,
} from "@/types/medicalDocument"
import { useStaffRealtimeRefresh } from "@/hooks/use-staff-realtime-refresh"
import { STAFF_REALTIME_TABLES } from "@/lib/health/realtime"

const PAGE_SIZE = 10
const SEARCH_DEBOUNCE_MS = 300

function toStatCards(stats: MedicalCertificateStats): DemoStat[] {
  return [
    {
      key: "issued",
      label: "Issued this month",
      value: String(stats.issuedThisMonth),
      description: "All types",
    },
    {
      key: "today",
      label: "Issued today",
      value: String(stats.issuedToday),
      description: "Ready to print",
    },
    {
      key: "draft",
      label: "Drafts",
      value: String(stats.drafts),
      description: "Incomplete",
    },
    {
      key: "pending",
      label: "Pending request",
      value: String(stats.pending),
      description: "From consultations",
    },
  ]
}

function CertificatesTableSkeleton() {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="flex items-center gap-3">
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-36" />
          <Skeleton className="h-10 w-20" />
          <Skeleton className="h-10 w-28" />
        </div>
      ))}
    </div>
  )
}

export function CertificatesPage({
  access,
  initialList,
  initialStats,
  initialError,
}: {
  access: StaffAccess
  initialList: MedicalDocumentListResult
  initialStats: MedicalCertificateStats
  initialError?: string | null
}) {
  const [query, setQuery] = useState("")
  const [debouncedQuery, setDebouncedQuery] = useState("")
  const [page, setPage] = useState(1)
  const [list, setList] = useState(initialList)
  const [stats, setStats] = useState(initialStats)
  const [loading, setLoading] = useState(false)
  const [documentTypeFilter, setDocumentTypeFilter] = useState<
    MedicalDocumentType | "all"
  >("all")
  const [statusFilter, setStatusFilter] = useState<MedicalDocumentStatus | "all">(
    "all"
  )
  const [selected, setSelected] = useState<MedicalDocument | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<"create" | "edit">("create")
  const [editing, setEditing] = useState<MedicalCertificate | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState<MedicalCertificate | null>(null)
  const [printDoc, setPrintDoc] = useState<MedicalDocument | null>(null)
  const [isPending, startTransition] = useTransition()
  const skipNextFetch = useRef(true)

  const d = access.designation
  const isPhysician = d === "physician"
  const cardsLevel = getAccessLevel(d, "certificates.summary_cards")
  const canPrint = can(d, "certificates.print")
  const canManage = canMutate(d, "certificates.generate")
  const canCreateFromRepo =
    canManage && d !== "physician" && d !== "dentist"
  const canVoid =
    canManage && (d === "physician" || d === "dentist" || d === "admin")

  useEffect(() => {
    if (initialError) {
      documentToasts.failed(initialError)
    }
  }, [initialError])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const nextQuery = query.trim()
      if (nextQuery === debouncedQuery) return
      setDebouncedQuery(nextQuery)
      setPage(1)
    }, SEARCH_DEBOUNCE_MS)
    return () => window.clearTimeout(timer)
  }, [query, debouncedQuery])

  const loadPage = useCallback(async (nextQuery: string, nextPage: number) => {
    setLoading(true)
    try {
      const [listResult, statsResult] = await Promise.all([
        fetchMedicalDocumentsAction({
          query: nextQuery,
          page: nextPage,
          pageSize: PAGE_SIZE,
          documentType: documentTypeFilter,
          status: statusFilter,
        }),
        fetchMedicalCertificateStatsAction(),
      ])

      if (!listResult.ok) {
        documentToasts.failed(listResult.error)
        return
      }
      if (!statsResult.ok) {
        documentToasts.failed(statsResult.error)
        return
      }

      setList(listResult.data)
      setStats(statsResult.data)
    } catch {
      documentToasts.failed(
        "Unable to reach the database. Check your connection and try again."
      )
    } finally {
      setLoading(false)
    }
  }, [documentTypeFilter, statusFilter])

  const refresh = useCallback(async () => {
    await loadPage(debouncedQuery, page)
  }, [debouncedQuery, page, loadPage])

  useStaffRealtimeRefresh(
    `staff-certificates-${access.designation}`,
    STAFF_REALTIME_TABLES.certificates,
    () => {
      void refresh()
    }
  )

  useEffect(() => {
    if (skipNextFetch.current) {
      skipNextFetch.current = false
      return
    }
    void loadPage(debouncedQuery, page)
  }, [debouncedQuery, page, loadPage, documentTypeFilter, statusFilter])

  const statCards = useMemo(() => toStatCards(stats), [stats])
  const showSkeleton = loading || isPending
  const rows = list.items
  const hasRows = rows.length > 0

  function openDocument(document: MedicalDocument) {
    setSelected(document)
    setSheetOpen(true)
    void logMedicalDocumentViewAction(document.id)
  }

  function openPreview(document: MedicalDocument) {
    setSelected(document)
    setPreviewOpen(true)
    void logMedicalDocumentViewAction(document.id)
  }

  function openCreate() {
    setFormMode("create")
    setEditing(null)
    setFormOpen(true)
  }

  function openEdit(certificate: MedicalCertificate) {
    setSheetOpen(false)
    setFormMode("edit")
    setEditing(certificate)
    setFormOpen(true)
  }

  function openDelete(certificate: MedicalCertificate) {
    setSheetOpen(false)
    setDeleting(certificate)
    setDeleteOpen(true)
  }

  function handlePrintRow(document: MedicalDocument) {
    setPrintDoc(document)
    startTransition(async () => {
      void logMedicalDocumentViewAction(document.id)
      triggerMedicalDocumentPrint()
    })
  }

  async function handleSaved(certificate: MedicalCertificate) {
    await refresh()
  }

  async function handleDeleted(id: string) {
    if (selected?.id === id) {
      setSelected(null)
      setSheetOpen(false)
    }
    setDeleting(null)
    await refresh()
  }

  async function handleVoided(document: MedicalDocument) {
    setSelected(document)
    await refresh()
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-6 print:p-0",
        d === "dentist" && "gap-8 pt-2"
      )}
    >
      <div className="print:hidden">
        <DemoPageHeader
          title="Medical Documents"
          description={
            d === "physician" || d === "dentist"
              ? "Documents you issued — issue new documents from a consultation visit"
              : d === "nurse"
                ? "View and print clinic medical documents"
                : "Browse, search, and print medical documents"
          }
          designation={d}
          showDemoBanner={false}
        />
      </div>

      {cardsLevel !== "none" ? (
        <div className="print:hidden">
          <DemoStatGrid stats={statCards} />
        </div>
      ) : null}

      <Card className="min-w-0 shadow-none print:hidden dark:ring-0">
        <CardHeader
          className={cn(
            "gap-4 border-b px-6 py-5 sm:flex-row sm:items-center sm:justify-between",
            d === "dentist" && "gap-4 px-6 py-5"
          )}
        >
          <CardTitle className="text-base">
            Document repository
            {cardsLevel === "view" ? (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                (view only)
              </span>
            ) : null}
          </CardTitle>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
            <Select
              value={documentTypeFilter}
              onValueChange={(value) => {
                setDocumentTypeFilter(value as MedicalDocumentType | "all")
                setPage(1)
              }}
            >
              <SelectTrigger className="sm:w-44">
                <SelectValue placeholder="Document type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {MEDICAL_DOCUMENT_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {DOCUMENT_TYPE_LABELS[type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={statusFilter}
              onValueChange={(value) => {
                setStatusFilter(value as MedicalDocumentStatus | "all")
                setPage(1)
              }}
            >
              <SelectTrigger className="sm:w-36">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {DOCUMENT_STATUS_FILTER_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {can(d, "certificates.search_patient") ? (
              d === "nurse" || d === "physician" ? (
                <StudentIdSearchInput
                  className="sm:w-72"
                  value={query}
                  onChange={setQuery}
                  placeholder="Search by student ID number"
                  aria-label="Search by student ID number"
                />
              ) : (
                <Input
                  className="sm:w-72"
                  placeholder={
                    d === "dentist"
                      ? DENTIST_PATIENT_SEARCH_PLACEHOLDER
                      : "Search by Student ID"
                  }
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  aria-label={
                    d === "dentist"
                      ? DENTIST_PATIENT_SEARCH_PLACEHOLDER
                      : "Search by Student ID"
                  }
                />
              )
            ) : null}
            {canCreateFromRepo ? (
              <Button className="shrink-0" onClick={openCreate}>
                New Medical Certificate
              </Button>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {showSkeleton ? (
            <CertificatesTableSkeleton />
          ) : !hasRows ? (
            <Empty className="border-0">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <IconFileText />
                </EmptyMedia>
                <EmptyTitle>No medical documents found.</EmptyTitle>
                <EmptyDescription>
                  {d === "physician" || d === "dentist"
                    ? "Issue documents from an active consultation visit."
                    : "No medical documents available."}
                </EmptyDescription>
              </EmptyHeader>
              {canCreateFromRepo ? (
                <EmptyContent>
                  <Button onClick={openCreate}>New Medical Certificate</Button>
                </EmptyContent>
              ) : null}
            </Empty>
          ) : (
            <>
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
                        <p className="font-medium">{row.patient.fullName}</p>
                        <p className="text-xs text-muted-foreground">
                          {row.patient.studentId ?? "—"}
                        </p>
                      </TableCell>
                      <TableCell>{documentTypeLabel(row)}</TableCell>
                      <TableCell>
                        <p>{formatCertificateDateTime(row.issuedAt)}</p>
                        <p className="text-xs text-muted-foreground">
                          {row.documentNumber} · {row.doctorName ?? "—"}
                        </p>
                      </TableCell>
                      <TableCell>
                        <Badge variant={documentStatusVariant(row.status)}>
                          {documentStatusLabel(row.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap justify-end gap-1">
                          {can(d, "certificates.view_history") ? (
                            <Button
                              size="xs"
                              variant="outline"
                              onClick={() => openDocument(row)}
                            >
                              View
                            </Button>
                          ) : null}
                          {canCreateFromRepo ? (
                            <Button
                              size="xs"
                              variant="outline"
                              onClick={() => openEdit(row as unknown as MedicalCertificate)}
                            >
                              Edit
                            </Button>
                          ) : null}
                          {can(d, "certificates.preview") &&
                          row.status !== "draft" &&
                          row.status !== "voided" ? (
                            <Button
                              size="xs"
                              variant="outline"
                              onClick={() => openPreview(row)}
                            >
                              Preview
                            </Button>
                          ) : null}
                          {canPrint &&
                          row.status !== "draft" &&
                          row.status !== "voided" ? (
                            <Button
                              size="xs"
                              onClick={() => handlePrintRow(row)}
                              aria-label="Print document"
                            >
                              {d === "nurse" ? (
                                <IconPrinter className="size-3.5" aria-hidden />
                              ) : (
                                "Print"
                              )}
                            </Button>
                          ) : null}
                          {can(d, "certificates.download_pdf") &&
                          d !== "physician" &&
                          d !== "dentist" &&
                          row.status !== "draft" &&
                          row.status !== "voided" ? (
                            <Button
                              size="xs"
                              variant="secondary"
                              onClick={() => {
                                setPrintDoc(row)
                                openDocument(row)
                                triggerMedicalDocumentPrint()
                              }}
                              aria-label="Export PDF"
                            >
                              {d === "nurse" ? (
                                <IconFileTypePdf className="size-3.5" aria-hidden />
                              ) : (
                                "PDF"
                              )}
                            </Button>
                          ) : null}
                          {canCreateFromRepo ? (
                            <Button
                              size="xs"
                              variant="destructive"
                              onClick={() =>
                                openDelete(row as unknown as MedicalCertificate)
                              }
                            >
                              Delete
                            </Button>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {list.totalPages > 1 ? (
                <div className="flex items-center justify-between gap-3 border-t px-4 py-3">
                  <p className="text-xs text-muted-foreground">
                    Page {list.page} of {list.totalPages} · {list.total}{" "}
                    documents
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="xs"
                      variant="outline"
                      disabled={list.page <= 1 || showSkeleton}
                      onClick={() =>
                        setPage((current) => Math.max(1, current - 1))
                      }
                    >
                      Previous
                    </Button>
                    <Button
                      size="xs"
                      variant="outline"
                      disabled={
                        list.page >= list.totalPages || showSkeleton
                      }
                      onClick={() =>
                        setPage((current) =>
                          Math.min(list.totalPages, current + 1)
                        )
                      }
                    >
                      Next
                    </Button>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>

      <DocumentDetailSheet
        document={selected}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        canPrint={canPrint}
        canVoid={canVoid}
        onVoided={handleVoided}
        onPrint={(document) => handlePrintRow(document)}
      />

      <DocumentPreviewDialog
        document={selected}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        onPrint={() => {
          if (!selected) return
          setPreviewOpen(false)
          handlePrintRow(selected)
        }}
      />

      {printDoc ? <MedicalDocumentPrintView document={printDoc} /> : null}

      <CertificateFormSheet
        open={formOpen}
        mode={formMode}
        certificate={editing}
        defaultDoctorName={
          d === "dentist" && access.fullName
            ? /^(dr|dra)\.?\s+/i.test(access.fullName.trim())
              ? access.fullName.trim()
              : `Dr. ${access.fullName.trim()}`
            : access.fullName
        }
        hideDoctorNameField={d === "physician" || d === "dentist"}
        onOpenChange={setFormOpen}
        onSaved={handleSaved}
      />

      <CertificateDeleteDialog
        certificate={deleting}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onDeleted={handleDeleted}
      />
    </div>
  )
}

/** @deprecated Prefer CertificatesPage — kept for route re-exports. */
export { CertificatesPage as CertificatesDemoPage }
