"use client"

import { useDeferredValue, useEffect, useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  IconDots,
  IconMailForward,
  IconPencil,
  IconSearch,
  IconUser,
  IconUserCheck,
  IconUserOff,
} from "@tabler/icons-react"

import {
  deleteStaffUser,
  resendStaffInvite,
  setStaffUserActive,
  updateStaffUserRole,
} from "@/features/admin/actions/user-management"
import {
  roleLabel,
  type DirectoryConfig,
  type UserDirectory,
} from "@/features/admin/lib/user-directory-config"
import type {
  ManagedRole,
  ManagedStaffUser,
} from "@/features/admin/types/user-management"
import {
  DirectoryColumnHeader,
  DirectoryColumnLabel,
  type ColumnSortDirection,
} from "@/features/admin/components/directory-column-header"
import { UserDeleteDialog } from "@/features/admin/components/user-delete-dialog"
import { UserEditSheet } from "@/features/admin/components/user-edit-sheet"
import { UserImportSheet } from "@/features/admin/components/user-import-sheet"
import { UserInviteSheet } from "@/features/admin/components/user-invite-sheet"
import {
  adminElevatedCardClassName,
  adminPageShellClassName,
} from "@/features/admin/lib/admin-surface"
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/reui/alert"
import { StatCard } from "@/components/shared/stat-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"

type UserDirectoryPanelProps = {
  directory: UserDirectory
  config: DirectoryConfig
  initialUsers: ManagedStaffUser[]
  loadError?: string
}

type ManageResult =
  | { ok: true; message: string; warning?: string }
  | { ok: false; error: string }

type SortColumn = "user" | "role" | "status" | "lastSignIn"
type StatusColumnFilter = "all" | "active" | "invited" | "inactive"

function statusBadge(user: ManagedStaffUser) {
  if (user.status === "inactive") {
    return (
      <Badge
        variant="secondary"
        className="border-transparent bg-muted text-muted-foreground"
      >
        Inactive
      </Badge>
    )
  }

  if (user.status === "invited") {
    return (
      <Badge
        variant="secondary"
        className="border-transparent bg-warning/15 text-warning-foreground"
      >
        Invited
      </Badge>
    )
  }

  return (
    <Badge
      variant="secondary"
      className="border-transparent bg-success/15 text-success-foreground"
    >
      Active
    </Badge>
  )
}

function withActiveFlag(
  user: ManagedStaffUser,
  isActive: boolean
): ManagedStaffUser {
  if (!isActive) {
    return {
      ...user,
      isActive: false,
      invitePending: false,
      status: "inactive",
    }
  }

  // Activate alone restores prior access — not a re-invite.
  const status = user.lastSignInAt ? "active" : "invited"
  return {
    ...user,
    isActive: true,
    invitePending: status === "invited",
    status,
  }
}

function withInvitePending(user: ManagedStaffUser): ManagedStaffUser {
  return {
    ...user,
    isActive: true,
    invitePending: true,
    status: "invited",
  }
}

function statusRank(user: ManagedStaffUser) {
  if (user.status === "active") return 0
  if (user.status === "invited") return 1
  return 2
}

function formatLastSignIn(value: string | null) {
  if (!value) return "Never"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Never"
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export function UserDirectoryPanel({
  directory,
  config,
  initialUsers,
  loadError,
}: UserDirectoryPanelProps) {
  const router = useRouter()
  const [users, setUsers] = useState(initialUsers)
  const [query, setQuery] = useState("")
  const [status, setStatus] = useState<StatusColumnFilter>("all")
  const [role, setRole] = useState<ManagedRole | "all">(
    directory === "admins" ? "admin" : "all"
  )
  const [sortColumn, setSortColumn] = useState<SortColumn>("user")
  const [sortDirection, setSortDirection] =
    useState<ColumnSortDirection>("asc")
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [bulkPending, setBulkPending] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<ManagedStaffUser | null>(null)
  const [, startTransition] = useTransition()
  const deferredQuery = useDeferredValue(query.trim().toLowerCase())

  useEffect(() => {
    setUsers(initialUsers)
    setSelectedIds((prev) => {
      const next = new Set<string>()
      for (const id of prev) {
        if (initialUsers.some((user) => user.id === id)) next.add(id)
      }
      return next
    })
  }, [initialUsers])

  function setColumnSort(column: SortColumn, direction: ColumnSortDirection) {
    setSortColumn(column)
    setSortDirection(direction)
  }

  function sortDirectionFor(column: SortColumn): ColumnSortDirection {
    return sortColumn === column ? sortDirection : false
  }

  const visibleUsers = useMemo(() => {
    const filtered = users.filter((user) => {
      if (role !== "all" && user.role !== role) return false
      if (status !== "all" && user.status !== status) return false
      if (!deferredQuery) return true
      return `${user.fullName} ${user.email} ${user.role}`
        .toLowerCase()
        .includes(deferredQuery)
    })

    const direction = sortDirection === "desc" ? -1 : 1
    return [...filtered].sort((a, b) => {
      let compare = 0
      if (sortColumn === "user") {
        compare = a.fullName.localeCompare(b.fullName)
      } else if (sortColumn === "role") {
        compare = a.role.localeCompare(b.role)
      } else if (sortColumn === "status") {
        compare = statusRank(a) - statusRank(b)
      } else {
        const aTime = a.lastSignInAt ? Date.parse(a.lastSignInAt) : 0
        const bTime = b.lastSignInAt ? Date.parse(b.lastSignInAt) : 0
        compare = aTime - bTime
      }
      if (compare === 0) {
        compare = a.fullName.localeCompare(b.fullName)
      }
      return compare * direction
    })
  }, [users, role, status, deferredQuery, sortColumn, sortDirection])

  const summary = useMemo(() => {
    const active = users.filter((user) => user.status === "active").length
    const invited = users.filter((user) => user.status === "invited").length
    const inactive = users.filter((user) => user.status === "inactive").length
    return {
      total: users.length,
      active,
      invited,
      inactive,
    }
  }, [users])

  const visibleIds = visibleUsers.map((user) => user.id)
  const selectedVisibleCount = visibleIds.filter((id) =>
    selectedIds.has(id)
  ).length
  const allVisibleSelected =
    visibleIds.length > 0 && selectedVisibleCount === visibleIds.length
  const someVisibleSelected =
    selectedVisibleCount > 0 && !allVisibleSelected

  function syncFromServer() {
    router.refresh()
  }

  function toggleRow(userId: string, checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (checked) next.add(userId)
      else next.delete(userId)
      return next
    })
  }

  function toggleSelectAll(checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (checked) {
        for (const id of visibleIds) next.add(id)
      } else {
        for (const id of visibleIds) next.delete(id)
      }
      return next
    })
  }

  function clearSelection() {
    setSelectedIds(new Set())
  }

  function runUserAction(
    userId: string,
    optimistic: (current: ManagedStaffUser[]) => ManagedStaffUser[],
    action: () => Promise<ManageResult>
  ) {
    const snapshot = users
    setUsers(optimistic)
    setPendingId(userId)

    startTransition(async () => {
      const result = await action()
      setPendingId(null)

      if (!result.ok) {
        setUsers(snapshot)
        toast.error(result.error)
        return
      }

      toast.success(result.message)
      if (result.warning) toast.message(result.warning)
      syncFromServer()
    })
  }

  function runBulkStatus(isActive: boolean, label: "activate" | "archive" | "deactivate" = isActive ? "activate" : "deactivate") {
    const ids = [...selectedIds]
    if (ids.length === 0) return

    const snapshot = users
    setUsers((current) =>
      current.map((row) =>
        ids.includes(row.id) ? withActiveFlag(row, isActive) : row
      )
    )
    setBulkPending(true)

    startTransition(async () => {
      const failures: string[] = []
      for (const userId of ids) {
        const result = await setStaffUserActive({ userId, isActive })
        if (!result.ok) failures.push(result.error)
      }
      setBulkPending(false)

      if (failures.length > 0) {
        setUsers(snapshot)
        toast.error(
          `Could not update ${failures.length} account${failures.length === 1 ? "" : "s"}.`
        )
        return
      }

      const noun = ids.length === 1 ? "account" : "accounts"
      toast.success(
        label === "activate"
          ? `Activated ${ids.length} ${noun}.`
          : label === "archive"
            ? `Archived ${ids.length} ${noun}.`
            : `Deactivated ${ids.length} ${noun}.`
      )
      clearSelection()
      syncFromServer()
    })
  }

  function confirmDeleteSelected() {
    const ids = [...selectedIds]
    if (ids.length === 0) return

    const snapshot = users
    const idSet = new Set(ids)

    // Local-first: remove selected rows immediately, sync in background.
    setUsers((current) => current.filter((row) => !idSet.has(row.id)))
    setDeleteOpen(false)
    setBulkPending(true)
    clearSelection()

    startTransition(async () => {
      const failures: string[] = []
      for (const userId of ids) {
        const result = await deleteStaffUser({ userId })
        if (!result.ok) failures.push(result.error)
      }
      setBulkPending(false)

      if (failures.length > 0) {
        setUsers(snapshot)
        toast.error(
          `Could not delete ${failures.length} account${failures.length === 1 ? "" : "s"}. ${failures[0] ?? ""}`.trim()
        )
        return
      }

      toast.success(
        `Deleted ${ids.length} account${ids.length === 1 ? "" : "s"}.`
      )
      syncFromServer()
    })
  }

  const deleteSelection = users.filter((user) => selectedIds.has(user.id))
  const deletePrimary = deleteSelection[0]

  return (
    <div className={adminPageShellClassName("min-h-0 gap-4")}>
      <div className="min-w-0">
        <h1 className="truncate text-2xl font-semibold tracking-tight">
          {config.title}
        </h1>
      </div>

      {loadError ? (
        <Alert variant="destructive">
          <AlertTitle>Directory unavailable</AlertTitle>
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          className={adminElevatedCardClassName}
          label={directory === "admins" ? "Admin accounts" : "Staff accounts"}
          value={String(summary.total)}
          description="In this directory"
        />
        <StatCard
          className={adminElevatedCardClassName}
          label="Active"
          value={String(summary.active)}
          description="Have signed in"
        />
        <StatCard
          className={adminElevatedCardClassName}
          label="Invited"
          value={String(summary.invited)}
          description="Invite sent, not yet signed in"
        />
        <StatCard
          className={adminElevatedCardClassName}
          label="Inactive"
          value={String(summary.inactive)}
          description="Access revoked"
        />
      </div>

      <Card className={cn(adminElevatedCardClassName, "min-w-0 gap-0 py-0")}>
        <CardHeader className="flex flex-col gap-3 border-b pt-(--card-spacing) sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base">
            {config.directoryTitle}
          </CardTitle>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <div className="relative w-full sm:w-72">
              <IconSearch
                className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                className="pl-8"
                placeholder="Search users…"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                aria-label="Search directory"
              />
            </div>
            <UserImportSheet
              config={config}
              onImported={syncFromServer}
              toolbar
            />
            <UserInviteSheet
              config={config}
              onCreated={syncFromServer}
              toolbar
            />
          </div>
        </CardHeader>

        {selectedIds.size > 0 ? (
          <div
            className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/30 px-(--card-spacing) py-3"
            role="status"
          >
            <p className="text-sm">
              <span className="font-medium tabular-nums">
                {selectedIds.size}
              </span>{" "}
              selected
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={bulkPending}
                onClick={() => runBulkStatus(true, "activate")}
              >
                Activate
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={bulkPending}
                onClick={() => runBulkStatus(false, "deactivate")}
              >
                Deactivate
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={bulkPending}
                onClick={() => runBulkStatus(false, "archive")}
              >
                Archive
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={bulkPending}
                onClick={() => setDeleteOpen(true)}
              >
                Delete
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={bulkPending}
                onClick={clearSelection}
              >
                Clear
              </Button>
            </div>
          </div>
        ) : null}

        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="h-12 w-12 px-4">
                  <Checkbox
                    checked={allVisibleSelected}
                    indeterminate={someVisibleSelected}
                    disabled={visibleUsers.length === 0 || bulkPending}
                    onCheckedChange={(value) => toggleSelectAll(!!value)}
                    aria-label={
                      allVisibleSelected
                        ? "Deselect all visible users"
                        : "Select all visible users"
                    }
                  />
                </TableHead>
                <TableHead className="h-12 px-4">
                  <DirectoryColumnHeader
                    title="User"
                    sortDirection={sortDirectionFor("user")}
                    onSortAsc={() => setColumnSort("user", "asc")}
                    onSortDesc={() => setColumnSort("user", "desc")}
                    onClearSort={() => setColumnSort("user", "asc")}
                  />
                </TableHead>
                <TableHead className="h-12 px-4">
                  <DirectoryColumnHeader
                    title="Role"
                    sortDirection={sortDirectionFor("role")}
                    onSortAsc={() => setColumnSort("role", "asc")}
                    onSortDesc={() => setColumnSort("role", "desc")}
                    onClearSort={() => {
                      setColumnSort("user", "asc")
                      setRole(directory === "admins" ? "admin" : "all")
                    }}
                    filterLabel="Role"
                    filterItems={
                      config.showRoleFilter ? (
                        <>
                          <DropdownMenuItem
                            onClick={() => setRole("all")}
                            className={cn(role === "all" && "bg-accent")}
                          >
                            All roles
                          </DropdownMenuItem>
                          {config.roles.map((nextRole) => (
                            <DropdownMenuItem
                              key={nextRole}
                              onClick={() => setRole(nextRole)}
                              className={cn(role === nextRole && "bg-accent")}
                            >
                              {roleLabel(nextRole)}
                            </DropdownMenuItem>
                          ))}
                        </>
                      ) : (
                        <DropdownMenuItem disabled>Admin only</DropdownMenuItem>
                      )
                    }
                  />
                </TableHead>
                <TableHead className="h-12 px-4">
                  <DirectoryColumnHeader
                    title="Status"
                    sortDirection={sortDirectionFor("status")}
                    onSortAsc={() => setColumnSort("status", "asc")}
                    onSortDesc={() => setColumnSort("status", "desc")}
                    onClearSort={() => {
                      setColumnSort("user", "asc")
                      setStatus("all")
                    }}
                    filterLabel="Status"
                    filterItems={
                      <>
                        <DropdownMenuItem
                          onClick={() => setStatus("all")}
                          className={cn(status === "all" && "bg-accent")}
                        >
                          All statuses
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setStatus("active")}
                          className={cn(status === "active" && "bg-accent")}
                        >
                          Active
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setStatus("invited")}
                          className={cn(status === "invited" && "bg-accent")}
                        >
                          Invited
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setStatus("inactive")}
                          className={cn(status === "inactive" && "bg-accent")}
                        >
                          Inactive
                        </DropdownMenuItem>
                      </>
                    }
                  />
                </TableHead>
                <TableHead className="h-12 px-4">
                  <DirectoryColumnHeader
                    title="Last sign-in"
                    sortDirection={sortDirectionFor("lastSignIn")}
                    onSortAsc={() => setColumnSort("lastSignIn", "asc")}
                    onSortDesc={() => setColumnSort("lastSignIn", "desc")}
                    onClearSort={() => setColumnSort("user", "asc")}
                  />
                </TableHead>
                <TableHead className="h-12 px-4 text-right">
                  <DirectoryColumnLabel title="Actions" className="ml-auto" />
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleUsers.map((user) => {
                const busy = pendingId === user.id || bulkPending
                const selected = selectedIds.has(user.id)
                return (
                  <TableRow
                    key={user.id}
                    data-state={selected ? "selected" : undefined}
                    className={cn(busy && "opacity-70")}
                  >
                    <TableCell className="px-4 py-3.5">
                      <Checkbox
                        checked={selected}
                        disabled={busy}
                        onCheckedChange={(value) =>
                          toggleRow(user.id, !!value)
                        }
                        aria-label={`Select ${user.fullName}`}
                      />
                    </TableCell>
                    <TableCell className="px-4 py-3.5">
                      <p className="text-sm font-medium">{user.fullName}</p>
                      <p className="text-sm text-muted-foreground">
                        {user.email}
                      </p>
                    </TableCell>
                    <TableCell className="px-4 py-3.5 text-sm capitalize">
                      {roleLabel(user.role)}
                    </TableCell>
                    <TableCell className="px-4 py-3.5">
                      {statusBadge(user)}
                    </TableCell>
                    <TableCell className="px-4 py-3.5 text-sm text-muted-foreground">
                      {formatLastSignIn(user.lastSignInAt)}
                    </TableCell>
                    <TableCell className="px-4 py-3.5 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button
                              type="button"
                              size="icon-sm"
                              variant="outline"
                              className="rounded-lg"
                              disabled={busy}
                              aria-label={`Actions for ${user.fullName}`}
                            >
                              <IconDots aria-hidden="true" />
                            </Button>
                          }
                        />
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuGroup>
                            <DropdownMenuItem
                              disabled={busy}
                              onClick={() => setEditingUser(user)}
                            >
                              <IconPencil aria-hidden="true" />
                              Edit details
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              disabled={busy}
                              onClick={() =>
                                runUserAction(
                                  user.id,
                                  (current) =>
                                    current.map((row) =>
                                      row.id === user.id
                                        ? withInvitePending(row)
                                        : row
                                    ),
                                  () =>
                                    resendStaffInvite({ userId: user.id })
                                )
                              }
                            >
                              <IconMailForward aria-hidden="true" />
                              Resend invite
                            </DropdownMenuItem>
                            {config.allowRoleChange
                              ? config.roles
                                  .filter((nextRole) => nextRole !== user.role)
                                  .map((nextRole) => (
                                    <DropdownMenuItem
                                      key={nextRole}
                                      disabled={busy}
                                      onClick={() =>
                                        runUserAction(
                                          user.id,
                                          (current) =>
                                            current.map((row) =>
                                              row.id === user.id
                                                ? { ...row, role: nextRole }
                                                : row
                                            ),
                                          () =>
                                            updateStaffUserRole({
                                              userId: user.id,
                                              role: nextRole,
                                              allowedRoles: [...config.roles],
                                            })
                                        )
                                      }
                                    >
                                      <IconUser aria-hidden="true" />
                                      Make {roleLabel(nextRole)}
                                    </DropdownMenuItem>
                                  ))
                              : null}
                          </DropdownMenuGroup>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant={user.isActive ? "destructive" : "default"}
                            disabled={busy}
                            onClick={() =>
                              runUserAction(
                                user.id,
                                (current) =>
                                  current.map((row) =>
                                    row.id === user.id
                                      ? withActiveFlag(row, !row.isActive)
                                      : row
                                  ),
                                () =>
                                  setStaffUserActive({
                                    userId: user.id,
                                    isActive: !user.isActive,
                                  })
                              )
                            }
                          >
                            {user.isActive ? (
                              <IconUserOff aria-hidden="true" />
                            ) : (
                              <IconUserCheck aria-hidden="true" />
                            )}
                            {user.isActive ? "Deactivate" : "Activate"}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })}
              {visibleUsers.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-10 text-center text-sm text-muted-foreground"
                  >
                    {loadError
                      ? "Fix the directory error above, then refresh."
                      : users.length === 0
                        ? "No accounts yet. Invite someone to get started."
                        : "No matches for these filters."}
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <UserDeleteDialog
        open={deleteOpen}
        count={selectedIds.size}
        userName={deletePrimary?.fullName}
        userEmail={deletePrimary?.email}
        pending={bulkPending && deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={confirmDeleteSelected}
      />

      <UserEditSheet
        config={config}
        user={editingUser}
        open={Boolean(editingUser)}
        onOpenChange={(next) => {
          if (!next) setEditingUser(null)
        }}
        onSaved={(updated) => {
          setUsers((current) =>
            current.map((row) => (row.id === updated.id ? updated : row))
          )
          setEditingUser(null)
        }}
      />

      <p className="sr-only" role="status">
        {selectedIds.size > 0
          ? `${selectedIds.size} users selected`
          : "No users selected"}
      </p>
    </div>
  )
}
