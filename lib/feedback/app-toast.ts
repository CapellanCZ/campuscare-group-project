import { toast, type ExternalToast } from "sonner"
import { createElement } from "react"

export type AppToastPayload = {
  title: string
  description?: string
}

/** Action feedback (queue buttons, saves) → center. Inbox-style alerts → right. */
export type AppToastPlacement = "action" | "notification"

export const APP_TOASTER_IDS = {
  action: "campuscare-action",
  notification: "campuscare-notification",
} as const

const DURATION = {
  success: 4000,
  info: 4000,
  warning: 6000,
  error: 8000,
} as const

type ToastKind = keyof typeof DURATION

function baseOptions(
  kind: ToastKind,
  payload: AppToastPayload,
  placement: AppToastPlacement = "action"
): ExternalToast {
  return {
    description: payload.description,
    duration: DURATION[kind],
    toasterId: APP_TOASTER_IDS[placement],
    classNames: {
      toast: `cn-toast cn-toast--${kind}`,
      title: "cn-toast__title",
      description: "cn-toast__description",
      closeButton: "cn-toast__close",
    },
  }
}

function ProgressToastContent({
  title,
  percent,
  hint,
}: {
  title: string
  percent: number
  hint?: string
}) {
  const clamped = Math.max(0, Math.min(100, Math.round(percent)))
  return createElement(
    "div",
    { className: "cn-toast-progress", role: "status", "aria-live": "polite" },
    createElement(
      "div",
      { className: "cn-toast-progress__meta" },
      createElement("p", { className: "cn-toast-progress__label" }, title),
      createElement(
        "p",
        { className: "cn-toast-progress__percent" },
        `${clamped}%`
      )
    ),
    hint
      ? createElement("p", { className: "cn-toast-progress__hint" }, hint)
      : null,
    createElement(
      "div",
      {
        className: "cn-toast-progress__track",
        "aria-hidden": true,
      },
      createElement("div", {
        className: "cn-toast-progress__fill",
        style: { width: `${clamped}%` },
      })
    )
  )
}

export const appToast = {
  success(
    payload: AppToastPayload,
    id?: string | number,
    placement: AppToastPlacement = "action"
  ) {
    return toast.success(payload.title, {
      ...baseOptions("success", payload, placement),
      id,
    })
  },
  error(
    payload: AppToastPayload,
    id?: string | number,
    placement: AppToastPlacement = "action"
  ) {
    return toast.error(payload.title, {
      ...baseOptions("error", payload, placement),
      id,
    })
  },
  warning(
    payload: AppToastPayload,
    id?: string | number,
    placement: AppToastPlacement = "action"
  ) {
    return toast.warning(payload.title, {
      ...baseOptions("warning", payload, placement),
      id,
    })
  },
  info(
    payload: AppToastPayload,
    id?: string | number,
    placement: AppToastPlacement = "action"
  ) {
    return toast.info(payload.title, {
      ...baseOptions("info", payload, placement),
      id,
    })
  },
  /** Inbox / live notification alerts — always top-right. */
  notify(
    payload: AppToastPayload,
    kind: Exclude<ToastKind, "loading"> = "info",
    id?: string | number
  ) {
    const options = {
      ...baseOptions(kind, payload, "notification"),
      id,
    }
    if (kind === "success") return toast.success(payload.title, options)
    if (kind === "warning") return toast.warning(payload.title, options)
    if (kind === "error") return toast.error(payload.title, options)
    return toast.info(payload.title, options)
  },
  loading(payload: AppToastPayload, id?: string | number) {
    return toast.loading(payload.title, {
      id,
      description: payload.description,
      toasterId: APP_TOASTER_IDS.action,
      classNames: {
        toast: "cn-toast cn-toast--loading",
        title: "cn-toast__title",
        description: "cn-toast__description",
        closeButton: "cn-toast__close",
      },
    })
  },
  /** Persistent progress toast — update by calling again with the same id. */
  progress(
    payload: { title: string; percent: number; hint?: string },
    id: string | number
  ) {
    return toast.custom(
      () =>
        createElement(ProgressToastContent, {
          title: payload.title,
          percent: payload.percent,
          hint: payload.hint,
        }),
      {
        id,
        duration: Infinity,
        toasterId: APP_TOASTER_IDS.action,
        classNames: {
          toast: "cn-toast cn-toast--loading",
          closeButton: "cn-toast__close",
        },
      }
    )
  },
  dismiss(id?: string | number) {
    toast.dismiss(id)
  },
  promise<T>(
    promise: Promise<T>,
    messages: {
      loading: AppToastPayload
      success: AppToastPayload | ((value: T) => AppToastPayload)
      error: AppToastPayload | ((error: unknown) => AppToastPayload)
    }
  ) {
    return toast.promise(promise, {
      loading: messages.loading.title,
      success: (value) => {
        const payload =
          typeof messages.success === "function"
            ? messages.success(value)
            : messages.success
        return payload.description
          ? `${payload.title}\n${payload.description}`
          : payload.title
      },
      error: (error) => {
        const payload =
          typeof messages.error === "function"
            ? messages.error(error)
            : messages.error
        return payload.description
          ? `${payload.title}\n${payload.description}`
          : payload.title
      },
      toasterId: APP_TOASTER_IDS.action,
      classNames: {
        toast: "cn-toast",
        title: "cn-toast__title",
        description: "cn-toast__description",
        closeButton: "cn-toast__close",
      },
    })
  },
}
