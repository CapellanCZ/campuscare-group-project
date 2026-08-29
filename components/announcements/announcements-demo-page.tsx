"use client"

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react"
import { announcementToasts } from "@/lib/feedback/toast-messages"
import { useConfirm } from "@/components/feedback/confirm-provider"
import { IconSpeakerphone } from "@tabler/icons-react"

import { AnnouncementArticleDialog } from "@/components/announcements/announcement-article-dialog"
import { AnnouncementDeleteDialog } from "@/components/announcements/announcement-delete-dialog"
import { AnnouncementDetailSheet } from "@/components/announcements/announcement-detail-sheet"
import { AnnouncementFormSheet } from "@/components/announcements/announcement-form-sheet"
import { AnnouncementNewsCard } from "@/components/announcements/announcement-news-card"
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
  fetchAnnouncementByIdAction,
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
import { useStaffRealtimeRefresh } from "@/hooks/use-staff-realtime-refresh"
import { STAFF_REALTIME_TABLES } from "@/lib/health/realtime"
import type {
  Announcement,
  AnnouncementListResult,
  AnnouncementStats,
  AnnouncementStatus,
} from "@/types/announcement"

const PAGE_SIZE = 10
const FEED_PAGE_SIZE = 24
const FEED_PREVIEW_LIMIT = 6
const SEARCH_DEBOUNCE_MS = 300
const STATUS_FILTERS = ["all", "published", "scheduled", "draft"] as const
type StatusFilter = (typeof STATUS_FILTERS)[number]

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

function NewsFeedSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <Skeleton key={index} className="aspect-[4/3] w-full rounded-xl" />
      ))}
    </div>
  )
}

export function AnnouncementsPage({
  access,
  initialFeed,
  initialList,
  initialStats,
  initialError,
}: {
  access: StaffAccess
  initialFeed: AnnouncementListResult
  initialList: AnnouncementListResult
  initialStats: AnnouncementStats
  initialError?: string | null
}) {
  const { confirmPreset } = useConfirm()
  const [query, setQuery] = useState("")
  const [debouncedQuery, setDebouncedQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [page, setPage] = useState(1)
  const [feed, setFeed] = useState(initialFeed)
  const [list, setList] = useState(initialList)
  const [stats, setStats] = useState(initialStats)
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<Announcement | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [articleOpen, setArticleOpen] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<"create" | "edit">("create")
  const [editing, setEditing] = useState<Announcement | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState<Announcement | null>(null)
  const [isPending, startTransition] = useTransition()
  const [showAllFeed, setShowAllFeed] = useState(false)
  const skipNextFetch = useRef(true)

  const d = access.designation
  const isPhysician = d === "physician"
  const canManage = canMutate(d, "announcements.add")
  const canEdit = can(d, "announcements.edit")
  const canPublish = can(d, "announcements.publish")
  const canDelete = can(d, "announcements.delete")

  useEffect(() => {
    if (initialError) announcementToasts.failed(initialError)
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
      nextStatus: StatusFilter = statusFilter
    ) => {
      setLoading(true)
      try {
        const feedPromise = searchAnnouncementsAction(nextQuery, {
          page: 1,
          pageSize: showAllFeed ? 48 : FEED_PAGE_SIZE,
          sortBy: "updated_at",
          sortDirection: "desc",
          feed: true,
        })
        const managePromise = canManage
          ? searchAnnouncementsAction(nextQuery, {
              page: nextPage,
              pageSize: PAGE_SIZE,
              sortBy: "updated_at",
              sortDirection: "desc",
              status: nextStatus === "all" ? "all" : nextStatus,
            })
          : Promise.resolve({
              ok: true as const,
              data: {
                items: [] as Announcement[],
                total: 0,
                page: 1,
                pageSize: PAGE_SIZE,
                totalPages: 1,
              },
            })
        const [feedResult, listResult, statsResult] = await Promise.all([
          feedPromise,
          managePromise,
          fetchAnnouncementStatsAction(),
        ])

        if (!feedResult.ok) {
          announcementToasts.failed(feedResult.error)
          return
        }
        if (!listResult.ok) {
          announcementToasts.failed(listResult.error)
          return
        }
        if (!statsResult.ok) {
          announcementToasts.failed(statsResult.error)
          return
        }

        setFeed(feedResult.data)
        if (canManage) setList(listResult.data)
        setStats(statsResult.data)
      } catch {
        announcementToasts.failed(
          "Unable to reach the database. Check your connection and try again."
        )
      } finally {
        setLoading(false)
      }
    },
    [statusFilter, canManage, showAllFeed]
  )

  const refresh = useCallback(async () => {
    await loadPage(debouncedQuery, page, statusFilter)
  }, [debouncedQuery, page, statusFilter, loadPage])

  useStaffRealtimeRefresh(
    `staff-announcements-${d}`,
    STAFF_REALTIME_TABLES.announcements,
    () => {
      void refresh()
    }
  )

  useEffect(() => {
    if (skipNextFetch.current) {
      skipNextFetch.current = false
      return
    }
    void loadPage(debouncedQuery, page, statusFilter)
  }, [debouncedQuery, page, statusFilter, loadPage])

  const statCards = useMemo(() => toStatCards(stats), [stats])
  const showSkeleton = loading || isPending
  const rows = list.items
  const hasRows = rows.length > 0
  const hasFeed = feed.items.length > 0

  function openAnnouncement(announcement: Announcement) {
    setSelected(announcement)
    // Nurses always open the dedicated article reader for published items.
    if (announcement.status === "published" || d === "nurse") {
      setSheetOpen(false)
      setArticleOpen(true)
    } else {
      setArticleOpen(false)
      setSheetOpen(true)
    }
    startTransition(async () => {
      const result = await fetchAnnouncementByIdAction(announcement.id)
      if (!result.ok) {
        announcementToasts.failed(result.error)
        return
      }
      setSelected(result.data)
    })
  }

  function openCreate() {
    setFormMode("create")
    setEditing(null)
    setFormOpen(true)
  }

  function openEdit(announcement: Announcement) {
    setSheetOpen(false)
    setArticleOpen(false)
    setFormMode("edit")
    setEditing(announcement)
    setFormOpen(true)
    startTransition(async () => {
      const result = await fetchAnnouncementByIdAction(announcement.id)
      if (!result.ok) {
        announcementToasts.failed(result.error)
        return
      }
      setEditing(result.data)
    })
  }

  function openDelete(announcement: Announcement) {
    setSheetOpen(false)
    setArticleOpen(false)
    setDeleting(announcement)
    setDeleteOpen(true)
  }

  function handlePublish(announcement: Announcement) {
    void confirmPreset("publish", {
      onConfirm: () => {
        startTransition(async () => {
          const result = await publishAnnouncementAction(announcement.id)
          if (!result.ok) {
            announcementToasts.failed(result.error)
            return
          }
          announcementToasts.published()
          setSelected(result.data)
          await refresh()
        })
      },
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
      setArticleOpen(false)
    }
    setDeleting(null)
    await refresh()
  }

  return (
    <div className="flex flex-col gap-6">
      <DemoPageHeader
        title="Announcements"
        description=""
        designation={d}
        showDemoBanner={false}
        showRoleSuffix={false}
        actions={
          canManage ? (
            <Button onClick={openCreate}>Add announcement</Button>
          ) : null
        }
      />

      {canManage && can(d, "announcements.cards") && d !== "nurse" ? (
        <DemoStatGrid stats={statCards} />
      ) : null}

      <section className="flex flex-col gap-4">
        {!canManage ? (
          <Input
            className="sm:w-72"
            placeholder="Search announcements"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        ) : null}

        {showSkeleton && !hasFeed ? (
          <NewsFeedSkeleton />
        ) : hasFeed ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {(isPhysician && !showAllFeed
                ? feed.items.slice(0, FEED_PREVIEW_LIMIT)
                : feed.items
              ).map((item) => (
                <AnnouncementNewsCard
                  key={item.id}
                  announcement={item}
                  onClick={() => openAnnouncement(item)}
                />
              ))}
            </div>
            {isPhysician && feed.items.length > FEED_PREVIEW_LIMIT ? (
              <div className="flex justify-center pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAllFeed((current) => !current)}
                >
                  {showAllFeed ? "Show less" : "View All"}
                </Button>
              </div>
            ) : null}
          </>
        ) : (
          <Empty className="border border-dashed py-12">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <IconSpeakerphone />
              </EmptyMedia>
              <EmptyTitle>No published announcements</EmptyTitle>
              <EmptyDescription>
                {canManage
                  ? "Publish a notice to show it in the news feed."
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
      </section>

      {canManage && can(d, "announcements.table") ? (
        <Card
          id="announcements-manage"
          className="min-w-0 scroll-mt-20 shadow-none dark:ring-0"
        >
          <CardHeader className="flex flex-col gap-3 border-b sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base">Manage announcements</CardTitle>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
              <div className="flex flex-wrap gap-1">
                {STATUS_FILTERS.map((value) => (
                  <Button
                    key={value}
                    size="xs"
                    variant={statusFilter === value ? "default" : "outline"}
                    onClick={() => {
                      setStatusFilter(value)
                      setPage(1)
                    }}
                  >
                    {value === "all"
                      ? "All"
                      : announcementStatusLabel(value)}
                  </Button>
                ))}
              </div>
              <Input
                className="sm:w-72"
                placeholder="Search title, body, audience, author, status"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
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
                            {canPublish ? (
                              row.status !== "published" ? (
                                <Button
                                  size="xs"
                                  onClick={() => handlePublish(row)}
                                >
                                  Publish
                                </Button>
                              ) : (
                                <Button size="xs" disabled>
                                  Published
                                </Button>
                              )
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
                        onClick={() =>
                          setPage((current) => Math.max(1, current - 1))
                        }
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
                    Create the first clinic notice for students and staff.
                  </EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  <Button onClick={openCreate}>Add announcement</Button>
                </EmptyContent>
              </Empty>
            )}
          </CardContent>
        </Card>
      ) : null}

      <AnnouncementArticleDialog
        announcement={selected}
        open={articleOpen}
        onOpenChange={setArticleOpen}
        canEdit={canEdit}
        canDelete={canDelete}
        onEdit={openEdit}
        onDelete={openDelete}
      />

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
