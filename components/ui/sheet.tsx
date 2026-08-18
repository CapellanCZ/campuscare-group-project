"use client"

import * as React from "react"
import { Dialog as SheetPrimitive } from "@base-ui/react/dialog"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { IconX } from "@tabler/icons-react"

function Sheet({ ...props }: SheetPrimitive.Root.Props) {
  return <SheetPrimitive.Root data-slot="sheet" {...props} />
}

function SheetTrigger({ ...props }: SheetPrimitive.Trigger.Props) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />
}

function SheetClose({ ...props }: SheetPrimitive.Close.Props) {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />
}

function SheetPortal({ ...props }: SheetPrimitive.Portal.Props) {
  return <SheetPrimitive.Portal data-slot="sheet-portal" {...props} />
}

function SheetOverlay({ className, ...props }: SheetPrimitive.Backdrop.Props) {
  return (
    <SheetPrimitive.Backdrop
      data-slot="sheet-overlay"
      className={cn(
        "fixed inset-0 z-50 bg-black/80 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0 supports-backdrop-filter:backdrop-blur-xs",
        className
      )}
      {...props}
    />
  )
}

function SheetContent({
  className,
  children,
  side: _side = "left",
  showCloseButton = true,
  ...props
}: SheetPrimitive.Popup.Props & {
  /** Side where the sheet slides in from. Defaults to left for mobile. */
  side?: "top" | "right" | "bottom" | "left"
  showCloseButton?: boolean
}) {
  const sideStyles = {
    top: "inset-x-0 top-0 max-h-[50vh] rounded-b-4xl",
    right: "inset-y-0 right-0 w-full max-w-[85vw] sm:max-w-lg rounded-l-4xl",
    bottom: "inset-x-0 bottom-0 max-h-[50vh] rounded-t-4xl",
    left: "inset-y-0 left-0 w-full max-w-[85vw] sm:max-w-lg rounded-r-4xl",
  }

  const animationStyles = {
    top: "data-open:slide-in-from-top data-closed:slide-out-to-top",
    right: "data-open:slide-in-from-right data-closed:slide-out-to-right",
    bottom: "data-open:slide-in-from-bottom data-closed:slide-out-to-bottom",
    left: "data-open:slide-in-from-left data-closed:slide-out-to-left",
  }

  return (
    <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Popup
        data-slot="sheet-content"
        className={cn(
          "fixed z-50 flex max-h-[min(92vh,960px)] flex-col overflow-hidden bg-popover bg-clip-padding text-sm text-popover-foreground shadow-lg ring-1 ring-foreground/5 duration-100 outline-none data-open:animate-in data-closed:animate-out data-closed:fade-out-0",
          sideStyles[_side],
          animationStyles[_side],
          className
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <SheetPrimitive.Close
            data-slot="sheet-close"
            render={
              <Button
                variant="ghost"
                className="absolute top-4 right-4"
                size="icon-sm"
              />
            }
          >
            <IconX />
            <span className="sr-only">Close</span>
          </SheetPrimitive.Close>
        )}
      </SheetPrimitive.Popup>
    </SheetPortal>
  )
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-header"
      className={cn("flex shrink-0 flex-col gap-2 px-6 pt-6 pb-5", className)}
      {...props}
    />
  )
}

function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn("flex shrink-0 flex-col gap-3 border-t px-6 py-5", className)}
      {...props}
    />
  )
}

function SheetTitle({ className, ...props }: SheetPrimitive.Title.Props) {
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      className={cn(
        "font-heading text-base font-medium text-foreground",
        className
      )}
      {...props}
    />
  )
}

function SheetDescription({
  className,
  ...props
}: SheetPrimitive.Description.Props) {
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
}
