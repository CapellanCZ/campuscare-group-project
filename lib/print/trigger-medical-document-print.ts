const STYLE_ID = "medical-document-print-page"
const ROOT_CLASS = "printing-medical-document"
const ROOT_CLASS_FULL = "printing-medical-document-full"

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

export const MEDICAL_DOCUMENT_FULL_PAGE_PRINT_CSS = `@media print {
  @page {
    size: letter portrait;
    margin: 0.4in;
  }

  html.${ROOT_CLASS_FULL},
  html.${ROOT_CLASS_FULL} body {
    width: 8.5in !important;
    height: 11in !important;
    max-height: 11in !important;
    margin: 0 !important;
    padding: 0 !important;
    overflow: hidden !important;
    background: white !important;
  }
}`

/** Opens the browser print dialog for HSO medical documents. */
export function triggerMedicalDocumentPrint(
  layout: "half-bond" | "full-page" = "half-bond",
  delayMs = 150
) {
  window.setTimeout(() => {
    const isFullPage = layout === "full-page"
    const rootClass = isFullPage ? ROOT_CLASS_FULL : ROOT_CLASS

    document.documentElement.classList.add(rootClass)

    let style = document.getElementById(STYLE_ID) as HTMLStyleElement | null
    if (!style) {
      style = document.createElement("style")
      style.id = STYLE_ID
      document.head.appendChild(style)
    }

    style.textContent = isFullPage
      ? MEDICAL_DOCUMENT_FULL_PAGE_PRINT_CSS
      : MEDICAL_DOCUMENT_PRINT_PAGE_CSS

    const cleanup = () => {
      document.documentElement.classList.remove(ROOT_CLASS, ROOT_CLASS_FULL)
      document.getElementById(STYLE_ID)?.remove()
      window.removeEventListener("afterprint", cleanup)
    }
    window.addEventListener("afterprint", cleanup, { once: true })
    window.print()
  }, delayMs)
}
