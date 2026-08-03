"use client"

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react"
import { toast } from "sonner"
import { IconFileText } from "@tabler/icons-react"

import { CertificateDeleteDialog } from "@/components/certificates/certificate-delete-dialog"
import { CertificateDetailSheet } from "@/components/certificates/certificate-detail-sheet"
import { CertificateFormSheet } from "@/components/certificates/certificate-form-sheet"
import { DemoPageHeader, DemoStatGrid } from "@/components/demo/demo-page"
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
  searchMedicalCertificatesAction,
  updateMedicalCertificateAction,
} from "@/features/certificates/actions"
import {
  formatCertificateDate,
  formatCertificateDateTime,
} from "@/features/certificates/lib/format"
import { can, canMutate, getAccessLevel } from "@/lib/auth/permissions"
import type { StaffAccess } from "@/lib/auth/types"
import type { DemoStat } from "@/lib/demo/types"
import type {
  MedicalCertificate,
  MedicalCertificateListResult,
  MedicalCertificateStats,
} from "@/types/medicalCertificate"

const PAGE_SIZE = 10
const SEARCH_DEBOUNCE_MS = 300

function statusVariant(
  status: MedicalCertificate["status"]
): "default" | "secondary" | "outline" {
  if (status === "issued") return "default"
  if (status === "printed") return "secondary"
  return "outline"
}

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
  initialList: MedicalCertificateListResult
  initialStats: MedicalCertificateStats
  initialError?: string | null
}) {
  const [query, setQuery] = useState("")
  const [debouncedQuery, setDebouncedQuery] = useState("")
  const [page, setPage] = useState(1)
  const [list, setList] = useState(initialList)
  const [stats, setStats] = useState(initialStats)
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<MedicalCertificate | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<"create" | "edit">("create")
  const [editing, setEditing] = useState<MedicalCertificate | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState<MedicalCertificate | null>(null)
  const [isPending, startTransition] = useTransition()
  const skipNextFetch = useRef(true)

  const d = access.designation
  const isPhysician = d === "physician"
  const cardsLevel = getAccessLevel(d, "certificates.summary_cards")
  const canPrint = can(d, "certificates.print")
  const canManage = canMutate(d, "certificates.generate")

  useEffect(() => {
    if (initialError) {
      toast.error(initialError)
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
        searchMedicalCertificatesAction(nextQuery, {
          page: nextPage,
          pageSize: PAGE_SIZE,
          sortBy: "issued_at",
          sortDirection: "desc",
            studentIdOnly: isPhysician,
        }),
        fetchMedicalCertificateStatsAction(),
      ])

      if (!listResult.ok) {
        toast.error(listResult.error)
        return
      }
      if (!statsResult.ok) {
        toast.error(statsResult.error)
        return
      }

      setList(listResult.data)
      setStats(statsResult.data)
    } catch {
      toast.error(
        "Unable to reach the database. Check your connection and try again."
      )
    } finally {
      setLoading(false)
    }
  }, [isPhysician])

  const refresh = useCallback(async () => {
    await loadPage(debouncedQuery, page)
  }, [debouncedQuery, page, loadPage])

  useEffect(() => {
    if (skipNextFetch.current) {
      skipNextFetch.current = false
      return
    }
    void loadPage(debouncedQuery, page)
  }, [debouncedQuery, page, loadPage])

  const statCards = useMemo(() => toStatCards(stats), [stats])
  const showSkeleton = loading || isPending
  const rows = list.items
  const hasRows = rows.length > 0

  function openCertificate(certificate: MedicalCertificate) {
    setSelected(certificate)
    setSheetOpen(true)
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

  function handlePrintRow(certificate: MedicalCertificate) {
    setSelected(certificate)
    setSheetOpen(true)
    startTransition(async () => {
      if (certificate.status === "issued") {
        const result = await updateMedicalCertificateAction({
          id: certificate.id,
          status: "printed",
        })
        if (!result.ok) {
          toast.error(result.error)
          return
        }
        setSelected(result.data)
        setList((current) => ({
          ...current,
          items: current.items.map((item) =>
            item.id === result.data.id ? result.data : item
          ),
        }))
        const statsResult = await fetchMedicalCertificateStatsAction()
        if (statsResult.ok) setStats(statsResult.data)
      }
      window.setTimeout(() => window.print(), 150)
    })
  }

  async function handleSaved(certificate: MedicalCertificate) {
    setSelected(certificate)
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

  return (
    <div className="flex flex-col gap-6 print:p-0">
      <div className="print:hidden">
        <DemoPageHeader
          title="Medical Certificates"
          description="Browse history and generate printable certificates"
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
        <CardHeader className="gap-4 border-b px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base">
            Certificate history
            {cardsLevel === "view" ? (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                (view only)
              </span>
            ) : null}
          </CardTitle>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            {can(d, "certificates.search_patient") ? (
              <Input
                className="sm:w-72"
                placeholder="Search by Student ID"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Search by Student ID"
              />
            ) : null}
            {canManage ? (
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
                <EmptyTitle>No medical certificates found.</EmptyTitle>
                <EmptyDescription>
                  No medical certificates available.
                </EmptyDescription>
              </EmptyHeader>
              {canManage ? (
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
                      <TableCell>{row.certificateType}</TableCell>
                      <TableCell>
                        <p>{formatCertificateDateTime(row.issuedAt)}</p>
                        <p className="text-xs text-muted-foreground">
                          {row.doctorName ?? "—"} · valid until{" "}
                          {formatCertificateDate(row.validUntil)}
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
                              onClick={() => openCertificate(row)}
                            >
                              View
                            </Button>
                          ) : null}
                          {canManage ? (
                            <Button
                              size="xs"
                              variant="outline"
                              onClick={() => openEdit(row)}
                            >
                              Edit
                            </Button>
                          ) : null}
                          {can(d, "certificates.preview") &&
                          row.status !== "draft" ? (
                            <Button
                              size="xs"
                              variant="outline"
                              onClick={() => openCertificate(row)}
                            >
                              Preview
                            </Button>
                          ) : null}
                          {canPrint && row.status !== "draft" ? (
                            <Button
                              size="xs"
                              onClick={() => handlePrintRow(row)}
                            >
                              Print
                            </Button>
                          ) : null}
                          {can(d, "certificates.download_pdf") &&
                          row.status !== "draft" ? (
                            <Button
                              size="xs"
                              variant="secondary"
                              onClick={() => {
                                openCertificate(row)
                                window.setTimeout(() => window.print(), 150)
                              }}
                            >
                              PDF
                            </Button>
                          ) : null}
                          {canManage ? (
                            <Button
                              size="xs"
                              variant="destructive"
                              onClick={() => openDelete(row)}
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
                    certificates
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

      <CertificateDetailSheet
        certificate={selected}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        canPrint={canPrint}
        canEdit={canManage}
        canDelete={canManage}
        onEdit={openEdit}
        onDelete={openDelete}
      />

      <CertificateFormSheet
        open={formOpen}
        mode={formMode}
        certificate={editing}
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
