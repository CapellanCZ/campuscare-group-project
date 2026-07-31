"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { IconSearch, IconSettings } from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Kbd, KbdGroup } from "@/components/ui/kbd"
import { getNavGroupsForRole } from "@/components/app-shared"
import { useOptionalStaffAccess } from "@/components/staff-access-provider"
import { staffBasePath } from "@/lib/auth/home-path"
import { canViewModule } from "@/lib/auth/permissions"
import { cn } from "@/lib/utils"

export function HeaderSearch({ className }: { className?: string }) {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const access = useOptionalStaffAccess()
  const role = access?.primaryRole ?? "admin"
  const groups = getNavGroupsForRole(role)
  const settingsHref = `${staffBasePath(role)}/settings`
  const canOpenSettings = canViewModule(role, "settings")

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== "k") return
      if (!(event.metaKey || event.ctrlKey)) return
      event.preventDefault()
      setOpen((value) => !value)
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  return (
    <>
      <Button
        type="button"
        variant="outline"
        aria-label="Search"
        onClick={() => setOpen(true)}
        className={cn(
          "hidden h-8 w-56 shrink-0 justify-start gap-2 px-2.5 font-normal text-muted-foreground sm:inline-flex md:w-64",
          className
        )}
      >
        <IconSearch className="size-4 shrink-0 opacity-70" aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate text-left text-sm">
          Search...
        </span>
        <KbdGroup className="pointer-events-none ml-auto">
          <Kbd>⌘</Kbd>
          <Kbd>K</Kbd>
        </KbdGroup>
      </Button>
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        aria-label="Search"
        onClick={() => setOpen(true)}
        className="sm:hidden"
      >
        <IconSearch aria-hidden="true" />
      </Button>
      {open ? (
        <CommandDialog
          open={open}
          onOpenChange={setOpen}
          title="Search"
          description="Jump to a page or setting"
        >
          <Command className="**:data-[selected=true]:bg-muted **:data-selected:bg-transparent">
            <CommandInput placeholder="Search..." />
            <CommandList className="min-h-0">
              <CommandEmpty>No results found.</CommandEmpty>
              {groups.map((group) => (
                <CommandGroup
                  key={group.label ?? "main"}
                  heading={group.label ?? "Platform"}
                >
                  {group.items.map((item) =>
                    item.path ? (
                      <CommandItem
                        key={item.path}
                        value={`${item.title} ${group.label ?? ""}`}
                        onSelect={() => {
                          setOpen(false)
                          router.push(item.path!)
                        }}
                      >
                        {item.icon}
                        <span>{item.title}</span>
                      </CommandItem>
                    ) : null
                  )}
                </CommandGroup>
              ))}
              {canOpenSettings ? (
                <CommandGroup heading="Account">
                  <CommandItem
                    value="Settings Account"
                    onSelect={() => {
                      setOpen(false)
                      router.push(settingsHref)
                    }}
                  >
                    <IconSettings aria-hidden="true" />
                    <span>Settings</span>
                  </CommandItem>
                </CommandGroup>
              ) : null}
            </CommandList>
          </Command>
        </CommandDialog>
      ) : null}
    </>
  )
}
