import "server-only"

type QueryError = { message: string } | null

type PageResult<T> = {
  data: T[] | null
  error: QueryError
}

/** PostgREST returns at most 1000 rows unless the query is paged with range(). */
export const REPORTS_PAGE_SIZE = 1000
const REPORTS_MAX_ROWS = 50_000

export async function fetchAllRows<T>(
  fetchPage: (from: number, to: number) => PromiseLike<PageResult<T>>,
  pageSize = REPORTS_PAGE_SIZE
): Promise<T[]> {
  const rows: T[] = []
  let from = 0

  while (from < REPORTS_MAX_ROWS) {
    const to = from + pageSize - 1
    const { data, error } = await fetchPage(from, to)
    if (error) throw error
    const page = data ?? []
    rows.push(...page)
    if (page.length < pageSize) break
    from += pageSize
  }

  return rows
}

export async function fetchInChunks<T>(
  ids: string[],
  fetchChunk: (chunk: string[]) => PromiseLike<PageResult<T>>,
  chunkSize = 200
): Promise<T[]> {
  if (ids.length === 0) return []
  const rows: T[] = []
  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize)
    const { data, error } = await fetchChunk(chunk)
    if (error) throw error
    rows.push(...(data ?? []))
  }
  return rows
}
