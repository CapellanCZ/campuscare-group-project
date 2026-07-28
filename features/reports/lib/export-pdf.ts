import { chartSeriesToSvg } from "@/features/reports/lib/chart-to-svg"
import type { ClinicExportPack } from "@/features/reports/lib/clinic-progress-narrative"
import {
  HSO_ACCENT,
  HSO_CONFIDENTIAL,
  HSO_LETTERHEAD_LINE,
  HSO_LOGO_PATH,
  HSO_OFFICE_NAME,
  HSO_OFFICE_UNIT,
  formatManilaTimestamp,
  type ExportMeta,
} from "@/features/reports/lib/export-letterhead"
import type { ReportTableBundle } from "@/features/reports/types"

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
}

function renderTable(table: ReportTableBundle): string {
  const headers = table.columns
    .map((c) => `<th>${escapeHtml(c.label)}</th>`)
    .join("")
  const body = table.rows
    .map((row) => {
      const cells = table.columns
        .map((c) => `<td>${escapeHtml(String(row.cells[c.key] ?? ""))}</td>`)
        .join("")
      return `<tr>${cells}</tr>`
    })
    .join("")

  return `<section class="block">
    <h2>${escapeHtml(table.title)}</h2>
    <table>
      <thead><tr>${headers}</tr></thead>
      <tbody>${
        body ||
        `<tr><td colspan="${table.columns.length}">No records for the selected filters.</td></tr>`
      }</tbody>
    </table>
  </section>`
}

export function buildClinicProgressPrintHtml(input: {
  meta: ExportMeta
  pack: ClinicExportPack
  logoUrl?: string
}): string {
  const logoSrc = input.logoUrl ?? `${window.location.origin}${HSO_LOGO_PATH}`
  const n = input.pack.narrative

  const kpiCards = input.pack.kpis
    .map(
      (k) => `<div class="kpi">
        <div class="kpi-label">${escapeHtml(k.label)}</div>
        <div class="kpi-value">${escapeHtml(k.value)}</div>
        ${k.description ? `<div class="kpi-desc">${escapeHtml(k.description)}</div>` : ""}
      </div>`
    )
    .join("")

  const charts = input.pack.charts
    .map(
      (series) => `<section class="block chart-block">
        <h2>${escapeHtml(series.title)}</h2>
        ${
          series.description
            ? `<p class="muted">${escapeHtml(series.description)}</p>`
            : ""
        }
        ${chartSeriesToSvg(series)}
        <table class="compact">
          <thead><tr><th>Category</th><th>Value</th></tr></thead>
          <tbody>
            ${series.points
              .map(
                (p) =>
                  `<tr><td>${escapeHtml(p.label)}</td><td>${p.value}</td></tr>`
              )
              .join("")}
          </tbody>
        </table>
      </section>`
    )
    .join("")

  const tables = input.pack.tables.map(renderTable).join("")

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(n.title)}</title>
  <style>
    @page { margin: 16mm 14mm; }
    body {
      font-family: "Segoe UI", Arial, Helvetica, sans-serif;
      color: #111827;
      font-size: 10.5pt;
      line-height: 1.45;
      margin: 0;
      background: #fff;
    }
    .letterhead {
      display: flex;
      align-items: center;
      gap: 16px;
      border-bottom: 2px solid ${HSO_ACCENT};
      padding-bottom: 12px;
      margin-bottom: 14px;
    }
    .letterhead img { height: 56px; width: auto; object-fit: contain; }
    .letterhead h1 { margin: 0; font-size: 15pt; color: ${HSO_ACCENT}; }
    .letterhead p { margin: 2px 0 0; color: ${HSO_ACCENT}; font-size: 10.5pt; }
    .meta, .narrative p { font-size: 9.5pt; color: #374151; }
    .meta strong, .narrative strong { color: #111827; }
    h2 {
      margin: 18px 0 8px;
      font-size: 12pt;
      color: ${HSO_ACCENT};
      border-bottom: 1px solid #dbe3f0;
      padding-bottom: 4px;
    }
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 8px;
      margin: 10px 0 16px;
    }
    .kpi {
      border: 1px solid #d1d5db;
      border-radius: 6px;
      padding: 8px 10px;
      background: #f8fafc;
    }
    .kpi-label { font-size: 8.5pt; color: #6b7280; }
    .kpi-value { font-size: 14pt; font-weight: 700; color: ${HSO_ACCENT}; }
    .kpi-desc { font-size: 8pt; color: #6b7280; }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 9pt;
      margin-top: 6px;
    }
    table.compact { max-width: 360px; }
    th, td {
      border: 1px solid #d1d5db;
      padding: 5px 7px;
      text-align: left;
      vertical-align: top;
    }
    th { background: #eef2ff; color: ${HSO_ACCENT}; font-weight: 600; }
    tr:nth-child(even) td { background: #f9fafb; }
    .block { break-inside: avoid; page-break-inside: avoid; margin-bottom: 12px; }
    .chart-block svg { max-width: 100%; }
    .muted { color: #6b7280; font-size: 9pt; margin: 0 0 6px; }
    .footer {
      margin-top: 18px;
      border-top: 1px solid #d1d5db;
      padding-top: 8px;
      font-size: 8pt;
      color: #6b7280;
      display: flex;
      justify-content: space-between;
      gap: 12px;
    }
    .narrative p { margin: 0 0 8px; text-align: justify; }
  </style>
</head>
<body>
  <header class="letterhead">
    <img src="${escapeHtml(logoSrc)}" alt="${escapeHtml(HSO_LETTERHEAD_LINE)}" />
    <div>
      <h1>${escapeHtml(HSO_OFFICE_NAME)}</h1>
      <p>${escapeHtml(HSO_OFFICE_UNIT)}</p>
      <p style="font-size:9pt;color:#6b7280;margin-top:4px;">CampusCare · Quarterly admin briefing</p>
    </div>
  </header>

  <section class="meta">
    <div><strong>Report:</strong> ${escapeHtml(n.title)}</div>
    <div><strong>Coverage period:</strong> ${escapeHtml(n.periodLabel)}</div>
    <div><strong>Generated:</strong> ${escapeHtml(formatManilaTimestamp(input.meta.generatedAt))} (Asia/Manila)</div>
    <div><strong>Prepared by:</strong> ${escapeHtml(input.meta.generatedBy)} · ${escapeHtml(input.meta.roleLabel)}</div>
    <div><strong>Applied filters:</strong> ${escapeHtml(input.meta.filterSummary)}</div>
  </section>

  <section class="narrative block">
    <h2>1. Executive summary</h2>
    <p>${escapeHtml(n.executiveSummary)}</p>
    <h2>2. Operational progress</h2>
    <p>${escapeHtml(n.operationalProgress)}</p>
    <h2>3. Health-related concerns</h2>
    <p>${escapeHtml(n.healthConcerns)}</p>
    <h2>4. Service capacity & queue situation</h2>
    <p>${escapeHtml(n.serviceCapacity)}</p>
  </section>

  <section class="block">
    <h2>5. Analytics snapshot (KPI cards)</h2>
    <div class="kpi-grid">${kpiCards}</div>
  </section>

  <section>
    <h2>6. Charts & visual analytics</h2>
    ${charts || `<p class="muted">No charts available for this role view.</p>`}
  </section>

  <section>
    <h2>7. Detailed report tables</h2>
    ${tables || `<p class="muted">No tables available.</p>`}
  </section>

  <section class="narrative block">
    <h2>8. Closing note for administration</h2>
    <p>${escapeHtml(n.closing)}</p>
  </section>

  <footer class="footer">
    <span>${escapeHtml(HSO_CONFIDENTIAL)}</span>
    <span>${escapeHtml(formatManilaTimestamp(input.meta.generatedAt))}</span>
  </footer>
</body>
</html>`
}

export function printClinicProgressReport(input: {
  meta: ExportMeta
  pack: ClinicExportPack
}): void {
  const html = buildClinicProgressPrintHtml({
    ...input,
    logoUrl: `${window.location.origin}${HSO_LOGO_PATH}`,
  })

  const existing = document.getElementById("campuscare-report-print-frame")
  if (existing) existing.remove()

  const iframe = document.createElement("iframe")
  iframe.id = "campuscare-report-print-frame"
  iframe.setAttribute("aria-hidden", "true")
  iframe.setAttribute("title", "Print clinic progress report")
  Object.assign(iframe.style, {
    position: "fixed",
    top: "0",
    left: "0",
    width: "8.5in",
    height: "11in",
    border: "0",
    margin: "0",
    padding: "0",
    opacity: "0",
    pointerEvents: "none",
    zIndex: "-1",
  })
  document.body.appendChild(iframe)

  const frameWindow = iframe.contentWindow
  const frameDocument = frameWindow?.document
  if (!frameWindow || !frameDocument) {
    iframe.remove()
    throw new Error("Could not prepare the print view. Try again.")
  }

  const cleanup = () => {
    window.setTimeout(() => iframe.remove(), 1500)
  }

  let printed = false
  const triggerPrint = () => {
    if (printed) return
    printed = true
    try {
      frameWindow.focus()
      frameWindow.print()
    } finally {
      cleanup()
    }
  }

  frameDocument.open()
  frameDocument.write(html)
  frameDocument.close()

  const images = Array.from(frameDocument.images)
  if (images.length === 0) {
    window.setTimeout(triggerPrint, 150)
    return
  }

  let remaining = images.length
  const onReady = () => {
    remaining -= 1
    if (remaining <= 0) triggerPrint()
  }
  for (const img of images) {
    if (img.complete) onReady()
    else {
      img.addEventListener("load", onReady, { once: true })
      img.addEventListener("error", onReady, { once: true })
    }
  }
  window.setTimeout(triggerPrint, 2500)
}

/** @deprecated Prefer printClinicProgressReport */
export function printReportPdf(input: {
  meta: ExportMeta
  table: ReportTableBundle
  pack?: ClinicExportPack
}): void {
  if (input.pack) {
    printClinicProgressReport({ meta: input.meta, pack: input.pack })
    return
  }
  printClinicProgressReport({
    meta: input.meta,
    pack: {
      narrative: {
        title: input.meta.reportTitle,
        periodLabel: input.meta.filterSummary,
        executiveSummary: "Single-table export fallback.",
        operationalProgress: "",
        healthConcerns: "",
        serviceCapacity: "",
        closing: "",
      },
      kpis: [],
      charts: [],
      tables: [input.table],
    },
  })
}
