/**
 * One-off: send a test Account Activation email.
 * Usage: npx tsx scripts/send-test-activation-email.ts [to@email]
 */
import { createRequire } from "node:module"
import { readFileSync } from "node:fs"
import path from "node:path"

const require = createRequire(import.meta.url)

// Allow importing Next "server-only" modules from this CLI script.
{
  const id = require.resolve("server-only")
  require.cache[id] = {
    id,
    filename: id,
    loaded: true,
    exports: {},
  } as NodeModule
}

function loadEnvLocal() {
  const envPath = path.join(process.cwd(), ".env.local")
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([^#=]+)=(.*)$/)
    if (!m) continue
    const key = m[1].trim()
    let val = m[2].trim()
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }
    if (!process.env[key]) process.env[key] = val
  }
}

async function main() {
  loadEnvLocal()

  const { buildActivationEmail } = await import("../lib/auth/email-templates")
  const { sendResendEmail } = await import("../lib/auth/resend-client")

  const to = (process.argv[2] || "achasgd.enyudi@gmail.com").trim()
  const activationUrl = "https://campuscare-group-project.vercel.app/login"
  const msg = buildActivationEmail({
    fullName: "Alex",
    role: "nurse",
    activationUrl,
    email: to,
  })

  await sendResendEmail({
    to,
    subject: `[TEST] ${msg.subject}`,
    html: msg.html,
    text: msg.text,
  })

  console.log(`Sent Account Activation test email to ${to}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
