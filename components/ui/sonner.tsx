"use client"

import { useTheme } from "next-themes"
import {
  IconAlertOctagon,
  IconAlertTriangle,
  IconCircleCheck,
  IconInfoCircle,
  IconLoader,
} from "@tabler/icons-react"
import { Toaster as Sonner, type ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="top-right"
      closeButton
      richColors={false}
      icons={{
        success: <IconCircleCheck className="size-5 shrink-0" aria-hidden />,
        info: <IconInfoCircle className="size-5 shrink-0" aria-hidden />,
        warning: <IconAlertTriangle className="size-5 shrink-0" aria-hidden />,
        error: <IconAlertOctagon className="size-5 shrink-0" aria-hidden />,
        loading: <IconLoader className="size-5 shrink-0 animate-spin" aria-hidden />,
      }}
      toastOptions={{
        classNames: {
          toast: "cn-toast",
          title: "cn-toast__title",
          description: "cn-toast__description",
          closeButton: "cn-toast__close",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
