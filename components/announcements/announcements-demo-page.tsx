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
import { IconSpeakerphone } from "@tabler/icons-react"

import { AnnouncementDeleteDialog } from "@/components/announcements/announcement-delete-dialog"
import { AnnouncementDetailSheet } from "@/components/announcements/announcement-detail-sheet"
import { AnnouncementFormSheet } from "@/components/announcements/announcement-form-sheet"
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
  fetchAnnouncementStatsAction,
  publishAnnouncementAction,
  searchAnnouncementsAction,
} from "@/features/announcements/actions"
import {
  announcementStatusLabel,
  formatAnnouncementDateTime,
} from "@/features/announcements/lib/format"
import { can, canMutate } from "@/lib/auth/permissions"
import type { StaffAccess } from "@/lib/auth/types"
import type { DemoStat } from "@/lib/demo/types"
import type {
  Announcement,
  AnnouncementListResult,
  AnnouncementStats,
  AnnouncementStatus,
} from "@/types/announcement"

const PAGE_SIZE = 10
const SEARCH_DEBOUNCE_MS = 300

function statusVariant(
  status: AnnouncementStatus
): "default" | "secondary" | "outline" {
  if (status === "published") return "default"
  if (status === "scheduled") return "secondary"
  return "outline"
}

function toStatCards(stats: AnnouncementStats): DemoStat[] {
  return [
    {
      key: "published",
      label: "Published",
      value: String(stats.published),
      description: "Visible now",
    },
    {
      key: "scheduled",
      label: "Scheduled",
      value: String(stats.scheduled),
      description: "Upcoming",
    },
    {
      key: "draft",
      label: "Drafts",
      value: String(stats.drafts),
      description: "Unpublished",
    },
    {
      key: "total",
      label: "Total",
      value: String(stats.total),
      description: "All notices",
    },
  ]
}

function AnnouncementsTableSkeleton() {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="flex items-center gap-3">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-28" />
        </div>
      ))}
    </div>
  )
}

export function AnnouncementsPage({
  access,
  initialList,
  initialStats,
  initialError,
}: {
  access: StaffAccess
  initialList: AnnouncementListResult
  initialStats: AnnouncementStats
  initialError?: string | null
}) {
  const [query, setQuery] = useState("")
  const [debouncedQuery, setDebouncedQuery] = useState("")
  const [page, setPage] = useState(1)
  const [list, setList] = useState(initialList)
  const [stats, setStats] = useState(initialStats)
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<Announcement | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<"create" | "edit">("create")
  const [editing, setEditing] = useState<Announcement | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState<Announcement | null>(null)
  const [isPending, startTransition] = useTransition()
  const skipNextFetch = useRef(true)

  const d = access.designation
  const canManage = canMutate(d, "announcements.add")
  const canEdit = can(d, "announcements.edit")
  const canPublish = can(d, "announcements.publish")
  const canDelete = can(d, "announcements.delete")

  useEffect(() => {
    if (initialError) toast.error(initialError)
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
        searchAnnouncementsAction(nextQuery, {
          page: nextPage,
          pageSize: PAGE_SIZE,
          sortBy: "updated_at",
          sortDirection: "desc",
        }),
        fetchAnnouncementStatsAction(),
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
  }, [])

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

  function openAnnouncement(announcement: Announcement) {
    setSelected(announcement)
    setSheetOpen(true)
  }

  function openCreate() {
    setFormMode("create")
    setEditing(null)
    setFormOpen(true)
  }

  function openEdit(announcement: Announcement) {
    setSheetOpen(false)
    setFormMode("edit")
    setEditing(announcement)
    setFormOpen(true)
  }

  function openDelete(announcement: Announcement) {
    setSheetOpen(false)
    setDeleting(announcement)
    setDeleteOpen(true)
  }

  function handlePublish(announcement: Announcement) {
    startTransition(async () => {
      const result = await publishAnnouncementAction(announcement.id)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success("Announcement published.")
      setSelected(result.data)
      await refresh()
    })
  }

  async function handleSaved(announcement: Announcement) {
    setSelected(announcement)
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
    <div className="flex flex-col gap-4">
      <DemoPageHeader
        title="Announcements"
        description="Clinic notices for students and staff"
        designation={d}
        showDemoBanner={false}
        actions={
          canManage ? (
            <Button onClick={openCreate}>Add announcement</Button>
          ) : null
        }
      />

      {can(d, "announcements.cards") ? (
        <DemoStatGrid stats={statCards} />
      ) : null}

      <Card className="min-w-0 shadow-none dark:ring-0">
        <CardHeader className="flex flex-col gap-3 border-b sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base">Announcement table</CardTitle>
          <Input
            className="sm:w-72"
            placeholder="Search title or audience"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </CardHeader>
        <CardContent className="p-0">
          {showSkeleton ? (
            <AnnouncementsTableSkeleton />
          ) : hasRows ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Audience</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Updated</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        <button
                          type="button"
                          className="text-left"
                          onClick={() => openAnnouncement(row)}
                        >
                          <p className="font-medium">{row.title}</p>
                          <p className="text-xs text-muted-foreground">
                            by {row.author.fullName}
                          </p>
                        </button>
                      </TableCell>
                      <TableCell>{row.audience}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(row.status)}>
                          {announcementStatusLabel(row.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatAnnouncementDateTime(
                          row.publishedAt ?? row.updatedAt
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap justify-end gap-1">
                          {canEdit ? (
                            <Button
                              size="xs"
                              variant="outline"
                              onClick={() => openEdit(row)}
                            >
                              Edit
                            </Button>
                          ) : null}
                          {canPublish && row.status !== "published" ? (
                            <Button
                              size="xs"
                              onClick={() => handlePublish(row)}
                            >
                              Publish
                            </Button>
                          ) : null}
                          {canDelete ? (
                            <Button
                              size="xs"
                              variant="destructive"
                              onClick={() => openDelete(row)}
                            >
                              Delete
                            </Button>
                          ) : null}
                          {!canManage ? (
                            <Button
                              size="xs"
                              variant="outline"
                              onClick={() => openAnnouncement(row)}
                            >
                              View
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
                  <p className="text-sm text-muted-foreground">
                    Page {list.page} of {list.totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={list.page <= 1 || loading}
                      onClick={() => setPage((current) => Math.max(1, current - 1))}
                    >
                      Previous
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={list.page >= list.totalPages || loading}
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
          ) : (
            <Empty className="border-0 py-12">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <IconSpeakerphone />
                </EmptyMedia>
                <EmptyTitle>No announcements yet</EmptyTitle>
                <EmptyDescription>
                  {canManage
                    ? "Create the first clinic notice for students and staff."
                    : "Published notices will appear here when available."}
                </EmptyDescription>
              </EmptyHeader>
              {canManage ? (
                <EmptyContent>
                  <Button onClick={openCreate}>Add announcement</Button>
                </EmptyContent>
              ) : null}
            </Empty>
          )}
        </CardContent>
      </Card>

      <AnnouncementDetailSheet
        announcement={selected}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        canEdit={canEdit}
        canPublish={canPublish}
        canDelete={canDelete}
        onEdit={openEdit}
        onPublish={handlePublish}
        onDelete={openDelete}
      />

      <AnnouncementFormSheet
        open={formOpen}
        onOpenChange={setFormOpen}
        mode={formMode}
        announcement={editing}
        onSaved={handleSaved}
      />

      <AnnouncementDeleteDialog
        announcement={deleting}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onDeleted={handleDeleted}
      />
    </div>
  )
}

/** @deprecated Prefer AnnouncementsPage */
export const AnnouncementsDemoPage = AnnouncementsPage
