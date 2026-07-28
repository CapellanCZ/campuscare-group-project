import { redirect } from "next/navigation"

const AUTH_QUERY_KEYS = [
  "code",
  "token_hash",
  "type",
  "error",
  "error_code",
  "error_description",
  "access_token",
  "refresh_token",
] as const

type RootPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

/** Site root: forward Supabase auth links to callback, otherwise landing. */
export default async function RootPage({ searchParams }: RootPageProps) {
  const params = await searchParams
  const hasAuthParams = AUTH_QUERY_KEYS.some((key) => params[key] !== undefined)

  if (hasAuthParams) {
    const qs = new URLSearchParams()
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined) continue
      if (Array.isArray(value)) {
        for (const entry of value) qs.append(key, entry)
      } else {
        qs.set(key, value)
      }
    }
    redirect(`/auth/callback?${qs.toString()}`)
  }

  redirect("/landing")
}
