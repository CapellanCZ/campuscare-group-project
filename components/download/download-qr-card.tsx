import { GoQrImage } from "@/components/download/go-qr-image"
import { FakeQr } from "@/components/landing/fake-qr"
import { cn } from "@/lib/utils"

type DownloadQrPanelProps = {
  /** Absolute download URL to encode. When omitted, shows coming-soon placeholder. */
  downloadUrl?: string | null
  caption?: string
  className?: string
}

/** Quiet QR frame — white square, thin border; live goQR image when URL is set. */
export function DownloadQrPanel({
  downloadUrl,
  caption,
  className,
}: DownloadQrPanelProps) {
  const ready = Boolean(downloadUrl)
  const label =
    caption ??
    (ready ? "Point your camera here" : "Preview code · APK coming soon")

  return (
    <figure className={cn("mx-auto w-full max-w-[17rem]", className)}>
      <div className="aspect-square w-full overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5">
        {ready && downloadUrl ? (
          <GoQrImage data={downloadUrl} />
        ) : (
          <FakeQr />
        )}
      </div>
      <figcaption className="mt-4 text-center text-sm text-slate-500">
        {label}
      </figcaption>
    </figure>
  )
}
