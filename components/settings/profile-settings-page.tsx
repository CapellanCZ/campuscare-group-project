"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import {
  IconAsterisk,
  IconEye,
  IconEyeOff,
  IconUpload,
} from "@tabler/icons-react"
import { toast } from "sonner"

import { DemoPageHeader } from "@/components/demo/demo-page"
import { useTheme } from "@/components/theme-provider"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  savePreferencesAction,
  updateAvatarAction,
  updateLicenseNumberAction,
} from "@/features/settings/actions"
import { designationLabel } from "@/lib/health/roles"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import type { StaffProfile, UserPreferences } from "@/services/staff-profile"

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
  return `${"*".repeat(Math.max(4, trimmed.length - 4))}${trimmed.slice(-4)}`
}

function ProfileField({
  label,
  value,
  trailing,
}: {
  label: string
  value: React.ReactNode
  trailing?: React.ReactNode
}) {
  return (
    <div className="flex min-w-0 items-start justify-between gap-3 border-b border-border/60 py-3 last:border-0 last:pb-0 first:pt-0">
      <div className="min-w-0 space-y-1">
        <dt className="text-sm text-muted-foreground">{label}</dt>
        <dd className="text-sm font-medium text-foreground">{value || "—"}</dd>
      </div>
      {trailing ? <div className="shrink-0">{trailing}</div> : null}
    </div>
  )
}

export function ProfileSettingsPage({
  profile: initialProfile,
  preferences: initialPreferences,
}: {
  profile: StaffProfile
  preferences: UserPreferences
}) {
  const { setTheme } = useTheme()
  const fileRef = useRef<HTMLInputElement>(null)
  const [profile, setProfile] = useState(initialProfile)
  const [preferences, setPreferences] = useState(initialPreferences)
  const [licenseVisible, setLicenseVisible] = useState(false)
  const [licenseEditing, setLicenseEditing] = useState(false)
  const [licenseDraft, setLicenseDraft] = useState(
    initialProfile.licenseNumber ?? ""
  )
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    setTheme(preferences.theme)
  }, [preferences.theme, setTheme])

  function saveLicense() {
    startTransition(async () => {
      const result = await updateLicenseNumberAction(licenseDraft)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      setProfile(result.data)
      setLicenseDraft(result.data.licenseNumber ?? "")
      setLicenseEditing(false)
      setLicenseVisible(true)
      toast.success("License number updated.")
    })
  }

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

  return (
    <div className="flex flex-col gap-8 pt-2">
      <DemoPageHeader
        title="Profile and Settings"
        description="Your staff profile, notifications, and display preferences"
        designation={profile.role}
        showDemoBanner={false}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <Card className="min-w-0 shadow-none dark:ring-0">
          <CardHeader className="gap-4 border-b px-6 py-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-base">Personal Information</CardTitle>
                <CardDescription>
                  Profile details from campus records. Only your photo is
                  editable here.
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={pending}
                  onClick={() => fileRef.current?.click()}
                >
                  <IconUpload className="size-4" aria-hidden />
                  Upload / Change Profile Picture
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled
                  title="Protected fields are managed by administrators"
                >
                  Edit Profile
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 px-6 py-6">
            <div className="flex items-center gap-4">
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
              <div className="min-w-0">
                <p className="truncate text-lg font-semibold tracking-tight">
                  {profile.fullName}
                </p>
                <p className="truncate text-sm text-muted-foreground">
                  {designationLabel(profile.role)} · {profile.department}
                </p>
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
              <div className="group/license flex min-w-0 items-start justify-between gap-3 border-b border-border/60 py-3">
                <div className="min-w-0 flex-1 space-y-1">
                  <dt className="text-sm text-muted-foreground">
                    Professional License Number
                  </dt>
                  <dd className="text-sm font-medium text-foreground">
                    {licenseEditing ? (
                      <Input
                        className="mt-1 max-w-xs"
                        value={licenseDraft}
                        onChange={(e) => setLicenseDraft(e.target.value)}
                        placeholder="Enter license number"
                        disabled={pending}
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault()
                            saveLicense()
                          }
                          if (e.key === "Escape") {
                            setLicenseDraft(profile.licenseNumber ?? "")
                            setLicenseEditing(false)
                          }
                        }}
                      />
                    ) : (
                      maskLicense(profile.licenseNumber ?? "", licenseVisible)
                    )}
                  </dd>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {licenseEditing ? (
                    <>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={pending}
                        onClick={() => {
                          setLicenseDraft(profile.licenseNumber ?? "")
                          setLicenseEditing(false)
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        disabled={pending}
                        onClick={saveLicense}
                      >
                        Save
                      </Button>
                    </>
                  ) : (
                    <>
                      {profile.licenseNumber ? (
                        <Button
                          type="button"
                          size="icon-sm"
                          variant="ghost"
                          className="opacity-0 transition-opacity group-hover/license:opacity-100 focus-visible:opacity-100"
                          aria-label={
                            licenseVisible
                              ? "Hide license number"
                              : "Show license number"
                          }
                          onClick={() => setLicenseVisible((v) => !v)}
                        >
                          {licenseVisible ? (
                            <IconEyeOff className="size-4" aria-hidden />
                          ) : (
                            <IconEye className="size-4" aria-hidden />
                          )}
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        className="opacity-0 transition-opacity group-hover/license:opacity-100 focus-visible:opacity-100"
                        aria-label="Edit professional license number"
                        disabled={pending}
                        onClick={() => {
                          setLicenseDraft(profile.licenseNumber ?? "")
                          setLicenseEditing(true)
                          setLicenseVisible(true)
                        }}
                      >
                        <IconAsterisk className="size-4" aria-hidden />
                      </Button>
                    </>
                  )}
                </div>
              </div>
              <ProfileField label="Department" value={profile.department} />
              <ProfileField label="Email Address" value={profile.email} />
            </dl>
          </CardContent>
        </Card>

        <div className="flex min-w-0 flex-col gap-6">
          <Card className="min-w-0 shadow-none dark:ring-0">
            <CardHeader className="border-b px-6 py-5">
              <CardTitle className="text-base">Notification Settings</CardTitle>
              <CardDescription>
                Choose which clinic events appear in your notification bell.
              </CardDescription>
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

          <Card className="min-w-0 shadow-none dark:ring-0">
            <CardHeader className="border-b px-6 py-5">
              <CardTitle className="text-base">Display Preferences</CardTitle>
              <CardDescription>
                Appearance for this account across CampusCare.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 px-6 py-5">
              {(
                [
                  { value: "light" as const, label: "Light Mode" },
                  { value: "dark" as const, label: "Dark Mode" },
                ] as const
              ).map((option) => {
                const selected = preferences.theme === option.value
                return (
                  <button
                    key={option.value}
                    type="button"
                    disabled={pending}
                    onClick={() => savePrefs({ theme: option.value })}
                    className={cn(
                      "flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-sm transition-colors",
                      selected
                        ? "border-primary bg-primary/5 font-medium"
                        : "border-border/70 hover:border-border hover:bg-muted/40"
                    )}
                  >
                    <span>{option.label}</span>
                    <span
                      className={cn(
                        "size-2 rounded-full",
                        selected ? "bg-primary" : "bg-transparent"
                      )}
                      aria-hidden
                    />
                  </button>
                )
              })}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
