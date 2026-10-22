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
import type { ComponentType } from "react"
import {
  IconCalendarEvent,
  IconLayoutCards,
  IconLayoutGrid,
  IconLayoutList,
  IconNews,
  IconPencil,
  IconPlus,
  IconSearch,
  IconSend,
  IconSpeakerphone,
  IconTrash,
  IconUsers,
} from "@tabler/icons-react"

import { AnnouncementArticleDialog } from "@/components/announcements/announcement-article-dialog"
import { AnnouncementDeleteDialog } from "@/components/announcements/announcement-delete-dialog"
import { AnnouncementDetailSheet } from "@/components/announcements/announcement-detail-sheet"
import { AnnouncementFormSheet } from "@/components/announcements/announcement-form-sheet"
import {
  AnnouncementNewsCard,
  type AnnouncementCardDensity,
} from "@/components/announcements/announcement-news-card"
import { cn } from "@/lib/utils"
import { DemoPageHeader, DemoStatGrid } from "@/components/demo/demo-page"
import { StatusBadge } from "@/components/ui/status-badge"
import { Button } from "@/components/ui/button"
import {
  STATUS_BADGE_DOT,
  STATUS_BADGE_TONE,
} from "@/lib/ui/status-badge-tone"
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
import { selectItemsRecord } from "@/lib/ui/select-label"
import {
  staleListBusy,
  staleListBusyClassName,
} from "@/lib/ui/stale-list-busy"
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
  getCachedAnnouncements,
  loadAnnouncementsBundle,
  saveAnnouncementsCache,
} from "@/features/announcements/lib/prefetch-announcements"
import {
  announcementsCacheKey,
  staffCacheIsFresh,
} from "@/lib/ui/staff-data-cache"
import {
  announcementStatusLabel,
  formatAnnouncementDateTime,
} from "@/features/announcements/lib/format"
import { can, canMutate } from "@/lib/auth/permissions"
import type { StaffAccess } from "@/lib/auth/types"
import type { DemoStat } from "@/lib/demo/types"
import { useInstantListRefresh } from "@/hooks/use-instant-list-refresh"
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
const FEED_PREVIEW_LIMITS: Record<AnnouncementCardDensity, number> = {
  card: 6,
  dense: 8,
  list: 8,
}
const FEED_LAYOUT_STORAGE_KEY = "campuscare.announcements.feedLayout"
const SEARCH_DEBOUNCE_MS = 300
const STATUS_FILTERS = ["all", "published", "scheduled", "draft"] as const
type StatusFilter = (typeof STATUS_FILTERS)[number]

const FEED_LAYOUTS: {
  value: AnnouncementCardDensity
  label: string
  icon: ComponentType<{ className?: string; stroke?: number }>
}[] = [
  { value: "card", label: "Cards", icon: IconLayoutGrid },
  { value: "dense", label: "Compact", icon: IconLayoutCards },
  { value: "list", label: "List", icon: IconLayoutList },
]

function readStoredFeedLayout(): AnnouncementCardDensity {
  if (typeof window === "undefined") return "card"
  try {
    const value = window.localStorage.getItem(FEED_LAYOUT_STORAGE_KEY)
    if (value === "card" || value === "dense" || value === "list") return value
  } catch {
    // ignore
  }
  return "card"
}

function announcementStatusToneKey(
  status: AnnouncementStatus
): "published" | "scheduled" | "draft" {
  if (status === "published") return "published"
  if (status === "scheduled") return "scheduled"
  return "draft"
}

function MetaChip({
  icon: Icon,
  label,
}: {
  icon: ComponentType<{ className?: string; stroke?: number }>
  label: string
}) {
  return (
    <span className="inline-flex max-w-full items-center gap-1 rounded-md bg-muted/55 px-1.5 py-0.5 text-[11px] text-muted-foreground">
      <Icon className="size-3.5 shrink-0 opacity-70" stroke={1.75} aria-hidden />
      <span className="truncate">{label}</span>
    </span>
  )
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
    <div
      className="space-y-2 p-4"
      role="status"
      aria-label="Loading announcements"
    >
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="flex items-center gap-3">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-8 flex-1" />
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-24" />
        </div>
      ))}
    </div>
  )
}

function NewsFeedSkeleton({
  density = "card",
}: {
  density?: AnnouncementCardDensity
}) {
  if (density === "list") {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-20 w-full rounded-xl" />
        ))}
      </div>
    )
  }

  return (
    <div
      className={cn(
        "grid gap-3",
        density === "dense"
          ? "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          : "gap-4 sm:grid-cols-2 xl:grid-cols-3"
      )}
    >
      {Array.from({ length: density === "dense" ? 4 : 3 }).map((_, index) => (
        <Skeleton
          key={index}
          className={cn(
            "w-full rounded-xl",
            density === "dense" ? "aspect-[16/12]" : "aspect-[4/3]"
          )}
        />
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
  hydrateFromCache = false,
}: {
  access: StaffAccess
  initialFeed: AnnouncementListResult
  initialList: AnnouncementListResult
  initialStats: AnnouncementStats
  initialError?: string | null
  hydrateFromCache?: boolean
}) {
  const { confirmPreset } = useConfirm()
  const cached = hydrateFromCache
    ? getCachedAnnouncements(access.designation)
    : null
  const [query, setQuery] = useState("")
  const [debouncedQuery, setDebouncedQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [page, setPage] = useState(1)
  const [feed, setFeed] = useState(cached?.feed ?? initialFeed)
  const [list, setList] = useState(cached?.list ?? initialList)
  const [stats, setStats] = useState(cached?.stats ?? initialStats)
  const [loading, setLoading] = useState(
    () => hydrateFromCache && !cached
  )
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
  const [feedLayout, setFeedLayout] = useState<AnnouncementCardDensity>("card")
  const [feedLayoutReady, setFeedLayoutReady] = useState(false)
  const skipNextFetch = useRef(true)
  const hydratedRef = useRef(false)

  const d = access.designation
  const canManage = canMutate(d, "announcements.add")
  const canEdit = can(d, "announcements.edit")
  const canPublish = can(d, "announcements.publish")
  const canDelete = can(d, "announcements.delete")
  const feedPreviewLimit = FEED_PREVIEW_LIMITS[feedLayout]

  useEffect(() => {
    setFeedLayout(readStoredFeedLayout())
    setFeedLayoutReady(true)
  }, [])

  useEffect(() => {
    if (!feedLayoutReady) return
    try {
      window.localStorage.setItem(FEED_LAYOUT_STORAGE_KEY, feedLayout)
    } catch {
      // ignore
    }
  }, [feedLayout, feedLayoutReady])

  useEffect(() => {
    if (initialError) announcementToasts.failed(initialError)
  }, [initialError])

  // Warm session cache from RSC seed so revisits / prefetch share the payload.
  useEffect(() => {
    if (hydrateFromCache) return
    saveAnnouncementsCache(access.designation, {
      feed: initialFeed,
      list: initialList,
      stats: initialStats,
    })
  }, [
    access.designation,
    hydrateFromCache,
    initialFeed,
    initialList,
    initialStats,
  ])

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
      nextStatus: StatusFilter = statusFilter,
      options?: { silent?: boolean }
    ) => {
      const silent = Boolean(options?.silent)
      const isDefault =
        hydrateFromCache &&
        !nextQuery.trim() &&
        nextPage === 1 &&
        nextStatus === "all" &&
        !showAllFeed

      if (!silent) setLoading(true)
      try {
        if (isDefault) {
          const bundle = await loadAnnouncementsBundle(access.designation, {
            force: true,
          })
          setFeed(bundle.feed)
          if (canManage) setList(bundle.list)
          setStats(bundle.stats)
          return
        }

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
    [
      access.designation,
      canManage,
      hydrateFromCache,
      showAllFeed,
      statusFilter,
    ]
  )

  const refresh = useCallback(async () => {
    await loadPage(debouncedQuery, page, statusFilter, { silent: true })
  }, [debouncedQuery, page, statusFilter, loadPage])

  const { schedule: scheduleRefresh } = useInstantListRefresh(refresh, 400)

  useStaffRealtimeRefresh(
    `staff-announcements-${d}`,
    STAFF_REALTIME_TABLES.announcements,
    scheduleRefresh
  )

  function patchAnnouncementInLists(announcement: Announcement) {
    setList((prev) => {
      const matchesFilter =
        statusFilter === "all" || announcement.status === statusFilter
      const without = prev.items.filter((item) => item.id !== announcement.id)
      const items = matchesFilter
        ? [announcement, ...without].slice(0, prev.pageSize)
        : without
      return { ...prev, items }
    })
    setFeed((prev) => {
      if (announcement.status !== "published") {
        return {
          ...prev,
          items: prev.items.filter((item) => item.id !== announcement.id),
        }
      }
      const without = prev.items.filter((item) => item.id !== announcement.id)
      return {
        ...prev,
        items: [announcement, ...without].slice(0, prev.pageSize),
      }
    })
  }

  useEffect(() => {
    if (!hydrateFromCache || hydratedRef.current) return
    hydratedRef.current = true
    const hit = getCachedAnnouncements(access.designation)
    const fresh =
      Boolean(hit) &&
      staffCacheIsFresh(announcementsCacheKey(access.designation))
    if (hit) {
      setFeed(hit.feed)
      setList(hit.list)
      setStats(hit.stats)
      setLoading(false)
    }
    if (fresh) return
    void loadAnnouncementsBundle(access.designation, {
      force: Boolean(hit),
    })
      .then((bundle) => {
        setFeed(bundle.feed)
        setList(bundle.list)
        setStats(bundle.stats)
        setLoading(false)
      })
      .catch(() => {
        setLoading(false)
        if (!hit) void loadPage("", 1, "all", { silent: true })
      })
  }, [access.designation, hydrateFromCache, loadPage])

  useEffect(() => {
    if (skipNextFetch.current) {
      skipNextFetch.current = false
      return
    }
    void loadPage(debouncedQuery, page, statusFilter)
  }, [debouncedQuery, page, statusFilter, loadPage])

  const statCards = useMemo(() => toStatCards(stats), [stats])
  const rows = list.items
  const hasRows = rows.length > 0
  const hasFeed = feed.items.length > 0
  const { showInitialSkeleton, isRefreshing } = staleListBusy(
    loading,
    rows.length,
    isPending
  )
  const feedBusy = staleListBusy(loading, feed.items.length, isPending)

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
          const optimistic: Announcement = {
            ...announcement,
            status: "published",
            publishedAt: new Date().toISOString(),
          }
          patchAnnouncementInLists(optimistic)
          setSelected(optimistic)
          const result = await publishAnnouncementAction(announcement.id)
          if (!result.ok) {
            announcementToasts.failed(result.error)
            patchAnnouncementInLists(announcement)
            setSelected(announcement)
            scheduleRefresh()
            return
          }
          announcementToasts.published()
          setSelected(result.data)
          patchAnnouncementInLists(result.data)
          scheduleRefresh()
        })
      },
    })
  }

  function handleSaved(announcement: Announcement) {
    setSelected(announcement)
    patchAnnouncementInLists(announcement)
    scheduleRefresh()
  }

  function handleDeleted(id: string) {
    if (selected?.id === id) {
      setSelected(null)
      setSheetOpen(false)
      setArticleOpen(false)
    }
    setDeleting(null)
    setList((prev) => ({
      ...prev,
      items: prev.items.filter((item) => item.id !== id),
      total: Math.max(0, prev.total - 1),
    }))
    setFeed((prev) => ({
      ...prev,
      items: prev.items.filter((item) => item.id !== id),
      total: Math.max(0, prev.total - 1),
    }))
    scheduleRefresh()
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
            <Button onClick={openCreate}>
              <IconPlus data-icon="inline-start" aria-hidden />
              Add announcement
            </Button>
          ) : null
        }
      />

      {canManage && can(d, "announcements.cards") && d !== "nurse" ? (
        <DemoStatGrid stats={statCards} />
      ) : null}

      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <IconNews className="size-4" stroke={1.75} aria-hidden />
            </span>
            <div>
              <h2 className="text-base font-semibold tracking-tight">
                News feed
              </h2>
              <p className="text-xs text-muted-foreground">
                Published notices for your audience
              </p>
            </div>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            {!canManage ? (
              <div className="relative w-full sm:w-64">
                <IconSearch className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Search announcements"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  aria-label="Search announcements"
                />
              </div>
            ) : null}
            <div
              className="inline-flex h-9 shrink-0 items-center rounded-lg border border-border/70 bg-muted/40 p-0.5"
              role="group"
              aria-label="Feed layout"
            >
              {FEED_LAYOUTS.map(({ value, label, icon: Icon }) => {
                const active = feedLayout === value
                return (
                  <Button
                    key={value}
                    type="button"
                    size="sm"
                    variant="ghost"
                    className={cn(
                      "h-8 gap-1.5 rounded-md px-2.5 text-xs",
                      active
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                    aria-pressed={active}
                    aria-label={`${label} layout`}
                    title={label}
                    onClick={() => setFeedLayout(value)}
                  >
                    <Icon className="size-3.5" stroke={1.75} aria-hidden />
                    <span className="hidden sm:inline">{label}</span>
                  </Button>
                )
              })}
            </div>
          </div>
        </div>

        {feedBusy.showInitialSkeleton ? (
          <NewsFeedSkeleton density={feedLayout} />
        ) : hasFeed ? (
          <div
            className={staleListBusyClassName(feedBusy.isRefreshing)}
            aria-busy={feedBusy.isRefreshing || undefined}
          >
            <div
              className={cn(
                feedLayout === "list"
                  ? "flex flex-col gap-2"
                  : feedLayout === "dense"
                    ? "grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                    : "grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
              )}
            >
              {(showAllFeed
                ? feed.items
                : feed.items.slice(0, feedPreviewLimit)
              ).map((item) => (
                <AnnouncementNewsCard
                  key={item.id}
                  announcement={item}
                  density={feedLayout}
                  onClick={() => openAnnouncement(item)}
                />
              ))}
            </div>
            {feed.items.length > feedPreviewLimit ||
            feed.total > feedPreviewLimit ? (
              <div className="flex flex-col items-center gap-1.5 pt-2">
                {!showAllFeed ? (
                  <p className="text-xs text-muted-foreground">
                    Showing {Math.min(feedPreviewLimit, feed.items.length)} of{" "}
                    {feed.total || feed.items.length}
                  </p>
                ) : null}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAllFeed((current) => !current)}
                >
                  {showAllFeed ? "Show less" : "Show more"}
                </Button>
              </div>
            ) : null}
          </div>
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
                <Button onClick={openCreate}>
                  <IconPlus data-icon="inline-start" aria-hidden />
                  Add announcement
                </Button>
              </EmptyContent>
            ) : null}
          </Empty>
        )}
      </section>

      {canManage && can(d, "announcements.table") ? (
        <Card
          id="announcements-manage"
          className="min-w-0 scroll-mt-20 gap-0 py-0 shadow-none dark:ring-0"
        >
          <CardHeader className="gap-4 border-b px-6 py-5">
            <CardTitle className="flex items-center gap-2 text-base">
              <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <IconSpeakerphone
                  className="size-4"
                  stroke={1.75}
                  aria-hidden
                />
              </span>
              Manage announcements
            </CardTitle>
            <div className="flex w-full min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:gap-3">
              <div className="relative w-full sm:max-w-sm sm:flex-1">
                <IconSearch className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="h-9 pl-9"
                  placeholder="Search title, body, audience, author"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  aria-label="Search announcements"
                />
              </div>
              <Select
                value={statusFilter}
                items={selectItemsRecord([
                  { value: "all", label: "All statuses" },
                  ...STATUS_FILTERS.filter((value) => value !== "all").map(
                    (value) => ({
                      value,
                      label: announcementStatusLabel(value),
                    })
                  ),
                ])}
                onValueChange={(value) => {
                  setStatusFilter((value as StatusFilter) ?? "all")
                  setPage(1)
                }}
              >
                <SelectTrigger
                  className="w-full shrink-0 sm:w-48"
                  aria-label="Filter by status"
                >
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {STATUS_FILTERS.filter((value) => value !== "all").map(
                    (value) => (
                      <SelectItem key={value} value={value}>
                        {announcementStatusLabel(value)}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {showInitialSkeleton ? (
              <AnnouncementsTableSkeleton />
            ) : hasRows ? (
              <div
                className={staleListBusyClassName(isRefreshing)}
                aria-busy={isRefreshing || undefined}
              >
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
                        <TableCell>
                          <MetaChip icon={IconUsers} label={row.audience} />
                        </TableCell>
                        <TableCell>
                          <StatusBadge
                            label={announcementStatusLabel(row.status)}
                            toneClassName={
                              STATUS_BADGE_TONE[
                                announcementStatusToneKey(row.status)
                              ]
                            }
                            dotClassName={
                              STATUS_BADGE_DOT[
                                announcementStatusToneKey(row.status)
                              ]
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <MetaChip
                            icon={IconCalendarEvent}
                            label={formatAnnouncementDateTime(
                              row.publishedAt ?? row.updatedAt
                            )}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap justify-end gap-1">
                            {canEdit ? (
                              <Button
                                size="icon-sm"
                                variant="outline"
                                className="size-7"
                                aria-label="Edit announcement"
                                title="Edit"
                                onClick={() => openEdit(row)}
                              >
                                <IconPencil className="size-3.5" aria-hidden />
                              </Button>
                            ) : null}
                            {canPublish ? (
                              row.status !== "published" ? (
                                <Button
                                  size="icon-sm"
                                  className="size-7"
                                  aria-label="Publish announcement"
                                  title="Publish"
                                  onClick={() => handlePublish(row)}
                                >
                                  <IconSend className="size-3.5" aria-hidden />
                                </Button>
                              ) : (
                                <Button
                                  size="icon-sm"
                                  className="size-7"
                                  disabled
                                  aria-label="Already published"
                                  title="Published"
                                >
                                  <IconSend className="size-3.5" aria-hidden />
                                </Button>
                              )
                            ) : null}
                            {canDelete ? (
                              <Button
                                size="icon-sm"
                                variant="destructive"
                                className="size-7"
                                aria-label="Delete announcement"
                                title="Delete"
                                onClick={() => openDelete(row)}
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
                    <p className="text-sm text-muted-foreground">
                      Page {list.page} of {list.totalPages}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={list.page <= 1 || isRefreshing}
                        onClick={() =>
                          setPage((current) => Math.max(1, current - 1))
                        }
                      >
                        Previous
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={list.page >= list.totalPages || isRefreshing}
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
                  <Button onClick={openCreate}>
                    <IconPlus data-icon="inline-start" aria-hidden />
                    Add announcement
                  </Button>
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
