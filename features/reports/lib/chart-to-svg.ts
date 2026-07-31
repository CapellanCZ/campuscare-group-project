import { HSO_ACCENT } from "@/features/reports/lib/export-letterhead"
import type { ReportChartSeries } from "@/features/reports/types"

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
}

/** Lightweight SVG charts for print/PDF (no canvas dependency). */
export function chartSeriesToSvg(series: ReportChartSeries): string {
  const points = series.points.slice(0, 10)
  if (points.length === 0) {
    return `<p style="color:#6b7280;font-size:9pt;">No chart data for ${escapeXml(series.title)}.</p>`
  }

  const width = 520
  const height = 220
  const padL = 36
  const padR = 16
  const padT = 16
  const padB = 48
  const max = Math.max(...points.map((p) => p.value), 1)
  const innerW = width - padL - padR
  const innerH = height - padT - padB

  if (series.kind === "pie") {
    const total = points.reduce((s, p) => s + p.value, 0) || 1
    const cx = 120
    const cy = 110
    const r = 70
    let angle = -Math.PI / 2
    const colors = ["#1e3a8a", "#2563eb", "#0ea5e9", "#64748b", "#94a3b8", "#334155"]
    const slices = points.map((p, i) => {
      const slice = (p.value / total) * Math.PI * 2
      const x1 = cx + r * Math.cos(angle)
      const y1 = cy + r * Math.sin(angle)
      angle += slice
      const x2 = cx + r * Math.cos(angle)
      const y2 = cy + r * Math.sin(angle)
      const large = slice > Math.PI ? 1 : 0
      return `<path d="M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z" fill="${colors[i % colors.length]}" />`
    })
    const legend = points
      .map(
        (p, i) =>
          `<div style="display:flex;align-items:center;gap:6px;margin:2px 0;font-size:9pt;"><span style="display:inline-block;width:10px;height:10px;background:${colors[i % colors.length]};"></span>${escapeXml(p.label)} — ${p.value}</div>`
      )
      .join("")
    return `<div style="display:flex;gap:20px;align-items:center;flex-wrap:wrap;">
      <svg viewBox="0 0 240 220" width="240" height="220">${slices.join("")}</svg>
      <div>${legend}</div>
    </div>`
  }

  if (series.kind === "line") {
    const step = points.length > 1 ? innerW / (points.length - 1) : innerW
    const coords = points.map((p, i) => {
      const x = padL + i * step
      const y = padT + innerH - (p.value / max) * innerH
      return `${x},${y}`
    })
    const circles = points
      .map((p, i) => {
        const x = padL + i * step
        const y = padT + innerH - (p.value / max) * innerH
        return `<circle cx="${x}" cy="${y}" r="3" fill="${HSO_ACCENT}" />`
      })
      .join("")
    const labels = points
      .map((p, i) => {
        const x = padL + i * step
        return `<text x="${x}" y="${height - 12}" text-anchor="middle" font-size="8" fill="#6b7280">${escapeXml(p.label.slice(0, 8))}</text>`
      })
      .join("")
    return `<svg viewBox="0 0 ${width} ${height}" width="100%" height="${height}">
      <polyline fill="none" stroke="${HSO_ACCENT}" stroke-width="2" points="${coords.join(" ")}" />
      ${circles}${labels}
    </svg>`
  }

  // bar
  const gap = 8
  const barW = Math.max(12, (innerW - gap * points.length) / points.length)
  const bars = points
    .map((p, i) => {
      const h = (p.value / max) * innerH
      const x = padL + i * (barW + gap)
      const y = padT + innerH - h
      return `<rect x="${x}" y="${y}" width="${barW}" height="${h}" fill="${HSO_ACCENT}" rx="2" />
        <text x="${x + barW / 2}" y="${height - 12}" text-anchor="middle" font-size="8" fill="#6b7280">${escapeXml(p.label.slice(0, 8))}</text>
        <text x="${x + barW / 2}" y="${y - 4}" text-anchor="middle" font-size="8" fill="#111827">${p.value}</text>`
    })
    .join("")

  return `<svg viewBox="0 0 ${width} ${height}" width="100%" height="${height}">${bars}</svg>`
}
