/**
 * Local-first mutation helper: apply UI change immediately, sync to server,
 * roll back only if the server rejects.
 */

export async function runOptimisticAction<T>(options: {
  apply: () => void
  revert: () => void
  action: () => Promise<T>
  isOk?: (result: T) => boolean
  onSuccess?: (result: T) => void
  onError?: (error: unknown) => void
}): Promise<{ ok: true; data: T } | { ok: false; error: unknown }> {
  options.apply()
  try {
    const result = await options.action()
    if (options.isOk && !options.isOk(result)) {
      options.revert()
      options.onError?.(result)
      return { ok: false, error: result }
    }
    options.onSuccess?.(result)
    return { ok: true, data: result }
  } catch (error) {
    options.revert()
    options.onError?.(error)
    return { ok: false, error }
  }
}
