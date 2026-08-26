"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { toast } from "sonner"

import { DemoPageHeader } from "@/components/demo/demo-page"
import { useTheme } from "@/components/theme-provider"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  savePreferencesAction,
  updateAvatarAction,
} from "@/features/settings/actions"
import { designationLabel } from "@/lib/health/roles"
import { createClient } from "@/lib/supabase/client"
import type { StaffProfile, UserPreferences } from "@/services/staff-profile"
import { adminElevatedCardClassName } from "@/features/admin/lib/admin-surface"
import { cn } from "@/lib/utils"
import { IconEye, IconEyeOff } from "@tabler/icons-react"

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
  return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase()
}

function maskLicense(value: string, visible: boolean) {
  const trimmed = value.trim()
  if (!trimmed) return "—"
  if (visible || trimmed.length <= 4) return trimmed
  const hidden = Math.max(4, trimmed.length - 4)
  return `${"*".repeat(hidden)}${trimmed.slice(-4)}`
}

function ProfileField({
  label,
  value,
}: {
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="flex min-w-0 items-start justify-between gap-3 border-b border-border/60 py-3 last:border-0 last:pb-0 first:pt-0">
      <div className="min-w-0 space-y-1">
        <dt className="text-sm text-muted-foreground">{label}</dt>
        <dd className="text-sm font-medium text-foreground">{value || "—"}</dd>
      </div>
    </div>
  )
}

export function ProfileSettingsPage({
  profile: initialProfile,
  preferences: initialPreferences,
  elevated = false,
  rightColumnExtras,
}: {
  profile: StaffProfile
  preferences: UserPreferences
  elevated?: boolean
  /** Renders under Notification Settings in the right column (e.g. nurse capacity). */
  rightColumnExtras?: React.ReactNode
}) {
  const { setTheme } = useTheme()
  const fileRef = useRef<HTMLInputElement>(null)
  const [profile, setProfile] = useState(initialProfile)
  const [preferences, setPreferences] = useState(initialPreferences)
  const [licenseRevealed, setLicenseRevealed] = useState(false)
  const [pending, startTransition] = useTransition()
  const cardClass = elevated
    ? adminElevatedCardClassName
    : "shadow-none dark:ring-0"

  useEffect(() => {
    setTheme(preferences.theme)
  }, [preferences.theme, setTheme])

  function savePrefs(
    patch: Partial<{
      notifyConsultationRequests: boolean
      notifyQueue: boolean
      notifyAnnouncements: boolean
      theme: "light" | "dark" | "system"
    }>
  ) {
    startTransition(async () => {
      const result = await savePreferencesAction(patch)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      setPreferences(result.data)
      if (patch.theme) setTheme(patch.theme)
      toast.success("Preferences saved.")
      window.dispatchEvent(new Event("campuscare:notification-prefs"))
    })
  }

  function uploadAvatar(file: File) {
    startTransition(async () => {
      try {
        const supabase = createClient()
        const ext = file.name.split(".").pop()?.toLowerCase() || "jpg"
        const path = `${profile.userId}/${Date.now()}.${ext}`
        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(path, file, { upsert: true, contentType: file.type })
        if (uploadError) {
          toast.error(uploadError.message)
          return
        }
        const { data } = supabase.storage.from("avatars").getPublicUrl(path)
        const result = await updateAvatarAction(data.publicUrl)
        if (!result.ok) {
          toast.error(result.error)
          return
        }
        setProfile(result.data)
        toast.success("Profile picture updated.")
      } catch {
        toast.error("Could not upload profile picture.")
      }
    })
  }

  const license = profile.licenseNumber ?? ""

  return (
    <div className="flex flex-col gap-8 pt-2">
      <DemoPageHeader
        title="Profile and Settings"
        description=""
        designation={profile.role}
        showDemoBanner={false}
        showRoleSuffix={false}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <Card
          id="profile"
          className={cn("min-w-0 scroll-mt-20", cardClass)}
        >
          <CardHeader className="border-b px-6 py-5">
            <CardTitle className="text-base">Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 px-6 py-6">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Profile Picture</p>
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  disabled={pending}
                  className="group relative rounded-full outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  aria-label="Change profile picture"
                  onClick={() => fileRef.current?.click()}
                >
                  <Avatar className="size-20">
                    {profile.avatarUrl ? (
                      <AvatarImage
                        src={profile.avatarUrl}
                        alt={profile.fullName}
                      />
                    ) : null}
                    <AvatarFallback className="text-lg font-medium">
                      {initials(profile.fullName)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/45 text-xs font-medium text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                    Change
                  </span>
                </button>
                <div className="min-w-0">
                  <p className="truncate text-lg font-semibold tracking-tight">
                    {profile.fullName}
                  </p>
                  <p className="truncate text-sm text-muted-foreground">
                    {designationLabel(profile.role)} · {profile.department}
                  </p>
                </div>
              </div>
            </div>

            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) uploadAvatar(file)
                event.target.value = ""
              }}
            />

            <dl>
              <ProfileField label="Full Name" value={profile.fullName} />
              <ProfileField
                label="Employee ID"
                value={profile.employeeId || "—"}
              />
              <ProfileField
                label="Role"
                value={designationLabel(profile.role)}
              />
              <div className="flex min-w-0 items-start justify-between gap-3 border-b border-border/60 py-3">
                <div className="min-w-0 flex-1 space-y-1">
                  <dt className="text-sm text-muted-foreground">
                    Professional License Number
                  </dt>
                  <dd className="flex items-center gap-2 text-sm font-medium text-foreground tabular-nums">
                    <span aria-live="polite">
                      {maskLicense(license, licenseRevealed)}
                    </span>
                    {license ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={
                          licenseRevealed
                            ? "Hide license number"
                            : "Reveal license number"
                        }
                        aria-pressed={licenseRevealed}
                        onClick={() => setLicenseRevealed((v) => !v)}
                      >
                        {licenseRevealed ? (
                          <IconEyeOff className="size-4" />
                        ) : (
                          <IconEye className="size-4" />
                        )}
                      </Button>
                    ) : null}
                  </dd>
                </div>
              </div>
              <ProfileField
                label="Department"
                value={profile.department || "Health Services Office"}
              />
              <ProfileField label="Email Address" value={profile.email} />
            </dl>
          </CardContent>
        </Card>

        <div className="flex min-w-0 flex-col gap-6">
          <Card
            id="settings"
            className={cn("min-w-0 scroll-mt-20", cardClass)}
          >
            <CardHeader className="border-b px-6 py-5">
              <CardTitle className="text-base">Notification Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 px-6 py-5">
              {(
                [
                  {
                    key: "notifyConsultationRequests" as const,
                    label: "Consultation Request Notifications",
                  },
                  {
                    key: "notifyQueue" as const,
                    label: "Queue Notifications",
                  },
                  {
                    key: "notifyAnnouncements" as const,
                    label: "Announcement Notifications",
                  },
                ] as const
              ).map((item) => (
                <div
                  key={item.key}
                  className="flex items-center justify-between gap-3"
                >
                  <Label htmlFor={item.key} className="text-sm font-normal">
                    {item.label}
                  </Label>
                  <Switch
                    id={item.key}
                    checked={preferences[item.key]}
                    disabled={pending}
                    onCheckedChange={(checked) =>
                      savePrefs({ [item.key]: checked })
                    }
                  />
                </div>
              ))}
            </CardContent>
          </Card>
          {rightColumnExtras}
        </div>
      </div>
    </div>
  )
}
