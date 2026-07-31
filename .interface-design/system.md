# CampusCare clinic staff UI

## Direction and feel
Operational clinic workbench with **Efferd dashboard composition**: one bordered frame, hairline cell grid, welcome intro — not scattered SaaS cards.

Reference: [@efferd/dashboard-1](https://efferd.com/) — `gap-6` page · `PageIntro` · `PanelFrame` + `PanelGrid gap-px bg-border` · flush cells `rounded-none ring-0`.

## Domain signature
**Vitals board** on nurse intake; specialty surfaces show nurse vitals as chips.

## Depth strategy
Borders-only. Outer `rounded-2xl border`. Inner cells separated by `gap-px`, not card gaps/shadows.

## Spacing
- Page: `gap-6` (shell + page)
- Intro: `gap-1` title stack; actions aligned top-right
- Panel cells: default Card padding; tables `pl-6` / `pr-6`, rows `h-14`
- Stats: label `text-xs tracking-wide muted` · value `text-xl font-medium tabular-nums`

## Hierarchy
1. PageIntro (welcome / queue title)
2. KPI strip (3 flush stats)
3. Nurse workbench / now serving (full width cell)
4. Primary table + stations
5. Recent / activity

## Surface mode
Card flush inside PanelFrame. Hold across nurse/physician/dentist dashboard + queue.

## Key files
- `components/layout/panel-frame.tsx` — PageIntro, PanelFrame, PanelGrid, PanelCell, panelCardClassName
- `components/dashboard/role-dashboard.tsx`
- `components/queue/queue-page.tsx`
- `components/queue/nurse-workbench.tsx`

## Nurse queue composition (tight)
**3 lane rectangles** (Needs intake · Specialty · Exceptions) via `NurseLaneSwitcher` — Efferd `gap-px` cells, count as hero number  
Then: title + search → Up next strip → dense table  
Needs-intake columns: Ticket · Patient · Status · Wait · actions  
Preview ref: [ReUI segmented tabs](https://reui.io/preview/base/components/c-tabs-9) — adapted to metric rectangles, not underline tabs
