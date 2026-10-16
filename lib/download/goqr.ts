/**
 * goQR.me / qrserver.com image URL builder.
 * Docs: https://goqr.me/api/
 * Endpoint: https://api.qrserver.com/v1/create-qr-code/
 */

const GOQR_ENDPOINT = "https://api.qrserver.com/v1/create-qr-code/"

/** CampusCare navy modules on white, medium ECC, quiet zone 4. */
export function buildGoQrImageUrl(data: string): string {
  const params = new URLSearchParams({
    size: "300x300",
    data,
    format: "png",
    color: "1C3476",
    bgcolor: "FFFFFF",
    qzone: "4",
    ecc: "M",
  })

  return `${GOQR_ENDPOINT}?${params.toString()}`
}
