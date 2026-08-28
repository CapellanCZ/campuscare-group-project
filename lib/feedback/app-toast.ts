import { toast, type ExternalToast } from "sonner"

export type AppToastPayload = {
  title: string
  description?: string
}

const DURATION = {
  success: 4000,
  info: 4000,
  warning: 6000,
  error: 8000,
} as const

type ToastKind = keyof typeof DURATION

function baseOptions(kind: ToastKind, payload: AppToastPayload): ExternalToast {
  return {
    description: payload.description,
    duration: DURATION[kind],
    classNames: {
      toast: `cn-toast cn-toast--${kind}`,
      title: "cn-toast__title",
      description: "cn-toast__description",
    },
  }
}

export const appToast = {
  success(payload: AppToastPayload) {
    return toast.success(payload.title, baseOptions("success", payload))
  },
  error(payload: AppToastPayload) {
    return toast.error(payload.title, baseOptions("error", payload))
  },
  warning(payload: AppToastPayload) {
    return toast.warning(payload.title, baseOptions("warning", payload))
  },
  info(payload: AppToastPayload) {
    return toast.info(payload.title, baseOptions("info", payload))
  },
  loading(payload: AppToastPayload) {
    return toast.loading(payload.title, {
      description: payload.description,
      classNames: {
        toast: "cn-toast cn-toast--loading",
        title: "cn-toast__title",
        description: "cn-toast__description",
      },
    })
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
      classNames: {
        toast: "cn-toast",
        title: "cn-toast__title",
        description: "cn-toast__description",
      },
    })
  },
}
