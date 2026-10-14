import QRCode from "qrcode"

import { getAndroidApkUrl } from "@/lib/download/apk"

/** Server-side SVG QR pointing at the official APK URL. */
export async function buildApkQrSvg(): Promise<string> {
  const value = getAndroidApkUrl()

  return QRCode.toString(value, {
    type: "svg",
    margin: 1,
    width: 280,
    color: {
      dark: "#0f172a",
      light: "#ffffff",
    },
    errorCorrectionLevel: "M",
  })
}
