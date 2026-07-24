import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import {
  IconActivityHeartbeat,
  IconCertificate,
  IconNurse,
  IconStethoscope,
  IconUserOff,
  IconUserPlus,
  IconUsers,
} from "@tabler/icons-react"

import {
  createStaffUser,
  importStaffUsersFromExcel,
  listStaffUsers,
  setStaffUserActive,
} from "@/features/admin/actions/user-management"
import { BulkExcelImportCard } from "@/features/admin/components/bulk-excel-import-card"
import {
  ADMIN_DIRECTORY_ROLES,
  STAFF_DIRECTORY_ROLES,
  type ManagedRole,
} from "@/features/admin/types/user-management"
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
type UserDirectory = "admins" | "staff"

type UserManagementPageProps = {
  directory: UserDirectory
  searchParams?: Record<string, SearchParamValue>
}

type DirectoryStatus = "all" | "active" | "inactive"
type DirectoryRole = ManagedRole | "all"

const DIRECTORY_CONFIG = {
  admins: {
    basePath: "/admin/user-management/admins",
    title: "Admins",
    subtitle: "Provision and maintain admin access",
    description:
      "Create admin accounts for OTP login and manage active or inactive system access.",
    createTitle: "Create Admin Account",
    createDescription:
      "Add an admin with Name and Email. An invite email will be sent so they can sign in with OTP.",
    importTitle: "Bulk import admins",
    importDescription: "Upload an Excel roster to invite multiple admin accounts at once.",
    importCardTitle: "Import admins",
    importRoleHint: "admin",
    templateFilename: "admins-import-template.xlsx",
    templateSampleRows: [["Alex Admin", "alex.admin@example.com", "admin"]] as string[][],
    directoryTitle: "Admin Directory",
    roles: ADMIN_DIRECTORY_ROLES,
    defaultCreateRole: "admin" as ManagedRole,
    showRoleFilter: false,
  },
  staff: {
    basePath: "/admin/user-management/staff",
    title: "Clinic Staff",
    subtitle: "Provision and maintain clinic staff access",
    description:
      "Create nurse, physician, and dentist accounts for OTP login and manage active or inactive access.",
    createTitle: "Create Staff Account",
    createDescription:
      "Add a user with Name, Email, and Role. An invite email will be sent so they can sign in with OTP.",
    importTitle: "Bulk import staff",
    importDescription:
      "Upload an Excel roster to invite multiple clinic staff accounts at once.",
    importCardTitle: "Import staff",
    importRoleHint: "nurse | physician | dentist",
    templateFilename: "staff-import-template.xlsx",
    templateSampleRows: [
      ["Nora Nurse", "nora.nurse@example.com", "nurse"],
      ["Pat Physician", "pat.physician@example.com", "physician"],
      ["Dana Dentist", "dana.dentist@example.com", "dentist"],
    ] as string[][],
    directoryTitle: "Clinic Staff Directory",
    roles: STAFF_DIRECTORY_ROLES,
    defaultCreateRole: "nurse" as ManagedRole,
    showRoleFilter: true,
  },
} as const

function firstValue(value: SearchParamValue): string {
  if (Array.isArray(value)) return value[0] ?? ""
  return value ?? ""
}

function normalizeStatus(value: string): DirectoryStatus {
  return value === "active" || value === "inactive" ? value : "all"
}

function normalizeRole(
  value: string,
  allowedRoles: readonly ManagedRole[]
): DirectoryRole {
  return allowedRoles.includes(value as ManagedRole)
    ? (value as ManagedRole)
    : "all"
}

function buildPageHref({
  basePath,
  query,
  status,
  role,
  notice,
  warning,
  error,
}: {
  basePath: string
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
  return queryString ? `${basePath}?${queryString}` : basePath
}

function statusBadge(isActive: boolean) {
  if (isActive) {
    return <Badge>Active</Badge>
  }
  return <Badge variant="outline">Inactive</Badge>
}

function roleLabel(role: DirectoryRole) {
  if (role === "admin") return "Admin"
  if (role === "nurse") return "Nurse"
  if (role === "physician") return "Physician"
  if (role === "dentist") return "Dentist"
  return "All roles"
}

export async function UserManagementPage({
  directory,
  searchParams = {},
}: UserManagementPageProps) {
  const config = DIRECTORY_CONFIG[directory]
  const { basePath, roles: allowedRoles } = config

  const query = firstValue(searchParams.q).trim()
  const status = normalizeStatus(firstValue(searchParams.status))
  const role =
    directory === "admins"
      ? ("admin" as const)
      : normalizeRole(firstValue(searchParams.role), allowedRoles)
  const notice = firstValue(searchParams.notice)
  const warning = firstValue(searchParams.warning)
  const error = firstValue(searchParams.error)

  async function createUserAction(formData: FormData) {
    "use server"
    const formQuery = String(formData.get("currentQuery") ?? "").trim()
    const formStatus = normalizeStatus(String(formData.get("currentStatus") ?? "all"))
    const formRole = normalizeRole(
      String(formData.get("currentRole") ?? "all"),
      allowedRoles
    )
    const inputRole = normalizeRole(String(formData.get("role") ?? ""), allowedRoles)
    const fullName = String(formData.get("fullName") ?? "")
    const email = String(formData.get("email") ?? "")

    if (inputRole === "all") {
      redirect(
        buildPageHref({
          basePath,
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
      allowedRoles: [...allowedRoles],
    })

    revalidatePath(basePath)
    if (!result.ok) {
      redirect(
        buildPageHref({
          basePath,
          query: formQuery,
          status: formStatus,
          role: formRole,
          error: result.error,
        })
      )
    }

    redirect(
      buildPageHref({
        basePath,
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
    const formRole = normalizeRole(
      String(formData.get("currentRole") ?? "all"),
      allowedRoles
    )
    const userId = String(formData.get("userId") ?? "")
    const isActive = String(formData.get("isActive") ?? "false") === "true"

    const result = await setStaffUserActive({ userId, isActive })
    revalidatePath(basePath)

    if (!result.ok) {
      redirect(
        buildPageHref({
          basePath,
          query: formQuery,
          status: formStatus,
          role: formRole,
          error: result.error,
        })
      )
    }

    redirect(
      buildPageHref({
        basePath,
        query: formQuery,
        status: formStatus,
        role: formRole,
        notice: result.message,
      })
    )
  }

  async function importStaffAction(formData: FormData) {
    "use server"
    const result = await importStaffUsersFromExcel(formData, {
      allowedRoles: [...allowedRoles],
    })
    revalidatePath(basePath)
    redirect(
      buildPageHref({
        basePath,
        query,
        status,
        role,
        notice: result.ok ? result.message : undefined,
        warning: result.ok ? result.warning : undefined,
        error: result.ok ? undefined : result.error,
      })
    )
  }

  const listResult = await listStaffUsers({
    query,
    status,
    role: directory === "admins" ? "admin" : role,
    roles: [...allowedRoles],
  })
  const users = listResult.ok ? listResult.users : []
  const summary = listResult.ok
    ? listResult.summary
    : {
        total: 0,
        active: 0,
        inactive: 0,
        admins: 0,
        nurses: 0,
        physicians: 0,
        dentists: 0,
      }
  const filters = listResult.ok
    ? listResult.filters
    : { query, status, role }

  return (
    <div className="space-y-6">
      <PageHeader
        title={config.title}
        subtitle={config.subtitle}
        description={config.description}
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
      {!listResult.ok ? (
        <Card className="border-destructive/35">
          <CardHeader>
            <CardTitle>Could not load user directory</CardTitle>
            <CardDescription>{listResult.error}</CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {directory === "admins" ? (
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <SummaryCard
            title="Total Admins"
            value={String(summary.total)}
            hint={`${summary.active} active · ${summary.inactive} inactive`}
            icon={<IconUsers className="size-4" />}
          />
          <SummaryCard
            title="Active Accounts"
            value={String(summary.active)}
            hint="Can sign in with email OTP"
            icon={<IconActivityHeartbeat className="size-4" />}
          />
          <SummaryCard
            title="Inactive Accounts"
            value={String(summary.inactive)}
            hint="Access currently revoked"
            icon={<IconUserOff className="size-4" />}
          />
        </section>
      ) : (
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <SummaryCard
            title="Total Clinic Staff"
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
            hint="Can sign in with email OTP"
            icon={<IconActivityHeartbeat className="size-4" />}
          />
        </section>
      )}

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{config.createTitle}</CardTitle>
            <CardDescription>{config.createDescription}</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              action={createUserAction}
              className="grid grid-cols-1 gap-3 lg:grid-cols-2"
            >
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
              {directory === "admins" ? (
                <input type="hidden" name="role" value="admin" />
              ) : (
                <select
                  name="role"
                  defaultValue={config.defaultCreateRole}
                  className="h-9 w-full rounded-4xl border border-input bg-input/30 px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  aria-label="Staff role"
                >
                  <option value="nurse">Nurse</option>
                  <option value="physician">Physician</option>
                  <option value="dentist">Dentist</option>
                </select>
              )}
              <Button type="submit" className={directory === "admins" ? "lg:col-span-2" : undefined}>
                <IconUserPlus data-icon="inline-start" />
                Create account
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{config.importTitle}</CardTitle>
            <CardDescription>{config.importDescription}</CardDescription>
          </CardHeader>
          <CardContent>
            <BulkExcelImportCard
              title={config.importCardTitle}
              description={`Columns: full_name, email, role (${config.importRoleHint})`}
              templateFilename={config.templateFilename}
              templateHeaders={["full_name", "email", "role"]}
              templateSampleRows={config.templateSampleRows}
              action={importStaffAction}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{config.directoryTitle}</CardTitle>
          <CardDescription>
            {listResult.ok
              ? `Showing ${users.length} users · ${roleLabel(filters.role)} · ${filters.status}`
              : "Directory is unavailable right now. You can still create accounts above."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form
            className={
              config.showRoleFilter
                ? "grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_auto_auto]"
                : "grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_auto]"
            }
          >
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
            {config.showRoleFilter ? (
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
            ) : (
              <input type="hidden" name="role" value="admin" />
            )}
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
                      <Button
                        type="submit"
                        size="sm"
                        variant={user.isActive ? "destructive" : "default"}
                      >
                        {user.isActive ? "Deactivate" : "Activate"}
                      </Button>
                    </form>
                  </TableCell>
                </TableRow>
              ))}
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    {listResult.ok
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
