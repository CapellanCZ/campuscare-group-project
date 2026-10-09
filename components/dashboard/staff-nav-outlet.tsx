"use client"

import { usePathname } from "next/navigation"

import {
  PageIntro,
  PanelCell,
  PanelFrame,
  PanelGrid,
  panelCardClassName,
} from "@/components/layout/panel-frame"
import { useOptionalNavPending } from "@/components/dashboard/nav-pending"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { StatCard } from "@/components/shared/stat-card"
import { cn } from "@/lib/utils"

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-1 text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">
      {children}
    </p>
  )
}

function KpiShell({
  labels,
}: {
  labels: Array<{ label: string; description?: string }>
}) {
  return (
    <PanelFrame>
      <PanelGrid
        className={cn(
          "grid-cols-2",
          labels.length >= 3 && "lg:grid-cols-3",
          labels.length >= 4 && "lg:grid-cols-4"
        )}
      >
        {labels.map((card) => (
          <PanelCell key={card.label}>
            <StatCard
              flush
              compact
              label={card.label}
              value="—"
              description={card.description}
              loading
            />
          </PanelCell>
        ))}
      </PanelGrid>
    </PanelFrame>
  )
}

function TableShell({
  title,
  description,
  columns,
}: {
  title: string
  description?: string
  columns: string[]
}) {
  return (
    <Card className={cn(panelCardClassName, "gap-0 py-0")}>
      <CardHeader className="border-b">
        <div className="min-w-0 space-y-1">
          <CardTitle>{title}</CardTitle>
          {description ? (
            <CardDescription>{description}</CardDescription>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-3 px-6 py-6">
        <div className="flex gap-4 border-b pb-3">
          {columns.map((col) => (
            <span
              key={col}
              className="text-xs font-medium text-muted-foreground"
            >
              {col}
            </span>
          ))}
        </div>
        {[0, 1, 2].map((row) => (
          <Skeleton key={row} className="h-10 w-full rounded-lg" />
        ))}
      </CardContent>
    </Card>
  )
}

function routeKind(path: string): string {
  const parts = path.split("/").filter(Boolean)
  // /physician/queue → queue; /physician → dashboard; /physician/dashboard → dashboard
  if (parts.length < 2) return "dashboard"
  const segment = parts[1] ?? "dashboard"
  if (segment === "dashboard") return "dashboard"
  return segment
}

function OptimisticRouteShell({ path }: { path: string }) {
  const kind = routeKind(path)

  if (kind === "queue") {
    return (
      <div className="flex flex-1 flex-col gap-8 pt-2">
        <PageIntro title="Queue" description="Live tickets at your station." />
        <div className="flex flex-col gap-3">
          <SectionLabel>At a glance</SectionLabel>
          <KpiShell
            labels={[
              { label: "Waiting" },
              { label: "Current" },
              { label: "Completed today" },
            ]}
          />
        </div>
        <PanelFrame>
          <PanelGrid>
            <PanelCell>
              <TableShell
                title="Live queue"
                description="Patients waiting at your station."
                columns={["#", "Patient", "Status"]}
              />
            </PanelCell>
          </PanelGrid>
        </PanelFrame>
      </div>
    )
  }

  if (kind === "patients" || kind === "bin") {
    return (
      <div className="flex flex-1 flex-col gap-6">
        <PageIntro
          title={kind === "bin" ? "Archived patients" : "Patients"}
          description="Directory of clinic patient records."
        />
        <div className="flex flex-col gap-3">
          <SectionLabel>Summary</SectionLabel>
          <KpiShell
            labels={[
              { label: "Patients on file" },
              { label: "Visited this month" },
              { label: "Flagged allergies" },
              { label: "Documents" },
            ]}
          />
        </div>
        <PanelFrame>
          <PanelGrid>
            <PanelCell>
              <TableShell
                title="Directory"
                columns={["Patient", "ID", "Type", "Updated"]}
              />
            </PanelCell>
          </PanelGrid>
        </PanelFrame>
      </div>
    )
  }

  if (kind === "requests") {
    return (
      <div className="flex flex-1 flex-col gap-6">
        <PageIntro
          title="Consultation requests"
          description="Incoming appointment and consultation requests."
        />
        <div className="flex flex-col gap-3">
          <SectionLabel>Summary</SectionLabel>
          <KpiShell
            labels={[
              { label: "Pending" },
              { label: "Confirmed" },
              { label: "In progress" },
              { label: "Completed" },
            ]}
          />
        </div>
        <PanelFrame>
          <PanelGrid>
            <PanelCell>
              <TableShell
                title="Requests"
                columns={["Patient", "Service", "Status", "Preferred"]}
              />
            </PanelCell>
          </PanelGrid>
        </PanelFrame>
      </div>
    )
  }

  if (kind === "consultations") {
    return (
      <div className="flex flex-1 flex-col gap-6">
        <PageIntro
          title="Consultations"
          description="Clinic consultation records."
        />
        <div className="flex flex-col gap-3">
          <SectionLabel>Summary</SectionLabel>
          <KpiShell
            labels={[
              { label: "Open today" },
              { label: "Awaiting assessment" },
              { label: "In progress" },
              { label: "Completed today" },
            ]}
          />
        </div>
        <PanelFrame>
          <PanelGrid>
            <PanelCell>
              <TableShell
                title="Consultations"
                columns={["Patient", "Provider", "Status", "Date"]}
              />
            </PanelCell>
          </PanelGrid>
        </PanelFrame>
      </div>
    )
  }

  if (kind === "certificates" || kind === "medical-certificates") {
    return (
      <div className="flex flex-1 flex-col gap-6">
        <PageIntro
          title="Medical certificates"
          description="Issued and draft medical documents."
        />
        <div className="flex flex-col gap-3">
          <SectionLabel>Summary</SectionLabel>
          <KpiShell
            labels={[
              { label: "Issued this month" },
              { label: "Issued today" },
              { label: "Drafts" },
              { label: "Pending" },
            ]}
          />
        </div>
        <PanelFrame>
          <PanelGrid>
            <PanelCell>
              <TableShell
                title="Documents"
                columns={["Patient", "Type", "Status", "Issued"]}
              />
            </PanelCell>
          </PanelGrid>
        </PanelFrame>
      </div>
    )
  }

  if (kind === "announcements") {
    return (
      <div className="flex flex-1 flex-col gap-6">
        <PageIntro
          title="Announcements"
          description="Clinic notices and published updates."
        />
        <div className="flex flex-col gap-3">
          <SectionLabel>Summary</SectionLabel>
          <KpiShell
            labels={[
              { label: "Published" },
              { label: "Scheduled" },
              { label: "Drafts" },
              { label: "Total" },
            ]}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="aspect-[4/3] w-full rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  if (kind === "reports") {
    return (
      <div className="flex flex-1 flex-col gap-6">
        <PageIntro title="Reports" description="Clinic analytics and trends." />
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-64 w-full rounded-2xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      </div>
    )
  }

  if (kind === "settings" || kind === "users") {
    return (
      <div className="flex flex-1 flex-col gap-6">
        <PageIntro
          title={kind === "users" ? "User management" : "Settings"}
        />
        <Skeleton className="h-48 w-full rounded-2xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
      </div>
    )
  }

  // Dashboard / home
  return (
    <div className="flex flex-1 flex-col gap-6 sm:gap-8">
      <PageIntro title="Welcome back" />
      <div className="flex flex-col gap-3">
        <SectionLabel>At a glance</SectionLabel>
        <KpiShell
          labels={[
            { label: "Appointments today", description: "Confirmed · in progress" },
            { label: "Patients today", description: "Clinic visits" },
            { label: "Waiting patients", description: "In your queue" },
            { label: "Current consultation", description: "Active patient" },
          ]}
        />
      </div>
      <div className="flex flex-col gap-3">
        <SectionLabel>Work now</SectionLabel>
        <PanelFrame>
          <PanelGrid>
            <PanelCell>
              <TableShell
                title="Your station queue"
                description="Patients waiting after nurse intake."
                columns={["#", "Patient", "Status"]}
              />
            </PanelCell>
          </PanelGrid>
        </PanelFrame>
      </div>
    </div>
  )
}

/**
 * While a sidebar nav click is in flight, paint the destination chrome
 * immediately so the main panel never sits on the previous page.
 */
export function StaffNavOutlet({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const navPending = useOptionalNavPending()
  const pendingPath = navPending?.activePath ?? null
  const showShell =
    Boolean(navPending?.isPending) &&
    Boolean(pendingPath) &&
    pendingPath !== pathname &&
    !pathname.startsWith(`${pendingPath}/`)

  if (showShell && pendingPath) {
    return <OptimisticRouteShell path={pendingPath} />
  }

  return <>{children}</>
}
