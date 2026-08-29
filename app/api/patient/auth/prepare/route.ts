import { NextResponse } from "next/server"

import { ensurePatientSignInByEmail } from "@/lib/patients/provision-patient-auth"

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string }
    const email = String(body.email ?? "")
      .trim()
      .toLowerCase()

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { ok: false, error: "Enter a valid email address." },
        { status: 400 }
      )
    }

    const result = await ensurePatientSignInByEmail(email)
    if (!result) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "This email is not on the clinic patient roster. Ask the clinic to import your record first.",
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      ok: true,
      prepared: true,
      authCreated: result.authCreated,
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not prepare patient sign-in."
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
