"use client"

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"

import { ConfirmDialog } from "@/components/feedback/confirm-dialog"
import { appToast } from "@/lib/feedback/app-toast"
import {
  CONFIRM_PRESETS,
  type ConfirmPresetKey,
} from "@/lib/feedback/confirm-presets"

export type ConfirmOptions = {
  variant?: "default" | "destructive" | "warning"
  icon?: ReactNode
  title: string
  description: string
  confirmLabel: string
  cancelLabel?: string
  hideCancel?: boolean
  pendingLabel?: string
  onConfirm: () => Promise<void> | void
  successToast?: { title: string; description?: string }
  errorToast?: { title: string; description?: string }
}

type ConfirmContextValue = {
  confirm: (options: ConfirmOptions) => Promise<boolean>
  confirmPreset: (
    preset: ConfirmPresetKey,
    overrides: Partial<ConfirmOptions> & {
      onConfirm: () => Promise<void> | void
    }
  ) => Promise<boolean>
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null)

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const [options, setOptions] = useState<ConfirmOptions | null>(null)
  const resolverRef = useRef<((confirmed: boolean) => void) | null>(null)

  const close = useCallback((confirmed: boolean) => {
    setOpen(false)
    setPending(false)
    setOptions(null)
    resolverRef.current?.(confirmed)
    resolverRef.current = null
  }, [])

  const confirm = useCallback((next: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve
      setOptions({
        variant: "default",
        ...next,
      })
      setOpen(true)
    })
  }, [])

  const confirmPreset = useCallback(
    (
      preset: ConfirmPresetKey,
      overrides: Partial<ConfirmOptions> & {
        onConfirm: () => Promise<void> | void
      }
    ) => {
      const base = CONFIRM_PRESETS[preset]
      return confirm({
        variant: base.variant,
        title: base.title,
        description: base.description,
        confirmLabel: base.confirmLabel,
        cancelLabel: base.cancelLabel,
        ...overrides,
      })
    },
    [confirm]
  )

  const handleCancel = useCallback(() => {
    if (pending) return
    close(false)
  }, [close, pending])

  const handleConfirm = useCallback(async () => {
    if (!options || pending) return
    setPending(true)
    try {
      await options.onConfirm()
      if (options.successToast) {
        appToast.success(options.successToast)
      }
      close(true)
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "The operation could not be completed. Please try again."
      appToast.error(
        options.errorToast ?? {
          title: "Operation Failed",
          description: message,
        }
      )
      setPending(false)
    }
  }, [close, options, pending])

  const value = useMemo(
    () => ({ confirm, confirmPreset }),
    [confirm, confirmPreset]
  )

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      <ConfirmDialog
        open={open}
        options={options}
        pending={pending}
        onCancel={handleCancel}
        onConfirm={() => void handleConfirm()}
      />
    </ConfirmContext.Provider>
  )
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext)
  if (!ctx) {
    throw new Error("useConfirm must be used within ConfirmProvider")
  }
  return ctx
}
