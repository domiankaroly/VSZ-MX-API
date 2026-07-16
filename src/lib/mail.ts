import nodemailer from 'nodemailer'

// ── Email küldés — Office 365 SMTP ─────────────────────────────────────────
// Ugyanaz az SMTP-módszer, mint a Python automatizációs szkripteknél
// (smtp.office365.com, STARTTLS, felhasználó/jelszó auth).
//
// Szükséges .env.local változók:
//   SMTP_HOST=smtp.office365.com
//   SMTP_PORT=587
//   SMTP_USER=<küldő fiók email címe>
//   SMTP_PASSWORD=<küldő fiók jelszava / app password>
//   SMTP_FROM=<opcionális, ha eltér a SMTP_USER-től>

let transporter: ReturnType<typeof nodemailer.createTransport> | null = null

function getTransporter() {
  if (transporter) return transporter

  const host = process.env.SMTP_HOST
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASSWORD

  if (!host || !user || !pass) {
    throw new Error('SMTP nincs konfigurálva (SMTP_HOST / SMTP_USER / SMTP_PASSWORD hiányzik)')
  }

  transporter = nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: false, // STARTTLS a 587-es porton
    auth: { user, pass },
  })

  return transporter
}

export async function sendMail(opts: {
  to: string
  subject: string
  text?: string
  html?: string
}) {
  const t = getTransporter()
  await t.sendMail({
    from: process.env.SMTP_FROM ?? process.env.SMTP_USER,
    to: opts.to,
    subject: opts.subject,
    text: opts.text,
    html: opts.html,
  })
}
