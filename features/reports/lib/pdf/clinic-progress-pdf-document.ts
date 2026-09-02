import { toPng } from "html-to-image"
import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"

import { chartSeriesToSvg } from "@/features/reports/lib/chart-to-svg"
import type { ClinicExportPack } from "@/features/reports/lib/clinic-progress-narrative"
import {
  HSO_CONFIDENTIAL,
  HSO_LETTERHEAD_PATH,
  formatManilaTimestamp,
  type ExportMeta,
} from "@/features/reports/lib/export-letterhead"
import { buildOfficialHealthCasesRows } from "@/features/reports/lib/pdf/health-cases-table-data"
import type {
  ReportChartSeries,
  ReportKpi,
  ReportTableBundle,
} from "@/features/reports/types"

const PAGE_W = 210
const PAGE_H = 297
const MARGIN_LEFT = 14
const MARGIN_RIGHT = 14
const MARGIN_TOP = 20
const MARGIN_BOTTOM = 16
const CONTENT_W = PAGE_W - MARGIN_LEFT - MARGIN_RIGHT
const ACCENT_RGB: [number, number, number] = [30, 58, 138]
const MUTED_RGB: [number, number, number] = [107, 114, 128]
const BODY_RGB: [number, number, number] = [17, 24, 39]

type ReportMode = "medical" | "dental" | "hso"

type PdfLayoutState = {
  doc: jsPDF
  y: number
  meta: ExportMeta
  logoDataUrl: string | null
}

async function loadLogoDataUrl(): Promise<string | null> {
  try {
    const response = await fetch(HSO_LETTERHEAD_PATH)
    if (!response.ok) return null
    const blob = await response.blob()
    return await new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

async function chartHtmlToPng(html: string): Promise<string | null> {
  const container = document.createElement("div")
  container.setAttribute("aria-hidden", "true")
  Object.assign(container.style, {
    position: "fixed",
    left: "-10000px",
    top: "0",
    width: "520px",
    padding: "8px",
    background: "#ffffff",
    color: "#111827",
  })
  container.innerHTML = html
  document.body.appendChild(container)

  try {
    return await toPng(container, {
      pixelRatio: 2,
      backgroundColor: "#ffffff",
      cacheBust: true,
    })
  } catch {
    return null
  } finally {
    container.remove()
  }
}

function chartDataTable(series: ReportChartSeries): {
  head: string[][]
  body: string[][]
} {
  if (series.kind === "stackedBar") {
    return {
      head: [["Health Case", "Student", "Faculty", "Employee", "Total"]],
      body: series.points.map((point) => {
        const student = point.value
        const faculty = point.secondary ?? 0
        const employee = point.tertiary ?? 0
        return [
          point.label,
          String(student),
          String(faculty),
          String(employee),
          String(student + faculty + employee),
        ]
      }),
    }
  }
  if (series.kind === "multiline" || series.kind === "line") {
    return {
      head: [["Date", "Medical", "Dental", "Total"]],
      body: series.points.map((point) => [
        point.label,
        String(point.value),
        String(point.secondary ?? 0),
        String(point.tertiary ?? point.value + (point.secondary ?? 0)),
      ]),
    }
  }
  return {
    head: [["Category", "Value"]],
    body: series.points.map((point) => [point.label, String(point.value)]),
  }
}

function tableBundleToRows(table: ReportTableBundle): {
  head: string[][]
  body: string[][]
} {
  return {
    head: [table.columns.map((col) => col.label)],
    body: table.rows.map((row) =>
      table.columns.map((col) => String(row.cells[col.key] ?? ""))
    ),
  }
}

function drawRunningHeader(state: PdfLayoutState, firstPage: boolean) {
  const { doc, meta } = state

  if (firstPage) {
    const letterheadWidth = 120
    let letterheadHeight = 24

    if (state.logoDataUrl) {
      const props = doc.getImageProperties(state.logoDataUrl)
      letterheadHeight = (props.height * letterheadWidth) / props.width
      const x = (PAGE_W - letterheadWidth) / 2
      doc.addImage(
        state.logoDataUrl,
        "PNG",
        x,
        10,
        letterheadWidth,
        letterheadHeight
      )
      state.y = 10 + letterheadHeight + 4
    } else {
      state.y = MARGIN_TOP
    }
  } else {
    doc.setFont("helvetica", "bold")
    doc.setFontSize(8)
    doc.setTextColor(...ACCENT_RGB)
    doc.text(meta.reportTitle, MARGIN_LEFT, 12)
    doc.setFont("helvetica", "normal")
    doc.setFontSize(7)
    doc.setTextColor(...MUTED_RGB)
    doc.text(
      formatManilaTimestamp(meta.generatedAt),
      PAGE_W - MARGIN_RIGHT,
      12,
      { align: "right" }
    )
    state.y = 18
  }

  doc.setDrawColor(...ACCENT_RGB)
  doc.setLineWidth(0.4)
  doc.line(MARGIN_LEFT, state.y, PAGE_W - MARGIN_RIGHT, state.y)
  state.y += 6
}

function drawPageFooters(doc: jsPDF) {
  const total = doc.getNumberOfPages()
  for (let page = 1; page <= total; page += 1) {
    doc.setPage(page)
    doc.setFont("helvetica", "normal")
    doc.setFontSize(7)
    doc.setTextColor(...MUTED_RGB)
    doc.text(HSO_CONFIDENTIAL, MARGIN_LEFT, PAGE_H - 8)
    doc.text(`Page ${page} of ${total}`, PAGE_W - MARGIN_RIGHT, PAGE_H - 8, {
      align: "right",
    })
  }
}

function ensureSpace(state: PdfLayoutState, needed: number) {
  const limit = PAGE_H - MARGIN_BOTTOM
  if (state.y + needed <= limit) return

  state.doc.addPage()
  drawRunningHeader(state, false)
}

function addWrappedText(
  state: PdfLayoutState,
  text: string,
  fontSize: number,
  options?: { bold?: boolean; color?: [number, number, number]; gap?: number }
) {
  const gap = options?.gap ?? 3
  state.doc.setFont("helvetica", options?.bold ? "bold" : "normal")
  state.doc.setFontSize(fontSize)
  state.doc.setTextColor(...(options?.color ?? BODY_RGB))
  const lines = state.doc.splitTextToSize(text, CONTENT_W) as string[]

  for (const line of lines) {
    ensureSpace(state, fontSize * 0.45 + gap)
    state.doc.text(line, MARGIN_LEFT, state.y)
    state.y += fontSize * 0.45 + gap
  }
}

function addSectionTitle(state: PdfLayoutState, title: string) {
  ensureSpace(state, 12)
  state.doc.setFont("helvetica", "bold")
  state.doc.setFontSize(10)
  state.doc.setTextColor(...ACCENT_RGB)
  state.doc.text(title, MARGIN_LEFT, state.y)
  state.y += 2
  state.doc.setDrawColor(219, 227, 240)
  state.doc.line(MARGIN_LEFT, state.y, PAGE_W - MARGIN_RIGHT, state.y)
  state.y += 6
}

function addAutoTable(
  state: PdfLayoutState,
  input: {
    head: string[][]
    body: string[][]
    startY?: number
  }
) {
  autoTable(state.doc, {
    head: input.head,
    body: input.body,
    startY: input.startY ?? state.y,
    margin: {
      left: MARGIN_LEFT,
      right: MARGIN_RIGHT,
      top: 16,
      bottom: MARGIN_BOTTOM,
    },
    tableWidth: CONTENT_W,
    theme: "grid",
    styles: {
      font: "helvetica",
      fontSize: 8,
      cellPadding: 2.2,
      textColor: BODY_RGB,
      lineColor: [156, 163, 175],
      lineWidth: 0.1,
      overflow: "linebreak",
      valign: "middle",
    },
    headStyles: {
      fillColor: ACCENT_RGB,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 7.5,
    },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    showHead: "everyPage",
    rowPageBreak: "avoid",
    didDrawPage: (data) => {
      if (data.pageNumber > 1) {
        state.doc.setFont("helvetica", "bold")
        state.doc.setFontSize(8)
        state.doc.setTextColor(...ACCENT_RGB)
        state.doc.text(state.meta.reportTitle, MARGIN_LEFT, 10)
        state.doc.setFont("helvetica", "normal")
        state.doc.setFontSize(7)
        state.doc.setTextColor(...MUTED_RGB)
        state.doc.text(
          formatManilaTimestamp(state.meta.generatedAt),
          PAGE_W - MARGIN_RIGHT,
          10,
          { align: "right" }
        )
        state.doc.setDrawColor(...ACCENT_RGB)
        state.doc.line(MARGIN_LEFT, 12, PAGE_W - MARGIN_RIGHT, 12)
      }
    },
  })
  state.y = state.doc.lastAutoTable.finalY + 6
}

function addKpiGrid(state: PdfLayoutState, kpis: ReportKpi[]) {
  if (kpis.length === 0) return

  const cols = 3
  const gap = 4
  const cardW = (CONTENT_W - gap * (cols - 1)) / cols
  const cardH = 18
  let col = 0
  let rowY = state.y

  for (const kpi of kpis) {
    ensureSpace(state, cardH + 4)
    if (col === 0) rowY = state.y

    const x = MARGIN_LEFT + col * (cardW + gap)
    state.doc.setDrawColor(209, 213, 219)
    state.doc.setFillColor(248, 250, 252)
    state.doc.roundedRect(x, rowY, cardW, cardH, 2, 2, "FD")

    state.doc.setFont("helvetica", "normal")
    state.doc.setFontSize(7)
    state.doc.setTextColor(...MUTED_RGB)
    const labelLines = state.doc.splitTextToSize(kpi.label, cardW - 4) as string[]
    state.doc.text(labelLines[0] ?? kpi.label, x + 3, rowY + 5)

    state.doc.setFont("helvetica", "bold")
    state.doc.setFontSize(11)
    state.doc.setTextColor(...ACCENT_RGB)
    state.doc.text(kpi.value, x + 3, rowY + 12)

    col += 1
    if (col >= cols) {
      col = 0
      state.y = rowY + cardH + gap
    }
  }

  if (col > 0) state.y = rowY + cardH + 6
}

async function addChartBlock(state: PdfLayoutState, series: ReportChartSeries) {
  addSectionTitle(state, series.title)
  if (series.description) {
    addWrappedText(state, series.description, 8, { color: MUTED_RGB, gap: 2 })
  }

  const chartHtml = chartSeriesToSvg(series)
  const png = await chartHtmlToPng(chartHtml)
  if (png) {
    const imgProps = state.doc.getImageProperties(png)
    const maxH = 52
    const imgW = CONTENT_W
    const imgH = Math.min(maxH, (imgProps.height * imgW) / imgProps.width)
    ensureSpace(state, imgH + 4)
    state.doc.addImage(png, "PNG", MARGIN_LEFT, state.y, imgW, imgH)
    state.y += imgH + 4
  }

  const dataTable = chartDataTable(series)
  if (dataTable.body.length > 0) {
    addAutoTable(state, dataTable)
  }
}

function addSignatures(state: PdfLayoutState) {
  ensureSpace(state, 28)
  const colW = CONTENT_W / 3
  const lineY = state.y + 18

  for (let i = 0; i < 3; i += 1) {
    const labels = ["Prepared by", "Checked by", "Noted by"]
    const x = MARGIN_LEFT + i * colW + colW / 2
    state.doc.setDrawColor(17, 24, 39)
    state.doc.line(MARGIN_LEFT + i * colW + 4, lineY, MARGIN_LEFT + (i + 1) * colW - 4, lineY)
    state.doc.setFont("helvetica", "normal")
    state.doc.setFontSize(8)
    state.doc.setTextColor(...MUTED_RGB)
    state.doc.text(labels[i], x, lineY + 5, { align: "center" })
  }

  state.y = lineY + 12
}

export async function buildClinicProgressPdfDocument(input: {
  meta: ExportMeta
  pack: ClinicExportPack
  reportMode?: ReportMode
}): Promise<jsPDF> {
  const reportMode: ReportMode =
    input.reportMode ??
    (input.meta.reportTitle.toLowerCase().includes("dental")
      ? "dental"
      : input.meta.reportTitle.toLowerCase().includes("medical")
        ? "medical"
        : "hso")

  const logoDataUrl = await loadLogoDataUrl()
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })
  const narrative = input.pack.narrative

  const state: PdfLayoutState = {
    doc,
    y: MARGIN_TOP,
    meta: input.meta,
    logoDataUrl,
  }

  drawRunningHeader(state, true)

  doc.setFont("helvetica", "bold")
  doc.setFontSize(12)
  doc.setTextColor(...BODY_RGB)
  const titleLines = doc.splitTextToSize(narrative.title, CONTENT_W) as string[]
  for (const line of titleLines) {
    ensureSpace(state, 7)
    doc.text(line, PAGE_W / 2, state.y, { align: "center" })
    state.y += 6
  }
  state.y += 2

  addWrappedText(state, `Report: ${narrative.title}`, 8, { gap: 2 })
  addWrappedText(state, `Coverage period: ${narrative.periodLabel}`, 8, { gap: 2 })
  addWrappedText(
    state,
    `Generated: ${formatManilaTimestamp(input.meta.generatedAt)} (Asia/Manila)`,
    8,
    { gap: 2 }
  )
  addWrappedText(
    state,
    `Prepared by: ${input.meta.generatedBy} · ${input.meta.roleLabel}`,
    8,
    { gap: 2 }
  )
  addWrappedText(state, `Applied filters: ${input.meta.filterSummary}`, 8, { gap: 4 })

  const narrativeSections = [
    { title: "1. Executive summary", body: narrative.executiveSummary },
    { title: "2. Operational progress", body: narrative.operationalProgress },
    { title: "3. Health-related concerns", body: narrative.healthConcerns },
    { title: "4. Service capacity & queue situation", body: narrative.serviceCapacity },
  ]

  for (const section of narrativeSections) {
    addSectionTitle(state, section.title)
    addWrappedText(state, section.body, 9, { gap: 3 })
    state.y += 2
  }

  addSectionTitle(state, "5. Analytics snapshot (KPI cards)")
  addKpiGrid(state, input.pack.kpis)

  if (input.pack.charts.length > 0) {
    addSectionTitle(state, "6. Charts & visual analytics")
    state.y += 2
    for (const series of input.pack.charts) {
      await addChartBlock(state, series)
      state.y += 2
    }
  }

  if (reportMode === "medical" || reportMode === "dental") {
    const healthTable = input.pack.tables.find(
      (table) =>
        table.kind === "health_cases_by_patient_type" ||
        table.kind === "health_cases"
    )
    const title =
      reportMode === "dental"
        ? "Dental Health Cases Summary"
        : "Medical Health Cases Summary"
    addSectionTitle(state, title)
    addWrappedText(
      state,
      "Official case tally for the selected period.",
      8,
      { color: MUTED_RGB, gap: 3 }
    )
    addAutoTable(state, {
      head: [["CASE", "EMPLOYEE", "COLLEGE", "SHS"]],
      body: buildOfficialHealthCasesRows(healthTable, reportMode),
    })
  }

  const detailTables = input.pack.tables.filter((table) => {
    if (reportMode === "hso") return true
    return (
      table.kind !== "health_cases" &&
      table.kind !== "health_cases_by_patient_type"
    )
  })

  if (detailTables.length > 0) {
    addSectionTitle(state, "7. Detailed report tables")
    for (const table of detailTables) {
      addSectionTitle(state, table.title)
      const { head, body } = tableBundleToRows(table)
      addAutoTable(state, { head, body })
    }
  }

  addSectionTitle(state, "8. Closing note for administration")
  addWrappedText(state, narrative.closing, 9, { gap: 3 })
  addSignatures(state)

  drawPageFooters(doc)
  return doc
}
