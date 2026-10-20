/**
 * Intentionally allow the next document unload (logout / forced sign-out)
 * without the browser's beforeunload confirmation.
 */
let allowUnload = false

export function allowNextUnload() {
  allowUnload = true
}

export function isUnloadAllowed(): boolean {
  return allowUnload
}
