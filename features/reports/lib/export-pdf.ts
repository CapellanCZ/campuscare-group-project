import { buildClinicProgressPdfDocument } from "@/features/reports/lib/pdf/clinic-progress-pdf-document"

import { chartSeriesToSvg } from "@/features/reports/lib/chart-to-svg"
import type { ClinicExportPack } from "@/features/reports/lib/clinic-progress-narrative"
import {
  STANDARD_DENTAL_CASE_LABELS,
  STANDARD_MEDICAL_CASE_LABELS,
} from "@/features/reports/lib/health-case-normalize"
import {
  HSO_ACCENT,
  HSO_CONFIDENTIAL,
  exportFilename,
  HSO_LETTERHEAD_LINE,
  HSO_LETTERHEAD_PATH,
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

  return `<section class="block pdf-section table-section">
    <h2>${escapeHtml(table.title)}</h2>
    <table class="data-table">
      <thead><tr>${headers}</tr></thead>
      <tbody>${
        body ||
        `<tr><td colspan="${table.columns.length}">No records for the selected filters.</td></tr>`
      }</tbody>
    </table>
  </section>`
}

function renderOfficialHealthCasesTable(
  table: ReportTableBundle | undefined,
  mode: "medical" | "dental"
): string {
  const standardLabels =
    mode === "dental"
      ? STANDARD_DENTAL_CASE_LABELS
      : STANDARD_MEDICAL_CASE_LABELS

  const byTypeTable = table?.kind === "health_cases_by_patient_type"
  const counts = new Map<
    string,
    { employee: number; college: number; shs: number }
  >()

  for (const row of table?.rows ?? []) {
    const label = String(row.cells.case ?? "")
    if (!label) continue
    if (byTypeTable) {
      counts.set(label, {
        employee: Number(row.cells.employee ?? 0),
        college: Number(row.cells.student ?? 0),
        shs: Number(row.cells.faculty ?? 0),
      })
    } else {
      counts.set(label, {
        employee: Number(row.cells.total ?? 0),
        college: 0,
        shs: 0,
      })
    }
  }

  const body = standardLabels
    .map((label) => {
      const bucket = counts.get(label) ?? { employee: 0, college: 0, shs: 0 }
      return `<tr>
        <td>${escapeHtml(label)}</td>
        <td class="num">${bucket.employee || "—"}</td>
        <td class="num">${bucket.college || "—"}</td>
        <td class="num">${bucket.shs || "—"}</td>
      </tr>`
    })
    .join("")

  const title =
    mode === "dental"
      ? "Dental Health Cases Summary"
      : "Medical Health Cases Summary"

  return `<section class="block pdf-section table-section">
    <h2>${escapeHtml(title)}</h2>
    <p class="muted">Official case tally for the selected period. Employee, College, and SHS columns reflect patient classification where available.</p>
    <table class="data-table health-cases">
      <thead>
        <tr>
          <th>CASE</th>
          <th>EMPLOYEE</th>
          <th>COLLEGE</th>
          <th>SHS</th>
        </tr>
      </thead>
      <tbody>${body}</tbody>
    </table>
  </section>`
}

export function buildClinicProgressPrintHtml(input: {
  meta: ExportMeta
  pack: ClinicExportPack
  logoUrl?: string
  reportMode?: "medical" | "dental" | "hso"
}): string {
  const logoSrc =
    input.logoUrl ?? `${window.location.origin}${HSO_LETTERHEAD_PATH}`
  const n = input.pack.narrative
  const reportMode =
    input.reportMode ??
    (input.meta.reportTitle.toLowerCase().includes("dental")
      ? "dental"
      : input.meta.reportTitle.toLowerCase().includes("medical")
        ? "medical"
        : "hso")

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
      (series) => `<section class="block chart-block pdf-section">
        <h2>${escapeHtml(series.title)}</h2>
        ${
          series.description
            ? `<p class="muted">${escapeHtml(series.description)}</p>`
            : ""
        }
        ${chartSeriesToSvg(series)}
        <table class="compact data-table">
          <thead>${
            series.kind === "stackedBar"
              ? "<tr><th>Health Case</th><th>Student</th><th>Faculty</th><th>Employee</th><th>Total</th></tr>"
              : series.kind === "multiline" || series.kind === "line"
                ? "<tr><th>Date</th><th>Medical</th><th>Dental</th><th>Total</th></tr>"
                : "<tr><th>Category</th><th>Value</th></tr>"
          }</thead>
          <tbody>
            ${series.points
              .map((p) => {
                if (series.kind === "stackedBar") {
                  const student = p.value
                  const faculty = p.secondary ?? 0
                  const employee = p.tertiary ?? 0
                  return `<tr><td>${escapeHtml(p.label)}</td><td class="num">${student}</td><td class="num">${faculty}</td><td class="num">${employee}</td><td class="num">${student + faculty + employee}</td></tr>`
                }
                if (series.kind === "multiline" || series.kind === "line") {
                  return `<tr><td>${escapeHtml(p.label)}</td><td class="num">${p.value}</td><td class="num">${p.secondary ?? 0}</td><td class="num">${p.tertiary ?? p.value + (p.secondary ?? 0)}</td></tr>`
                }
                return `<tr><td>${escapeHtml(p.label)}</td><td class="num">${p.value}</td></tr>`
              })
              .join("")}
          </tbody>
        </table>
      </section>`
    )
    .join("")

  const healthCasesTable =
    input.pack.tables.find(
      (table) =>
        table.kind === "health_cases_by_patient_type" ||
        table.kind === "health_cases"
    )
  const officialHealthCases =
    reportMode === "medical" || reportMode === "dental"
      ? renderOfficialHealthCasesTable(healthCasesTable, reportMode)
      : ""

  const tables = input.pack.tables
    .filter((table) => table.kind !== "health_cases" || reportMode === "hso")
    .map(renderTable)
    .join("")

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(n.title)}</title>
  <style>
    @page { margin: 14mm 12mm; size: A4 portrait; }
    * { box-sizing: border-box; }
    body {
      font-family: "Segoe UI", Arial, Helvetica, sans-serif;
      color: #111827;
      font-size: 10pt;
      line-height: 1.45;
      margin: 0;
      padding: 0;
      background: #fff;
    }
    .letterhead {
      display: flex;
      justify-content: center;
      align-items: center;
      border-bottom: 2px solid ${HSO_ACCENT};
      padding-bottom: 12px;
      margin-bottom: 14px;
    }
    .letterhead img { height: 64px; width: auto; object-fit: contain; }
    .report-title {
      margin: 10px 0 4px;
      font-size: 13pt;
      font-weight: 700;
      text-align: center;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: #111827;
    }
    .meta, .narrative p { font-size: 9pt; color: #374151; }
    .meta { margin-bottom: 12px; display: grid; gap: 3px; }
    .meta strong, .narrative strong { color: #111827; }
    h2 {
      margin: 14px 0 8px;
      font-size: 11pt;
      color: ${HSO_ACCENT};
      border-bottom: 1px solid #dbe3f0;
      padding-bottom: 4px;
      page-break-after: avoid;
    }
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 8px;
      margin: 10px 0 16px;
    }
    .kpi {
      border: 1px solid #d1d5db;
      border-radius: 6px;
      padding: 8px 10px;
      background: #f8fafc;
      page-break-inside: avoid;
    }
    .kpi-label { font-size: 8pt; color: #6b7280; }
    .kpi-value { font-size: 13pt; font-weight: 700; color: ${HSO_ACCENT}; }
    .kpi-desc { font-size: 7.5pt; color: #6b7280; }
    table.data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 8.5pt;
      margin-top: 6px;
      page-break-inside: auto;
    }
    table.compact { max-width: 100%; }
    th, td {
      border: 1px solid #9ca3af;
      padding: 5px 7px;
      text-align: left;
      vertical-align: top;
    }
    td.num { text-align: right; font-variant-numeric: tabular-nums; }
    th {
      background: #e8eef8;
      color: ${HSO_ACCENT};
      font-weight: 600;
      font-size: 8pt;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }
    thead { display: table-header-group; }
    tr { page-break-inside: avoid; page-break-after: auto; }
    tbody tr:nth-child(even) td { background: #f9fafb; }
    .block { margin-bottom: 14px; }
    .pdf-section { page-break-inside: auto; }
    .table-section { page-break-before: auto; }
    .chart-block svg { max-width: 100%; height: auto; }
    .muted { color: #6b7280; font-size: 8.5pt; margin: 0 0 6px; }
    .footer {
      margin-top: 24px;
      border-top: 1px solid #d1d5db;
      padding-top: 8px;
      font-size: 7.5pt;
      color: #6b7280;
      display: flex;
      justify-content: space-between;
      gap: 12px;
    }
    .signatures {
      margin-top: 28px;
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
      font-size: 8.5pt;
      page-break-inside: avoid;
    }
    .signatures .line {
      border-top: 1px solid #111827;
      margin-top: 36px;
      padding-top: 4px;
      text-align: center;
      color: #374151;
    }
    .narrative p { margin: 0 0 8px; text-align: justify; }
  </style>
</head>
<body>
  <header class="letterhead pdf-section">
    <img src="${escapeHtml(logoSrc)}" alt="${escapeHtml(HSO_LETTERHEAD_LINE)}" />
  </header>

  <h1 class="report-title">${escapeHtml(n.title)}</h1>

  <section class="meta pdf-section">
    <div><strong>Report:</strong> ${escapeHtml(n.title)}</div>
    <div><strong>Coverage period:</strong> ${escapeHtml(n.periodLabel)}</div>
    <div><strong>Generated:</strong> ${escapeHtml(formatManilaTimestamp(input.meta.generatedAt))} (Asia/Manila)</div>
    <div><strong>Prepared by:</strong> ${escapeHtml(input.meta.generatedBy)} · ${escapeHtml(input.meta.roleLabel)}</div>
    <div><strong>Applied filters:</strong> ${escapeHtml(input.meta.filterSummary)}</div>
  </section>

  <section class="narrative block pdf-section">
    <h2>1. Executive summary</h2>
    <p>${escapeHtml(n.executiveSummary)}</p>
    <h2>2. Operational progress</h2>
    <p>${escapeHtml(n.operationalProgress)}</p>
    <h2>3. Health-related concerns</h2>
    <p>${escapeHtml(n.healthConcerns)}</p>
    <h2>4. Service capacity & queue situation</h2>
    <p>${escapeHtml(n.serviceCapacity)}</p>
  </section>

  <section class="block pdf-section">
    <h2>5. Analytics snapshot (KPI cards)</h2>
    <div class="kpi-grid">${kpiCards}</div>
  </section>

  <section class="pdf-section">
    <h2>6. Charts & visual analytics</h2>
    ${charts || `<p class="muted">No charts available for this role view.</p>`}
  </section>

  ${officialHealthCases}

  <section class="pdf-section">
    <h2>7. Detailed report tables</h2>
    ${tables || `<p class="muted">No tables available.</p>`}
  </section>

  <section class="narrative block pdf-section">
    <h2>8. Closing note for administration</h2>
    <p>${escapeHtml(n.closing)}</p>
  </section>

  <section class="signatures pdf-section">
    <div><div class="line">Prepared by</div></div>
    <div><div class="line">Checked by</div></div>
    <div><div class="line">Noted by</div></div>
  </section>

  <footer class="footer">
    <span>${escapeHtml(HSO_CONFIDENTIAL)}</span>
    <span>${escapeHtml(formatManilaTimestamp(input.meta.generatedAt))}</span>
  </footer>
</body>
</html>`
}

function createReportRenderFrame(html: string, title: string): HTMLIFrameElement {
  const existing = document.getElementById("campuscare-report-print-frame")
  if (existing) existing.remove()

  const iframe = document.createElement("iframe")
  iframe.id = "campuscare-report-print-frame"
  iframe.setAttribute("aria-hidden", "true")
  iframe.setAttribute("title", title)
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

  const frameDocument = iframe.contentWindow?.document
  if (!frameDocument) {
    iframe.remove()
    throw new Error("Could not prepare the report view. Try again.")
  }

  frameDocument.open()
  frameDocument.write(html)
  frameDocument.close()

  return iframe
}

function waitForReportFrameReady(iframe: HTMLIFrameElement): Promise<void> {
  const frameDocument = iframe.contentWindow?.document
  if (!frameDocument) {
    return Promise.reject(new Error("Could not prepare the report view. Try again."))
  }

  return new Promise((resolve) => {
    const images = Array.from(frameDocument.images)
    if (images.length === 0) {
      window.setTimeout(resolve, 150)
      return
    }

    let remaining = images.length
    let settled = false
    const finish = () => {
      if (settled) return
      settled = true
      resolve()
    }

    const onReady = () => {
      remaining -= 1
      if (remaining <= 0) finish()
    }

    for (const img of images) {
      if (img.complete) onReady()
      else {
        img.addEventListener("load", onReady, { once: true })
        img.addEventListener("error", onReady, { once: true })
      }
    }

    window.setTimeout(finish, 2500)
  })
}

export function printClinicProgressReport(input: {
  meta: ExportMeta
  pack: ClinicExportPack
}): void {
  const html = buildClinicProgressPrintHtml({
    ...input,
    logoUrl: `${window.location.origin}${HSO_LETTERHEAD_PATH}`,
  })

  const iframe = createReportRenderFrame(html, "Print clinic progress report")
  const frameWindow = iframe.contentWindow
  if (!frameWindow) {
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

  void waitForReportFrameReady(iframe).then(triggerPrint)
}

export async function downloadClinicProgressPdf(input: {
  meta: ExportMeta
  pack: ClinicExportPack
  reportMode?: "medical" | "dental" | "hso"
}): Promise<void> {
  const doc = await buildClinicProgressPdfDocument({
    meta: input.meta,
    pack: input.pack,
    reportMode: input.reportMode,
  })
  doc.save(exportFilename(input.meta.reportTitle, "pdf"))
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
