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
import {
  IconCalendarMonth,
  IconClockHour4,
  IconEye,
  IconFileText,
  IconFileTypePdf,
  IconInfoCircle,
  IconPencil,
  IconPrinter,
  IconTrash,
} from "@tabler/icons-react"

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
  PanelCell,
  PanelFrame,
  PanelGrid,
  panelCardClassName,
} from "@/components/layout/panel-frame"
import {
  formatCertificateDateTime,
} from "@/features/certificates/lib/format"
import { Badge } from "@/components/ui/badge"
import { StatusBadge } from "@/components/ui/status-badge"
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
import { selectItemsRecord } from "@/lib/ui/select-label"
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
  getCachedCertificates,
  loadCertificatesBundle,
} from "@/features/certificates/lib/prefetch-certificates"
import {
  certificatesCacheKey,
  staffCacheIsFresh,
} from "@/lib/ui/staff-data-cache"
import {
  fetchMedicalDocumentByIdAction,
  fetchMedicalDocumentsAction,
  logMedicalDocumentViewAction,
} from "@/features/medical-documents/actions"
import { appToast } from "@/lib/feedback/app-toast"
import { can, canMutate, getAccessLevel } from "@/lib/auth/permissions"
import type { StaffAccess } from "@/lib/auth/types"
import type { DemoStat } from "@/lib/demo/types"
import { cn } from "@/lib/utils"
import {
  staleListBusy,
  staleListBusyClassName,
} from "@/lib/ui/stale-list-busy"
import type {
  MedicalCertificate,
  MedicalCertificateStats,
} from "@/types/medicalCertificate"
import {
  DOCUMENT_STATUS_FILTER_OPTIONS,
  documentStatusLabel,
  documentStatusToneKey,
} from "@/features/medical-documents/lib/document-status"
import {
  STATUS_BADGE_DOT,
  STATUS_BADGE_TONE,
} from "@/lib/ui/status-badge-tone"
import { isHalfBondDocument } from "@/components/medical-documents/document-print-view"
import { triggerMedicalDocumentPrint } from "@/lib/print/trigger-medical-document-print"
import {
  DOCUMENT_TYPE_LABELS,
  MEDICAL_DOCUMENT_TYPES,
  normalizeDocumentStatus,
  type MedicalDocument,
  type MedicalDocumentListResult,
  type MedicalDocumentStatus,
  type MedicalDocumentType,
} from "@/types/medicalDocument"
import { useInstantListRefresh } from "@/hooks/use-instant-list-refresh"
import { useStaffRealtimeRefresh } from "@/hooks/use-staff-realtime-refresh"
import { STAFF_REALTIME_TABLES } from "@/lib/health/realtime"

const PAGE_SIZE = 10
const SEARCH_DEBOUNCE_MS = 300
const DOC_STATS_BASELINE_KEY = "campuscare:document-stats-baseline"

type DocumentStatsBaseline = {
  issuedThisMonth: number
  issuedToday: number
  drafts: number
  pending: number
}

function readDocumentStatsBaseline(): DocumentStatsBaseline | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.sessionStorage.getItem(DOC_STATS_BASELINE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as DocumentStatsBaseline
    if (
      typeof parsed.issuedThisMonth !== "number" ||
      typeof parsed.issuedToday !== "number" ||
      typeof parsed.drafts !== "number" ||
      typeof parsed.pending !== "number"
    ) {
      return null
    }
    return parsed
  } catch {
    return null
  }
}

function writeDocumentStatsBaseline(stats: MedicalCertificateStats) {
  try {
    window.sessionStorage.setItem(
      DOC_STATS_BASELINE_KEY,
      JSON.stringify({
        issuedThisMonth: stats.issuedThisMonth,
        issuedToday: stats.issuedToday,
        drafts: stats.drafts,
        pending: stats.pending,
      } satisfies DocumentStatsBaseline)
    )
  } catch {
    /* ignore */
  }
}

function toBaseline(stats: MedicalCertificateStats): DocumentStatsBaseline {
  return {
    issuedThisMonth: stats.issuedThisMonth,
    issuedToday: stats.issuedToday,
    drafts: stats.drafts,
    pending: stats.pending,
  }
}

function toStatCards(
  stats: MedicalCertificateStats,
  baseline: DocumentStatsBaseline | null
): DemoStat[] {
  const grew = (key: keyof DocumentStatsBaseline) =>
    baseline != null && stats[key] > baseline[key]

  return [
    {
      key: "issued",
      label: "Issued this month",
      value: String(stats.issuedThisMonth),
      description: "All types",
      icon: <IconCalendarMonth stroke={1.75} aria-hidden />,
      iconClassName: "bg-primary/12 text-primary",
      highlight: grew("issuedThisMonth"),
    },
    {
      key: "today",
      label: "Issued today",
      value: String(stats.issuedToday),
      description: "Ready to print",
      icon: <IconPrinter stroke={1.75} aria-hidden />,
      iconClassName: "bg-success/12 text-success",
      highlight: grew("issuedToday"),
    },
    {
      key: "draft",
      label: "Drafts",
      value: String(stats.drafts),
      description: "Incomplete",
      icon: <IconPencil stroke={1.75} aria-hidden />,
      iconClassName: "bg-warning/15 text-warning",
      highlight: grew("drafts"),
    },
    {
      key: "pending",
      label: "Pending request",
      value: String(stats.pending),
      description: "From consultations",
      icon: <IconClockHour4 stroke={1.75} aria-hidden />,
      iconClassName: "bg-muted text-muted-foreground",
      highlight: grew("pending"),
    },
  ]
}

function CertificatesTableSkeleton() {
  return (
    <div
      className="space-y-2 p-4"
      role="status"
      aria-label="Loading certificates"
    >
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="flex items-center gap-3">
          <Skeleton className="h-8 w-36" />
          <Skeleton className="h-8 flex-1" />
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-8 w-20" />
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
  hydrateFromCache = false,
}: {
  access: StaffAccess
  initialList: MedicalDocumentListResult
  initialStats: MedicalCertificateStats
  initialError?: string | null
  hydrateFromCache?: boolean
}) {
  const cached = hydrateFromCache
    ? getCachedCertificates(access.designation)
    : null
  const [query, setQuery] = useState("")
  const [debouncedQuery, setDebouncedQuery] = useState("")
  const [page, setPage] = useState(1)
  const [list, setList] = useState(cached?.list ?? initialList)
  const [stats, setStats] = useState(cached?.stats ?? initialStats)
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
  const hydratedRef = useRef(false)

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

  const loadPage = useCallback(
    async (
      nextQuery: string,
      nextPage: number,
      options?: { silent?: boolean }
    ) => {
      const silent = Boolean(options?.silent)
      const isDefault =
        hydrateFromCache &&
        !nextQuery.trim() &&
        nextPage === 1 &&
        documentTypeFilter === "all" &&
        statusFilter === "all"

      if (!silent) setLoading(true)
      try {
        if (isDefault) {
          const bundle = await loadCertificatesBundle(access.designation, {
            force: true,
          })
          setList(bundle.list)
          setStats(bundle.stats)
          return
        }

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
    },
    [
      access.designation,
      documentTypeFilter,
      hydrateFromCache,
      statusFilter,
    ]
  )

  const refresh = useCallback(async () => {
    await loadPage(debouncedQuery, page, { silent: true })
  }, [debouncedQuery, page, loadPage])

  const { schedule: scheduleRefresh } = useInstantListRefresh(refresh, 400)

  useStaffRealtimeRefresh(
    `staff-certificates-${access.designation}`,
    STAFF_REALTIME_TABLES.certificates,
    scheduleRefresh
  )

  useEffect(() => {
    if (!hydrateFromCache || hydratedRef.current) return
    hydratedRef.current = true
    const hit = getCachedCertificates(access.designation)
    if (hit) {
      setList(hit.list)
      setStats(hit.stats)
      setLoading(false)
    }
    void loadCertificatesBundle(access.designation, {
      force:
        Boolean(hit) &&
        !staffCacheIsFresh(certificatesCacheKey(access.designation)),
    })
      .then((bundle) => {
        setList(bundle.list)
        setStats(bundle.stats)
        setLoading(false)
      })
      .catch(() => {
        setLoading(false)
        if (!hit) void loadPage("", 1, { silent: true })
      })
  }, [access.designation, hydrateFromCache, loadPage])

  useEffect(() => {
    if (skipNextFetch.current) {
      skipNextFetch.current = false
      return
    }
    void loadPage(debouncedQuery, page)
  }, [debouncedQuery, page, loadPage, documentTypeFilter, statusFilter])

  const [statsBaseline, setStatsBaseline] =
    useState<DocumentStatsBaseline | null>(null)
  const statsBaselineReady = useRef(false)

  useEffect(() => {
    if (statsBaselineReady.current) return
    statsBaselineReady.current = true
    const existing = readDocumentStatsBaseline()
    if (existing) {
      setStatsBaseline(existing)
      return
    }
    // First open this session — seed quietly so nothing looks “new” yet.
    const seed = toBaseline(stats)
    writeDocumentStatsBaseline(stats)
    setStatsBaseline(seed)
  }, [stats])

  useEffect(() => {
    if (!statsBaseline) return
    // After staff can notice a blue “new” count, lock the baseline as seen.
    const id = window.setTimeout(() => {
      writeDocumentStatsBaseline(stats)
      setStatsBaseline(toBaseline(stats))
    }, 12_000)
    return () => window.clearTimeout(id)
  }, [stats, statsBaseline])

  const statCards = useMemo(
    () => toStatCards(stats, statsBaseline),
    [stats, statsBaseline]
  )
  const rows = list.items
  const hasRows = rows.length > 0
  const { showInitialSkeleton, isRefreshing } = staleListBusy(
    loading,
    rows.length,
    isPending
  )

  /** Open the official HSO file preview for the selected record (not metadata-only). */
  function openFilePreview(document: MedicalDocument) {
    setSelected(document)
    setPreviewOpen(true)
    void logMedicalDocumentViewAction(document.id)
    // Re-fetch so label + template use the full payload / resolved document type.
    void fetchMedicalDocumentByIdAction(document.id).then((result) => {
      if (!result.ok) {
        appToast.error({
          title: "Unable to load document",
          description: result.error,
        })
        return
      }
      setSelected(result.data)
    })
  }

  function openDocumentDetails(document: MedicalDocument) {
    setSelected(document)
    setSheetOpen(true)
    void logMedicalDocumentViewAction(document.id)
    void fetchMedicalDocumentByIdAction(document.id).then((result) => {
      if (result.ok) setSelected(result.data)
    })
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
      triggerMedicalDocumentPrint(
        isHalfBondDocument(document) ? "half-bond" : "full-page"
      )
    })
  }

  function handleSaved(certificate: MedicalCertificate) {
    setList((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.id === certificate.id
          ? {
              ...item,
              purpose: certificate.purpose,
              doctorName: certificate.doctorName,
              remarks: certificate.remarks,
              status: normalizeDocumentStatus(certificate.status),
              issuedAt: certificate.issuedAt,
              validUntil: certificate.validUntil,
              certificateType: certificate.certificateType,
              documentNumber: certificate.certificateNumber,
              updatedAt: certificate.updatedAt,
            }
          : item
      ),
    }))
    scheduleRefresh()
  }

  function handleDeleted(id: string) {
    if (selected?.id === id) {
      setSelected(null)
      setSheetOpen(false)
    }
    setDeleting(null)
    setList((prev) => ({
      ...prev,
      items: prev.items.filter((item) => item.id !== id),
      total: Math.max(0, prev.total - 1),
    }))
    scheduleRefresh()
  }

  function handleVoided(document: MedicalDocument) {
    setSelected(document)
    setList((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.id === document.id ? document : item
      ),
    }))
    scheduleRefresh()
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

      <PanelFrame className="print:hidden">
        <PanelGrid>
          {cardsLevel !== "none" ? (
            <PanelCell>
              <DemoStatGrid
                stats={statCards}
                framed={false}
                variant="lane"
              />
            </PanelCell>
          ) : null}
          <PanelCell>
      <Card className={cn(panelCardClassName, "min-w-0 gap-0 py-0 shadow-none dark:ring-0")}>
        <CardHeader className="gap-3 border-b px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-5 sm:py-4">
          <div className="min-w-0">
            <CardTitle className="text-base">
              Document repository
              {cardsLevel === "view" ? (
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  (view only)
                </span>
              ) : null}
            </CardTitle>
            <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
              {list.total} document{list.total === 1 ? "" : "s"}
              {documentTypeFilter !== "all"
                ? ` · ${DOCUMENT_TYPE_LABELS[documentTypeFilter]}`
                : ""}
              {statusFilter !== "all"
                ? ` · ${documentStatusLabel(statusFilter)}`
                : ""}
              {debouncedQuery.trim() ? " matching search" : ""}
            </p>
          </div>
          <div className="flex w-full min-w-0 flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
            {can(d, "certificates.search_patient") ? (
              d === "nurse" || d === "physician" ? (
                <StudentIdSearchInput
                  className="w-full sm:w-56 lg:w-64"
                  value={query}
                  onChange={setQuery}
                  placeholder="Search by student ID number"
                  aria-label="Search by student ID number"
                />
              ) : (
                <Input
                  className="h-9 w-full sm:w-56 lg:w-64"
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
            <Select
              value={documentTypeFilter}
              items={selectItemsRecord([
                { value: "all", label: "All types" },
                ...MEDICAL_DOCUMENT_TYPES.map((type) => ({
                  value: type,
                  label: DOCUMENT_TYPE_LABELS[type],
                })),
              ])}
              onValueChange={(value) => {
                setDocumentTypeFilter(value as MedicalDocumentType | "all")
                setPage(1)
              }}
            >
              <SelectTrigger
                className="h-9 w-full shrink-0 sm:w-40"
                aria-label="Filter by document type"
              >
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
              items={selectItemsRecord([
                { value: "all", label: "All statuses" },
                ...DOCUMENT_STATUS_FILTER_OPTIONS,
              ])}
              onValueChange={(value) => {
                setStatusFilter(value as MedicalDocumentStatus | "all")
                setPage(1)
              }}
            >
              <SelectTrigger
                className="h-9 w-full shrink-0 sm:w-36"
                aria-label="Filter by status"
              >
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
            {canCreateFromRepo ? (
              <Button className="h-9 shrink-0" onClick={openCreate}>
                New Medical Certificate
              </Button>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {showInitialSkeleton ? (
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
            <div
              className={staleListBusyClassName(isRefreshing)}
              aria-busy={isRefreshing || undefined}
            >
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[28%] min-w-[10rem] pl-4 sm:pl-5">
                      Patient
                    </TableHead>
                    <TableHead className="w-[14%]">Type</TableHead>
                    <TableHead className="w-[28%]">Issued</TableHead>
                    <TableHead className="w-[12%]">Status</TableHead>
                    <TableHead className="w-[18%] pr-4 text-right sm:pr-5">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="max-w-0 pl-4 sm:pl-5">
                        <p className="truncate font-medium text-foreground">
                          {row.patient.fullName}
                        </p>
                        <p className="text-xs tabular-nums text-muted-foreground">
                          {row.patient.studentId ?? "—"}
                        </p>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className="max-w-full truncate font-normal"
                        >
                          {documentTypeLabel(row)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm tabular-nums">
                          {formatCertificateDateTime(row.issuedAt)}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {row.documentNumber} · {row.doctorName ?? "—"}
                        </p>
                      </TableCell>
                      <TableCell>
                        <StatusBadge
                          label={documentStatusLabel(row.status)}
                          toneClassName={
                            STATUS_BADGE_TONE[
                              documentStatusToneKey(row.status)
                            ]
                          }
                          dotClassName={
                            STATUS_BADGE_DOT[
                              documentStatusToneKey(row.status)
                            ]
                          }
                        />
                      </TableCell>
                      <TableCell className="pr-4 sm:pr-5">
                        <div className="flex flex-wrap justify-end gap-0.5">
                          {can(d, "certificates.view_history") ||
                          can(d, "certificates.preview") ? (
                            <Button
                              size="icon-sm"
                              variant="ghost"
                              className="size-8 text-foreground/70 hover:text-foreground"
                              aria-label="View document"
                              title="View"
                              onClick={() => openFilePreview(row)}
                            >
                              <IconEye className="size-4" aria-hidden />
                            </Button>
                          ) : null}
                          {can(d, "certificates.view_history") ? (
                            <Button
                              size="icon-sm"
                              variant="ghost"
                              className="size-8 text-foreground/70 hover:text-foreground"
                              aria-label="Document details"
                              title="Details"
                              onClick={() => openDocumentDetails(row)}
                            >
                              <IconInfoCircle className="size-4" aria-hidden />
                            </Button>
                          ) : null}
                          {canCreateFromRepo ? (
                            <Button
                              size="icon-sm"
                              variant="outline"
                              className="size-7"
                              aria-label="Edit document"
                              title="Edit"
                              onClick={() =>
                                openEdit(row as unknown as MedicalCertificate)
                              }
                            >
                              <IconPencil className="size-3.5" aria-hidden />
                            </Button>
                          ) : null}
                          {canPrint &&
                          row.status !== "draft" &&
                          row.status !== "voided" ? (
                            <Button
                              size="icon-sm"
                              className="size-7"
                              onClick={() => handlePrintRow(row)}
                              aria-label="Print document"
                              title="Print"
                            >
                              <IconPrinter className="size-3.5" aria-hidden />
                            </Button>
                          ) : null}
                          {can(d, "certificates.download_pdf") &&
                          d !== "physician" &&
                          d !== "dentist" &&
                          row.status !== "draft" &&
                          row.status !== "voided" ? (
                            <Button
                              size="icon-sm"
                              variant="secondary"
                              className="size-7"
                              onClick={() => {
                                setPrintDoc(row)
                                openFilePreview(row)
                                triggerMedicalDocumentPrint(
                                  isHalfBondDocument(row)
                                    ? "half-bond"
                                    : "full-page"
                                )
                              }}
                              aria-label="Export PDF"
                              title="PDF"
                            >
                              <IconFileTypePdf
                                className="size-3.5"
                                aria-hidden
                              />
                            </Button>
                          ) : null}
                          {canCreateFromRepo ? (
                            <Button
                              size="icon-sm"
                              variant="destructive"
                              className="size-7"
                              aria-label="Delete document"
                              title="Delete"
                              onClick={() =>
                                openDelete(row as unknown as MedicalCertificate)
                              }
                            >
                              <IconTrash className="size-3.5" aria-hidden />
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
                      disabled={list.page <= 1 || isRefreshing}
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
                        list.page >= list.totalPages || isRefreshing
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
            </div>
          )}
        </CardContent>
      </Card>
          </PanelCell>
        </PanelGrid>
      </PanelFrame>

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
