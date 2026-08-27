const STYLE_ID = "medical-document-print-page"

/** Opens the browser print dialog sized for half-bond HSO documents. */
export function triggerMedicalDocumentPrint(delayMs = 150) {
  window.setTimeout(() => {
    let style = document.getElementById(STYLE_ID) as HTMLStyleElement | null
    if (!style) {
      style = document.createElement("style")
      style.id = STYLE_ID
      style.textContent = `@media print {
  @page {
    size: 8.5in 5.5in;
    margin: 0;
  }

  html, body {
    width: 8.5in !important;
    height: 5.5in !important;
    margin: 0 !important;
    padding: 0 !important;
    overflow: hidden !important;
  }
}`
      document.head.appendChild(style)
    }

    const cleanup = () => {
      document.getElementById(STYLE_ID)?.remove()
      window.removeEventListener("afterprint", cleanup)
    }
    window.addEventListener("afterprint", cleanup, { once: true })
    window.print()
  }, delayMs)
}
