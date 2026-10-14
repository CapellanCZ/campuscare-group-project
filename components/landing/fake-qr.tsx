import { cn } from "@/lib/utils"

type FakeQrProps = {
  className?: string
  /** Accessible label — decorative preview, not a live install code. */
  label?: string
}

/**
 * Decorative QR stand-in until the real APK URL is wired.
 * Looks like a code; does not encode a download link.
 */
export function FakeQr({
  className,
  label = "Preview QR code — not linked to an APK yet",
}: FakeQrProps) {
  // Sparse finder-ish corners + scattered modules for a believable preview.
  const modules = [
    // top-left finder
    ...finder(0, 0),
    // top-right finder
    ...finder(18, 0),
    // bottom-left finder
    ...finder(0, 18),
    // scattered data modules
    [9, 2],
    [11, 3],
    [13, 2],
    [10, 5],
    [14, 5],
    [16, 4],
    [8, 8],
    [10, 9],
    [12, 8],
    [15, 10],
    [17, 9],
    [9, 12],
    [11, 13],
    [13, 12],
    [16, 14],
    [8, 15],
    [12, 16],
    [14, 17],
    [18, 12],
    [20, 13],
    [22, 11],
    [19, 16],
    [21, 18],
    [23, 15],
    [10, 19],
    [13, 20],
    [15, 22],
    [17, 21],
    [20, 20],
    [22, 22],
    [6, 10],
    [4, 12],
    [3, 14],
    [5, 16],
    [7, 18],
    [2, 9],
  ] as const

  return (
    <svg
      viewBox="0 0 25 25"
      className={cn("size-full text-slate-900", className)}
      role="img"
      aria-label={label}
    >
      <rect width="25" height="25" fill="white" />
      {modules.map(([x, y]) => (
        <rect
          key={`${x}-${y}`}
          x={x}
          y={y}
          width="1"
          height="1"
          fill="currentColor"
        />
      ))}
    </svg>
  )
}

function finder(ox: number, oy: number): Array<readonly [number, number]> {
  const cells: Array<readonly [number, number]> = []
  for (let y = 0; y < 7; y += 1) {
    for (let x = 0; x < 7; x += 1) {
      const edge = x === 0 || y === 0 || x === 6 || y === 6
      const core = x >= 2 && x <= 4 && y >= 2 && y <= 4
      if (edge || core) cells.push([ox + x, oy + y] as const)
    }
  }
  return cells
}
