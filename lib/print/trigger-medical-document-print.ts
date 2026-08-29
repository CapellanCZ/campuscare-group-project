const STYLE_ID = "medical-document-print-page"
const ROOT_CLASS = "printing-medical-document"

/**
 * Half-bond HSO forms use the top 8.5in × 5.5in of portrait letter paper
 * (or pre-cut half-bond stock with the same printable area).
 */
export const MEDICAL_DOCUMENT_PRINT_PAGE_CSS = `@media print {
  @page {
    size: letter portrait;
    margin: 0;
  }

  html.${ROOT_CLASS},
  html.${ROOT_CLASS} body {
    width: 8.5in !important;
    height: 5.5in !important;
    max-height: 5.5in !important;
    margin: 0 !important;
    padding: 0 !important;
    overflow: hidden !important;
    background: white !important;
  }
}`

/** Opens the browser print dialog for portrait half-bond HSO documents. */
export function triggerMedicalDocumentPrint(delayMs = 150) {
  window.setTimeout(() => {
    document.documentElement.classList.add(ROOT_CLASS)

    let style = document.getElementById(STYLE_ID) as HTMLStyleElement | null
    if (!style) {
      style = document.createElement("style")
      style.id = STYLE_ID
      style.textContent = MEDICAL_DOCUMENT_PRINT_PAGE_CSS
      document.head.appendChild(style)
    }

    const cleanup = () => {
      document.documentElement.classList.remove(ROOT_CLASS)
      document.getElementById(STYLE_ID)?.remove()
      window.removeEventListener("afterprint", cleanup)
    }
    window.addEventListener("afterprint", cleanup, { once: true })
    window.print()
  }, delayMs)
}
