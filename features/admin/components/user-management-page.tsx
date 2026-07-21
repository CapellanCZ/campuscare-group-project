import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import {
  IconActivityHeartbeat,
  IconCertificate,
  IconNurse,
  IconStethoscope,
  IconUserPlus,
  IconUsers,
} from "@tabler/icons-react"

import {
  createStaffUser,
  listStaffUsers,
  setStaffUserActive,
} from "@/features/admin/actions/user-management"
import { PageHeader } from "@/features/common/components/page-header"
import { SummaryCard } from "@/features/common/components/summary-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
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

type SearchParamValue = string | string[] | undefined
const MANAGED_ROLES = ["nurse", "physician", "dentist"] as const

type UserManagementPageProps = {
  searchParams?: Record<string, SearchParamValue>
}

type DirectoryStatus = "all" | "active" | "inactive"
type DirectoryRole = (typeof MANAGED_ROLES)[number] | "all"

function firstValue(value: SearchParamValue): string {
  if (Array.isArray(value)) return value[0] ?? ""
  return value ?? ""
}

function normalizeStatus(value: string): DirectoryStatus {
  return value === "active" || value === "inactive" ? value : "all"
}

function normalizeRole(value: string): DirectoryRole {
  return MANAGED_ROLES.includes(value as (typeof MANAGED_ROLES)[number])
    ? (value as DirectoryRole)
    : "all"
}

function buildPageHref({
  query,
  status,
  role,
  notice,
  warning,
  error,
}: {
  query: string
  status: DirectoryStatus
  role: DirectoryRole
  notice?: string
  warning?: string
  error?: string
}) {
  const params = new URLSearchParams()

  if (query) params.set("q", query)
  if (status !== "all") params.set("status", status)
  if (role !== "all") params.set("role", role)
  if (notice) params.set("notice", notice)
  if (warning) params.set("warning", warning)
  if (error) params.set("error", error)

  const queryString = params.toString()
  return queryString
    ? `/admin/user-management?${queryString}`
    : "/admin/user-management"
}

function statusBadge(isActive: boolean) {
  if (isActive) {
    return <Badge>Active</Badge>
  }
  return <Badge variant="outline">Inactive</Badge>
}

function roleLabel(role: DirectoryRole) {
  if (role === "nurse") return "Nurse"
  if (role === "physician") return "Physician"
  if (role === "dentist") return "Dentist"
  return "All roles"
}

export async function UserManagementPage({
  searchParams = {},
}: UserManagementPageProps) {
  const query = firstValue(searchParams.q).trim()
  const status = normalizeStatus(firstValue(searchParams.status))
  const role = normalizeRole(firstValue(searchParams.role))
  const notice = firstValue(searchParams.notice)
  const warning = firstValue(searchParams.warning)
  const error = firstValue(searchParams.error)

  async function createUserAction(formData: FormData) {
    "use server"
    const formQuery = String(formData.get("currentQuery") ?? "").trim()
    const formStatus = normalizeStatus(String(formData.get("currentStatus") ?? "all"))
    const formRole = normalizeRole(String(formData.get("currentRole") ?? "all"))
    const inputRole = normalizeRole(String(formData.get("role") ?? ""))
    const fullName = String(formData.get("fullName") ?? "")
    const email = String(formData.get("email") ?? "")

    if (inputRole === "all") {
      redirect(
        buildPageHref({
          query: formQuery,
          status: formStatus,
          role: formRole,
          error: "Select a role for this account.",
        })
      )
    }

    const result = await createStaffUser({
      fullName,
      email,
      role: inputRole,
    })

    revalidatePath("/admin/user-management")
    if (!result.ok) {
      redirect(
        buildPageHref({
          query: formQuery,
          status: formStatus,
          role: formRole,
          error: result.error,
        })
      )
    }

    redirect(
      buildPageHref({
        query: formQuery,
        status: formStatus,
        role: formRole,
        notice: result.message,
        warning: result.warning,
      })
    )
  }

  async function setUserStatusAction(formData: FormData) {
    "use server"
    const formQuery = String(formData.get("currentQuery") ?? "").trim()
    const formStatus = normalizeStatus(String(formData.get("currentStatus") ?? "all"))
    const formRole = normalizeRole(String(formData.get("currentRole") ?? "all"))
    const userId = String(formData.get("userId") ?? "")
    const isActive = String(formData.get("isActive") ?? "false") === "true"

    const result = await setStaffUserActive({ userId, isActive })
    revalidatePath("/admin/user-management")

    if (!result.ok) {
      redirect(
        buildPageHref({
          query: formQuery,
          status: formStatus,
          role: formRole,
          error: result.error,
        })
      )
    }

    redirect(
      buildPageHref({
        query: formQuery,
        status: formStatus,
        role: formRole,
        notice: result.message,
      })
    )
  }

  const directory = await listStaffUsers({ query, status, role })
  const users = directory.ok ? directory.users : []
  const summary = directory.ok
    ? directory.summary
    : {
        total: 0,
        active: 0,
        inactive: 0,
        nurses: 0,
        physicians: 0,
        dentists: 0,
      }
  const filters = directory.ok
    ? directory.filters
    : { query, status, role }

  return (
    <div className="space-y-6">
      <PageHeader
        title="User Management"
        subtitle="Provision and maintain staff access"
        description="Create nurse, physician, and dentist accounts using magic-link login and manage active or inactive access."
      />

      {error ? (
        <Card className="border-destructive/35">
          <CardContent className="pt-6 text-sm text-destructive">{error}</CardContent>
        </Card>
      ) : null}
      {warning ? (
        <Card className="border-amber-500/35">
          <CardContent className="pt-6 text-sm text-amber-700 dark:text-amber-300">
            {warning}
          </CardContent>
        </Card>
      ) : null}
      {notice ? (
        <Card className="border-emerald-500/35">
          <CardContent className="pt-6 text-sm text-emerald-700 dark:text-emerald-300">
            {notice}
          </CardContent>
        </Card>
      ) : null}
      {!directory.ok ? (
        <Card className="border-destructive/35">
          <CardHeader>
            <CardTitle>Could not load user directory</CardTitle>
            <CardDescription>{directory.error}</CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <SummaryCard
          title="Total Managed Users"
          value={String(summary.total)}
          hint={`${summary.active} active · ${summary.inactive} inactive`}
          icon={<IconUsers className="size-4" />}
        />
        <SummaryCard
          title="Nurses"
          value={String(summary.nurses)}
          hint="Healthcare triage and support"
          icon={<IconNurse className="size-4" />}
        />
        <SummaryCard
          title="Physicians"
          value={String(summary.physicians)}
          hint="Consultation and diagnosis"
          icon={<IconStethoscope className="size-4" />}
        />
        <SummaryCard
          title="Dentists"
          value={String(summary.dentists)}
          hint="Dental consultation workflows"
          icon={<IconCertificate className="size-4" />}
        />
        <SummaryCard
          title="Active Accounts"
          value={String(summary.active)}
          hint="Can sign in through magic link"
          icon={<IconActivityHeartbeat className="size-4" />}
        />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Create Staff Account</CardTitle>
          <CardDescription>
            Add a user with Name, Email, and Role. A magic-link invite will be sent.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createUserAction} className="grid grid-cols-1 gap-3 lg:grid-cols-4">
            <input type="hidden" name="currentQuery" value={filters.query} />
            <input type="hidden" name="currentStatus" value={filters.status} />
            <input type="hidden" name="currentRole" value={filters.role} />
            <Input name="fullName" placeholder="Full name" required />
            <Input
              name="email"
              placeholder="Email address"
              required
              type="email"
              autoComplete="email"
            />
            <select
              name="role"
              defaultValue="nurse"
              className="h-9 w-full rounded-4xl border border-input bg-input/30 px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              aria-label="Staff role"
            >
              <option value="nurse">Nurse</option>
              <option value="physician">Physician</option>
              <option value="dentist">Dentist</option>
            </select>
            <Button type="submit">
              <IconUserPlus data-icon="inline-start" />
              Create account
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Staff Directory</CardTitle>
          <CardDescription>
            {directory.ok
              ? `Showing ${users.length} users · ${roleLabel(filters.role)} · ${filters.status}`
              : "Directory is unavailable right now. You can still create staff accounts above."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_auto_auto]">
            <Input name="q" defaultValue={filters.query} placeholder="Search name or email" />
            <select
              name="status"
              defaultValue={filters.status}
              className="h-9 rounded-4xl border border-input bg-input/30 px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              aria-label="Filter by status"
            >
              <option value="all">All statuses</option>
              <option value="active">Active only</option>
              <option value="inactive">Inactive only</option>
            </select>
            <select
              name="role"
              defaultValue={filters.role}
              className="h-9 rounded-4xl border border-input bg-input/30 px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              aria-label="Filter by role"
            >
              <option value="all">All roles</option>
              <option value="nurse">Nurse</option>
              <option value="physician">Physician</option>
              <option value="dentist">Dentist</option>
            </select>
            <Button type="submit" variant="outline">
              Apply filters
            </Button>
          </form>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Clinic Membership</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.fullName}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell className="capitalize">{user.role}</TableCell>
                  <TableCell>{statusBadge(user.isActive)}</TableCell>
                  <TableCell>
                    {user.hasClinicMembership ? (
                      <Badge variant="outline">Assigned</Badge>
                    ) : (
                      <Badge variant="destructive">Pending clinic</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <form action={setUserStatusAction} className="inline-flex">
                      <input type="hidden" name="userId" value={user.id} />
                      <input type="hidden" name="isActive" value={String(!user.isActive)} />
                      <input type="hidden" name="currentQuery" value={filters.query} />
                      <input type="hidden" name="currentStatus" value={filters.status} />
                      <input type="hidden" name="currentRole" value={filters.role} />
                      <Button type="submit" size="sm" variant={user.isActive ? "destructive" : "default"}>
                        {user.isActive ? "Deactivate" : "Activate"}
                      </Button>
                    </form>
                  </TableCell>
                </TableRow>
              ))}
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    {directory.ok
                      ? "No users found for the current filters."
                      : "User list unavailable due to a configuration or database query issue."}
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
