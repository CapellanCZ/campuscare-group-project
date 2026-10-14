import { FakeQr } from "@/components/landing/fake-qr"
import { cn } from "@/lib/utils"

type DownloadQrPanelProps = {
  /** Live QR SVG from the server. Falls back to fake preview. */
  svg?: string
  caption?: string
  className?: string
}

/** Quiet QR frame — white square, thin border, no badge stack. */
export function DownloadQrPanel({
  svg,
  caption = "Point your camera here",
  className,
}: DownloadQrPanelProps) {
  return (
    <figure className={cn("mx-auto w-full max-w-[17rem]", className)}>
      {svg ? (
        <div
          className="aspect-square w-full rounded-2xl border border-slate-200/90 bg-white p-5 [&_svg]:h-full [&_svg]:w-full"
          dangerouslySetInnerHTML={{ __html: svg }}
          role="img"
          aria-label="QR code to download the CampusCare Android app"
        />
      ) : (
        <div className="aspect-square w-full rounded-2xl border border-slate-200/90 bg-white p-5">
          <FakeQr />
        </div>
      )}
      <figcaption className="mt-4 text-center text-sm text-slate-500">
        {caption}
      </figcaption>
    </figure>
  )
}
